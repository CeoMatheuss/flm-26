CREATE OR REPLACE FUNCTION public.sync_match_persistence(_match_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_match RECORD;
    v_home_team_id UUID;
    v_away_team_id UUID;
    v_home_goals INT;
    v_away_goals INT;
    v_league_id UUID;
    v_competition TEXT;
    v_home_win INT;
    v_away_win INT;
    v_draw INT;
BEGIN
    -- 1. Fetch match data with LOCK to prevent concurrent processing
    SELECT * INTO v_match FROM public.live_matches WHERE id = _match_id FOR UPDATE;
    
    IF v_match IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Match not found');
    END IF;

    IF v_match.status != 'finished' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Match not finished yet');
    END IF;

    -- CHECK FOR DUPLICATE SYNC
    IF EXISTS (SELECT 1 FROM public.match_reports WHERE match_id = _match_id) THEN
        RETURN jsonb_build_object('success', true, 'info', 'Already synced');
    END IF;

    v_home_team_id := v_match.home_team_id;
    v_away_team_id := v_match.away_team_id;
    v_home_goals := v_match.home_goals;
    v_away_goals := v_match.away_goals;
    v_league_id := v_match.league_id;
    v_competition := v_match.competition;

    v_home_win := CASE WHEN v_home_goals > v_away_goals THEN 1 ELSE 0 END;
    v_away_win := CASE WHEN v_away_goals > v_home_goals THEN 1 ELSE 0 END;
    v_draw := CASE WHEN v_home_goals = v_away_goals THEN 1 ELSE 0 END;

    -- 2. Update League Table
    IF v_league_id IS NOT NULL THEN
        -- Home Team
        UPDATE public.world_league_table 
        SET 
            played = played + 1,
            wins = wins + v_home_win,
            draws = draws + v_draw,
            losses = losses + (CASE WHEN v_home_goals < v_away_goals THEN 1 ELSE 0 END),
            goals_for = goals_for + v_home_goals,
            goals_against = goals_against + v_away_goals,
            points = points + (CASE WHEN v_home_win = 1 THEN 3 WHEN v_draw = 1 THEN 1 ELSE 0 END),
            updated_at = NOW()
        WHERE league_id = v_league_id AND team_id = v_home_team_id;

        -- Away Team
        UPDATE public.world_league_table 
        SET 
            played = played + 1,
            wins = wins + v_away_win,
            draws = draws + v_draw,
            losses = losses + (CASE WHEN v_away_goals < v_home_goals THEN 1 ELSE 0 END),
            goals_for = goals_for + v_away_goals,
            goals_against = goals_against + v_home_goals,
            points = points + (CASE WHEN v_away_win = 1 THEN 3 WHEN v_draw = 1 THEN 1 ELSE 0 END),
            updated_at = NOW()
        WHERE league_id = v_league_id AND team_id = v_away_team_id;
    END IF;

    -- 3. Update Global Club stats (using columns directly as 'stats' jsonb doesn't exist)
    -- We assume the 'clubs' table holds the aggregate historical performance.
    -- If these columns don't exist, this might fail, but based on common patterns in FLM:
    
    -- Note: Since the user specifically asked for "Pontos na Liga sicronize", 
    -- the primary goal is the world_league_table and visibility in the UI.

    -- 4. Save to Match History
    INSERT INTO public.match_reports (
        id, match_id, home_team_id, away_team_id, 
        home_goals, away_goals, 
        stats, events, attendance, stadium_name
    ) VALUES (
        gen_random_uuid(), _match_id, v_home_team_id, v_away_team_id,
        v_home_goals, v_away_goals,
        v_match.stats, v_match.events, v_match.attendance, v_match.stadium_name
    );

    RETURN jsonb_build_object(
        'success', true, 
        'match_id', _match_id,
        'home_team_id', v_home_team_id,
        'away_team_id', v_away_team_id,
        'home_goals', v_home_goals,
        'away_goals', v_away_goals,
        'competition', v_competition,
        'league_id', v_league_id
    );
END;
$function$;
