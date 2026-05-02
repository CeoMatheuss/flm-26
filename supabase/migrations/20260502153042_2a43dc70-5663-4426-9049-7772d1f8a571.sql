-- Drop conflicting functions first
DROP FUNCTION IF EXISTS public.generate_league_calendar(uuid);
DROP FUNCTION IF EXISTS public.ensure_league_full(uuid);
DROP FUNCTION IF EXISTS public.get_division_start_time(integer);

-- 1. Ensure exactly 16 teams rule
ALTER TABLE public.multiplayer_leagues 
ADD COLUMN IF NOT EXISTS division_level INTEGER DEFAULT 1,
ALTER COLUMN max_members SET DEFAULT 16;

-- Function to fill league with bots to reach 16
CREATE OR REPLACE FUNCTION public.ensure_league_full(target_league_id UUID)
RETURNS VOID AS $$
DECLARE
    current_count INTEGER;
    needed INTEGER;
BEGIN
    SELECT COUNT(*) INTO current_count FROM public.league_members WHERE league_id = target_league_id;
    
    IF current_count < 16 THEN
        needed := 16 - current_count;
        -- Add bots
        FOR i IN 1..needed LOOP
            INSERT INTO public.league_members (league_id, team_name, is_bot, points, played, wins, draws, losses, goals_for, goals_against)
            VALUES (target_league_id, 'Bot Team ' || substr(gen_random_uuid()::text, 1, 8), true, 0, 0, 0, 0, 0, 0, 0);
        END LOOP;
    ELSIF current_count > 16 THEN
        -- Remove extra members (prioritize bots, then worst performing)
        DELETE FROM public.league_members 
        WHERE id IN (
            SELECT id FROM public.league_members 
            WHERE league_id = target_league_id 
            ORDER BY is_bot DESC, points ASC, (goals_for - goals_against) ASC
            LIMIT (current_count - 16)
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Individual Player Stats Table
CREATE TABLE IF NOT EXISTS public.league_player_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID REFERENCES public.multiplayer_leagues(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.league_members(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    team_name TEXT NOT NULL,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    total_rating DECIMAL(10, 2) DEFAULT 0,
    matches_played INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_stats_league ON public.league_player_stats(league_id);

-- 3. Fixed Schedules System
CREATE OR REPLACE FUNCTION public.get_division_start_time(div_level INTEGER)
RETURNS TIME AS $$
BEGIN
    RETURN CASE 
        WHEN div_level = 1 THEN '19:00:00'::TIME
        WHEN div_level = 2 THEN '20:00:00'::TIME
        WHEN div_level = 3 THEN '21:00:00'::TIME
        ELSE '22:00:00'::TIME
    END;
END;
$$ LANGUAGE plpgsql;

-- 4. Calendar Generation
CREATE OR REPLACE FUNCTION public.generate_league_calendar(target_league_id UUID)
RETURNS VOID AS $$
DECLARE
    team_ids UUID[];
    match_time_fixed TIME;
    div_level INTEGER;
    start_date DATE := CURRENT_DATE;
    current_match_time TIMESTAMP;
    i INTEGER;
    j INTEGER;
    home_idx INTEGER;
    away_idx INTEGER;
    temp_id UUID;
BEGIN
    PERFORM public.ensure_league_full(target_league_id);
    DELETE FROM public.league_matches WHERE league_id = target_league_id;
    
    SELECT ARRAY_AGG(id) INTO team_ids FROM (
        SELECT id FROM public.league_members WHERE league_id = target_league_id ORDER BY id
    ) t;
    
    SELECT COALESCE(division_level, 1) INTO div_level FROM public.multiplayer_leagues WHERE id = target_league_id;
    match_time_fixed := public.get_division_start_time(div_level);
    
    FOR i IN 1..15 LOOP 
        FOR j IN 1..8 LOOP 
            home_idx := j;
            away_idx := 16 - j + 1;
            
            -- Round i
            current_match_time := (start_date + (i - 1) * INTERVAL '1 day')::TIMESTAMP + match_time_fixed;
            INSERT INTO public.league_matches (league_id, round, home_team_id, away_team_id, match_time, status)
            VALUES (target_league_id, i, team_ids[home_idx], team_ids[away_idx], current_match_time, 'scheduled');
            
            -- Round i+15
            current_match_time := (start_date + (i + 14) * INTERVAL '1 day')::TIMESTAMP + match_time_fixed;
            INSERT INTO public.league_matches (league_id, round, home_team_id, away_team_id, match_time, status)
            VALUES (target_league_id, i + 15, team_ids[away_idx], team_ids[home_idx], current_match_time, 'scheduled');
        END LOOP;
        
        temp_id := team_ids[16];
        FOR j IN REVERSE 16..3 LOOP
            team_ids[j] := team_ids[j-1];
        END LOOP;
        team_ids[2] := temp_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
