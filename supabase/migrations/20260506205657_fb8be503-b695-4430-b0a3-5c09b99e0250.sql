-- 1. Wipe all existing matches
DELETE FROM public.world_matches;

-- 2. Identify or create the primary league
DO $$
DECLARE
    target_league_id UUID;
    team_count INTEGER;
    teams_needed INTEGER;
    i INTEGER;
BEGIN
    SELECT id INTO target_league_id FROM public.world_leagues WHERE division = 1 LIMIT 1;
    
    IF target_league_id IS NULL THEN
        INSERT INTO public.world_leagues (league_name, division, status, total_matchdays, flag_emoji)
        VALUES ('Divisão Nacional 1', 1, 'in_progress', 30, '🇧🇷')
        RETURNING id INTO target_league_id;
    END IF;

    -- 3. Ensure exactly 16 teams
    SELECT count(*) INTO team_count FROM public.world_league_teams WHERE league_id = target_league_id;
    
    IF team_count < 16 THEN
        teams_needed := 16 - team_count;
        FOR i IN 1..teams_needed LOOP
            INSERT INTO public.world_league_teams (league_id, club_name, club_logo, bot_strength, is_bot)
            VALUES (
                target_league_id, 
                'Bot Club ' || (team_count + i), 
                '🤖', 
                floor(random() * (75 - 60 + 1) + 60)::int, 
                true
            );
        END LOOP;
    ELSIF team_count > 16 THEN
        DELETE FROM public.world_league_teams 
        WHERE id IN (
            SELECT id FROM public.world_league_teams 
            WHERE league_id = target_league_id 
            ORDER BY created_at DESC 
            OFFSET 16
        );
    END IF;

    -- 4. Reset team stats
    UPDATE public.world_league_teams 
    SET wins = 0, draws = 0, losses = 0, played = 0, points = 0, goals_for = 0, goals_against = 0 
    WHERE league_id = target_league_id;
END $$;

-- 5. Add unique constraint (correct column is matchday)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_match_per_matchday'
    ) THEN
        ALTER TABLE public.world_matches 
        ADD CONSTRAINT unique_match_per_matchday UNIQUE (home_team_id, away_team_id, matchday);
    END IF;
END $$;

-- 6. Generate 30 Rounds
DO $$
DECLARE
    target_league_id UUID;
    team_ids UUID[];
    num_teams INTEGER := 16;
    r INTEGER;
    i INTEGER;
    home_idx INTEGER;
    away_idx INTEGER;
    temp_id UUID;
    kickoff_base TIMESTAMP WITH TIME ZONE := (CURRENT_DATE - INTERVAL '4 days' + TIME '19:30:00');
BEGIN
    SELECT id INTO target_league_id FROM public.world_leagues WHERE division = 1 LIMIT 1;
    SELECT ARRAY(SELECT id FROM public.world_league_teams WHERE league_id = target_league_id ORDER BY id LIMIT 16) INTO team_ids;

    -- Generate first half (Rounds 1-15)
    FOR r IN 1..15 LOOP
        FOR i IN 0..(num_teams / 2 - 1) LOOP
            home_idx := i;
            away_idx := num_teams - 1 - i;
            
            IF r % 2 = 0 THEN
                INSERT INTO public.world_matches (league_id, home_team_id, away_team_id, matchday, kickoff_at, status, season)
                VALUES (target_league_id, team_ids[away_idx + 1], team_ids[home_idx + 1], r, kickoff_base + (INTERVAL '1 day' * (r - 1)), 'scheduled', 1)
                ON CONFLICT DO NOTHING;
            ELSE
                INSERT INTO public.world_matches (league_id, home_team_id, away_team_id, matchday, kickoff_at, status, season)
                VALUES (target_league_id, team_ids[home_idx + 1], team_ids[away_idx + 1], r, kickoff_base + (INTERVAL '1 day' * (r - 1)), 'scheduled', 1)
                ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
        
        temp_id := team_ids[num_teams];
        FOR i IN REVERSE (num_teams)..3 LOOP
            team_ids[i] := team_ids[i-1];
        END LOOP;
        team_ids[2] := temp_id;
    END LOOP;

    -- Reset for second half
    SELECT ARRAY(SELECT id FROM public.world_league_teams WHERE league_id = target_league_id ORDER BY id LIMIT 16) INTO team_ids;

    -- Generate second half (Rounds 16-30)
    FOR r IN 16..30 LOOP
        FOR i IN 0..(num_teams / 2 - 1) LOOP
            home_idx := i;
            away_idx := num_teams - 1 - i;
            
            IF (r - 15) % 2 = 0 THEN
                INSERT INTO public.world_matches (league_id, home_team_id, away_team_id, matchday, kickoff_at, status, season)
                VALUES (target_league_id, team_ids[home_idx + 1], team_ids[away_idx + 1], r, kickoff_base + (INTERVAL '1 day' * (r - 1)), 'scheduled', 1)
                ON CONFLICT DO NOTHING;
            ELSE
                INSERT INTO public.world_matches (league_id, home_team_id, away_team_id, matchday, kickoff_at, status, season)
                VALUES (target_league_id, team_ids[away_idx + 1], team_ids[home_idx + 1], r, kickoff_base + (INTERVAL '1 day' * (r - 1)), 'scheduled', 1)
                ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
        
        temp_id := team_ids[num_teams];
        FOR i IN REVERSE (num_teams)..3 LOOP
            team_ids[i] := team_ids[i-1];
        END LOOP;
        team_ids[2] := temp_id;
    END LOOP;
END $$;

-- 7. Auto-simulate rounds 1-4
DO $$
DECLARE
    m RECORD;
    h_score INTEGER;
    a_score INTEGER;
BEGIN
    FOR m IN SELECT id, home_team_id, away_team_id FROM public.world_matches WHERE matchday <= 4 LOOP
        h_score := floor(random() * 4)::int;
        a_score := floor(random() * 3)::int;
        
        UPDATE public.world_matches
        SET home_goals = h_score, away_goals = a_score, status = 'finished'
        WHERE id = m.id;

        UPDATE public.world_league_teams
        SET played = played + 1,
            goals_for = goals_for + h_score,
            goals_against = goals_against + a_score,
            wins = wins + (CASE WHEN h_score > a_score THEN 1 ELSE 0 END),
            draws = draws + (CASE WHEN h_score = a_score THEN 1 ELSE 0 END),
            losses = losses + (CASE WHEN h_score < a_score THEN 1 ELSE 0 END),
            points = points + (CASE WHEN h_score > a_score THEN 3 WHEN h_score = a_score THEN 1 ELSE 0 END)
        WHERE id = m.home_team_id;

        UPDATE public.world_league_teams
        SET played = played + 1,
            goals_for = goals_for + a_score,
            goals_against = goals_against + h_score,
            wins = wins + (CASE WHEN a_score > h_score THEN 1 ELSE 0 END),
            draws = draws + (CASE WHEN a_score = h_score THEN 1 ELSE 0 END),
            losses = losses + (CASE WHEN a_score < h_score THEN 1 ELSE 0 END),
            points = points + (CASE WHEN a_score > h_score THEN 3 WHEN a_score = h_score THEN 1 ELSE 0 END)
        WHERE id = m.away_team_id;
    END LOOP;
END $$;
