-- Add flags to world_matches if not present
ALTER TABLE public.world_matches ADD COLUMN IF NOT EXISTS simulated BOOLEAN DEFAULT false;

-- Function to simulate a single BOT vs BOT match realistically
CREATE OR REPLACE FUNCTION public.simulate_realistic_bot_match(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
    v_home_team_id UUID;
    v_away_team_id UUID;
    v_home_strength INT;
    v_away_strength INT;
    v_home_goals INT := 0;
    v_away_goals INT := 0;
    v_home_name TEXT;
    v_away_name TEXT;
    v_league_id UUID;
    v_round INT;
    v_events JSONB := '[]';
    v_player_ratings JSONB := '{}';
    v_goal_scorers JSONB := '[]';
    v_home_player_ids UUID[];
    v_away_player_ids UUID[];
    v_i INT;
    v_scorer_id UUID;
    v_assist_id UUID;
    v_scorer_name TEXT;
    v_assist_name TEXT;
    v_minute INT;
BEGIN
    -- Get match info
    SELECT home_team_id, away_team_id, league_id, round
    INTO v_home_team_id, v_away_team_id, v_league_id, v_round
    FROM public.world_matches WHERE id = p_match_id;

    -- Get team info
    SELECT name, strength INTO v_home_name, v_home_strength FROM public.world_teams WHERE id = v_home_team_id;
    SELECT name, strength INTO v_away_name, v_away_strength FROM public.world_teams WHERE id = v_away_team_id;

    -- Simple strength-based poisson simulation
    v_home_goals := floor(random() * (v_home_strength / 20.0) + (random() * 2));
    v_away_goals := floor(random() * (v_away_strength / 20.0) + (random() * 1.5));
    
    -- Caps
    IF v_home_goals > 7 THEN v_home_goals := 7; END IF;
    IF v_away_goals > 7 THEN v_away_goals := 7; END IF;

    -- Get some players for events
    SELECT array_agg(id) INTO v_home_player_ids FROM (SELECT id FROM public.world_players WHERE team_id = v_home_team_id AND position != 'GOL' ORDER BY overall DESC LIMIT 5) s;
    SELECT array_agg(id) INTO v_away_player_ids FROM (SELECT id FROM public.world_players WHERE team_id = v_away_team_id AND position != 'GOL' ORDER BY overall DESC LIMIT 5) s;

    -- Generate Home Goals
    FOR v_i IN 1..v_home_goals LOOP
        v_scorer_id := v_home_player_ids[1 + floor(random() * array_length(v_home_player_ids, 1))];
        SELECT name INTO v_scorer_name FROM public.world_players WHERE id = v_scorer_id;
        v_minute := floor(random() * 90) + 1;
        
        v_events := v_events || jsonb_build_object(
            'minute', v_minute,
            'type', 'goal',
            'team', 'home',
            'playerName', v_scorer_name,
            'description', '⚽ GOOOL de ' || v_scorer_name || '!'
        );
        
        v_goal_scorers := v_goal_scorers || jsonb_build_object(
            'name', v_scorer_name,
            'team', 'home',
            'minute', v_minute
        );
    END LOOP;

    -- Generate Away Goals
    FOR v_i IN 1..v_away_goals LOOP
        v_scorer_id := v_away_player_ids[1 + floor(random() * array_length(v_away_player_ids, 1))];
        SELECT name INTO v_scorer_name FROM public.world_players WHERE id = v_scorer_id;
        v_minute := floor(random() * 90) + 1;
        
        v_events := v_events || jsonb_build_object(
            'minute', v_minute,
            'type', 'goal',
            'team', 'away',
            'playerName', v_scorer_name,
            'description', '⚽ GOOOL de ' || v_scorer_name || '!'
        );
        
        v_goal_scorers := v_goal_scorers || jsonb_build_object(
            'name', v_scorer_name,
            'team', 'away',
            'minute', v_minute
        );
    END LOOP;

    -- Update match
    UPDATE public.world_matches
    SET status = 'finished',
        home_goals = v_home_goals,
        away_goals = v_away_goals,
        played_at = now(),
        simulated = true,
        match_data = jsonb_build_object(
            'events', v_events,
            'goalScorers', v_goal_scorers,
            'simulated', true,
            'auto_simulated', true
        )
    WHERE id = p_match_id;

    -- Sync stats
    PERFORM public.sync_match_stats(p_match_id, 'world');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to simulate all BOT matches for a round
CREATE OR REPLACE FUNCTION public.simulate_bot_matches_for_round(p_league_id UUID, p_round INT)
RETURNS VOID AS $$
DECLARE
    v_match RECORD;
BEGIN
    FOR v_match IN 
        SELECT m.id 
        FROM public.world_matches m
        JOIN public.world_teams ht ON ht.id = m.home_team_id
        JOIN public.world_teams at ON at.id = m.away_team_id
        WHERE m.league_id = p_league_id 
          AND m.round = p_round 
          AND m.status = 'scheduled'
          AND ht.is_bot = true 
          AND at.is_bot = true
    LOOP
        PERFORM public.simulate_realistic_bot_match(v_match.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
