-- 1. Redefine the generation function with valid kickoff dates
CREATE OR REPLACE FUNCTION public.generate_league_matches_v2(p_league_id UUID)
RETURNS void AS $$
DECLARE
    v_teams UUID[];
    v_n INT;
    v_home UUID;
    v_away UUID;
    v_home_idx INT;
    v_away_idx INT;
    v_matchday INT;
    v_season INT;
    v_kickoff_hour INT;
    v_kickoff_minute INT;
    v_base_date DATE;
    v_kickoff TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get league metadata
    SELECT season, kickoff_hour, kickoff_minute 
    INTO v_season, v_kickoff_hour, v_kickoff_minute 
    FROM public.world_leagues WHERE id = p_league_id;
    
    -- Get team IDs
    SELECT array_agg(id) INTO v_teams 
    FROM (SELECT id FROM public.world_league_teams WHERE league_id = p_league_id ORDER BY id) t;
    
    v_n := array_length(v_teams, 1);
    
    IF v_n != 20 THEN RETURN; END IF;

    -- Clear existing matches
    DELETE FROM public.world_matches WHERE league_id = p_league_id AND season = v_season;

    -- Base date: Start of the current month
    v_base_date := date_trunc('month', now())::date;

    -- Berger Algorithm for 38 rounds
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

            -- Turno (Matchdays 1-19)
            v_matchday := r + 1;
            v_kickoff := (v_base_date + (v_matchday - 1) * INTERVAL '1 day')::timestamp + (v_kickoff_hour || ' hours')::interval + (v_kickoff_minute || ' minutes')::interval + INTERVAL '3 hours';
            
            INSERT INTO public.world_matches (league_id, season, matchday, home_team_id, away_team_id, kickoff_at, status)
            VALUES (p_league_id, v_season, v_matchday, v_home, v_away, v_kickoff, 'scheduled');

            -- Returno (Matchdays 20-38)
            v_matchday := r + v_n;
            v_kickoff := (v_base_date + (v_matchday - 1) * INTERVAL '1 day')::timestamp + (v_kickoff_hour || ' hours')::interval + (v_kickoff_minute || ' minutes')::interval + INTERVAL '3 hours';
            
            INSERT INTO public.world_matches (league_id, season, matchday, home_team_id, away_team_id, kickoff_at, status)
            VALUES (p_league_id, v_season, v_matchday, v_away, v_home, v_kickoff, 'scheduled');
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Execute immediately for all full leagues
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT l.id FROM public.world_leagues l
        JOIN (SELECT league_id, count(*) as cnt FROM public.world_league_teams GROUP BY league_id) t ON t.league_id = l.id
        WHERE t.cnt = 20
    ) LOOP
        PERFORM public.generate_league_matches_v2(r.id);
    END LOOP;
END;
$$;
