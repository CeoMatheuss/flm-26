-- Update auto_assign_league to support 30 teams per league and 4 divisions (A, B, C, D)
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
  _division_names text[] := ARRAY['Série A', 'Série B', 'Série C', 'Série D'];
  _div_name text;
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
        30,
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
      -- Find max division to create next tier (max 4 divisions)
      SELECT COALESCE(max(division), 0) INTO _max_division
      FROM multiplayer_leagues
      WHERE country = _country AND league_type = 'main' AND auto_created = true;

      _league_number := LEAST(_max_division + 1, 4);
      _div_name := _division_names[_league_number];
      _code := upper(substr(md5(random()::text), 1, 6));

      INSERT INTO multiplayer_leagues (name, code, owner_id, country, auto_created, max_members, status, league_type, total_rounds, season_status, division)
      VALUES (
        _country || ' ' || _div_name,
        _code,
        _user_id,
        _country,
        true,
        30,
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

-- Update process_season_transition to use 30 teams and 4 max divisions
CREATE OR REPLACE FUNCTION public.process_season_transition(_country text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _player RECORD;
  _current_league_id uuid;
  _current_division int := 1;
  _member_count int := 0;
  _league_name text;
  _league_id uuid;
  _code text;
  _reward bigint;
  _position int;
  _division_names text[] := ARRAY['Série A', 'Série B', 'Série C', 'Série D'];
BEGIN
  -- 1. First, redistribute beginner graduates
  PERFORM public.redistribute_beginners(_country);

  -- 2. Collect ALL players from main auto-created leagues in the country
  _position := 1;
  FOR _player IN 
    SELECT 
      lm.id as member_db_id,
      lm.user_id, 
      lm.club_name, 
      lm.club_logo,
      ml.id as old_league_id,
      ml.division as old_division,
      lm.points,
      (lm.goals_for - lm.goals_against) as gd,
      lm.goals_for as gs,
      ml.season as finished_season
    FROM league_members lm
    JOIN multiplayer_leagues ml ON ml.id = lm.league_id
    WHERE ml.country = _country 
      AND ml.league_type = 'main' 
      AND ml.auto_created = true
      AND ml.season_status = 'finished'
    ORDER BY 
      ml.division ASC,
      lm.points DESC, 
      (lm.goals_for - lm.goals_against) DESC, 
      lm.goals_for DESC
  LOOP
    -- Reward based on division and position (30 teams per division)
    _reward := CASE 
      WHEN _player.old_division = 1 THEN 
        CASE 
          WHEN ((_position - 1) % 30) = 0 THEN 50000000
          WHEN ((_position - 1) % 30) = 1 THEN 30000000
          WHEN ((_position - 1) % 30) = 2 THEN 20000000
          WHEN ((_position - 1) % 30) BETWEEN 3 AND 9 THEN 10000000
          ELSE 5000000
        END
      WHEN _player.old_division = 2 THEN
        CASE 
          WHEN ((_position - 1) % 30) = 0 THEN 20000000
          WHEN ((_position - 1) % 30) = 1 THEN 15000000
          WHEN ((_position - 1) % 30) = 2 THEN 10000000
          WHEN ((_position - 1) % 30) BETWEEN 3 AND 9 THEN 5000000
          ELSE 2000000
        END
      WHEN _player.old_division = 3 THEN
        CASE 
          WHEN ((_position - 1) % 30) = 0 THEN 10000000
          WHEN ((_position - 1) % 30) = 1 THEN 7000000
          WHEN ((_position - 1) % 30) = 2 THEN 5000000
          ELSE 1000000
        END
      ELSE -- Div 4
        CASE 
          WHEN ((_position - 1) % 30) = 0 THEN 5000000
          WHEN ((_position - 1) % 30) = 1 THEN 3000000
          WHEN ((_position - 1) % 30) = 2 THEN 2000000
          ELSE 500000
        END
    END;

    -- Record the award
    INSERT INTO public.league_awards (league_id, user_id, season, award_type, value, player_name)
    VALUES (_player.old_league_id, _player.user_id, _player.finished_season, 'Premiação de Temporada', _reward, _player.club_name);

    -- Update player's budget
    UPDATE league_members SET budget = budget + _reward WHERE id = _player.member_db_id;

    -- New division assignment (30 per division, max 4 divisions)
    IF _member_count = 0 OR _member_count >= 30 THEN
      _current_division := LEAST((_position - 1) / 30 + 1, 4);
      _league_name := _country || ' ' || _division_names[_current_division];
      
      SELECT id INTO _league_id 
      FROM multiplayer_leagues 
      WHERE name = _league_name 
        AND country = _country 
        AND auto_created = true 
        AND league_type = 'main'
      LIMIT 1;
      
      IF _league_id IS NULL THEN
        _code := upper(substr(md5(random()::text), 1, 6));
        INSERT INTO multiplayer_leagues (name, code, owner_id, country, auto_created, max_members, status, league_type, total_rounds, season_status, division)
        VALUES (_league_name, _code, _player.user_id, _country, true, 30, 'waiting', 'main', 30, 'registration', _current_division)
        RETURNING id INTO _league_id;
      ELSE
        UPDATE multiplayer_leagues 
        SET season = season + 1, season_status = 'registration', current_round = 0,
            division = _current_division, owner_id = _player.user_id
        WHERE id = _league_id;
        DELETE FROM league_matches WHERE league_id = _league_id;
      END IF;
      
      _current_league_id := _league_id;
      _member_count := 0;
    END IF;

    UPDATE league_members 
    SET league_id = _current_league_id,
      points = 0, wins = 0, draws = 0, losses = 0, goals_for = 0, goals_against = 0, played = 0
    WHERE user_id = _player.user_id 
      AND league_id IN (SELECT id FROM multiplayer_leagues WHERE country = _country AND league_type = 'main');
    
    _member_count := _member_count + 1;
    _position := _position + 1;
  END LOOP;
END;
$function$;

-- Update redistribute_beginners for 30-member leagues
CREATE OR REPLACE FUNCTION public.redistribute_beginners(_country text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _beginner_member RECORD;
  _target_league_id uuid;
  _max_division int;
  _league_number int;
  _code text;
  _division_names text[] := ARRAY['Série A', 'Série B', 'Série C', 'Série D'];
BEGIN
  FOR _beginner_member IN
    SELECT lm.id as member_id, lm.user_id, lm.club_name, lm.club_logo, lm.reputation
    FROM league_members lm
    JOIN multiplayer_leagues ml ON ml.id = lm.league_id
    WHERE ml.country = _country
      AND ml.league_type = 'beginner'
      AND ml.season_status = 'finished'
    ORDER BY lm.reputation DESC
  LOOP
    -- Find lowest tier main league with space
    SELECT ml.id INTO _target_league_id
    FROM multiplayer_leagues ml
    WHERE ml.country = _country
      AND ml.league_type = 'main'
      AND ml.auto_created = true
      AND ml.season_status IN ('registration', 'waiting')
      AND (SELECT count(*) FROM league_members lm2 WHERE lm2.league_id = ml.id) < ml.max_members
    ORDER BY ml.division DESC, ml.created_at ASC
    LIMIT 1;

    IF _target_league_id IS NULL THEN
      SELECT COALESCE(max(division), 0) INTO _max_division
      FROM multiplayer_leagues
      WHERE country = _country AND league_type = 'main' AND auto_created = true;

      _league_number := LEAST(_max_division + 1, 4);
      _code := upper(substr(md5(random()::text), 1, 6));

      INSERT INTO multiplayer_leagues (name, code, owner_id, country, auto_created, max_members, status, league_type, total_rounds, season_status, division)
      VALUES (
        _country || ' ' || _division_names[_league_number],
        _code, _beginner_member.user_id, _country, true, 30, 'waiting', 'main', 30, 'registration', _league_number
      )
      RETURNING id INTO _target_league_id;
    END IF;

    UPDATE league_members
    SET league_id = _target_league_id, points = 0, wins = 0, draws = 0, losses = 0, goals_for = 0, goals_against = 0, played = 0
    WHERE id = _beginner_member.member_id;
  END LOOP;
END;
$function$;
