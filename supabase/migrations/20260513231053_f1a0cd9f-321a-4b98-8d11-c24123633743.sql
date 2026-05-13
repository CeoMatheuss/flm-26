CREATE OR REPLACE FUNCTION public.handle_team_league_entry(_team_id UUID, _country_id UUID)
RETURNS VOID AS $$
DECLARE
  v_league_id UUID;
  v_bot_team_id UUID;
  v_count INT;
  v_season_month INT := EXTRACT(MONTH FROM NOW());
  v_season_year INT := EXTRACT(YEAR FROM NOW());
BEGIN
  -- 1. Get the latest league for the country
  SELECT id INTO v_league_id
  FROM public.world_leagues
  WHERE country_id = _country_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no league exists, create one with correct columns
  IF v_league_id IS NULL THEN
    INSERT INTO public.world_leagues (name, country_id, division_level, active)
    VALUES ('Série A', _country_id, 1, true)
    RETURNING id INTO v_league_id;
  END IF;

  -- 2. Count teams in league
  SELECT count(*) INTO v_count FROM public.world_teams WHERE league_id = v_league_id;

  IF v_count < 16 THEN
    -- Join normally
    UPDATE public.world_teams SET league_id = v_league_id WHERE id = _team_id;
    
    -- Initialize standing
    INSERT INTO public.world_league_table (league_id, team_id, season_month, season_year, played, wins, draws, losses, goals_for, goals_against, points)
    VALUES (v_league_id, _team_id, v_season_month, v_season_year, 0, 0, 0, 0, 0, 0, 0)
    ON CONFLICT (league_id, team_id) DO NOTHING;
  ELSE
    -- 3. League is full. Try to replace a BOT.
    SELECT id INTO v_bot_team_id
    FROM public.world_teams
    WHERE league_id = v_league_id AND is_bot = true
    LIMIT 1;

    IF v_bot_team_id IS NOT NULL THEN
      -- A. Transfer matches
      UPDATE public.world_matches SET home_team_id = _team_id WHERE home_team_id = v_bot_team_id AND league_id = v_league_id;
      UPDATE public.world_matches SET away_team_id = _team_id WHERE away_team_id = v_bot_team_id AND league_id = v_league_id;
      
      -- B. Transfer standings
      UPDATE public.world_league_table SET team_id = _team_id 
      WHERE team_id = v_bot_team_id AND league_id = v_league_id AND season_month = v_season_month AND season_year = v_season_year;
      
      -- C. Move BOT out
      UPDATE public.world_teams SET league_id = NULL WHERE id = v_bot_team_id;
      
      -- D. Set human team to league
      UPDATE public.world_teams SET league_id = v_league_id WHERE id = _team_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
