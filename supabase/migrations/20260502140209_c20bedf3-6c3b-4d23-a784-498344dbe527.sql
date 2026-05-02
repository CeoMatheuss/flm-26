-- 1. Remove 30-day constraint
ALTER TABLE world_matches DROP CONSTRAINT IF EXISTS world_matches_matchday_check;
ALTER TABLE world_matches ADD CONSTRAINT world_matches_matchday_check CHECK (matchday >= 1 AND matchday <= 38);

-- 2. Ensure kickoff times are correct
UPDATE world_leagues SET kickoff_hour = 19, kickoff_minute = 0 WHERE division = 1;
UPDATE world_leagues SET kickoff_hour = 19, kickoff_minute = 30 WHERE division = 2;
UPDATE world_leagues SET kickoff_hour = 18, kickoff_minute = 0 WHERE division = 3;
UPDATE world_leagues SET kickoff_hour = 20, kickoff_minute = 0 WHERE division = 4;

-- 3. Redefine initialize_world_league with 38 rounds logic
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

    -- Get teams (ordered for deterministic output)
    SELECT array_agg(id) INTO v_teams 
    FROM (SELECT id FROM world_league_teams WHERE league_id = p_league_id ORDER BY id) t;
    
    v_n := array_length(v_teams, 1);
    IF v_n IS NULL OR v_n < 2 THEN
        RETURN;
    END IF;

    -- Reset existing matches
    DELETE FROM world_matches WHERE league_id = p_league_id AND season = v_season;

    -- Start date: Yesterday so matchday 1 can be treated as finished/ongoing
    v_start_date := (v_today_utc AT TIME ZONE 'UTC' - INTERVAL '1 day' - INTERVAL '3 hours')::date;

    -- Berger Algorithm for Round Robin
    -- N-1 rounds per half. For 20 teams, 19 rounds.
    FOR r IN 0..(v_n - 2) LOOP
        FOR i IN 0..(v_n/2 - 1) LOOP
            -- Determine indices using Berger rotation
            IF i = 0 THEN
                v_home_idx := 0;
                v_away_idx := (v_n - 1 - r) % (v_n - 1) + 1;
            ELSE
                v_home_idx := (i + r) % (v_n - 1) + 1;
                v_away_idx := (v_n - 1 - i + r) % (v_n - 1) + 1;
            END IF;

            v_home := v_teams[v_home_idx + 1];
            v_away := v_teams[v_away_idx + 1];

            -- Swap home/away for variety in the first half
            IF r % 2 = 1 THEN
                DECLARE temp UUID := v_home; BEGIN v_home := v_away; v_away := temp; END;
            END IF;

            -- Turno (Matchdays 1 to N-1, e.g., 1-19)
            v_matchday := r + 1;
            v_kickoff := (v_start_date + (v_matchday - 1) * INTERVAL '1 day')::timestamp + (v_kickoff_hour || ' hours')::interval + (v_kickoff_minute || ' minutes')::interval + INTERVAL '3 hours';
            
            INSERT INTO world_matches (league_id, season, matchday, home_team_id, away_team_id, kickoff_at, status)
            VALUES (p_league_id, v_season, v_matchday, v_home, v_away, v_kickoff, 'scheduled');

            -- Returno (Matchdays N to 2N-2, e.g., 20-38)
            v_matchday := r + v_n; -- This will be 20 to 38 for N=20
            v_kickoff := (v_start_date + (v_matchday - 1) * INTERVAL '1 day')::timestamp + (v_kickoff_hour || ' hours')::interval + (v_kickoff_minute || ' minutes')::interval + INTERVAL '3 hours';
            
            -- Swap for the return leg
            INSERT INTO world_matches (league_id, season, matchday, home_team_id, away_team_id, kickoff_at, status)
            VALUES (p_league_id, v_season, v_matchday, v_away, v_home, v_kickoff, 'scheduled');
        END LOOP;
    END LOOP;

    -- Update league metadata
    UPDATE world_leagues 
    SET status = 'in_progress', 
        current_matchday = 1, 
        total_matchdays = (v_n - 1) * 2,
        season_started_at = v_today_utc
    WHERE id = p_league_id;

    -- Simular Rodada 1 retroativamente
    UPDATE world_matches 
    SET status = 'finished',
        home_goals = floor(random() * 4),
        away_goals = floor(random() * 3),
        match_data = jsonb_set(COALESCE(match_data, '{}'::jsonb), '{auto_simulated}', 'true')
    WHERE league_id = p_league_id AND matchday = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger for automatic initialization
CREATE OR REPLACE FUNCTION public.trg_auto_init_world_league_func()
RETURNS TRIGGER AS $$
DECLARE
    v_count INT;
    v_slots INT;
BEGIN
    SELECT count(*) INTO v_count FROM world_league_teams WHERE league_id = NEW.league_id;
    SELECT total_slots INTO v_slots FROM world_leagues WHERE id = NEW.league_id;

    IF v_count >= v_slots AND v_slots >= 20 THEN
        -- Only initialize if no matches exist or we are forcing a reset
        IF NOT EXISTS (SELECT 1 FROM world_matches WHERE league_id = NEW.league_id LIMIT 1) THEN
            PERFORM public.initialize_world_league(NEW.league_id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_init_world_league ON world_league_teams;
CREATE TRIGGER trg_auto_init_world_league
AFTER INSERT OR UPDATE ON world_league_teams
FOR EACH ROW EXECUTE FUNCTION public.trg_auto_init_world_league_func();

-- 5. Validation Function for Frontend/UI
CREATE OR REPLACE FUNCTION public.validate_world_league(p_league_id UUID)
RETURNS jsonb AS $$
DECLARE
    v_match_count INT;
    v_team_count INT;
BEGIN
    SELECT count(*) INTO v_team_count FROM world_league_teams WHERE league_id = p_league_id;
    SELECT count(*) INTO v_match_count FROM world_matches WHERE league_id = p_league_id;
    
    -- If 20 teams and not 380 matches, fix it
    IF v_team_count = 20 AND v_match_count < 380 THEN
        PERFORM public.initialize_world_league(p_league_id);
        RETURN jsonb_build_object('status', 'fixed', 'new_match_count', 380);
    END IF;
    
    RETURN jsonb_build_object('status', 'valid', 'match_count', v_match_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Retroactive cleanup for all full 20-team leagues
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT id FROM world_leagues 
        WHERE total_slots = 20 
        AND (SELECT count(*) FROM world_league_teams WHERE league_id = world_leagues.id) = 20
        AND (SELECT count(*) FROM world_matches WHERE league_id = world_leagues.id) < 380
    ) LOOP
        PERFORM public.initialize_world_league(r.id);
    END LOOP;
END;
$$;
