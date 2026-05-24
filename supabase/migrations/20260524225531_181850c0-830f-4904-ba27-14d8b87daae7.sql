-- Ensure league matches have a status for synchronization
ALTER TABLE public.league_matches ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT false;

-- Drop function first because we need to change its return type from void to jsonb
DROP FUNCTION IF EXISTS public.sync_league_integrity(uuid);

-- 1. Create a function to atomize match finalization and table update
CREATE OR REPLACE FUNCTION public.finalize_league_match(
    _match_id UUID,
    _home_goals INT,
    _away_goals INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_match RECORD;
    v_home_id UUID;
    v_away_id UUID;
    v_league_id UUID;
BEGIN
    -- Select match with lock
    SELECT * INTO v_match FROM public.league_matches WHERE id = _match_id FOR UPDATE;
    
    IF v_match IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Match not found');
    END IF;

    IF v_match.status = 'finished' AND v_match.synced = true THEN
        RETURN jsonb_build_object('success', true, 'info', 'Already finalized');
    END IF;

    v_home_id := v_match.home_user_id;
    v_away_id := v_match.away_user_id;
    v_league_id := v_match.league_id;

    -- Update match status
    UPDATE public.league_matches 
    SET 
        status = 'finished',
        home_goals = _home_goals,
        away_goals = _away_goals,
        played_at = NOW(),
        synced = true
    WHERE id = _match_id;

    -- Atomic Table Update for Home Team
    UPDATE public.league_standings 
    SET 
        played = played + 1,
        wins = wins + (CASE WHEN _home_goals > _away_goals THEN 1 ELSE 0 END),
        draws = draws + (CASE WHEN _home_goals = _away_goals THEN 1 ELSE 0 END),
        losses = losses + (CASE WHEN _home_goals < _away_goals THEN 1 ELSE 0 END),
        goals_for = goals_for + _home_goals,
        goals_against = goals_against + _away_goals,
        goals_diff = (goals_for + _home_goals) - (goals_against + _away_goals),
        points = points + (CASE WHEN _home_goals > _away_goals THEN 3 WHEN _home_goals = _away_goals THEN 1 ELSE 0 END)
    WHERE league_id = v_league_id AND user_id = v_home_id;

    -- Atomic Table Update for Away Team
    UPDATE public.league_standings 
    SET 
        played = played + 1,
        wins = wins + (CASE WHEN _away_goals > _home_goals THEN 1 ELSE 0 END),
        draws = draws + (CASE WHEN _home_goals = _away_goals THEN 1 ELSE 0 END),
        losses = losses + (CASE WHEN _away_goals < _home_goals THEN 1 ELSE 0 END),
        goals_for = goals_for + _away_goals,
        goals_against = goals_against + _home_goals,
        goals_diff = (goals_for + _away_goals) - (goals_against + _home_goals),
        points = points + (CASE WHEN _away_goals > _home_goals THEN 3 WHEN _home_goals = _away_goals THEN 1 ELSE 0 END)
    WHERE league_id = v_league_id AND user_id = v_away_id;

    -- Log synchronization if table exists
    BEGIN
        INSERT INTO public.match_sync_log (match_id, status, details)
        VALUES (_match_id, 'success', jsonb_build_object('home', _home_goals, 'away', _away_goals));
    EXCEPTION WHEN OTHERS THEN
        -- Table might not exist, ignore
    END;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 2. Improved League Integrity: Recalculates EVERYTHING based on match history
CREATE OR REPLACE FUNCTION public.sync_league_integrity(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_league_id UUID;
BEGIN
    -- Find which league the user is in
    SELECT league_id INTO v_league_id FROM public.league_members WHERE user_id = _user_id LIMIT 1;
    
    IF v_league_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No league found for user');
    END IF;

    -- Reset all stats for this league to 0
    UPDATE public.league_standings 
    SET 
        played = 0, wins = 0, draws = 0, losses = 0,
        goals_for = 0, goals_against = 0, goals_diff = 0, points = 0
    WHERE league_id = v_league_id;

    -- Recalculate based on finished matches
    WITH match_stats AS (
        SELECT 
            league_id, 
            home_user_id as user_id,
            COUNT(*) as p,
            SUM(CASE WHEN home_goals > away_goals THEN 1 ELSE 0 END) as w,
            SUM(CASE WHEN home_goals = away_goals THEN 1 ELSE 0 END) as d,
            SUM(CASE WHEN home_goals < away_goals THEN 1 ELSE 0 END) as l,
            SUM(home_goals) as gf,
            SUM(away_goals) as ga
        FROM public.league_matches 
        WHERE league_id = v_league_id AND status = 'finished'
        GROUP BY league_id, home_user_id
        
        UNION ALL
        
        SELECT 
            league_id, 
            away_user_id as user_id,
            COUNT(*) as p,
            SUM(CASE WHEN away_goals > home_goals THEN 1 ELSE 0 END) as w,
            SUM(CASE WHEN home_goals = away_goals THEN 1 ELSE 0 END) as d,
            SUM(CASE WHEN away_goals < home_goals THEN 1 ELSE 0 END) as l,
            SUM(away_goals) as gf,
            SUM(home_goals) as ga
        FROM public.league_matches 
        WHERE league_id = v_league_id AND status = 'finished'
        GROUP BY league_id, away_user_id
    ),
    aggregated AS (
        SELECT 
            user_id,
            SUM(p) as played,
            SUM(w) as wins,
            SUM(d) as draws,
            SUM(l) as losses,
            SUM(gf) as goals_for,
            SUM(ga) as goals_against
        FROM match_stats
        GROUP BY user_id
    )
    UPDATE public.league_standings ls
    SET 
        played = a.played,
        wins = a.wins,
        draws = a.draws,
        losses = a.losses,
        goals_for = a.goals_for,
        goals_against = a.goals_against,
        goals_diff = a.goals_for - a.goals_against,
        points = (a.wins * 3) + a.draws
    FROM aggregated a
    WHERE ls.league_id = v_league_id AND ls.user_id = a.user_id;

    RETURN jsonb_build_object('success', true, 'league_id', v_league_id);
END;
$$;

-- 3. Auto-simulation logic (5 minutes rule)
CREATE OR REPLACE FUNCTION public.auto_simulate_expired_matches()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_match RECORD;
    v_count INT := 0;
    v_home_strength INT;
    v_away_strength INT;
    v_home_goals INT;
    v_away_goals INT;
BEGIN
    FOR v_match IN 
        SELECT lm.* 
        FROM public.league_matches lm
        WHERE lm.status != 'finished'
        AND lm.scheduled_at < (NOW() - INTERVAL '5 minutes')
        AND (lm.home_joined = false OR lm.away_joined = false)
        LIMIT 50
    LOOP
        v_home_strength := 60 + floor(random() * 20);
        v_away_strength := 60 + floor(random() * 20);
        v_home_goals := floor(random() * 2.5);
        v_away_goals := floor(random() * 2.5);

        PERFORM public.finalize_league_match(v_match.id, v_home_goals, v_away_goals);
        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('simulated_count', v_count);
END;
$$;
