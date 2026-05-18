-- Function to simulate a single BOT vs BOT Cup match
CREATE OR REPLACE FUNCTION public.simulate_realistic_bot_cup_match(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
    v_home_team_id UUID;
    v_away_team_id UUID;
    v_home_strength INT;
    v_away_strength INT;
    v_home_score INT := 0;
    v_away_score INT := 0;
    v_cup_id UUID;
    v_winner_id UUID;
BEGIN
    SELECT home_team_id, away_team_id, cup_id
    INTO v_home_team_id, v_away_team_id, v_cup_id
    FROM public.national_cup_matches WHERE id = p_match_id;

    SELECT strength INTO v_home_strength FROM public.national_cup_teams WHERE id = v_home_team_id;
    SELECT strength INTO v_away_strength FROM public.national_cup_teams WHERE id = v_away_team_id;

    v_home_score := floor(random() * (v_home_strength / 25.0) + (random() * 2));
    v_away_score := floor(random() * (v_away_strength / 25.0) + (random() * 1.5));
    
    IF v_home_score > v_away_score THEN 
        v_winner_id := v_home_team_id; 
    ELSIF v_away_score > v_home_score THEN 
        v_winner_id := v_away_team_id; 
    ELSE
        -- Random winner for draw in cup
        IF random() > 0.5 THEN v_winner_id := v_home_team_id; ELSE v_winner_id := v_away_team_id; END IF;
    END IF;

    UPDATE public.national_cup_matches
    SET status = 'finished',
        home_score = v_home_score,
        away_score = v_away_score,
        winner_team_id = v_winner_id,
        updated_at = now(),
        match_data = jsonb_build_object('simulated', true, 'auto_simulated', true)
    WHERE id = p_match_id;

    -- Sync stats
    PERFORM public.sync_match_stats(p_match_id, 'cup');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the main simulation function
CREATE OR REPLACE FUNCTION public.simulate_bot_matches_for_round(p_league_id UUID, p_round INT)
RETURNS VOID AS $$
DECLARE
    v_match RECORD;
BEGIN
    -- 1. World Matches
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

    -- 2. National Cup Matches (if round matches)
    -- This is slightly different as round in cup is phase
    FOR v_match IN
        SELECT m.id
        FROM public.national_cup_matches m
        JOIN public.national_cup_teams ht ON ht.id = m.home_team_id
        JOIN public.national_cup_teams at ON at.id = m.away_team_id
        WHERE m.round = p_round
          AND m.status = 'scheduled'
          AND ht.user_id IS NULL
          AND at.user_id IS NULL
    LOOP
        PERFORM public.simulate_realistic_bot_cup_match(v_match.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
