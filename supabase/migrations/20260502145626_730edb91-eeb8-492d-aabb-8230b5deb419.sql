-- Complete System Reset and League Rebuild Logic (V2)

-- 1. Reset existing data
TRUNCATE public.world_matches;

UPDATE public.world_league_teams
SET points = 0,
    wins = 0,
    draws = 0,
    losses = 0,
    goals_for = 0,
    goals_against = 0,
    played = 0;

UPDATE public.world_leagues
SET total_slots = 16,
    total_matchdays = 30,
    current_matchday = 0,
    status = 'in_progress';

-- 2. Enhanced function to adjust team counts to exactly 16
CREATE OR REPLACE FUNCTION public.rebuild_league_teams_to_16(p_league_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_count INT;
    v_needed INT;
    _i INT;
    _bot_name TEXT;
    _bot_logo TEXT;
    _bot_strength INT;
    _country TEXT;
    _division INT;
BEGIN
    -- Get league info for bot generation
    SELECT country, division INTO _country, _division FROM public.world_leagues WHERE id = p_league_id;

    -- Count teams
    SELECT count(*) INTO v_total_count FROM public.world_league_teams WHERE league_id = p_league_id;

    -- If more than 16, keep humans first, then remove excess bots or lowest id teams
    IF v_total_count > 16 THEN
        DELETE FROM public.world_league_teams
        WHERE id IN (
            SELECT id FROM public.world_league_teams
            WHERE league_id = p_league_id
            ORDER BY user_id NULLS LAST, id ASC
            OFFSET 16
        );
    -- If less than 16, add bots
    ELSIF v_total_count < 16 THEN
        v_needed := 16 - v_total_count;
        FOR _i IN 1..v_needed LOOP
            _bot_name := public.generate_bot_club_name(COALESCE(_country, 'Brasil'), v_total_count + _i);
            _bot_logo := public.random_bot_logo();
            
            -- Simple strength logic based on division
            _bot_strength := CASE 
                WHEN _division = 1 THEN 75 + floor(random() * 15) -- 75-90
                WHEN _division = 2 THEN 65 + floor(random() * 15) -- 65-80
                WHEN _division = 3 THEN 55 + floor(random() * 15) -- 55-70
                ELSE 45 + floor(random() * 15) -- 45-60
            END;

            INSERT INTO public.world_league_teams (
                league_id, is_bot, club_name, club_logo, bot_strength,
                points, wins, draws, losses, goals_for, goals_against, played
            ) VALUES (
                p_league_id, true, _bot_name || ' BOT', _bot_logo, _bot_strength,
                0, 0, 0, 0, 0, 0, 0
            );
        END LOOP;
    END IF;
END;
$$;

-- 3. Match Generation v3 (16 teams, 30 rounds, Double Round Robin)
CREATE OR REPLACE FUNCTION public.generate_league_matches_v3(p_league_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 AS $$
 DECLARE
     v_teams UUID[];
     v_n INT := 16;
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
     -- Ensure exactly 16 teams exist
     PERFORM public.rebuild_league_teams_to_16(p_league_id);

     -- Get league metadata
     SELECT season, kickoff_hour, kickoff_minute 
     INTO v_season, v_kickoff_hour, v_kickoff_minute 
     FROM public.world_leagues WHERE id = p_league_id;
     
     -- Get the 16 team IDs
     SELECT array_agg(id) INTO v_teams 
     FROM (SELECT id FROM public.world_league_teams WHERE league_id = p_league_id ORDER BY id LIMIT 16) t;
     
     -- Base date: Tomorrow (Day 1)
     v_base_date := current_date + interval '1 day';

     -- Berger Algorithm for Round Robin (16 teams = 15 rounds)
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

             -- Alternar mandos de campo a cada rodada
             IF r % 2 = 1 THEN
                 DECLARE temp UUID := v_home; BEGIN v_home := v_away; v_away := temp; END;
             END IF;

             -- First Half (Turno: Matchdays 1-15)
             v_matchday := r + 1;
             v_kickoff := (v_base_date + (v_matchday - 1) * INTERVAL '1 day')::timestamp + (COALESCE(v_kickoff_hour, 19) || ' hours')::interval + (COALESCE(v_kickoff_minute, 0) || ' minutes')::interval;
             
             INSERT INTO public.world_matches (league_id, season, matchday, home_team_id, away_team_id, kickoff_at, status)
             VALUES (p_league_id, v_season, v_matchday, v_home, v_away, v_kickoff, 'scheduled');

             -- Second Half (Returno: Matchdays 16-30) - Invert home/away
             v_matchday := r + 16;
             v_kickoff := (v_base_date + (v_matchday - 1) * INTERVAL '1 day')::timestamp + (COALESCE(v_kickoff_hour, 19) || ' hours')::interval + (COALESCE(v_kickoff_minute, 0) || ' minutes')::interval;
             
             INSERT INTO public.world_matches (league_id, season, matchday, home_team_id, away_team_id, kickoff_at, status)
             VALUES (p_league_id, v_season, v_matchday, v_away, v_home, v_kickoff, 'scheduled');
         END LOOP;
     END LOOP;
 END;
 $$;

-- 4. Global Trigger for System Rebuild
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.world_leagues LOOP
        PERFORM public.generate_league_matches_v3(r.id);
    END LOOP;
END;
$$;
