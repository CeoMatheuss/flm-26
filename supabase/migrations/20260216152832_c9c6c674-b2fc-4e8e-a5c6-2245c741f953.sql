CREATE OR REPLACE FUNCTION public.auto_assign_league(_user_id uuid, _club_name text, _country text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _league_id uuid;
  _member_count int;
  _league_number int;
  _max_division int;
  _code text;
  _has_active_main boolean;
BEGIN
  -- Check if user is already in any league of this country
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
    -- Prioritize highest division number (lowest tier) that has space
    SELECT ml.id INTO _league_id
    FROM multiplayer_leagues ml
    WHERE ml.country = _country
      AND ml.league_type = 'main'
      AND ml.auto_created = true
      AND ml.season_status IN ('registration', 'waiting')
      AND (SELECT count(*) FROM league_members lm2 WHERE lm2.league_id = ml.id) < ml.max_members
    ORDER BY ml.division DESC, ml.created_at ASC
    LIMIT 1;

    IF _league_id IS NULL THEN
      -- Find max division to create next tier
      SELECT COALESCE(max(division), 0) INTO _max_division
      FROM multiplayer_leagues
      WHERE country = _country AND league_type = 'main' AND auto_created = true;

      _league_number := _max_division + 1;
      _code := upper(substr(md5(random()::text), 1, 6));

      INSERT INTO multiplayer_leagues (name, code, owner_id, country, auto_created, max_members, status, league_type, total_rounds, season_status, division)
      VALUES (
        _country || ' Liga ' || _league_number,
        _code,
        _user_id,
        _country,
        true,
        20,
        'waiting',
        'main',
        30,
        'registration',
        _league_number
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
$function$;
