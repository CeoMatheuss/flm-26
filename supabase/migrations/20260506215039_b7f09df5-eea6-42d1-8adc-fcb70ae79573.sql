-- Drop functions that might have conflicts
DROP FUNCTION IF EXISTS public.generate_league_fixtures(UUID);
DROP FUNCTION IF EXISTS public.sync_league_progress(UUID);
DROP FUNCTION IF EXISTS public.get_or_create_current_league(UUID);
DROP FUNCTION IF EXISTS public.ensure_league_teams(UUID, UUID);
DROP FUNCTION IF EXISTS public.initialize_player_league(UUID);

-- Function to get or create current month league
CREATE OR REPLACE FUNCTION public.get_or_create_current_league(p_division_id UUID)
RETURNS UUID AS $$
DECLARE
    v_league_id UUID;
    v_month INT := EXTRACT(MONTH FROM CURRENT_DATE);
    v_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
    v_start_date DATE := DATE_TRUNC('month', CURRENT_DATE);
    v_end_date DATE := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
BEGIN
    SELECT id INTO v_league_id 
    FROM public.leagues 
    WHERE division_id = p_division_id 
    AND EXTRACT(MONTH FROM start_date) = v_month 
    AND EXTRACT(YEAR FROM start_date) = v_year
    LIMIT 1;

    IF v_league_id IS NULL THEN
        INSERT INTO public.leagues (division_id, name, start_date, end_date, status)
        VALUES (p_division_id, 'Liga ' || TO_CHAR(CURRENT_DATE, 'Month YYYY'), v_start_date, v_end_date, 'active')
        RETURNING id INTO v_league_id;
    END IF;

    RETURN v_league_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure 16 teams (Player + BOTS) in a league
CREATE OR REPLACE FUNCTION public.ensure_league_teams(p_league_id UUID, p_player_team_id UUID)
RETURNS VOID AS $$
DECLARE
    v_division_id UUID;
    v_team_count INT;
    v_needed INT;
BEGIN
    SELECT division_id INTO v_division_id FROM public.leagues WHERE id = p_league_id;
    
    INSERT INTO public.standings (league_id, team_id)
    VALUES (p_league_id, p_player_team_id)
    ON CONFLICT (league_id, team_id) DO NOTHING;
    
    SELECT COUNT(*) INTO v_team_count FROM public.standings WHERE league_id = p_league_id;
    
    v_needed := 16 - v_team_count;
    
    IF v_needed > 0 THEN
        INSERT INTO public.standings (league_id, team_id)
        SELECT p_league_id, id
        FROM public.teams
        WHERE is_bot = true 
        AND division_id = v_division_id
        AND id NOT IN (SELECT team_id FROM public.standings WHERE league_id = p_league_id)
        LIMIT v_needed;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Corrected Round Robin Scheduler for 16 teams (30 rounds)
CREATE OR REPLACE FUNCTION public.generate_league_fixtures(p_league_id UUID)
RETURNS VOID AS $$
DECLARE
    v_teams UUID[];
    v_num_teams INT := 16;
    v_num_rounds INT := 30;
    v_round_num INT;
    v_i INT;
    v_home UUID;
    v_away UUID;
    v_match_date DATE;
    v_division_id UUID;
    v_match_time TIME;
    v_temp UUID;
    v_league_start DATE;
BEGIN
    IF EXISTS (SELECT 1 FROM public.matches WHERE league_id = p_league_id) THEN
        RETURN;
    END IF;

    SELECT division_id, start_date INTO v_division_id, v_league_start FROM public.leagues WHERE id = p_league_id;
    
    SELECT 
        CASE 
            WHEN name ILIKE '%Série A%' THEN '19:30'::TIME
            WHEN name ILIKE '%Série B%' THEN '18:30'::TIME
            WHEN name ILIKE '%Série C%' THEN '17:30'::TIME
            ELSE '16:00'::TIME
        END INTO v_match_time
    FROM public.divisions WHERE id = v_division_id;

    SELECT ARRAY_AGG(team_id) INTO v_teams FROM public.standings WHERE league_id = p_league_id;
    
    FOR v_round_num IN 1..v_num_rounds LOOP
        v_match_date := v_league_start + (v_round_num - 1) * INTERVAL '1 day';
        
        FOR v_i IN 0..(v_num_teams / 2 - 1) LOOP
            v_home := v_teams[v_i + 1];
            v_away := v_teams[v_num_teams - v_i];
            
            IF v_round_num > 15 THEN
                v_temp := v_home;
                v_home := v_away;
                v_away := v_temp;
            END IF;

            INSERT INTO public.matches (
                league_id, home_team_id, away_team_id, 
                scheduled_at, status, round
            ) VALUES (
                p_league_id, v_home, v_away, 
                (v_match_date + v_match_time), 'scheduled', v_round_num
            );
        END LOOP;

        -- Correct rotation: keep teams[1] fixed, rotate others
        v_temp := v_teams[v_num_teams];
        FOR v_i IN 0..(v_num_teams - 3) LOOP
            v_teams[v_num_teams - v_i] := v_teams[v_num_teams - v_i - 1];
        END LOOP;
        v_teams[2] := v_temp;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Catch up and simulate past matches
CREATE OR REPLACE FUNCTION public.sync_league_progress(p_league_id UUID)
RETURNS VOID AS $$
DECLARE
    v_match RECORD;
BEGIN
    FOR v_match IN 
        SELECT id, home_team_id, away_team_id, scheduled_at 
        FROM public.matches 
        WHERE league_id = p_league_id 
        AND status = 'scheduled' 
        AND scheduled_at < (NOW() - INTERVAL '5 minutes')
    LOOP
        UPDATE public.matches 
        SET 
            home_score = floor(random() * 4),
            away_score = floor(random() * 3),
            status = 'finished',
            finished_at = scheduled_at + INTERVAL '105 minutes'
        WHERE id = v_match.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize or Sync Player's League
CREATE OR REPLACE FUNCTION public.initialize_player_league(p_player_team_id UUID)
RETURNS UUID AS $$
DECLARE
    v_division_id UUID;
    v_league_id UUID;
BEGIN
    SELECT division_id INTO v_division_id FROM public.teams WHERE id = p_player_team_id;
    v_league_id := public.get_or_create_current_league(v_division_id);
    PERFORM public.ensure_league_teams(v_league_id, p_player_team_id);
    PERFORM public.generate_league_fixtures(v_league_id);
    PERFORM public.sync_league_progress(v_league_id);
    RETURN v_league_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
