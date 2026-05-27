CREATE OR REPLACE FUNCTION public.generate_world_league_calendar(p_league_id uuid, p_start_date timestamp with time zone, p_match_time time without time zone)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    team_ids UUID[];
    num_teams INTEGER;
    num_rounds INTEGER;
    matches_per_round INTEGER;
    r INTEGER;
    m INTEGER;
    home_idx INTEGER;
    away_idx INTEGER;
    temp_team UUID;
    scheduled_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Use world_teams instead of world_league_teams
    SELECT ARRAY_AGG(id) INTO team_ids FROM public.world_teams WHERE league_id = p_league_id;
    num_teams := array_length(team_ids, 1);
    
    IF num_teams < 2 THEN RETURN; END IF;
    
    -- Ensure even number of teams for rotation algorithm
    IF num_teams % 2 != 0 THEN
        -- This shouldn't happen with 20 teams but good for safety
        num_teams := num_teams - 1;
        team_ids := team_ids[1:num_teams];
    END IF;

    num_rounds := (num_teams - 1) * 2;
    matches_per_round := num_teams / 2;
    
    -- Clear existing matches for this league
    DELETE FROM public.world_matches WHERE league_id = p_league_id AND status = 'scheduled';
    
    -- Round robin scheduling algorithm (Circle method)
    FOR r IN 1..num_rounds LOOP
        -- For season 1 catch-up, we don't worry too much about exact dates here as simulation will fix it
        scheduled_time := p_start_date + (r - 1) * INTERVAL '1 day';
        scheduled_time := (scheduled_time::date + p_match_time)::timestamp with time zone;
        
        FOR m IN 1..matches_per_round LOOP
            home_idx := m;
            away_idx := num_teams - m + 1;
            
            IF r > (num_teams - 1) THEN
                -- Second half of the season: Swap home/away
                INSERT INTO public.world_matches (league_id, home_team_id, away_team_id, round, scheduled_at, status)
                VALUES (p_league_id, team_ids[away_idx], team_ids[home_idx], r, scheduled_time, 'scheduled');
            ELSE
                INSERT INTO public.world_matches (league_id, home_team_id, away_team_id, round, scheduled_at, status)
                VALUES (p_league_id, team_ids[home_idx], team_ids[away_idx], r, scheduled_time, 'scheduled');
            END IF;
        END LOOP;
        
        -- Rotate teams (keep first team fixed)
        temp_team := team_ids[num_teams];
        FOR i IN REVERSE num_teams..3 LOOP
            team_ids[i] := team_ids[i-1];
        END LOOP;
        team_ids[2] := temp_team;
    END LOOP;
END;
$function$;
