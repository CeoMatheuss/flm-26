-- 1. HARD CLEANUP
DELETE FROM public.world_matches;
DELETE FROM public.world_league_teams WHERE is_bot = true;

-- 2. LEAGUE INITIALIZATION (BR Division 1)
DO $$
DECLARE
    br_league_id UUID;
    team_count INTEGER;
    bot_names TEXT[] := ARRAY['Flamengo', 'Palmeiras', 'São Paulo', 'Corinthians', 'Grêmio', 'Internacional', 'Atlético-MG', 'Cruzeiro', 'Santos', 'Fluminense', 'Botafogo', 'Vasco', 'Bahia', 'Fortaleza', 'Athletico-PR', 'Cuiabá', 'Goiás', 'Coritiba'];
    b_name TEXT;
    i INTEGER := 0;
BEGIN
    -- Ensure league exists and is reset
    SELECT id INTO br_league_id FROM public.world_leagues WHERE country = 'BR' AND division = 1 LIMIT 1;
    
    IF br_league_id IS NULL THEN
        INSERT INTO public.world_leagues (league_name, country, flag_emoji, division, total_matchdays, kickoff_hour, kickoff_minute, status, season, current_matchday)
        VALUES ('Brasileirão Série A', 'BR', '🇧🇷', 1, 30, 19, 30, 'in_progress', 1, 5)
        RETURNING id INTO br_league_id;
    ELSE
        UPDATE public.world_leagues 
        SET kickoff_hour = 19, kickoff_minute = 30, total_slots = 16, current_matchday = 5 
        WHERE id = br_league_id;
    END IF;

    -- Reset stats for all teams in this league
    UPDATE public.world_league_teams 
    SET points = 0, played = 0, wins = 0, draws = 0, losses = 0, goals_for = 0, goals_against = 0 
    WHERE league_id = br_league_id;

    -- Count existing teams
    SELECT count(*) INTO team_count FROM public.world_league_teams WHERE league_id = br_league_id;
    
    -- Maintain exactly 16 teams
    WHILE team_count < 16 LOOP
        b_name := bot_names[1 + (i % array_length(bot_names, 1))];
        IF EXISTS (SELECT 1 FROM public.world_league_teams WHERE club_name = b_name AND league_id = br_league_id) THEN
            b_name := b_name || ' ' || (i + 1);
        END IF;
        
        INSERT INTO public.world_league_teams (league_id, club_name, is_bot, bot_strength, club_logo)
        VALUES (br_league_id, b_name, true, floor(random() * (85-70+1) + 70), '🤖');
        
        team_count := team_count + 1;
        i := i + 1;
    END LOOP;
    
    IF team_count > 16 THEN
        DELETE FROM public.world_league_teams 
        WHERE id IN (
            SELECT id FROM public.world_league_teams 
            WHERE league_id = br_league_id AND is_bot = true 
            LIMIT (team_count - 16)
        );
    END IF;
END $$;

-- 3. FIXTURE GENERATION & AUTO-SIMULATION
DO $$
DECLARE
    br_league_id UUID;
    l_season INTEGER;
    team_ids UUID[];
    num_teams INTEGER := 16;
    num_rounds INTEGER := 30;
    r INTEGER;
    idx INTEGER;
    home_idx INTEGER;
    away_idx INTEGER;
    home_team UUID;
    away_team UUID;
    match_date DATE := CURRENT_DATE - INTERVAL '4 days';
    kickoff TIMESTAMP WITH TIME ZONE;
    temp_id UUID;
    h_score INTEGER;
    a_score INTEGER;
BEGIN
    SELECT id, season INTO br_league_id, l_season FROM public.world_leagues WHERE country = 'BR' AND division = 1 LIMIT 1;
    SELECT array_agg(id) INTO team_ids FROM (SELECT id FROM public.world_league_teams WHERE league_id = br_league_id ORDER BY id) s;

    FOR r IN 1..num_rounds LOOP
        kickoff := (match_date + (r-1) * INTERVAL '1 day')::TIMESTAMP + TIME '19:30:00';
        
        FOR idx IN 0..(num_teams/2 - 1) LOOP
            home_idx := (r + idx - 1) % (num_teams - 1);
            away_idx := (num_teams - 1 - idx + r - 1) % (num_teams - 1);
            
            IF idx = 0 THEN
                home_idx := num_teams - 1;
            END IF;

            home_team := team_ids[home_idx + 1];
            away_team := team_ids[away_idx + 1];

            IF r > 15 THEN
                temp_id := home_team;
                home_team := away_team;
                away_team := temp_id;
            END IF;

            h_score := CASE WHEN r < 5 THEN floor(random() * 4) ELSE 0 END;
            a_score := CASE WHEN r < 5 THEN floor(random() * 4) ELSE 0 END;

            INSERT INTO public.world_matches (
                league_id, season, matchday, home_team_id, away_team_id, 
                kickoff_at, status, home_goals, away_goals
            ) VALUES (
                br_league_id, COALESCE(l_season, 1), r, home_team, away_team, 
                kickoff, 
                (CASE WHEN r < 5 THEN 'finished' ELSE 'scheduled' END)::public.world_match_status,
                h_score,
                a_score
            );

            -- SIMULATE STANDINGS FOR COMPLETED ROUNDS
            IF r < 5 THEN
                UPDATE public.world_league_teams 
                SET 
                    played = played + 1,
                    goals_for = goals_for + h_score,
                    goals_against = goals_against + a_score,
                    wins = wins + (CASE WHEN h_score > a_score THEN 1 ELSE 0 END),
                    draws = draws + (CASE WHEN h_score = a_score THEN 1 ELSE 0 END),
                    losses = losses + (CASE WHEN h_score < a_score THEN 1 ELSE 0 END),
                    points = points + (CASE WHEN h_score > a_score THEN 3 WHEN h_score = a_score THEN 1 ELSE 0 END)
                WHERE id = home_team;

                UPDATE public.world_league_teams 
                SET 
                    played = played + 1,
                    goals_for = goals_for + a_score,
                    goals_against = goals_against + h_score,
                    wins = wins + (CASE WHEN a_score > h_score THEN 1 ELSE 0 END),
                    draws = draws + (CASE WHEN a_score = h_score THEN 1 ELSE 0 END),
                    losses = losses + (CASE WHEN a_score < h_score THEN 1 ELSE 0 END),
                    points = points + (CASE WHEN a_score > h_score THEN 3 WHEN a_score = h_score THEN 1 ELSE 0 END)
                WHERE id = away_team;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- 4. UNIQUE CONSTRAINT REINFORCEMENT
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'world_matches_unique_fixture') THEN
        ALTER TABLE public.world_matches ADD CONSTRAINT world_matches_unique_fixture UNIQUE (league_id, matchday, home_team_id, away_team_id);
    END IF;
END $$;
