
-- Add season scheduling and league type fields
ALTER TABLE public.multiplayer_leagues 
  ADD COLUMN IF NOT EXISTS league_type text NOT NULL DEFAULT 'main',
  ADD COLUMN IF NOT EXISTS season_start timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS season_end timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_rounds integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS round_interval_hours integer NOT NULL DEFAULT 24;

-- Update auto_assign_league to handle beginner tournament for mid-season joins
CREATE OR REPLACE FUNCTION public.auto_assign_league(_user_id uuid, _club_name text, _country text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _league_id uuid;
  _member_count int;
  _league_number int;
  _code text;
  _has_active_main boolean;
BEGIN
  -- Check if user is already in any league
  SELECT lm.league_id INTO _league_id
  FROM league_members lm
  JOIN multiplayer_leagues ml ON ml.id = lm.league_id
  WHERE lm.user_id = _user_id AND ml.country = _country
  LIMIT 1;

  IF _league_id IS NOT NULL THEN
    RETURN _league_id;
  END IF;

  -- Check if there are active main leagues in progress for this country
  SELECT EXISTS (
    SELECT 1 FROM multiplayer_leagues
    WHERE country = _country AND league_type = 'main' AND season_status = 'in_progress'
  ) INTO _has_active_main;

  IF _has_active_main THEN
    -- Season is running: put player in beginner tournament
    -- Find an open beginner league
    SELECT ml.id INTO _league_id
    FROM multiplayer_leagues ml
    WHERE ml.country = _country
      AND ml.league_type = 'beginner'
      AND ml.auto_created = true
      AND ml.season_status IN ('registration', 'waiting')
      AND (SELECT count(*) FROM league_members lm2 WHERE lm2.league_id = ml.id) < ml.max_members
    ORDER BY ml.created_at ASC
    LIMIT 1;

    IF _league_id IS NULL THEN
      SELECT count(*) INTO _league_number
      FROM multiplayer_leagues
      WHERE country = _country AND league_type = 'beginner' AND auto_created = true;

      _code := upper(substr(md5(random()::text), 1, 6));

      INSERT INTO multiplayer_leagues (name, code, owner_id, country, auto_created, max_members, status, league_type, total_rounds, season_status)
      VALUES (
        _country || ' Torneio Iniciantes ' || (_league_number + 1),
        _code,
        _user_id,
        _country,
        true,
        20,
        'waiting',
        'beginner',
        10,
        'registration'
      )
      RETURNING id INTO _league_id;
    END IF;
  ELSE
    -- No active season: join main league in registration/waiting
    SELECT ml.id INTO _league_id
    FROM multiplayer_leagues ml
    WHERE ml.country = _country
      AND ml.league_type = 'main'
      AND ml.auto_created = true
      AND ml.season_status IN ('registration', 'waiting')
      AND (SELECT count(*) FROM league_members lm2 WHERE lm2.league_id = ml.id) < ml.max_members
    ORDER BY ml.created_at ASC
    LIMIT 1;

    IF _league_id IS NULL THEN
      SELECT count(*) INTO _league_number
      FROM multiplayer_leagues
      WHERE country = _country AND league_type = 'main' AND auto_created = true;

      _code := upper(substr(md5(random()::text), 1, 6));

      INSERT INTO multiplayer_leagues (name, code, owner_id, country, auto_created, max_members, status, league_type, total_rounds, season_status)
      VALUES (
        _country || ' Liga ' || (_league_number + 1),
        _code,
        _user_id,
        _country,
        true,
        20,
        'waiting',
        'main',
        30,
        'registration'
      )
      RETURNING id INTO _league_id;
    END IF;
  END IF;

  -- Add user as member
  INSERT INTO league_members (league_id, user_id, club_name, club_logo)
  VALUES (_league_id, _user_id, _club_name, '⚽')
  ON CONFLICT DO NOTHING;

  RETURN _league_id;
END;
$$;

-- Function to redistribute beginner tournament players to main leagues
CREATE OR REPLACE FUNCTION public.redistribute_beginners(_country text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _beginner_member RECORD;
  _target_league_id uuid;
  _league_number int;
  _code text;
BEGIN
  -- Get all members from finished beginner tournaments for this country
  FOR _beginner_member IN
    SELECT lm.id as member_id, lm.user_id, lm.club_name, lm.club_logo, lm.reputation
    FROM league_members lm
    JOIN multiplayer_leagues ml ON ml.id = lm.league_id
    WHERE ml.country = _country
      AND ml.league_type = 'beginner'
      AND ml.season_status = 'finished'
    ORDER BY lm.reputation DESC
  LOOP
    -- Find open main league with registration
    SELECT ml.id INTO _target_league_id
    FROM multiplayer_leagues ml
    WHERE ml.country = _country
      AND ml.league_type = 'main'
      AND ml.auto_created = true
      AND ml.season_status IN ('registration', 'waiting')
      AND (SELECT count(*) FROM league_members lm2 WHERE lm2.league_id = ml.id) < ml.max_members
    ORDER BY ml.created_at ASC
    LIMIT 1;

    IF _target_league_id IS NULL THEN
      SELECT count(*) INTO _league_number
      FROM multiplayer_leagues
      WHERE country = _country AND league_type = 'main' AND auto_created = true;

      _code := upper(substr(md5(random()::text), 1, 6));

      INSERT INTO multiplayer_leagues (name, code, owner_id, country, auto_created, max_members, status, league_type, total_rounds, season_status)
      VALUES (
        _country || ' Liga ' || (_league_number + 1),
        _code,
        _beginner_member.user_id,
        _country,
        true,
        20,
        'waiting',
        'main',
        30,
        'registration'
      )
      RETURNING id INTO _target_league_id;
    END IF;

    -- Move member to main league
    UPDATE league_members
    SET league_id = _target_league_id, points = 0, wins = 0, draws = 0, losses = 0, goals_for = 0, goals_against = 0, played = 0
    WHERE id = _beginner_member.member_id;
  END LOOP;
END;
$$;

-- Function to end season and redistribute players based on performance
CREATE OR REPLACE FUNCTION public.end_season_redistribute(_league_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _league RECORD;
  _member RECORD;
  _target_league_id uuid;
  _league_number int;
  _code text;
BEGIN
  SELECT * INTO _league FROM multiplayer_leagues WHERE id = _league_id;
  
  IF _league IS NULL OR _league.season_status != 'finished' THEN
    RETURN;
  END IF;

  -- Reset stats and prepare for next season
  UPDATE league_members
  SET points = 0, wins = 0, draws = 0, losses = 0, goals_for = 0, goals_against = 0, played = 0
  WHERE league_id = _league_id;

  -- Delete old matches
  DELETE FROM league_matches WHERE league_id = _league_id;

  -- Update league for next season
  UPDATE multiplayer_leagues
  SET season = season + 1, season_status = 'registration', current_round = 0
  WHERE id = _league_id;
END;
$$;
