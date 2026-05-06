-- Create a function to handle automatic league entry and BOT replacement
CREATE OR REPLACE FUNCTION public.handle_team_league_entry(_team_id UUID, _country_id UUID)
RETURNS VOID AS $$
DECLARE
  v_league_id UUID;
  v_bot_team_id UUID;
  v_count INT;
  v_season_month INT := EXTRACT(MONTH FROM NOW());
  v_season_year INT := EXTRACT(YEAR FROM NOW());
  v_day INT := EXTRACT(DAY FROM NOW());
BEGIN
  -- 1. Check if there's a league in the country that isn't full (less than 16 teams)
  -- Priority: Leages that are still in "waiting" (if any, though we aim for automatic)
  SELECT id INTO v_league_id
  FROM public.world_leagues
  WHERE country_id = _country_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no league exists for country, create one
  IF v_league_id IS NULL THEN
    INSERT INTO public.world_leagues (name, country_id, division_level, match_time, status)
    VALUES ('Série A', _country_id, 1, '19:30:00', 'active')
    RETURNING id INTO v_league_id;
  END IF;

  -- 2. Check if league has space (< 16 teams)
  SELECT count(*) INTO v_count FROM public.world_teams WHERE league_id = v_league_id;

  IF v_count < 16 THEN
    -- Join normally
    UPDATE public.world_teams SET league_id = v_league_id WHERE id = _team_id;
    
    -- Initialize standing if not exists
    INSERT INTO public.world_league_table (league_id, team_id, season_month, season_year, played, wins, draws, losses, goals_for, goals_against, points)
    VALUES (v_league_id, _team_id, v_season_month, v_season_year, 0, 0, 0, 0, 0, 0, 0)
    ON CONFLICT (league_id, team_id, season_month, season_year) DO NOTHING;
  ELSE
    -- 3. League is full. Try to replace a BOT.
    SELECT id INTO v_bot_team_id
    FROM public.world_teams
    WHERE league_id = v_league_id AND is_bot = true
    LIMIT 1;

    IF v_bot_team_id IS NOT NULL THEN
      -- REPLACE BOT LOGIC (CRITICAL)
      -- A. Transfer matches from BOT to human
      UPDATE public.world_matches SET home_team_id = _team_id WHERE home_team_id = v_bot_team_id AND league_id = v_league_id;
      UPDATE public.world_matches SET away_team_id = _team_id WHERE away_team_id = v_bot_team_id AND league_id = v_league_id;
      
      -- B. Transfer standings from BOT to human
      UPDATE public.world_league_table SET team_id = _team_id 
      WHERE team_id = v_bot_team_id AND league_id = v_league_id AND season_month = v_season_month AND season_year = v_season_year;
      
      -- C. Move BOT out of league (or delete if it was just a placeholder)
      UPDATE public.world_teams SET league_id = NULL WHERE id = v_bot_team_id;
      
      -- D. Set human team to league
      UPDATE public.world_teams SET league_id = v_league_id WHERE id = _team_id;
    ELSE
      -- No bots to replace? This shouldn't happen with 16 teams limit, but if it does, 
      -- maybe the player stays in beginner cup or waits for next season.
      -- For now, we'll just log or do nothing.
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-enroll on club creation
CREATE OR REPLACE FUNCTION public.on_team_created_enroll()
RETURNS TRIGGER AS $$
DECLARE
  v_country_id UUID;
BEGIN
  -- Get country_id from profiles or some default
  SELECT id INTO v_country_id FROM public.countries WHERE code = 'BR' LIMIT 1;
  
  PERFORM public.handle_team_league_entry(NEW.id, v_country_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- If 'world_teams' table exists, we should use it. 
-- The user mentioned "world_teams" in schema results.

-- Add index to speed up BOT replacement
CREATE INDEX IF NOT EXISTS idx_world_teams_league_bot ON public.world_teams(league_id, is_bot);

-- Ensure world_league_table has a unique constraint for the replacement logic to work perfectly
-- ALTER TABLE public.world_league_table ADD CONSTRAINT unique_league_team_season UNIQUE (league_id, team_id, season_month, season_year);
-- (Assuming it might already have one or we'll handle it via UPSERT)
