CREATE OR REPLACE FUNCTION public.check_and_advance_league_round(p_league_id UUID)
RETURNS VOID AS $$
DECLARE
    v_current_round INT;
    v_unfinished_matches INT;
BEGIN
    -- Get current round
    SELECT current_round INTO v_current_round FROM public.world_leagues WHERE id = p_league_id;

    -- Count unfinished matches in the current round
    SELECT COUNT(*) INTO v_unfinished_matches 
    FROM public.world_matches 
    WHERE league_id = p_league_id 
      AND round = v_current_round 
      AND status != 'finished';

    -- If all finished, advance round
    IF v_unfinished_matches = 0 THEN
        UPDATE public.world_leagues 
        SET current_round = current_round + 1 
        WHERE id = p_league_id;
        
        -- You could also trigger newspaper generation or other end-of-round events here
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the simulation function to call round advancement
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
        
        -- Check if all matches in round are now finished and advance
        PERFORM public.check_and_advance_league_round(p_competition_id);
        
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
