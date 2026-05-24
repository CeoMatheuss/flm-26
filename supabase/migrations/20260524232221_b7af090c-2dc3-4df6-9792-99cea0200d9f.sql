-- Update qualify_teams_for_mundial to be explicit about 1st place
CREATE OR REPLACE FUNCTION public.qualify_teams_for_mundial()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Reset previous qualifications
    UPDATE public.world_league_table SET qualified_for_mundial = false;

    -- Qualify Champions of Div 1 from each country
    WITH champions AS (
        SELECT DISTINCT ON (country) 
            team_id
        FROM public.world_league_table
        WHERE position = 1
        ORDER BY country, position
    )
    UPDATE public.world_league_table
    SET qualified_for_mundial = true
    WHERE team_id IN (SELECT team_id FROM champions);

    -- Also qualify top ranking clubs if there are remaining spots (up to 32 total for the tournament)
    WITH top_ranking AS (
        SELECT id as team_id
        FROM public.world_teams
        WHERE id NOT IN (SELECT team_id FROM public.world_league_table WHERE qualified_for_mundial = true)
        ORDER BY strength DESC
        LIMIT 10 
    )
    UPDATE public.world_league_table
    SET qualified_for_mundial = true
    WHERE team_id IN (SELECT team_id FROM top_ranking);
END;
$function$;

-- Update qualify_continental_humans to use positions 2nd to 8th
CREATE OR REPLACE FUNCTION public.qualify_continental_humans(_continent text, _tier text, _season integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
BEGIN
  -- Define faixa de posições por tier
  -- 2º ao 8º pegam Libertadores (Principal)
  -- Secundária removida (retire os subs continentais)
  IF _tier = 'principal' THEN
    _start_pos := 2; _end_pos := 8;
  ELSE
    RETURN '[]'::jsonb;
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
      IF _member.club_name = ANY(_seen_clubs) THEN
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
  END LOOP;

  RETURN _result;
END;
$function$;

-- Adjust start_continental_tournament to use 32 teams for the main tier
CREATE OR REPLACE FUNCTION public.start_continental_tournament(_continent text, _tier text, _season integer DEFAULT 1, _start_date date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _comp_id uuid;
  _qualified jsonb;
  _target_size int;
  _num_groups int;
  _teams_per_group int;
  _team_record RECORD;
  _team_id uuid;
  _team_ids uuid[] := ARRAY[]::uuid[];
  _i int;
  _bot_idx int := 0;
  _bot_name text;
  _start date := COALESCE(_start_date, CURRENT_DATE);
  _bot_country text;
BEGIN
  -- Se não for tier principal, ignora (subs removidos)
  IF _tier != 'principal' THEN
    RETURN NULL;
  END IF;

  -- Alvo agora é 32 times para acomodar G2-G8 de múltiplos países
  _target_size := 32;
  _num_groups := 8;
  _teams_per_group := 4;

  -- Cria/recupera competição
  INSERT INTO continental_competitions (continent, tier, season, status, total_teams, num_groups, start_date, season_year)
  VALUES (
    _continent, _tier, _season, 'in_progress',
    _target_size, _num_groups, _start, EXTRACT(YEAR FROM _start)::int
  )
  ON CONFLICT (continent, tier, season) DO UPDATE
    SET status = 'in_progress', start_date = EXCLUDED.start_date, total_teams = EXCLUDED.total_teams, num_groups = EXCLUDED.num_groups
  RETURNING id INTO _comp_id;

  -- Limpa registros anteriores
  DELETE FROM continental_matches WHERE competition_id = _comp_id;
  DELETE FROM continental_teams WHERE competition_id = _comp_id;

  -- Qualifica humanos (G2 ao G8)
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

  -- Completa com bots
  WHILE array_length(_team_ids, 1) IS NULL OR array_length(_team_ids, 1) < _target_size LOOP
    _bot_idx := _bot_idx + 1;
    SELECT country INTO _bot_country FROM multiplayer_leagues
    WHERE public.get_continent_for_country(country) = _continent
    ORDER BY random() LIMIT 1;
    _bot_country := COALESCE(_bot_country, 'Brasil');
    _bot_name := public.generate_bot_club_name(_bot_country, _bot_idx + 100);

    INSERT INTO continental_teams (
      competition_id, user_id, is_bot, club_name, club_logo, country, source, bot_strength
    ) VALUES (
      _comp_id, NULL, true, _bot_name, '🤖', _bot_country, 'bot_filler', 70 + (random() * 15)::int
    ) RETURNING id INTO _team_id;
    _team_ids := _team_ids || _team_id;
  END LOOP;

  -- Gera partidas (reutilizando lógica existente simplificada aqui)
  PERFORM public.generate_continental_matches(_comp_id);

  RETURN _comp_id;
END;
$function$;