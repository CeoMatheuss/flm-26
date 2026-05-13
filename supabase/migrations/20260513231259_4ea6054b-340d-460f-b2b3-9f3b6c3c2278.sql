CREATE OR REPLACE FUNCTION public.handle_team_league_entry(_team_id UUID, _country_id UUID)
RETURNS VOID AS $$
DECLARE
  v_league_id UUID;
  v_bot_team_id UUID;
  v_count INT;
  v_season_month INT := EXTRACT(MONTH FROM NOW());
  v_season_year INT := EXTRACT(YEAR FROM NOW());
BEGIN
  -- 1. Get the latest active league for the specified country
  SELECT id INTO v_league_id
  FROM public.world_leagues
  WHERE country_id = _country_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no league exists for this country, create a new one
  IF v_league_id IS NULL THEN
    INSERT INTO public.world_leagues (name, country_id, division_level, active)
    VALUES ('Série A', _country_id, 1, true)
    RETURNING id INTO v_league_id;
  END IF;

  -- 2. Count current teams in this specific league
  SELECT count(*) INTO v_count FROM public.world_teams WHERE league_id = v_league_id;

  IF v_count < 16 THEN
    -- Join the league directly if there is space
    UPDATE public.world_teams SET league_id = v_league_id WHERE id = _team_id;
    
    -- Initialize standing for the new team
    INSERT INTO public.world_league_table (league_id, team_id, season_month, season_year, played, wins, draws, losses, goals_for, goals_against, points)
    VALUES (v_league_id, _team_id, v_season_month, v_season_year, 0, 0, 0, 0, 0, 0, 0)
    ON CONFLICT (league_id, team_id) DO NOTHING;
  ELSE
    -- 3. League is full (16+ teams). Attempt to replace a BOT.
    -- The replacement MUST be a BOT (is_bot = true)
    -- We don't strictly filter by BOT country here because the league itself is already country-specific (v_league_id is from _country_id)
    -- However, to be extra safe and follow instructions:
    SELECT id INTO v_bot_team_id
    FROM public.world_teams
    WHERE league_id = v_league_id 
      AND is_bot = true
    LIMIT 1;

    IF v_bot_team_id IS NOT NULL THEN
      -- A. Transfer all match fixtures from the BOT to the human player
      UPDATE public.world_matches SET home_team_id = _team_id WHERE home_team_id = v_bot_team_id AND league_id = v_league_id;
      UPDATE public.world_matches SET away_team_id = _team_id WHERE away_team_id = v_bot_team_id AND league_id = v_league_id;
      
      -- B. Transfer the current standing/statistics from the BOT to the human player
      UPDATE public.world_league_table SET team_id = _team_id 
      WHERE team_id = v_bot_team_id AND league_id = v_league_id AND season_month = v_season_month AND season_year = v_season_year;
      
      -- C. Remove the BOT from the league
      UPDATE public.world_teams SET league_id = NULL WHERE id = v_bot_team_id;
      
      -- D. Assign the human team to the league
      UPDATE public.world_teams SET league_id = v_league_id WHERE id = _team_id;
    ELSE
      -- Optional: If league is full and NO bots exist, we could potentially create a new division or expansion league
      -- For now, we follow the "create normal" flow by letting the user join if space permits or waiting.
      -- Given 16 teams is the limit, if 16 humans are in, a new league should probably be created.
      -- We already handle "no league exists", but we could add "create if full and no bots" logic here.
      
      INSERT INTO public.world_leagues (name, country_id, division_level, active)
      VALUES ('Série A - Divisão ' || (SELECT count(*) + 1 FROM public.world_leagues WHERE country_id = _country_id), _country_id, 1, true)
      RETURNING id INTO v_league_id;
      
      UPDATE public.world_teams SET league_id = v_league_id WHERE id = _team_id;
      
      INSERT INTO public.world_league_table (league_id, team_id, season_month, season_year, played, wins, draws, losses, goals_for, goals_against, points)
      VALUES (v_league_id, _team_id, v_season_month, v_season_year, 0, 0, 0, 0, 0, 0, 0);
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
