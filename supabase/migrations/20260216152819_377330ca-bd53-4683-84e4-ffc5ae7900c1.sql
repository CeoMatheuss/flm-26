-- Add division column to multiplayer_leagues
ALTER TABLE public.multiplayer_leagues ADD COLUMN division INTEGER DEFAULT 1;

-- Update existing main leagues to have division numbers based on their name if possible
UPDATE public.multiplayer_leagues 
SET division = (regexp_match(name, 'Liga (\d+)'))[1]::integer
WHERE league_type = 'main' AND name ~ 'Liga \d+';

-- Update redistribute_beginners to put players in the highest division number (lowest tier)
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
    -- Find the highest division number (lowest tier) main league with registration space
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
        _beginner_member.user_id,
        _country,
        true,
        20,
        'waiting',
        'main',
        30,
        'registration',
        _league_number
      )
      RETURNING id INTO _target_league_id;
    END IF;

    -- Move member to the target main league
    UPDATE league_members
    SET league_id = _target_league_id, points = 0, wins = 0, draws = 0, losses = 0, goals_for = 0, goals_against = 0, played = 0
    WHERE id = _beginner_member.member_id;
  END LOOP;
END;
$function$;

-- New function for global promotion and relegation transition
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
BEGIN
  -- 1. First, redistribute beginner graduates
  PERFORM public.redistribute_beginners(_country);

  -- 2. Collect ALL players from main auto-created leagues in the country
  -- Rank them globally to determine their new division
  -- Sorting: 
  -- First by current division (players in higher divisions have priority if they did well)
  -- Then by league standing (points, goal difference, goals scored)
  FOR _player IN 
    SELECT 
      lm.user_id, 
      lm.club_name, 
      lm.club_logo,
      ml.division as old_division,
      lm.points,
      (lm.goals_for - lm.goals_against) as gd,
      lm.goals_for as gs
    FROM league_members lm
    JOIN multiplayer_leagues ml ON ml.id = lm.league_id
    WHERE ml.country = _country 
      AND ml.league_type = 'main' 
      AND ml.auto_created = true
      AND ml.season_status = 'finished'
    ORDER BY 
      ml.division ASC, -- Division 1 comes first
      lm.points DESC, 
      (lm.goals_for - lm.goals_against) DESC, 
      lm.goals_for DESC
  LOOP
    -- Increment member count and potentially division
    IF _member_count = 0 OR _member_count >= 20 THEN
      -- Calculate which division this group of 20 belongs to
      _league_name := _country || ' Liga ' || _current_division;
      
      -- Find existing league for this division or create it
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
        VALUES (_league_name, _code, _player.user_id, _country, true, 20, 'waiting', 'main', 30, 'registration', _current_division)
        RETURNING id INTO _league_id;
      ELSE
        -- Reset league for new season
        UPDATE multiplayer_leagues 
        SET season = season + 1, 
            season_status = 'registration', 
            current_round = 0,
            division = _current_division,
            owner_id = _player.user_id -- Best player of this tier is the owner
        WHERE id = _league_id;
        
        -- Clear old matches
        DELETE FROM league_matches WHERE league_id = _league_id;
      END IF;
      
      _current_league_id := _league_id;
      _current_division := _current_division + 1;
      _member_count := 0;
    END IF;

    -- Update member's league and reset stats
    UPDATE league_members 
    SET 
      league_id = _current_league_id,
      points = 0, wins = 0, draws = 0, losses = 0, goals_for = 0, goals_against = 0, played = 0
    WHERE user_id = _player.user_id 
      AND league_id IN (SELECT id FROM multiplayer_leagues WHERE country = _country AND league_type = 'main');
    
    _member_count := _member_count + 1;
  END LOOP;
END;
$function$;

-- Update end_season_redistribute to use the global transition
CREATE OR REPLACE FUNCTION public.end_season_redistribute(_league_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _league RECORD;
BEGIN
  SELECT * INTO _league FROM multiplayer_leagues WHERE id = _league_id;
  
  IF _league IS NULL OR _league.season_status != 'finished' THEN
    RETURN;
  END IF;

  -- If it's a private league, just reset it
  IF _league.auto_created = false THEN
    UPDATE league_members
    SET points = 0, wins = 0, draws = 0, losses = 0, goals_for = 0, goals_against = 0, played = 0
    WHERE league_id = _league_id;

    DELETE FROM league_matches WHERE league_id = _league_id;

    UPDATE multiplayer_leagues
    SET season = season + 1, season_status = 'registration', current_round = 0
    WHERE id = _league_id;
  ELSE
    -- For auto-created leagues, we trigger the country-wide transition
    -- This will handle all leagues in that country once they are all finished
    -- Check if ALL auto-created leagues in the country are finished
    IF NOT EXISTS (
      SELECT 1 FROM multiplayer_leagues 
      WHERE country = _league.country 
        AND league_type = 'main' 
        AND auto_created = true 
        AND season_status != 'finished'
    ) THEN
      PERFORM public.process_season_transition(_league.country);
    END IF;
  END IF;
END;
$function$;
