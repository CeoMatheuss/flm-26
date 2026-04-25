
-- Tabela para rastrear vagas continentais conquistadas (campeão da copa)
CREATE TABLE IF NOT EXISTS public.continental_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  club_name text NOT NULL,
  club_logo text,
  country text NOT NULL,
  continent text NOT NULL,
  source text NOT NULL, -- 'national_cup_winner' | 'league_pos_X'
  tier text NOT NULL,   -- 'principal' | 'secundaria'
  season_year int NOT NULL,
  qualified_at timestamptz NOT NULL DEFAULT now(),
  consumed boolean NOT NULL DEFAULT false
);

ALTER TABLE public.continental_qualifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view continental qualifications"
  ON public.continental_qualifications FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_cont_qual_country_year 
  ON public.continental_qualifications(country, season_year, consumed);

-- ====== qualify_national_cup_teams ======
CREATE OR REPLACE FUNCTION public.qualify_national_cup_teams(_country text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _teams jsonb := '[]'::jsonb;
  _league_id uuid;
  _member RECORD;
  _count int := 0;
  _seen_clubs text[] := ARRAY[]::text[];
BEGIN
  -- Pega TODOS os 20 da Série A
  SELECT id INTO _league_id
  FROM multiplayer_leagues
  WHERE country = _country AND tier = 'nacional' AND division = 1 AND auto_created = true
  LIMIT 1;

  IF _league_id IS NOT NULL THEN
    FOR _member IN
      SELECT user_id, club_name, club_logo
      FROM league_members
      WHERE league_id = _league_id
      ORDER BY points DESC NULLS LAST, (goals_for - goals_against) DESC NULLS LAST
      LIMIT 20
    LOOP
      _teams := _teams || jsonb_build_object(
        'user_id', _member.user_id,
        'club_name', _member.club_name,
        'club_logo', COALESCE(_member.club_logo, '⚽'),
        'is_bot', _member.user_id IS NULL
      );
      _seen_clubs := _seen_clubs || _member.club_name;
      _count := _count + 1;
    END LOOP;
  END IF;

  -- Top 12 da Série B
  SELECT id INTO _league_id
  FROM multiplayer_leagues
  WHERE country = _country AND tier = 'nacional' AND division = 2 AND auto_created = true
  LIMIT 1;

  IF _league_id IS NOT NULL THEN
    FOR _member IN
      SELECT user_id, club_name, club_logo
      FROM league_members
      WHERE league_id = _league_id
        AND NOT (club_name = ANY(_seen_clubs))
      ORDER BY points DESC NULLS LAST, (goals_for - goals_against) DESC NULLS LAST
      LIMIT 12
    LOOP
      _teams := _teams || jsonb_build_object(
        'user_id', _member.user_id,
        'club_name', _member.club_name,
        'club_logo', COALESCE(_member.club_logo, '⚽'),
        'is_bot', _member.user_id IS NULL
      );
      _count := _count + 1;
    END LOOP;
  END IF;

  -- Completa com bots se faltar para 32
  WHILE _count < 32 LOOP
    _teams := _teams || jsonb_build_object(
      'user_id', NULL,
      'club_name', generate_bot_club_name(_country, _count + 100),
      'club_logo', random_bot_logo(),
      'is_bot', true
    );
    _count := _count + 1;
  END LOOP;

  RETURN _teams;
END;
$$;

-- ====== start_national_cup ======
CREATE OR REPLACE FUNCTION public.start_national_cup(_country text, _season_year int)
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
  _i int;
  _today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  _round_dates timestamptz[];
BEGIN
  -- Evita duplicar
  IF EXISTS (
    SELECT 1 FROM cup_competitions 
    WHERE country = _country AND cup_type = 'national' 
      AND season_year = _season_year AND status IN ('scheduled','in_progress')
  ) THEN
    RAISE NOTICE 'Cup already exists for % season %', _country, _season_year;
    RETURN NULL;
  END IF;

  _teams := qualify_national_cup_teams(_country);
  
  IF jsonb_array_length(_teams) <> 32 THEN
    RAISE EXCEPTION 'Expected 32 teams, got %', jsonb_array_length(_teams);
  END IF;

  -- Cria copa
  INSERT INTO cup_competitions (
    name, cup_type, country, season_year, format, status, current_round, total_rounds, tier
  ) VALUES (
    'Copa do ' || _country, 'national', _country, _season_year, 'knockout', 'scheduled', 1, 5, 'nacional'
  ) RETURNING id INTO _cup_id;

  -- Insere times com seed aleatório (Fisher-Yates)
  FOR _team_record IN
    SELECT * FROM jsonb_array_elements(_teams) WITH ORDINALITY AS t(team, ord)
    ORDER BY random()
  LOOP
    INSERT INTO cup_teams (
      cup_id, user_id, is_bot, bot_name, bot_strength,
      club_name, club_logo, seed, eliminated
    ) VALUES (
      _cup_id,
      NULLIF(_team_record.team->>'user_id','')::uuid,
      (_team_record.team->>'is_bot')::boolean,
      CASE WHEN (_team_record.team->>'is_bot')::boolean THEN _team_record.team->>'club_name' ELSE NULL END,
      CASE WHEN (_team_record.team->>'is_bot')::boolean THEN 50 + floor(random()*30)::int ELSE NULL END,
      _team_record.team->>'club_name',
      _team_record.team->>'club_logo',
      array_length(_team_ids, 1),
      false
    ) RETURNING id INTO _new_team_id;
    _team_ids := array_append(_team_ids, _new_team_id);
  END LOOP;

  -- Datas: dia 10=R32, dia 12=R16, dia 14=QF, dia 16=SF, dia 17=F (12h BRT)
  _round_dates := ARRAY[
    ((_today + 10) || ' 12:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo',
    ((_today + 12) || ' 12:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo',
    ((_today + 14) || ' 12:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo',
    ((_today + 16) || ' 12:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo',
    ((_today + 17) || ' 12:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo'
  ];

  -- Cria os 16 jogos da R32
  FOR _i IN 1..16 LOOP
    INSERT INTO cup_matches (
      cup_id, round, leg, home_team_id, away_team_id, scheduled_at, status
    ) VALUES (
      _cup_id, 1, 1, _team_ids[_i*2-1], _team_ids[_i*2], _round_dates[1], 'scheduled'
    );
  END LOOP;

  UPDATE cup_competitions SET status = 'in_progress' WHERE id = _cup_id;
  
  RETURN _cup_id;
END;
$$;

-- ====== finish_national_cup_award_continental ======
CREATE OR REPLACE FUNCTION public.finish_national_cup_award_continental(_cup_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cup RECORD;
  _winner RECORD;
  _continent text;
  _country_continent_map jsonb := '{
    "Brasil":"América do Sul","Argentina":"América do Sul","Uruguai":"América do Sul","Chile":"América do Sul","Colômbia":"América do Sul","Peru":"América do Sul","Equador":"América do Sul","Paraguai":"América do Sul","Bolívia":"América do Sul","Venezuela":"América do Sul",
    "Espanha":"Europa","Inglaterra":"Europa","Itália":"Europa","Alemanha":"Europa","França":"Europa","Portugal":"Europa","Holanda":"Europa","Bélgica":"Europa","Turquia":"Europa","Rússia":"Europa","Suécia":"Europa","Noruega":"Europa","Dinamarca":"Europa","Suíça":"Europa","Áustria":"Europa",
    "México":"América do Norte","Estados Unidos":"América do Norte","Canadá":"América do Norte",
    "Egito":"África","Marrocos":"África","Nigéria":"África","África do Sul":"África",
    "Japão":"Ásia","Coreia do Sul":"Ásia","Arábia Saudita":"Ásia","China":"Ásia","Índia":"Ásia",
    "Austrália":"Oceania","Nova Zelândia":"Oceania"
  }'::jsonb;
BEGIN
  SELECT * INTO _cup FROM cup_competitions WHERE id = _cup_id;
  IF _cup IS NULL OR _cup.status <> 'finished' THEN RETURN; END IF;

  -- Vencedor = único time não eliminado
  SELECT user_id, club_name, club_logo INTO _winner
  FROM cup_teams
  WHERE cup_id = _cup_id AND eliminated = false
  LIMIT 1;

  IF _winner IS NULL THEN RETURN; END IF;

  _continent := _country_continent_map->>_cup.country;
  IF _continent IS NULL THEN RETURN; END IF;

  -- Registra vaga continental (só se humano)
  IF _winner.user_id IS NOT NULL THEN
    INSERT INTO continental_qualifications (
      user_id, club_name, club_logo, country, continent, source, tier, season_year
    ) VALUES (
      _winner.user_id, _winner.club_name, _winner.club_logo, _cup.country, _continent,
      'national_cup_winner', 'principal', COALESCE(_cup.season_year, EXTRACT(year FROM now())::int)
    );

    -- Notifica
    INSERT INTO user_notifications (user_id, type, title, message, icon, data)
    VALUES (
      _winner.user_id, 'cup_won', '🏆 Campeão da Copa!',
      'Você venceu a ' || _cup.name || ' e garantiu vaga na Continental Principal!',
      '🏆',
      jsonb_build_object('cup_id', _cup_id, 'country', _cup.country)
    );

    -- Prêmio em dinheiro (R$ 15M)
    UPDATE league_members 
    SET budget = budget + 15000000
    WHERE user_id = _winner.user_id;
  END IF;
END;
$$;
