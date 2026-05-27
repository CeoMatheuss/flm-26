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
    v_season_year INTEGER;
    v_season_month INTEGER;
BEGIN
    -- Get season info from league
    SELECT season_year, season_month INTO v_season_year, v_season_month 
    FROM public.world_leagues WHERE id = p_league_id;
    
    v_season_year := COALESCE(v_season_year, 1);
    v_season_month := COALESCE(v_season_month, 1);

    -- Get teams in the league
    SELECT ARRAY_AGG(id) INTO team_ids FROM public.world_teams WHERE league_id = p_league_id;
    num_teams := array_length(team_ids, 1);
    
    IF num_teams < 2 THEN RETURN; END IF;
    
    IF num_teams % 2 != 0 THEN
        num_teams := num_teams - 1;
        team_ids := team_ids[1:num_teams];
    END IF;

    num_rounds := (num_teams - 1) * 2;
    matches_per_round := num_teams / 2;
    
    DELETE FROM public.world_matches WHERE league_id = p_league_id AND status = 'scheduled';
    
    FOR r IN 1..num_rounds LOOP
        scheduled_time := p_start_date + (r - 1) * INTERVAL '1 day';
        scheduled_time := (scheduled_time::date + p_match_time)::timestamp with time zone;
        
        FOR m IN 1..matches_per_round LOOP
            home_idx := m;
            away_idx := num_teams - m + 1;
            
            IF r > (num_teams - 1) THEN
                INSERT INTO public.world_matches (league_id, home_team_id, away_team_id, round, scheduled_at, status, season_year, season_month)
                VALUES (p_league_id, team_ids[away_idx], team_ids[home_idx], r, scheduled_time, 'scheduled', v_season_year, v_season_month);
            ELSE
                INSERT INTO public.world_matches (league_id, home_team_id, away_team_id, round, scheduled_at, status, season_year, season_month)
                VALUES (p_league_id, team_ids[home_idx], team_ids[away_idx], r, scheduled_time, 'scheduled', v_season_year, v_season_month);
            END IF;
        END LOOP;
        
        temp_team := team_ids[num_teams];
        FOR i IN REVERSE num_teams..3 LOOP
            team_ids[i] := team_ids[i-1];
        END LOOP;
        team_ids[2] := temp_team;
    END LOOP;
END;
$function$;
