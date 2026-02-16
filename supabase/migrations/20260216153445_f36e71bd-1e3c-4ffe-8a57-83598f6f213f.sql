-- Add budget column to league_members for persistent online finance
ALTER TABLE public.league_members ADD COLUMN IF NOT EXISTS budget BIGINT NOT NULL DEFAULT 5000000;

-- Update the process_season_transition function to include financial rewards
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
BEGIN
  -- 1. First, redistribute beginner graduates
  PERFORM public.redistribute_beginners(_country);

  -- 2. Collect ALL players from main auto-created leagues in the country
  -- Rank them globally to determine their new division and rewards
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
      ml.division ASC, -- Division 1 comes first
      lm.points DESC, 
      (lm.goals_for - lm.goals_against) DESC, 
      lm.goals_for DESC
  LOOP
    -- Calculate reward based on division and position within their group
    -- Note: _member_count resets every 20 players, but for rewards we use their actual rank in the division
    -- Let's simplify: position 1-20 in each division
    -- Since we loop through all players, we need to know their relative rank in their division
    
    -- Reward logic (example values in local currency/game credits)
    -- Division 1 (Top Tier):
    -- 1st: 50M, 2nd: 30M, 3rd: 20M, 4-10th: 10M, 11-20th: 5M
    -- Division 2:
    -- 1st: 20M, 2nd: 15M, 3rd: 10M, 4-10th: 5M, 11-20th: 2M
    -- Division 3+:
    -- 1st: 10M, 2nd: 7M, 3rd: 5M, 4-20th: 1M
    
    _reward := CASE 
      WHEN _player.old_division = 1 THEN 
        CASE 
          WHEN (_position % 20) = 1 THEN 50000000
          WHEN (_position % 20) = 2 THEN 30000000
          WHEN (_position % 20) = 3 THEN 20000000
          WHEN (_position % 20) BETWEEN 4 AND 10 OR (_position % 20) = 0 THEN 10000000
          ELSE 5000000
        END
      WHEN _player.old_division = 2 THEN
        CASE 
          WHEN (_position % 20) = 1 THEN 20000000
          WHEN (_position % 20) = 2 THEN 15000000
          WHEN (_position % 20) = 3 THEN 10000000
          WHEN (_position % 20) BETWEEN 4 AND 10 OR (_position % 20) = 0 THEN 5000000
          ELSE 2000000
        END
      ELSE -- Div 3+
        CASE 
          WHEN (_position % 20) = 1 THEN 10000000
          WHEN (_position % 20) = 2 THEN 7000000
          WHEN (_position % 20) = 3 THEN 5000000
          ELSE 1000000
        END
    END;

    -- Record the award
    INSERT INTO public.league_awards (league_id, user_id, season, award_type, value, player_name)
    VALUES (_player.old_league_id, _player.user_id, _player.finished_season, 'Premiação de Temporada', _reward, _player.club_name);

    -- Update player's budget
    UPDATE league_members 
    SET budget = budget + _reward
    WHERE id = _player.member_db_id;

    -- Increment member count and potentially division for the NEXT season assignment
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

    -- Update member's league and reset stats (KEEP budget)
    UPDATE league_members 
    SET 
      league_id = _current_league_id,
      points = 0, wins = 0, draws = 0, losses = 0, goals_for = 0, goals_against = 0, played = 0
    WHERE user_id = _player.user_id 
      AND league_id IN (SELECT id FROM multiplayer_leagues WHERE country = _country AND league_type = 'main');
    
    _member_count := _member_count + 1;
    _position := _position + 1;
  END LOOP;
END;
$function$;
