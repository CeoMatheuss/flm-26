-- Update existing leagues to the new 16-team standard
UPDATE public.world_leagues 
SET total_slots = 16, 
    total_matchdays = 30;

-- Update the match generation function for 16 teams
CREATE OR REPLACE FUNCTION public.generate_league_matches_v2(p_league_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
    
    -- Get team IDs (up to 16)
    SELECT array_agg(id) INTO v_teams 
    FROM (SELECT id FROM public.world_league_teams WHERE league_id = p_league_id ORDER BY id LIMIT 16) t;
    
    v_n := array_length(v_teams, 1);
    
    -- Ensure we have exactly 16 teams as per new requirements
    IF v_n != 16 THEN 
        RAISE NOTICE 'League % has % teams, expected 16', p_league_id, v_n;
        RETURN; 
    END IF;

    -- Clear existing scheduled matches for current season
    DELETE FROM public.world_matches WHERE league_id = p_league_id AND season = v_season AND status = 'scheduled';

    -- Base date: Today, or start of month if preferred. JSON says "duracao_dias: 30".
    -- We'll start from tomorrow to avoid immediate conflicts.
    v_base_date := current_date + interval '1 day';

    -- Berger Algorithm for 16 teams (15 rounds ida + 15 rounds volta = 30 rounds)
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

            -- Balance home/away
            IF r % 2 = 1 THEN
                DECLARE temp UUID := v_home; BEGIN v_home := v_away; v_away := temp; END;
            END IF;

            -- Turno (Matchdays 1-15)
            v_matchday := r + 1;
            v_kickoff := (v_base_date + (v_matchday - 1) * INTERVAL '1 day')::timestamp + (COALESCE(v_kickoff_hour, 19) || ' hours')::interval + (COALESCE(v_kickoff_minute, 0) || ' minutes')::interval;
            
            INSERT INTO public.world_matches (league_id, season, matchday, home_team_id, away_team_id, kickoff_at, status)
            VALUES (p_league_id, v_season, v_matchday, v_home, v_away, v_kickoff, 'scheduled');

            -- Returno (Matchdays 16-30)
            v_matchday := r + v_n; -- (e.g. 0 + 16 = 16, 14 + 16 = 30)
            v_kickoff := (v_base_date + (v_matchday - 1) * INTERVAL '1 day')::timestamp + (COALESCE(v_kickoff_hour, 19) || ' hours')::interval + (COALESCE(v_kickoff_minute, 0) || ' minutes')::interval;
            
            INSERT INTO public.world_matches (league_id, season, matchday, home_team_id, away_team_id, kickoff_at, status)
            VALUES (p_league_id, v_season, v_matchday, v_away, v_home, v_kickoff, 'scheduled');
        END LOOP;
    END LOOP;
END;
$function$;

-- Function to force-rebuild all leagues to the new 16-team format
CREATE OR REPLACE FUNCTION public.rebuild_all_leagues_v3()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.world_leagues LOOP
        PERFORM public.generate_league_matches_v2(r.id);
    END LOOP;
END;
$$;
