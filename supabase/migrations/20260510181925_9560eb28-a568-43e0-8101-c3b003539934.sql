-- 1. Real Names Mapping for Cups
CREATE OR REPLACE FUNCTION get_national_cup_name(p_country text)
RETURNS text AS $$
BEGIN
    RETURN CASE p_country
        WHEN 'Brasil' THEN 'Copa do Brasil'
        WHEN 'Inglaterra' THEN 'FA Cup'
        WHEN 'Espanha' THEN 'Copa del Rey'
        WHEN 'Itália' THEN 'Coppa Italia'
        WHEN 'Alemanha' THEN 'DFB Pokal'
        WHEN 'França' THEN 'Coupe de France'
        WHEN 'Portugal' THEN 'Taça de Portugal'
        WHEN 'Argentina' THEN 'Copa Argentina'
        WHEN 'Uruguai' THEN 'Copa Uruguay'
        WHEN 'Holanda' THEN 'KNVB Beker'
        WHEN 'Bélgica' THEN 'Belgian Cup'
        WHEN 'Turquia' THEN 'Türkiye Kupası'
        WHEN 'Catar' THEN 'Emir Cup'
        WHEN 'Arábia Saudita' THEN 'King Cup'
        WHEN 'Estados Unidos' THEN 'US Open Cup'
        ELSE 'Copa do ' || COALESCE(p_country, 'País')
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Update Qualification Logic to use world_leagues (D1 and D2)
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
  -- Top 20 from Division 1
  SELECT id INTO _league_id
  FROM world_leagues
  WHERE country = _country AND division_level = 1 AND active = true
  LIMIT 1;

  IF _league_id IS NOT NULL THEN
    FOR _member IN
      SELECT user_id, name as club_name, logo as club_logo
      FROM world_teams
      WHERE league_id = _league_id
      ORDER BY strength DESC
      LIMIT 20
    LOOP
      _teams := _teams || jsonb_build_object(
        'user_id', _member.user_id,
        'club_name', _member.club_name,
        'club_logo', COALESCE(_member.club_logo, '⚽'),
        'is_bot', COALESCE(_member.user_id IS NULL, true)
      );
      _seen_clubs := _seen_clubs || _member.club_name;
      _count := _count + 1;
    END LOOP;
  END IF;

  -- Top 12 from Division 2
  SELECT id INTO _league_id
  FROM world_leagues
  WHERE country = _country AND division_level = 2 AND active = true
  LIMIT 1;

  IF _league_id IS NOT NULL THEN
    FOR _member IN
      SELECT user_id, name as club_name, logo as club_logo
      FROM world_teams
      WHERE league_id = _league_id
        AND NOT (name = ANY(_seen_clubs))
      ORDER BY strength DESC
      LIMIT 12
    LOOP
      _teams := _teams || jsonb_build_object(
        'user_id', _member.user_id,
        'club_name', _member.club_name,
        'club_logo', COALESCE(_member.club_logo, '⚽'),
        'is_bot', COALESCE(_member.user_id IS NULL, true)
      );
      _count := _count + 1;
    END LOOP;
  END IF;

  -- Fill with bots if needed to reach 32
  WHILE _count < 32 LOOP
    _teams := _teams || jsonb_build_object(
      'user_id', NULL,
      'club_name', 'Bot Cup ' || COALESCE(_country, 'Global') || ' ' || (_count + 1),
      'club_logo', '🏆',
      'is_bot', true
    );
    _count := _count + 1;
  END LOOP;

  RETURN _teams;
END;
$$;

-- 3. Unified Start National Cup with Monthly/Yearly Support
CREATE OR REPLACE FUNCTION public.start_national_cup(_country text, _season_year int)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cup_id uuid;
  _teams jsonb;
  _team_json jsonb;
  _team_ids uuid[] := ARRAY[]::uuid[];
  _new_team_id uuid;
  _i int;
  _cup_name text;
  _year int := COALESCE(_season_year, EXTRACT(year FROM now())::int);
  _month int := EXTRACT(month FROM now());
BEGIN
  -- Prevent duplicates for same month/year
  IF EXISTS (
    SELECT 1 FROM cup_competitions 
    WHERE country = _country AND cup_type = 'national' 
      AND season_year = _year AND season_month = _month
      AND status IN ('scheduled','in_progress')
  ) THEN
    RETURN NULL;
  END IF;

  _teams := qualify_national_cup_teams(_country);
  _cup_name := get_national_cup_name(_country);

  -- Create Cup
  INSERT INTO cup_competitions (
    name, cup_type, country, season_year, season_month, format, status, current_round, total_rounds, tier
  ) VALUES (
    _cup_name, 'national', _country, _year, _month, 'knockout', 'in_progress', 1, 5, 'nacional'
  ) RETURNING id INTO _cup_id;

  -- Insert Teams (Random Seed)
  FOR _team_json IN SELECT jsonb_array_elements(_teams) ORDER BY random()
  LOOP
    INSERT INTO cup_teams (
      cup_id, user_id, is_bot, club_name, club_logo, eliminated, seed
    ) VALUES (
      _cup_id,
      NULLIF(_team_json->>'user_id','')::uuid,
      (_team_json->>'is_bot')::boolean,
      _team_json->>'club_name',
      _team_json->>'club_logo',
      false,
      array_length(_team_ids, 1) + 1
    ) RETURNING id INTO _new_team_id;
    _team_ids := array_append(_team_ids, _new_team_id);
  END LOOP;

  -- Create First Round (R32 - 16 matches)
  FOR _i IN 1..16 LOOP
    INSERT INTO cup_matches (
      cup_id, round, leg, home_team_id, away_team_id, scheduled_at, status
    ) VALUES (
      _cup_id, 1, 1, _team_ids[_i*2-1], _team_ids[_i*2], now(), 'scheduled'
    );
  END LOOP;

  -- Notifications (with COALESCE to avoid NULL text)
  INSERT INTO newspaper_entries (user_id, text, category, is_event)
  SELECT DISTINCT user_id, '🏆 A ' || _cup_name || ' ' || _year || ' começou! Os confrontos da 1ª fase já foram sorteados.', 'COMPETIÇÃO', true
  FROM world_teams
  WHERE country = _country AND user_id IS NOT NULL;
  
  RETURN _cup_id;
END;
$$;

-- 4. Global Daily Sync and Cup Trigger
CREATE OR REPLACE FUNCTION public.advance_world_system_day()
RETURNS void AS $$
DECLARE
    v_league RECORD;
BEGIN
    -- 1. Advance League Rounds based on date
    -- Rule: 1 matchday per day. Season starts 1st day of month.
    UPDATE world_leagues
    SET current_round = GREATEST(1, LEAST(38, EXTRACT(day FROM now())::int)),
        season_month = COALESCE(season_month, EXTRACT(month FROM now())::int),
        season_year = COALESCE(season_year, EXTRACT(year FROM now())::int)
    WHERE active = true;

    -- 2. Trigger National Cups at Day 10
    FOR v_league IN 
        SELECT DISTINCT country, season_year, current_round
        FROM world_leagues 
        WHERE active = true AND current_round >= 10
    LOOP
        PERFORM public.start_national_cup(v_league.country, v_league.season_year);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize
SELECT public.advance_world_system_day();
