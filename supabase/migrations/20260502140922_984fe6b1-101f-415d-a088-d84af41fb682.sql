-- 1. Redefine initialize_world_league to be the source of truth for generation
CREATE OR REPLACE FUNCTION public.initialize_world_league(p_league_id UUID)
RETURNS void AS $$
DECLARE
    v_teams UUID[];
    v_n INT;
    v_kickoff_hour INT;
    v_kickoff_minute INT;
    v_season INT;
    v_start_date DATE;
    v_home UUID;
    v_away UUID;
    v_home_idx INT;
    v_away_idx INT;
    v_matchday INT;
    v_kickoff TIMESTAMP WITH TIME ZONE;
    v_today_utc TIMESTAMP WITH TIME ZONE := now();
BEGIN
    -- Get league info
    SELECT kickoff_hour, kickoff_minute, season 
    INTO v_kickoff_hour, v_kickoff_minute, v_season
    FROM world_leagues WHERE id = p_league_id;

    -- Get teams
    SELECT array_agg(id) INTO v_teams 
    FROM (SELECT id FROM world_league_teams WHERE league_id = p_league_id ORDER BY id) t;
    
    v_n := array_length(v_teams, 1);
    IF v_n IS NULL OR v_n < 2 THEN
        RETURN;
    END IF;

    -- Force delete all matches for this league (Global Reset)
    DELETE FROM world_matches WHERE league_id = p_league_id;

    -- Start date: Yesterday
    v_start_date := (v_today_utc AT TIME ZONE 'UTC' - INTERVAL '1 day' - INTERVAL '3 hours')::date;

    -- Berger Algorithm (38 rounds for 20 teams)
    FOR r in 0..(v_n - 2) LOOP
        FOR i in 0..(v_n/2 - 1) LOOP
            IF i = 0 THEN
                v_home_idx := 0;
                v_away_idx := (v_n - 1 - r) % (v_n - 1) + 1;
            ELSE
                v_home_idx := (i + r) % (v_n - 1) + 1;
                v_away_idx := (v_n - 1 - i + r) % (v_n - 1) + 1;
            END IF;

            v_home := v_teams[v_home_idx + 1];
            v_away := v_teams[v_away_idx + 1];

            IF r % 2 = 1 THEN
                DECLARE temp UUID := v_home; BEGIN v_home := v_away; v_away := temp; END;
            END IF;

            -- Turno
            v_matchday := r + 1;
            v_kickoff := (v_start_date + (v_matchday - 1) * INTERVAL '1 day')::timestamp + (v_kickoff_hour || ' hours')::interval + (v_kickoff_minute || ' minutes')::interval + INTERVAL '3 hours';
            
            INSERT INTO world_matches (league_id, season, matchday, home_team_id, away_team_id, kickoff_at, status)
            VALUES (p_league_id, v_season, v_matchday, v_home, v_away, v_kickoff, 'scheduled');

            -- Returno
            v_matchday := r + v_n;
            v_kickoff := (v_start_date + (v_matchday - 1) * INTERVAL '1 day')::timestamp + (v_kickoff_hour || ' hours')::interval + (v_kickoff_minute || ' minutes')::interval + INTERVAL '3 hours';
            
            INSERT INTO world_matches (league_id, season, matchday, home_team_id, away_team_id, kickoff_at, status)
            VALUES (p_league_id, v_season, v_matchday, v_away, v_home, v_kickoff, 'scheduled');
        END LOOP;
    END LOOP;

    -- Metadata
    UPDATE world_leagues 
    SET status = 'in_progress', 
        current_matchday = 1, 
        total_matchdays = (v_n - 1) * 2,
        season_started_at = v_today_utc
    WHERE id = p_league_id;

    -- Auto-Simulate Matchday 1
    UPDATE world_matches 
    SET status = 'finished',
        home_goals = floor(random() * 4),
        away_goals = floor(random() * 3),
        match_data = jsonb_set(COALESCE(match_data, '{}'::jsonb), '{auto_simulated}', 'true')
    WHERE league_id = p_league_id AND matchday = 1;

    RAISE NOTICE 'League % initialized with 380 matches and matchday 1 simulated.', p_league_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the forced fix function
CREATE OR REPLACE FUNCTION public.fix_league_forcefully(p_league_id UUID)
RETURNS jsonb AS $$
DECLARE
    v_team_count INT;
BEGIN
    SELECT count(*) INTO v_team_count FROM world_league_teams WHERE league_id = p_league_id;
    
    IF v_team_count = 20 THEN
        PERFORM public.initialize_world_league(p_league_id);
        RETURN jsonb_build_object('success', true, 'message', 'League fixed: 380 matches generated.');
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'League not full (only ' || v_team_count || ' teams).');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update sync_league_state to be the global entry point
CREATE OR REPLACE FUNCTION public.sync_league_state(_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_league_id uuid;
    v_match_count int;
    v_team_count int;
    v_current_day int;
BEGIN
    -- Get user league
    SELECT league_id INTO v_league_id FROM world_league_teams WHERE user_id = _user_id LIMIT 1;
    
    IF v_league_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not in a league');
    END IF;

    -- DETECT AND FIX
    SELECT count(*) INTO v_team_count FROM world_league_teams WHERE league_id = v_league_id;
    SELECT count(*) INTO v_match_count FROM world_matches WHERE league_id = v_league_id;
    
    IF v_team_count = 20 AND v_match_count < 380 THEN
        RAISE NOTICE 'Sync: League % is broken (matches: %), fixing...', v_league_id, v_match_count;
        PERFORM public.initialize_world_league(v_league_id);
    END IF;

    -- Update current matchday based on date
    v_current_day := EXTRACT(DAY FROM (now() AT TIME ZONE 'UTC' - INTERVAL '3 hours'));
    IF v_current_day > 38 THEN v_current_day := 38; END IF;

    UPDATE world_leagues SET current_matchday = v_current_day WHERE id = v_league_id;

    -- Auto-finish old scheduled matches
    UPDATE world_matches 
    SET status = 'finished',
        home_goals = floor(random() * 4),
        away_goals = floor(random() * 3),
        match_data = jsonb_set(COALESCE(match_data, '{}'::jsonb), '{auto_simulated}', 'true')
    WHERE league_id = v_league_id 
      AND kickoff_at < now() - interval '1 hour'
      AND status = 'scheduled';

    RETURN jsonb_build_object('success', true, 'league_id', v_league_id, 'matches', (SELECT count(*) FROM world_matches WHERE league_id = v_league_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
