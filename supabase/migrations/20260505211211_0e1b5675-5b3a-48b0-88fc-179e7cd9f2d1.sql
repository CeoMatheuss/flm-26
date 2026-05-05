-- 1. DELETE ALL MATCHES
DELETE FROM public.world_matches;

-- 2. ENSURE 16 UNIQUE TEAMS
DO $$
DECLARE
    v_league_id UUID;
    v_count INTEGER;
    v_to_add INTEGER;
BEGIN
    SELECT id INTO v_league_id FROM public.world_leagues LIMIT 1;
    IF v_league_id IS NULL THEN
        v_league_id := gen_random_uuid();
        INSERT INTO public.world_leagues (id, league_name, flag_emoji, division, total_matchdays, kickoff_hour, kickoff_minute, status)
        VALUES (v_league_id, 'Divisão Nacional 1', '🇧🇷', 1, 30, 19, 30, 'in_progress');
    END IF;

    -- Clean duplicate names
    DELETE FROM public.world_league_teams 
    WHERE id IN (
        SELECT id FROM (
            SELECT id, row_number() OVER (PARTITION BY club_name ORDER BY user_id NULLS LAST, created_at ASC) as rn
            FROM public.world_league_teams
        ) t WHERE rn > 1
    );

    -- Standardize league
    UPDATE public.world_league_teams SET league_id = v_league_id;

    SELECT count(*) INTO v_count FROM public.world_league_teams;

    IF v_count > 16 THEN
        DELETE FROM public.world_league_teams 
        WHERE id IN (
            SELECT id FROM public.world_league_teams 
            ORDER BY user_id NULLS LAST, id ASC 
            OFFSET 16
        );
    ELSIF v_count < 16 THEN
        v_to_add := 16 - v_count;
        FOR i IN 1..v_to_add LOOP
            INSERT INTO public.world_league_teams (id, league_id, club_name, club_logo, is_bot, points, wins, draws, losses, goals_for, goals_against, played)
            VALUES (gen_random_uuid(), v_league_id, 'Bot FC ' || (v_count + i), '⚽', true, 0, 0, 0, 0, 0, 0, 0);
        END LOOP;
    END IF;
END $$;

-- 3. MATCH GENERATION FUNCTION
CREATE OR REPLACE FUNCTION public.rebuild_league_v6()
RETURNS void AS $$
DECLARE
    team_ids UUID[];
    num_teams INTEGER := 16;
    round_num INTEGER;
    i INTEGER;
    h_idx INTEGER;
    a_idx INTEGER;
    temp_id UUID;
    v_league_id UUID;
    v_start DATE := CURRENT_DATE - INTERVAL '4 days';
    v_time TIME := '19:30:00';
BEGIN
    SELECT id INTO v_league_id FROM public.world_leagues LIMIT 1;
    SELECT ARRAY_AGG(id ORDER BY id) INTO team_ids FROM public.world_league_teams;

    -- IDA (Matchdays 1-15)
    FOR round_num IN 1..15 LOOP
        FOR i IN 0..7 LOOP
            h_idx := i;
            a_idx := num_teams - 1 - i;
            
            INSERT INTO public.world_matches (id, league_id, home_team_id, away_team_id, matchday, kickoff_at, status, season)
            VALUES (
                gen_random_uuid(), v_league_id, team_ids[h_idx + 1], team_ids[a_idx + 1], round_num, 
                (v_start + (round_num - 1) * INTERVAL '1 day' + v_time)::timestamp with time zone,
                CASE WHEN round_num < 5 THEN 'finished'::public.world_match_status ELSE 'scheduled'::public.world_match_status END,
                1
            );
        END LOOP;
        
        temp_id := team_ids[num_teams];
        FOR i IN REVERSE num_teams..3 LOOP
            team_ids[i] := team_ids[i-1];
        END LOOP;
        team_ids[2] := temp_id;
    END LOOP;

    -- VOLTA (Matchdays 16-30)
    SELECT ARRAY_AGG(id ORDER BY id) INTO team_ids FROM public.world_league_teams;
    FOR round_num IN 1..15 LOOP
        FOR i IN 0..7 LOOP
            h_idx := i;
            a_idx := num_teams - 1 - i;
            
            INSERT INTO public.world_matches (id, league_id, home_team_id, away_team_id, matchday, kickoff_at, status, season)
            VALUES (
                gen_random_uuid(), v_league_id, team_ids[a_idx + 1], team_ids[h_idx + 1], round_num + 15, 
                (v_start + (round_num + 15 - 1) * INTERVAL '1 day' + v_time)::timestamp with time zone,
                'scheduled'::public.world_match_status,
                1
            );
        END LOOP;
        
        temp_id := team_ids[num_teams];
        FOR i IN REVERSE num_teams..3 LOOP
            team_ids[i] := team_ids[i-1];
        END LOOP;
        team_ids[2] := temp_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT public.rebuild_league_v6();

-- 4. SIMULATE AND UPDATE (FIXED COLUMN NAMES)
UPDATE public.world_matches
SET home_goals = floor(random() * 4)::int, away_goals = floor(random() * 4)::int
WHERE matchday < 5 AND status = 'finished';

UPDATE public.world_league_teams SET points = 0, wins = 0, draws = 0, losses = 0, goals_for = 0, goals_against = 0, played = 0;

UPDATE public.world_league_teams t
SET 
    played = sub.p, wins = sub.w, draws = sub.d, losses = sub.l, 
    goals_for = sub.gf, goals_against = sub.ga, points = (sub.w * 3) + sub.d
FROM (
    SELECT team_id, COUNT(*) as p, SUM(w) as w, SUM(d) as d, SUM(l) as l, SUM(gf) as gf, SUM(ga) as ga
    FROM (
        SELECT home_team_id as team_id, 1 as p, CASE WHEN home_goals > away_goals THEN 1 ELSE 0 END as w, CASE WHEN home_goals = away_goals THEN 1 ELSE 0 END as d, CASE WHEN home_goals < away_goals THEN 1 ELSE 0 END as l, home_goals as gf, away_goals as ga FROM public.world_matches WHERE status = 'finished'
        UNION ALL
        SELECT away_team_id as team_id, 1 as p, CASE WHEN away_goals > home_goals THEN 1 ELSE 0 END as w, CASE WHEN away_goals = home_goals THEN 1 ELSE 0 END as d, CASE WHEN away_goals < home_goals THEN 1 ELSE 0 END as l, away_goals as gf, home_goals as ga FROM public.world_matches WHERE status = 'finished'
    ) m GROUP BY team_id
) sub WHERE t.id = sub.team_id;

-- 5. UNIQUE CONSTRAINT
ALTER TABLE public.world_matches DROP CONSTRAINT IF EXISTS world_matches_unique_round;
ALTER TABLE public.world_matches ADD CONSTRAINT world_matches_unique_round UNIQUE (home_team_id, away_team_id, matchday);
