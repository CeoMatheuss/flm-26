
-- ====== Club World Cup Tables ======
CREATE TABLE IF NOT EXISTS public.club_world_cups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  season_year int NOT NULL,
  status text NOT NULL DEFAULT 'scheduled', -- scheduled | groups | knockout | finished
  current_stage text NOT NULL DEFAULT 'groups', -- groups | r16 | qf | sf | final | done
  current_round int NOT NULL DEFAULT 1,
  champion_team_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(season_year)
);

CREATE TABLE IF NOT EXISTS public.club_world_cup_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cup_id uuid NOT NULL REFERENCES public.club_world_cups(id) ON DELETE CASCADE,
  user_id uuid,
  is_bot boolean NOT NULL DEFAULT false,
  bot_strength int,
  club_name text NOT NULL,
  club_logo text,
  country text,
  continent text,
  group_letter text, -- A..H
  group_pos int,
  played int NOT NULL DEFAULT 0,
  wins int NOT NULL DEFAULT 0,
  draws int NOT NULL DEFAULT 0,
  losses int NOT NULL DEFAULT 0,
  goals_for int NOT NULL DEFAULT 0,
  goals_against int NOT NULL DEFAULT 0,
  points int NOT NULL DEFAULT 0,
  eliminated boolean NOT NULL DEFAULT false,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.club_world_cup_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cup_id uuid NOT NULL REFERENCES public.club_world_cups(id) ON DELETE CASCADE,
  stage text NOT NULL, -- groups | r16 | qf | sf | final
  round int NOT NULL DEFAULT 1,
  group_letter text,
  home_team_id uuid REFERENCES public.club_world_cup_teams(id),
  away_team_id uuid REFERENCES public.club_world_cup_teams(id),
  home_goals int,
  away_goals int,
  scheduled_at timestamptz NOT NULL,
  played_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled',
  match_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cwc_matches_cup_status ON public.club_world_cup_matches(cup_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_cwc_teams_cup_group ON public.club_world_cup_teams(cup_id, group_letter, points DESC);

ALTER TABLE public.club_world_cups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_world_cup_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_world_cup_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view club world cups" ON public.club_world_cups FOR SELECT USING (true);
CREATE POLICY "Anyone can view club world cup teams" ON public.club_world_cup_teams FOR SELECT USING (true);
CREATE POLICY "Anyone can view club world cup matches" ON public.club_world_cup_matches FOR SELECT USING (true);

-- ====== qualify_club_world_cup ======
CREATE OR REPLACE FUNCTION public.qualify_club_world_cup(_season_year int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _teams jsonb := '[]'::jsonb;
  _seen_clubs text[] := ARRAY[]::text[];
  _continents text[] := ARRAY['América do Sul','Europa','América do Norte','África','Ásia','Oceania'];
  _cont text;
  _comp RECORD;
  _team RECORD;
  _count int := 0;
  _added_per_cont int;
BEGIN
  -- 1) Top 2 de cada Continental Principal finalizada (12 clubes)
  FOREACH _cont IN ARRAY _continents LOOP
    _added_per_cont := 0;
    FOR _comp IN
      SELECT id FROM continental_competitions
      WHERE continent = _cont AND tier = 'principal' AND status = 'finished'
      ORDER BY created_at DESC LIMIT 1
    LOOP
      FOR _team IN
        SELECT user_id, club_name, club_logo, country, points, goals_for, goals_against
        FROM continental_teams
        WHERE competition_id = _comp.id
        ORDER BY 
          CASE WHEN eliminated = false THEN 0 ELSE 1 END,
          points DESC NULLS LAST,
          (goals_for - goals_against) DESC NULLS LAST
        LIMIT 4
      LOOP
        IF _team.club_name = ANY(_seen_clubs) THEN CONTINUE; END IF;
        IF _added_per_cont >= 2 THEN EXIT; END IF;
        _teams := _teams || jsonb_build_object(
          'user_id', _team.user_id,
          'club_name', _team.club_name,
          'club_logo', COALESCE(_team.club_logo, '⚽'),
          'country', _team.country,
          'continent', _cont,
          'is_bot', _team.user_id IS NULL,
          'source', 'continental_principal_top2'
        );
        _seen_clubs := _seen_clubs || _team.club_name;
        _count := _count + 1;
        _added_per_cont := _added_per_cont + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  -- 2) Completar com melhores da Série A (D1) de cada país, balanceado por continente
  FOR _team IN
    SELECT lm.user_id, lm.club_name, lm.club_logo, ml.country, lm.points
    FROM league_members lm
    JOIN multiplayer_leagues ml ON ml.id = lm.league_id
    WHERE ml.tier = 'nacional' AND ml.division = 1 AND ml.auto_created = true
      AND NOT (lm.club_name = ANY(_seen_clubs))
    ORDER BY lm.points DESC NULLS LAST, (lm.goals_for - lm.goals_against) DESC NULLS LAST
  LOOP
    IF _count >= 32 THEN EXIT; END IF;
    _teams := _teams || jsonb_build_object(
      'user_id', _team.user_id,
      'club_name', _team.club_name,
      'club_logo', COALESCE(_team.club_logo, '⚽'),
      'country', _team.country,
      'continent', NULL,
      'is_bot', _team.user_id IS NULL,
      'source', 'league_top'
    );
    _seen_clubs := _seen_clubs || _team.club_name;
    _count := _count + 1;
  END LOOP;

  -- 3) Completar com bots se ainda faltar
  WHILE _count < 32 LOOP
    _teams := _teams || jsonb_build_object(
      'user_id', NULL,
      'club_name', generate_bot_club_name('Brasil', _count + 500),
      'club_logo', random_bot_logo(),
      'country', 'Brasil',
      'continent', 'América do Sul',
      'is_bot', true,
      'source', 'bot_fill'
    );
    _count := _count + 1;
  END LOOP;

  RETURN _teams;
END;
$$;

-- ====== start_club_world_cup ======
CREATE OR REPLACE FUNCTION public.start_club_world_cup(_season_year int)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cup_id uuid;
  _teams jsonb;
  _team_record record;
  _team_ids uuid[] := ARRAY[]::uuid[];
  _new_team_id uuid;
  _today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  _groups text[] := ARRAY['A','B','C','D','E','F','G','H'];
  _g int;
  _i int;
  _matchday1 timestamptz;
  _matchday2 timestamptz;
  _matchday3 timestamptz;
  _t1 uuid; _t2 uuid; _t3 uuid; _t4 uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM club_world_cups WHERE season_year = _season_year) THEN
    RAISE NOTICE 'Club World Cup already exists for %', _season_year;
    RETURN NULL;
  END IF;

  _teams := qualify_club_world_cup(_season_year);
  IF jsonb_array_length(_teams) <> 32 THEN
    RAISE EXCEPTION 'Expected 32 teams, got %', jsonb_array_length(_teams);
  END IF;

  INSERT INTO club_world_cups (name, season_year, status, current_stage)
  VALUES ('Mundial de Clubes ' || _season_year, _season_year, 'groups', 'groups')
  RETURNING id INTO _cup_id;

  -- Inserir times com ordem aleatória
  FOR _team_record IN
    SELECT * FROM jsonb_array_elements(_teams) WITH ORDINALITY AS t(team, ord)
    ORDER BY random()
  LOOP
    INSERT INTO club_world_cup_teams (
      cup_id, user_id, is_bot, bot_strength, club_name, club_logo, country, continent, source
    ) VALUES (
      _cup_id,
      NULLIF(_team_record.team->>'user_id','')::uuid,
      (_team_record.team->>'is_bot')::boolean,
      CASE WHEN (_team_record.team->>'is_bot')::boolean THEN 70 + floor(random()*20)::int ELSE NULL END,
      _team_record.team->>'club_name',
      _team_record.team->>'club_logo',
      _team_record.team->>'country',
      _team_record.team->>'continent',
      _team_record.team->>'source'
    ) RETURNING id INTO _new_team_id;
    _team_ids := array_append(_team_ids, _new_team_id);
  END LOOP;

  -- Distribuir nos 8 grupos (4 times cada)
  FOR _g IN 1..8 LOOP
    FOR _i IN 1..4 LOOP
      UPDATE club_world_cup_teams
      SET group_letter = _groups[_g], group_pos = _i
      WHERE id = _team_ids[(_g-1)*4 + _i];
    END LOOP;
  END LOOP;

  -- Datas dos jogos de grupo (21h BRT = 00h UTC dia seguinte)
  _matchday1 := ((_today + 20) || ' 21:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
  _matchday2 := ((_today + 21) || ' 21:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
  _matchday3 := ((_today + 22) || ' 21:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';

  -- Para cada grupo, gerar 6 jogos (round-robin de 4 = 3 rodadas com 2 jogos cada)
  -- Pares: R1: 1v2, 3v4 | R2: 1v3, 2v4 | R3: 1v4, 2v3
  FOR _g IN 1..8 LOOP
    SELECT id INTO _t1 FROM club_world_cup_teams WHERE cup_id = _cup_id AND group_letter = _groups[_g] AND group_pos = 1;
    SELECT id INTO _t2 FROM club_world_cup_teams WHERE cup_id = _cup_id AND group_letter = _groups[_g] AND group_pos = 2;
    SELECT id INTO _t3 FROM club_world_cup_teams WHERE cup_id = _cup_id AND group_letter = _groups[_g] AND group_pos = 3;
    SELECT id INTO _t4 FROM club_world_cup_teams WHERE cup_id = _cup_id AND group_letter = _groups[_g] AND group_pos = 4;

    -- R1
    INSERT INTO club_world_cup_matches (cup_id, stage, round, group_letter, home_team_id, away_team_id, scheduled_at)
    VALUES (_cup_id, 'groups', 1, _groups[_g], _t1, _t2, _matchday1),
           (_cup_id, 'groups', 1, _groups[_g], _t3, _t4, _matchday1);
    -- R2
    INSERT INTO club_world_cup_matches (cup_id, stage, round, group_letter, home_team_id, away_team_id, scheduled_at)
    VALUES (_cup_id, 'groups', 2, _groups[_g], _t1, _t3, _matchday2),
           (_cup_id, 'groups', 2, _groups[_g], _t2, _t4, _matchday2);
    -- R3
    INSERT INTO club_world_cup_matches (cup_id, stage, round, group_letter, home_team_id, away_team_id, scheduled_at)
    VALUES (_cup_id, 'groups', 3, _groups[_g], _t1, _t4, _matchday3),
           (_cup_id, 'groups', 3, _groups[_g], _t2, _t3, _matchday3);
  END LOOP;

  RETURN _cup_id;
END;
$$;

-- ====== award_club_world_cup_prizes ======
CREATE OR REPLACE FUNCTION public.award_club_world_cup_prizes(_cup_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _final_match RECORD;
  _winner_id uuid; _runner_id uuid;
  _winner RECORD; _runner RECORD;
  _semi_losers uuid[];
  _semi_team RECORD;
BEGIN
  -- Encontrar a final
  SELECT * INTO _final_match
  FROM club_world_cup_matches
  WHERE cup_id = _cup_id AND stage = 'final' AND status = 'finished'
  LIMIT 1;

  IF _final_match IS NULL THEN RETURN; END IF;

  IF (_final_match.match_data->>'winner_team_id') IS NOT NULL THEN
    _winner_id := (_final_match.match_data->>'winner_team_id')::uuid;
    _runner_id := CASE WHEN _winner_id = _final_match.home_team_id 
                       THEN _final_match.away_team_id ELSE _final_match.home_team_id END;
  END IF;

  IF _winner_id IS NULL THEN RETURN; END IF;

  -- Marcar campeão
  UPDATE club_world_cups SET champion_team_id = _winner_id, status = 'finished', current_stage = 'done' WHERE id = _cup_id;

  -- Premiar campeão (R$ 100M)
  SELECT * INTO _winner FROM club_world_cup_teams WHERE id = _winner_id;
  IF _winner.user_id IS NOT NULL THEN
    UPDATE league_members SET budget = budget + 100000000 WHERE user_id = _winner.user_id;
    INSERT INTO user_notifications (user_id, type, title, message, icon, data)
    VALUES (_winner.user_id, 'world_cup_won', '🌍 CAMPEÃO MUNDIAL!',
            'Você venceu o ' || (SELECT name FROM club_world_cups WHERE id = _cup_id) || '! Prêmio: R$ 100M.',
            '🏆', jsonb_build_object('cup_id', _cup_id));
  END IF;

  -- Premiar vice (R$ 50M)
  SELECT * INTO _runner FROM club_world_cup_teams WHERE id = _runner_id;
  IF _runner.user_id IS NOT NULL THEN
    UPDATE league_members SET budget = budget + 50000000 WHERE user_id = _runner.user_id;
    INSERT INTO user_notifications (user_id, type, title, message, icon, data)
    VALUES (_runner.user_id, 'world_cup_runner', '🥈 Vice-Campeão Mundial',
            'Você foi vice-campeão do Mundial de Clubes! Prêmio: R$ 50M.',
            '🥈', jsonb_build_object('cup_id', _cup_id));
  END IF;

  -- Premiar perdedores das semis (R$ 25M cada)
  SELECT array_agg(loser) INTO _semi_losers FROM (
    SELECT CASE WHEN (m.match_data->>'winner_team_id')::uuid = m.home_team_id THEN m.away_team_id ELSE m.home_team_id END AS loser
    FROM club_world_cup_matches m
    WHERE m.cup_id = _cup_id AND m.stage = 'sf' AND m.status = 'finished'
  ) sl;

  IF _semi_losers IS NOT NULL THEN
    FOR _semi_team IN SELECT * FROM club_world_cup_teams WHERE id = ANY(_semi_losers) AND user_id IS NOT NULL LOOP
      UPDATE league_members SET budget = budget + 25000000 WHERE user_id = _semi_team.user_id;
      INSERT INTO user_notifications (user_id, type, title, message, icon, data)
      VALUES (_semi_team.user_id, 'world_cup_semi', '🥉 Semifinalista Mundial',
              'Você chegou às semifinais do Mundial de Clubes! Prêmio: R$ 25M.',
              '🥉', jsonb_build_object('cup_id', _cup_id));
    END LOOP;
  END IF;
END;
$$;
