-- 1. Reset everything related to cups
DELETE FROM public.cup_matches;
DELETE FROM public.cup_teams;
DELETE FROM public.cup_competitions;

-- 2. Improved Qualification Logic
CREATE OR REPLACE FUNCTION public.qualify_national_cup_teams(_country text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _teams jsonb := '[]'::jsonb;
  _member RECORD;
  _count int := 0;
BEGIN
  FOR _member IN
    SELECT user_id, name as club_name, logo as club_logo, strength
    FROM world_teams
    WHERE country = _country
    ORDER BY strength DESC
    LIMIT 32
  LOOP
    _teams := _teams || jsonb_build_object(
      'user_id', _member.user_id,
      'club_name', _member.club_name,
      'club_logo', COALESCE(_member.club_logo, '🛡️'),
      'is_bot', (_member.user_id IS NULL),
      'bot_strength', _member.strength
    );
    _count := _count + 1;
  END LOOP;

  WHILE _count < 32 LOOP
    _teams := _teams || jsonb_build_object(
      'user_id', NULL,
      'club_name', 'Bot ' || COALESCE(_country, 'Brasil') || ' ' || (_count + 1),
      'club_logo', '🛡️',
      'is_bot', true,
      'bot_strength', 50 + floor(random() * 15)
    );
    _count := _count + 1;
  END LOOP;

  RETURN _teams;
END;
$$;

-- 3. Redefine start_national_cup
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
  _match_date timestamp with time zone;
BEGIN
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

  INSERT INTO cup_competitions (
    name, cup_type, country, season_year, season_month, format, status, current_round, total_rounds, tier
  ) VALUES (
    _cup_name, 'national', _country, _year, _month, 'knockout', 'in_progress', 1, 5, 'nacional'
  ) RETURNING id INTO _cup_id;

  FOR _team_json IN SELECT jsonb_array_elements(_teams) ORDER BY random()
  LOOP
    INSERT INTO cup_teams (
      cup_id, user_id, is_bot, club_name, club_logo, eliminated, seed, bot_strength
    ) VALUES (
      _cup_id,
      NULLIF(_team_json->>'user_id','')::uuid,
      (_team_json->>'is_bot')::boolean,
      _team_json->>'club_name',
      _team_json->>'club_logo',
      false,
      COALESCE(array_length(_team_ids, 1), 0) + 1,
      (_team_json->>'bot_strength')::int
    ) RETURNING id INTO _new_team_id;
    _team_ids := array_append(_team_ids, _new_team_id);
  END LOOP;

  -- 12:00 BRT = 15:00 UTC
  _match_date := (CURRENT_DATE + time '15:00:00')::timestamp with time zone;

  FOR _i IN 1..16 LOOP
    INSERT INTO cup_matches (
      cup_id, round, leg, home_team_id, away_team_id, scheduled_at, status
    ) VALUES (
      _cup_id, 1, 1, _team_ids[_i*2-1], _team_ids[_i*2], _match_date, 'scheduled'
    );
  END LOOP;
  
  RETURN _cup_id;
END;
$$;

-- 4. Correct advance_world_system_day
CREATE OR REPLACE FUNCTION public.advance_world_system_day()
RETURNS void AS $$
DECLARE
    v_league RECORD;
    v_cup RECORD;
    v_day int := EXTRACT(day FROM now())::int;
BEGIN
    UPDATE world_leagues
    SET current_round = v_day,
        season_month = EXTRACT(month FROM now())::int,
        season_year = EXTRACT(year FROM now())::int
    WHERE active = true;

    IF v_day >= 10 THEN
      FOR v_league IN SELECT DISTINCT country, season_year FROM world_leagues WHERE active = true LOOP
          PERFORM public.start_national_cup(v_league.country, v_league.season_year);
      END LOOP;
    END IF;

    FOR v_cup IN SELECT id FROM cup_competitions WHERE status = 'in_progress' LOOP
        PERFORM public.advance_cup_round(v_cup.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Trigger auto-sim and sync
SELECT public.advance_world_system_day();
