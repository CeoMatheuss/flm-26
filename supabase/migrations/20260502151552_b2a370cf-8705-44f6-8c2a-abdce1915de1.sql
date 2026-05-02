-- Standardize League System

-- 1. Ensure league_matches has the correct structure
ALTER TABLE public.league_matches ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.league_matches ADD COLUMN IF NOT EXISTS home_goals INTEGER;
ALTER TABLE public.league_matches ADD COLUMN IF NOT EXISTS away_goals INTEGER;

-- 2. Function to ensure exactly 16 teams per league
CREATE OR REPLACE FUNCTION public.ensure_league_size(p_league_id UUID)
RETURNS VOID AS $$
DECLARE
    v_count INTEGER;
    v_excess INTEGER;
    v_country TEXT;
    v_needed INTEGER;
BEGIN
    SELECT count(*) INTO v_count FROM public.league_members WHERE league_id = p_league_id;
    SELECT country INTO v_country FROM public.multiplayer_leagues WHERE id = p_league_id;

    IF v_count > 16 THEN
        -- Remove bots with lowest reputation first
        v_excess := v_count - 16;
        DELETE FROM public.league_members
        WHERE id IN (
            SELECT id FROM public.league_members
            WHERE league_id = p_league_id AND user_id IS NULL
            ORDER BY reputation ASC NULLS FIRST, id DESC
            LIMIT v_excess
        );
    ELSIF v_count < 16 THEN
        -- Add bots to complete 16
        v_needed := 16 - v_count;
        FOR i IN 1..v_needed LOOP
            INSERT INTO public.league_members (league_id, club_name, club_logo, reputation, budget)
            VALUES (
                p_league_id, 
                'Bot FC ' || floor(random() * 10000)::text, 
                'https://api.dicebear.com/7.x/avataaars/svg?seed=' || gen_random_uuid()::text,
                50 + floor(random() * 20),
                1000000
            );
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to generate a double round-robin calendar (30 rounds)
CREATE OR REPLACE FUNCTION public.generate_league_calendar(p_league_id UUID)
RETURNS VOID AS $$
DECLARE
    v_members UUID[];
    v_n INTEGER := 16;
    v_rounds INTEGER := 30;
    v_home UUID;
    v_away UUID;
    v_match_date TIMESTAMP WITH TIME ZONE;
    v_start_date DATE := CURRENT_DATE;
BEGIN
    -- Ensure 16 teams first
    PERFORM public.ensure_league_size(p_league_id);
    
    -- Get all member user_ids (using id if user_id is null for bots)
    SELECT array_agg(id ORDER BY id) INTO v_members FROM public.league_members WHERE league_id = p_league_id;
    
    -- Clear existing scheduled matches
    DELETE FROM public.league_matches WHERE league_id = p_league_id AND status = 'scheduled';

    -- Circle algorithm for Round Robin
    FOR v_round IN 1..v_rounds LOOP
        v_match_date := (v_start_date + (v_round - 1) * INTERVAL '1 day') + INTERVAL '19 hours';
        
        FOR i IN 0..(v_n / 2 - 1) LOOP
            IF v_round <= 15 THEN
                -- First half of season
                v_home := v_members[((v_round - 1 + i) % (v_n - 1)) + 1];
                v_away := v_members[((v_n - 1 - i + v_round - 1) % (v_n - 1)) + 1];
                
                -- Fix first element
                IF i = 0 THEN
                    v_home := v_members[1];
                END IF;
            ELSE
                -- Second half (reverse home/away)
                v_home := v_members[((v_round - 16 + i) % (v_n - 1)) + 1];
                v_away := v_members[((v_n - 1 - i + v_round - 16) % (v_n - 1)) + 1];
                
                IF i = 0 THEN
                    v_home := v_members[1];
                END IF;
                
                -- Swap
                DECLARE
                    temp UUID := v_home;
                BEGIN
                    v_home := v_away;
                    v_away := temp;
                END;
            END IF;

            INSERT INTO public.league_matches (
                league_id, round, home_user_id, away_user_id, status, scheduled_at
            ) VALUES (
                p_league_id, v_round, v_home, v_away, 'scheduled', v_match_date
            );
        END LOOP;
    END LOOP;
    
    UPDATE public.multiplayer_leagues 
    SET season_status = 'in_progress', current_round = 1, total_rounds = 30
    WHERE id = p_league_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create a view for classification (Source of Truth)
CREATE OR REPLACE VIEW public.league_standings AS
WITH team_stats AS (
    -- Stats as Home Team
    SELECT 
        league_id,
        home_user_id as team_id,
        COUNT(*) filter (where status = 'played') as played,
        COUNT(*) filter (where status = 'played' and home_goals > away_goals) as wins,
        COUNT(*) filter (where status = 'played' and home_goals = away_goals) as draws,
        COUNT(*) filter (where status = 'played' and home_goals < away_goals) as losses,
        SUM(COALESCE(home_goals, 0)) as goals_for,
        SUM(COALESCE(away_goals, 0)) as goals_against
    FROM public.league_matches
    GROUP BY league_id, home_user_id
    
    UNION ALL
    
    -- Stats as Away Team
    SELECT 
        league_id,
        away_user_id as team_id,
        COUNT(*) filter (where status = 'played') as played,
        COUNT(*) filter (where status = 'played' and away_goals > home_goals) as wins,
        COUNT(*) filter (where status = 'played' and away_goals = home_goals) as draws,
        COUNT(*) filter (where status = 'played' and away_goals < home_goals) as losses,
        SUM(COALESCE(away_goals, 0)) as goals_for,
        SUM(COALESCE(home_goals, 0)) as goals_against
    FROM public.league_matches
    GROUP BY league_id, away_user_id
),
aggregated_stats AS (
    SELECT 
        league_id,
        team_id,
        SUM(played) as played,
        SUM(wins) as wins,
        SUM(draws) as draws,
        SUM(losses) as losses,
        SUM(goals_for) as goals_for,
        SUM(goals_against) as goals_against,
        (SUM(wins) * 3 + SUM(draws)) as points,
        (SUM(goals_for) - SUM(goals_against)) as goals_diff
    FROM team_stats
    GROUP BY league_id, team_id
)
SELECT 
    s.*,
    m.club_name,
    m.club_logo,
    ROW_NUMBER() OVER(PARTITION BY s.league_id ORDER BY s.points DESC, s.goals_diff DESC, s.goals_for DESC) as position
FROM aggregated_stats s
JOIN public.league_members m ON s.team_id = m.id;

-- 5. Auto-Simulation Function
CREATE OR REPLACE FUNCTION public.auto_simulate_overdue_matches()
RETURNS VOID AS $$
DECLARE
    v_match RECORD;
    v_home_ovr INTEGER;
    v_away_ovr INTEGER;
    v_home_goals INTEGER;
    v_away_goals INTEGER;
BEGIN
    FOR v_match IN 
        SELECT m.* 
        FROM public.league_matches m
        WHERE m.status = 'scheduled' 
        AND m.scheduled_at < (NOW() - INTERVAL '5 minutes')
    LOOP
        -- Simple OVR simulation
        v_home_ovr := 70; -- Default
        v_away_ovr := 70;
        
        -- Try to get real OVR from league_members reputation
        SELECT reputation INTO v_home_ovr FROM public.league_members WHERE id = v_match.home_user_id;
        SELECT reputation INTO v_away_ovr FROM public.league_members WHERE id = v_match.away_user_id;
        
        -- Simulation logic
        v_home_goals := floor(random() * (v_home_ovr / 20.0 + 1));
        v_away_goals := floor(random() * (v_away_ovr / 20.0 + 1));
        
        UPDATE public.league_matches 
        SET status = 'played', 
            home_goals = v_home_goals, 
            away_goals = v_away_goals,
            played_at = NOW()
        WHERE id = v_match.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
