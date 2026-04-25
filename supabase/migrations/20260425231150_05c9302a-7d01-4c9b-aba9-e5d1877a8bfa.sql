
-- ============================================================================
-- FASE 3: Sistema Continental para Jogadores Humanos
-- ============================================================================

-- 1) Tabela principal de competições continentais
CREATE TABLE IF NOT EXISTS public.continental_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  continent text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('principal', 'secundaria')),
  season integer NOT NULL DEFAULT 1,
  season_year integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'registration', 'in_progress', 'finished', 'cancelled')),
  current_stage text DEFAULT 'group',
  current_round integer DEFAULT 0,
  total_teams integer DEFAULT 16,
  num_groups integer DEFAULT 4,
  start_date date,
  end_date date,
  champion_team_id uuid,
  runner_up_team_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(continent, tier, season)
);

ALTER TABLE public.continental_competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view continental competitions"
  ON public.continental_competitions FOR SELECT
  USING (true);

CREATE POLICY "Admins manage continental competitions"
  ON public.continental_competitions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_cont_comp_continent ON public.continental_competitions(continent, tier);
CREATE INDEX idx_cont_comp_status ON public.continental_competitions(status);

-- 2) Times inscritos
CREATE TABLE IF NOT EXISTS public.continental_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.continental_competitions(id) ON DELETE CASCADE,
  user_id uuid,
  is_bot boolean NOT NULL DEFAULT false,
  club_name text NOT NULL,
  club_logo text,
  country text NOT NULL,
  source text NOT NULL,
  group_label text,
  seed integer,
  group_points integer NOT NULL DEFAULT 0,
  group_wins integer NOT NULL DEFAULT 0,
  group_draws integer NOT NULL DEFAULT 0,
  group_losses integer NOT NULL DEFAULT 0,
  group_goals_for integer NOT NULL DEFAULT 0,
  group_goals_against integer NOT NULL DEFAULT 0,
  eliminated boolean NOT NULL DEFAULT false,
  eliminated_in_stage text,
  bot_strength integer DEFAULT 70,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.continental_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view continental teams"
  ON public.continental_teams FOR SELECT
  USING (true);

CREATE POLICY "Admins manage continental teams"
  ON public.continental_teams FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_cont_teams_comp ON public.continental_teams(competition_id);
CREATE INDEX idx_cont_teams_user ON public.continental_teams(user_id);
CREATE INDEX idx_cont_teams_group ON public.continental_teams(competition_id, group_label);

-- 3) Partidas
CREATE TABLE IF NOT EXISTS public.continental_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.continental_competitions(id) ON DELETE CASCADE,
  stage text NOT NULL,
  round integer NOT NULL DEFAULT 1,
  leg integer NOT NULL DEFAULT 1,
  group_label text,
  home_team_id uuid REFERENCES public.continental_teams(id) ON DELETE CASCADE,
  away_team_id uuid REFERENCES public.continental_teams(id) ON DELETE CASCADE,
  home_goals integer,
  away_goals integer,
  home_goals_pen integer,
  away_goals_pen integer,
  aggregate_home integer,
  aggregate_away integer,
  scheduled_at timestamptz NOT NULL,
  played_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'played', 'cancelled')),
  match_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.continental_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view continental matches"
  ON public.continental_matches FOR SELECT
  USING (true);

CREATE POLICY "Admins manage continental matches"
  ON public.continental_matches FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_cont_matches_comp ON public.continental_matches(competition_id);
CREATE INDEX idx_cont_matches_stage ON public.continental_matches(competition_id, stage, round);
CREATE INDEX idx_cont_matches_scheduled ON public.continental_matches(scheduled_at);

-- 4) Trigger updated_at
CREATE TRIGGER update_continental_competitions_updated_at
  BEFORE UPDATE ON public.continental_competitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Mapa país → continente (helper imutável)
CREATE OR REPLACE FUNCTION public.get_continent_for_country(_country text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE _country
    WHEN 'Brasil' THEN 'América do Sul'
    WHEN 'Argentina' THEN 'América do Sul'
    WHEN 'Chile' THEN 'América do Sul'
    WHEN 'Colômbia' THEN 'América do Sul'
    WHEN 'Uruguai' THEN 'América do Sul'
    WHEN 'Peru' THEN 'América do Sul'
    WHEN 'Equador' THEN 'América do Sul'
    WHEN 'Paraguai' THEN 'América do Sul'
    WHEN 'Bolívia' THEN 'América do Sul'
    WHEN 'Venezuela' THEN 'América do Sul'
    WHEN 'Espanha' THEN 'Europa'
    WHEN 'Inglaterra' THEN 'Europa'
    WHEN 'Itália' THEN 'Europa'
    WHEN 'Alemanha' THEN 'Europa'
    WHEN 'França' THEN 'Europa'
    WHEN 'Portugal' THEN 'Europa'
    WHEN 'Holanda' THEN 'Europa'
    WHEN 'Bélgica' THEN 'Europa'
    WHEN 'Áustria' THEN 'Europa'
    WHEN 'Suíça' THEN 'Europa'
    WHEN 'Dinamarca' THEN 'Europa'
    WHEN 'Suécia' THEN 'Europa'
    WHEN 'Noruega' THEN 'Europa'
    WHEN 'Rússia' THEN 'Europa'
    WHEN 'Turquia' THEN 'Europa'
    WHEN 'México' THEN 'América do Norte'
    WHEN 'Estados Unidos' THEN 'América do Norte'
    WHEN 'Canadá' THEN 'América do Norte'
    WHEN 'Egito' THEN 'África'
    WHEN 'Marrocos' THEN 'África'
    WHEN 'Nigéria' THEN 'África'
    WHEN 'África do Sul' THEN 'África'
    WHEN 'Japão' THEN 'Ásia'
    WHEN 'Coreia do Sul' THEN 'Ásia'
    WHEN 'China' THEN 'Ásia'
    WHEN 'Arábia Saudita' THEN 'Ásia'
    WHEN 'Índia' THEN 'Ásia'
    WHEN 'Austrália' THEN 'Oceania'
    WHEN 'Nova Zelândia' THEN 'Oceania'
    ELSE NULL
  END;
$$;

-- 6) Função: monta qualificados (humanos) de um continente
CREATE OR REPLACE FUNCTION public.qualify_continental_humans(_continent text, _tier text, _season integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb := '[]'::jsonb;
  _country text;
  _league_id uuid;
  _member RECORD;
  _position int;
  _added int;
  _seen_users uuid[] := ARRAY[]::uuid[];
  _seen_clubs text[] := ARRAY[]::text[];
  _start_pos int;
  _end_pos int;
  _cup_winner RECORD;
  _previously_qualified_clubs text[] := ARRAY[]::text[];
BEGIN
  -- Para Secundária, não duplicar clubes já na Principal da mesma temporada
  IF _tier = 'secundaria' THEN
    SELECT array_agg(DISTINCT ct.club_name) INTO _previously_qualified_clubs
    FROM continental_teams ct
    JOIN continental_competitions cc ON cc.id = ct.competition_id
    WHERE cc.continent = _continent
      AND cc.tier = 'principal'
      AND cc.season = _season;
    _previously_qualified_clubs := COALESCE(_previously_qualified_clubs, ARRAY[]::text[]);
  END IF;

  -- Define faixa de posições por tier
  IF _tier = 'principal' THEN
    _start_pos := 1; _end_pos := 4;
  ELSE
    _start_pos := 5; _end_pos := 8;
  END IF;

  -- Itera países do continente
  FOR _country IN
    SELECT DISTINCT country FROM multiplayer_leagues
    WHERE tier = 'nacional' AND division = 1
      AND public.get_continent_for_country(country) = _continent
  LOOP
    SELECT id INTO _league_id
    FROM multiplayer_leagues
    WHERE country = _country AND tier = 'nacional' AND division = 1
      AND auto_created = true
    ORDER BY created_at ASC LIMIT 1;
    
    IF _league_id IS NULL THEN CONTINUE; END IF;
    
    _position := 0;
    _added := 0;

    FOR _member IN
      SELECT user_id, club_name, club_logo
      FROM league_members
      WHERE league_id = _league_id AND user_id IS NOT NULL
      ORDER BY points DESC, (goals_for - goals_against) DESC, goals_for DESC
      LIMIT _end_pos
    LOOP
      _position := _position + 1;
      IF _position < _start_pos THEN CONTINUE; END IF;

      -- Skip duplicados
      IF _member.club_name = ANY(_seen_clubs) 
         OR _member.club_name = ANY(_previously_qualified_clubs) THEN
        CONTINUE;
      END IF;

      _result := _result || jsonb_build_object(
        'user_id', _member.user_id,
        'club_name', _member.club_name,
        'club_logo', COALESCE(_member.club_logo, '⚽'),
        'country', _country,
        'source', 'league_pos_' || _position,
        'is_bot', false
      );
      _seen_clubs := _seen_clubs || _member.club_name;
      _seen_users := _seen_users || _member.user_id;
      _added := _added + 1;
    END LOOP;

    -- Para Principal: adiciona campeão da copa nacional do país
    IF _tier = 'principal' THEN
      SELECT ct.user_id, ct.club_name, ct.club_logo, ct.is_bot
      INTO _cup_winner
      FROM cup_competitions cc
      JOIN cup_teams ct ON ct.cup_id = cc.id
      WHERE cc.country = _country
        AND cc.cup_type = 'national'
        AND cc.status = 'finished'
        AND ct.eliminated = false
      ORDER BY cc.season_year DESC NULLS LAST, cc.created_at DESC
      LIMIT 1;
      
      IF FOUND AND NOT (_cup_winner.club_name = ANY(_seen_clubs)) THEN
        _result := _result || jsonb_build_object(
          'user_id', _cup_winner.user_id,
          'club_name', _cup_winner.club_name,
          'club_logo', COALESCE(_cup_winner.club_logo, '🏆'),
          'country', _country,
          'source', 'national_cup_winner',
          'is_bot', COALESCE(_cup_winner.is_bot, false)
        );
        _seen_clubs := _seen_clubs || _cup_winner.club_name;
      END IF;
    END IF;
  END LOOP;

  RETURN _result;
END;
$$;

-- 7) Função: cria competição continental + inscreve clubes + agenda jogos
CREATE OR REPLACE FUNCTION public.start_continental_tournament(
  _continent text,
  _tier text,
  _season integer DEFAULT 1,
  _start_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _comp_id uuid;
  _qualified jsonb;
  _target_size int;
  _num_groups int;
  _teams_per_group int;
  _team_record RECORD;
  _team_id uuid;
  _team_ids uuid[] := ARRAY[]::uuid[];
  _group_team_ids uuid[];
  _i int;
  _group_idx int;
  _group_label text;
  _bot_idx int := 0;
  _bot_name text;
  _start date := COALESCE(_start_date, CURRENT_DATE);
  _day_offset int;
  _round_in_group int;
  _idx_a int;
  _idx_b int;
  _scheduled_ts timestamptz;
  _matches_to_insert jsonb := '[]'::jsonb;
  _bot_country text;
BEGIN
  -- Cria/recupera competição
  INSERT INTO continental_competitions (continent, tier, season, status, total_teams, num_groups, start_date, season_year)
  VALUES (
    _continent, _tier, _season, 'in_progress',
    CASE WHEN _tier = 'principal' THEN 16 ELSE 8 END,
    CASE WHEN _tier = 'principal' THEN 4 ELSE 2 END,
    _start, EXTRACT(YEAR FROM _start)::int
  )
  ON CONFLICT (continent, tier, season) DO UPDATE
    SET status = 'in_progress', start_date = EXCLUDED.start_date
  RETURNING id INTO _comp_id;

  -- Limpa registros anteriores (re-execução segura)
  DELETE FROM continental_matches WHERE competition_id = _comp_id;
  DELETE FROM continental_teams WHERE competition_id = _comp_id;

  _target_size := CASE WHEN _tier = 'principal' THEN 16 ELSE 8 END;
  _num_groups := CASE WHEN _tier = 'principal' THEN 4 ELSE 2 END;
  _teams_per_group := _target_size / _num_groups;

  -- Qualifica humanos
  _qualified := public.qualify_continental_humans(_continent, _tier, _season);

  -- Insere humanos
  FOR _team_record IN SELECT * FROM jsonb_array_elements(_qualified)
  LOOP
    INSERT INTO continental_teams (
      competition_id, user_id, is_bot, club_name, club_logo, country, source, bot_strength
    ) VALUES (
      _comp_id,
      NULLIF(_team_record.value->>'user_id','')::uuid,
      COALESCE((_team_record.value->>'is_bot')::boolean, false),
      _team_record.value->>'club_name',
      _team_record.value->>'club_logo',
      _team_record.value->>'country',
      _team_record.value->>'source',
      75
    ) RETURNING id INTO _team_id;
    _team_ids := _team_ids || _team_id;
  END LOOP;

  -- Completa com bots se necessário
  WHILE array_length(_team_ids, 1) IS NULL OR array_length(_team_ids, 1) < _target_size LOOP
    _bot_idx := _bot_idx + 1;
    -- Escolhe um país aleatório do continente para o bot
    SELECT country INTO _bot_country FROM multiplayer_leagues
    WHERE public.get_continent_for_country(country) = _continent
    ORDER BY random() LIMIT 1;
    _bot_country := COALESCE(_bot_country, 'Brasil');
    _bot_name := public.generate_bot_club_name(_bot_country, _bot_idx + 100);

    INSERT INTO continental_teams (
      competition_id, user_id, is_bot, club_name, club_logo, country, source, bot_strength
    ) VALUES (
      _comp_id, NULL, true,
      _bot_name || ' BOT', public.random_bot_logo(),
      _bot_country, 'bot_filler',
      CASE WHEN _tier = 'principal' THEN 75 + floor(random()*10)::int ELSE 65 + floor(random()*10)::int END
    ) RETURNING id INTO _team_id;
    _team_ids := _team_ids || _team_id;
  END LOOP;

  -- Embaralha (Fisher-Yates simples)
  FOR _i IN REVERSE array_length(_team_ids,1)..2 LOOP
    _idx_a := _i;
    _idx_b := 1 + floor(random() * _i)::int;
    IF _idx_a <> _idx_b THEN
      _team_id := _team_ids[_idx_a];
      _team_ids[_idx_a] := _team_ids[_idx_b];
      _team_ids[_idx_b] := _team_id;
    END IF;
  END LOOP;

  -- Distribui em grupos e atribui group_label
  FOR _i IN 1.._target_size LOOP
    _group_idx := ((_i - 1) / _teams_per_group);
    _group_label := chr(65 + _group_idx);
    UPDATE continental_teams 
      SET group_label = _group_label, seed = _i
      WHERE id = _team_ids[_i];
  END LOOP;

  -- Agenda fase de grupos:
  --   Principal (4 grupos × 4 times = 6 partidas/grupo): 
  --     dia 15-20 (6 dias) — distribuir as rodadas (3 rodadas naturais)
  --   Secundária (2 grupos × 4 times): mesmo, mas menos jogos
  -- Para 4 times, round-robin gera 3 rodadas (3 jogos por rodada). Vamos espalhar as 3 rodadas
  -- nos dias 0,2,4 (relativos ao _start = dia 15) → cabe em dia 15, 17, 19 com folga.
  -- Para garantir "todo dia", também duplicamos para ida/volta? NÃO — manteremos jogo único na fase de grupos.

  FOR _group_idx IN 0.._num_groups - 1 LOOP
    _group_label := chr(65 + _group_idx);
    SELECT array_agg(id ORDER BY seed) INTO _group_team_ids
    FROM continental_teams 
    WHERE competition_id = _comp_id AND group_label = _group_label;

    -- 4 times → 3 rodadas: (1v4,2v3) (1v3,2v4) (1v2,3v4)
    FOR _round_in_group IN 1..3 LOOP
      _day_offset := (_round_in_group - 1) * 2; -- dias 0,2,4 → 15,17,19 BRT
      _scheduled_ts := ((_start + _day_offset)::text || ' 20:00:00 America/Sao_Paulo')::timestamptz;
      
      IF _round_in_group = 1 THEN
        -- 1v4, 2v3
        INSERT INTO continental_matches (competition_id, stage, round, group_label, home_team_id, away_team_id, scheduled_at)
        VALUES 
          (_comp_id, 'group', 1, _group_label, _group_team_ids[1], _group_team_ids[4], _scheduled_ts),
          (_comp_id, 'group', 1, _group_label, _group_team_ids[2], _group_team_ids[3], _scheduled_ts);
      ELSIF _round_in_group = 2 THEN
        INSERT INTO continental_matches (competition_id, stage, round, group_label, home_team_id, away_team_id, scheduled_at)
        VALUES 
          (_comp_id, 'group', 2, _group_label, _group_team_ids[1], _group_team_ids[3], _scheduled_ts),
          (_comp_id, 'group', 2, _group_label, _group_team_ids[4], _group_team_ids[2], _scheduled_ts);
      ELSE
        INSERT INTO continental_matches (competition_id, stage, round, group_label, home_team_id, away_team_id, scheduled_at)
        VALUES 
          (_comp_id, 'group', 3, _group_label, _group_team_ids[1], _group_team_ids[2], _scheduled_ts),
          (_comp_id, 'group', 3, _group_label, _group_team_ids[3], _group_team_ids[4], _scheduled_ts);
      END IF;
    END LOOP;
  END LOOP;

  -- Mata-mata (placeholders agendados; chaves serão preenchidas pelo advancer ao fim dos grupos)
  -- Principal: oitavas (8 jogos) dia 21 → mas 16 times geram 8 oitavas? Não — 16 times = 8 oitavas.
  -- Espec do usuário: D21 oitavas, D22 quartas, D23 semi, D24 final.
  -- Para Secundária (8 times) começamos direto em quartas no dia 22.
  -- Aqui apenas registramos a janela; o advancer cria os pares quando souber os classificados.

  -- Atualiza end_date estimada
  UPDATE continental_competitions 
    SET end_date = _start + 9
    WHERE id = _comp_id;

  RETURN _comp_id;
END;
$$;
