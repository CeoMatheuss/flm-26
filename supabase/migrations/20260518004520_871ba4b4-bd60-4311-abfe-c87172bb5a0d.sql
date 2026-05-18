-- Function to simulate a single BOT vs BOT Custom Tournament match
CREATE OR REPLACE FUNCTION public.simulate_realistic_bot_tournament_match(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
    v_home_team_id UUID;
    v_away_team_id UUID;
    v_home_strength INT;
    v_away_strength INT;
    v_home_goals INT := 0;
    v_away_goals INT := 0;
    v_tournament_id UUID;
BEGIN
    SELECT home_team_id, away_team_id, tournament_id
    INTO v_home_team_id, v_away_team_id, v_tournament_id
    FROM public.custom_tournament_matches WHERE id = p_match_id;

    -- Custom tournament teams might have bot_strength or derive from user strength
    SELECT COALESCE(bot_strength, 70) INTO v_home_strength FROM public.custom_tournament_teams WHERE id = v_home_team_id;
    SELECT COALESCE(bot_strength, 70) INTO v_away_strength FROM public.custom_tournament_teams WHERE id = v_away_team_id;

    v_home_goals := floor(random() * (v_home_strength / 25.0) + (random() * 2));
    v_away_goals := floor(random() * (v_away_strength / 25.0) + (random() * 1.5));
    
    UPDATE public.custom_tournament_matches
    SET status = 'finished',
        home_goals = v_home_goals,
        away_goals = v_away_goals,
        played_at = now(),
        match_data = jsonb_build_object('simulated', true, 'auto_simulated', true)
    WHERE id = p_match_id;

    -- Standings are usually updated by triggers or need manual update
    -- Assuming a trigger exists for custom_tournament_matches results
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the main simulation function to include custom tournaments
CREATE OR REPLACE FUNCTION public.simulate_bot_matches_for_round(p_competition_id UUID, p_round INT, p_type TEXT)
RETURNS VOID AS $$
DECLARE
    v_match RECORD;
BEGIN
    IF p_type = 'world' THEN
        FOR v_match IN 
            SELECT m.id 
            FROM public.world_matches m
            JOIN public.world_teams ht ON ht.id = m.home_team_id
            JOIN public.world_teams at ON at.id = m.away_team_id
            WHERE m.league_id = p_competition_id 
              AND m.round = p_round 
              AND m.status = 'scheduled'
              AND ht.is_bot = true 
              AND at.is_bot = true
        LOOP
            PERFORM public.simulate_realistic_bot_match(v_match.id);
        END LOOP;
    ELSIF p_type = 'cup' THEN
        FOR v_match IN
            SELECT m.id
            FROM public.national_cup_matches m
            JOIN public.national_cup_teams ht ON ht.id = m.home_team_id
            JOIN public.national_cup_teams at ON at.id = m.away_team_id
            WHERE m.cup_id = p_competition_id
              AND m.round = p_round
              AND m.status = 'scheduled'
              AND ht.user_id IS NULL
              AND at.user_id IS NULL
        LOOP
            PERFORM public.simulate_realistic_bot_cup_match(v_match.id);
        END LOOP;
    ELSIF p_type = 'tournament' THEN
        FOR v_match IN
            SELECT m.id
            FROM public.custom_tournament_matches m
            JOIN public.custom_tournament_teams ht ON ht.id = m.home_team_id
            JOIN public.custom_tournament_teams at ON at.id = m.away_team_id
            WHERE m.tournament_id = p_competition_id
              AND m.round = p_round
              AND m.status = 'scheduled'
              AND ht.user_id IS NULL
              AND at.user_id IS NULL
        LOOP
            PERFORM public.simulate_realistic_bot_tournament_match(v_match.id);
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
