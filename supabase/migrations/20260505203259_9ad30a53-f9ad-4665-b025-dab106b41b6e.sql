-- Drop conflicting functions first
DROP FUNCTION IF EXISTS public.generate_league_calendar(UUID);
DROP FUNCTION IF EXISTS public.get_league_match_time(INTEGER);

-- 1. Ensure exactly 16 teams per league
CREATE OR REPLACE FUNCTION public.enforce_league_team_count()
RETURNS TRIGGER AS $$
DECLARE
    team_count INTEGER;
    bot_count INTEGER;
    i INTEGER;
BEGIN
    SELECT count(*) INTO team_count FROM public.league_members WHERE league_id = NEW.id;
    
    IF team_count < 16 THEN
        bot_count := 16 - team_count;
        FOR i IN 1..bot_count LOOP
            INSERT INTO public.league_members (league_id, team_id, is_bot, points, games_played, wins, draws, losses, goals_for, goals_against)
            VALUES (NEW.id, gen_random_uuid(), true, 0, 0, 0, 0, 0, 0, 0);
        END LOOP;
    ELSIF team_count > 16 THEN
        DELETE FROM public.league_members
        WHERE id IN (
            SELECT id FROM public.league_members
            WHERE league_id = NEW.id
            ORDER BY is_bot DESC, points ASC, id ASC
            LIMIT (team_count - 16)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Fixed schedule times by division
CREATE OR REPLACE FUNCTION public.get_league_match_time(division_level INTEGER)
RETURNS TIME AS $$
BEGIN
    RETURN CASE 
        WHEN division_level = 1 THEN '19:00:00'::TIME
        WHEN division_level = 2 THEN '20:00:00'::TIME
        ELSE '21:00:00'::TIME
    END;
END;
$$ LANGUAGE plpgsql;

-- 3. Automatic Match Generation (Double Round Robin - 30 rounds)
CREATE OR REPLACE FUNCTION public.generate_league_calendar(p_league_id UUID)
RETURNS VOID AS $$
DECLARE
    v_division_level INTEGER;
    v_match_time TIME;
    v_start_date DATE;
    v_teams UUID[];
    v_num_teams INTEGER := 16;
    v_rounds INTEGER := 30;
    v_matches_per_round INTEGER := 8;
    v_r INTEGER;
    v_m INTEGER;
    v_home_idx INTEGER;
    v_away_idx INTEGER;
    v_temp UUID;
    v_match_date TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT level, start_date INTO v_division_level, v_start_date FROM public.multiplayer_leagues WHERE id = p_league_id;
    v_match_time := public.get_league_match_time(v_division_level);
    
    SELECT ARRAY_AGG(id) INTO v_teams FROM (
        SELECT id FROM public.league_members WHERE league_id = p_league_id ORDER BY id
    ) t;

    DELETE FROM public.league_matches WHERE league_id = p_league_id;

    FOR v_r IN 1..v_rounds LOOP
        v_match_date := (v_start_date + (v_r - 1 || ' days')::INTERVAL)::DATE + v_match_time;
        
        FOR v_m IN 0..(v_matches_per_round - 1) LOOP
            v_home_idx := v_m;
            v_away_idx := v_num_teams - 1 - v_m;
            
            -- Swap in second leg
            IF v_r > 15 THEN
                v_temp := v_teams[v_home_idx + 1];
                v_home_idx := v_away_idx;
                v_away_idx := ARRAY_POSITION(v_teams, v_temp) - 1;
            END IF;

            INSERT INTO public.league_matches (
                league_id, round, scheduled_at, home_team_id, away_team_id, status
            ) VALUES (
                p_league_id, v_r, v_match_date, v_teams[v_home_idx + 1], v_teams[v_away_idx + 1], 'scheduled'
            );
        END LOOP;

        -- Round robin rotation
        v_temp := v_teams[v_num_teams];
        FOR i IN REVERSE v_num_teams .. 3 LOOP
            v_teams[i] := v_teams[i-1];
        END LOOP;
        v_teams[2] := v_temp;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Auto-simulation logic
CREATE OR REPLACE FUNCTION public.simulate_overdue_matches()
RETURNS VOID AS $$
BEGIN
    UPDATE public.league_matches
    SET home_score = FLOOR(RANDOM() * 5), away_score = FLOOR(RANDOM() * 5), status = 'finished', updated_at = NOW()
    WHERE status = 'scheduled' AND scheduled_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger for league initialization
DROP TRIGGER IF EXISTS tr_initialize_league ON public.multiplayer_leagues;
CREATE TRIGGER tr_initialize_league
AFTER INSERT OR UPDATE OF status ON public.multiplayer_leagues
FOR EACH ROW
WHEN (NEW.status = 'active')
EXECUTE FUNCTION public.enforce_league_team_count();

-- Final cleanup: Reset existing leagues
UPDATE public.multiplayer_leagues SET max_members = 16, total_rounds = 30;
