-- Function to simulate a single knockout match
CREATE OR REPLACE FUNCTION public.simulate_cup_match(_match_id UUID)
RETURNS void AS $$
DECLARE
    m RECORD;
    h_goals INTEGER;
    a_goals INTEGER;
    h_pen INTEGER := 0;
    a_pen INTEGER := 0;
    w_id UUID;
BEGIN
    SELECT * INTO m FROM public.beginner_cup_matches WHERE id = _match_id;
    IF m.status = 'finished' THEN RETURN; END IF;

    -- Basic simulation logic
    h_goals := (floor(random() * 4))::int;
    a_goals := (floor(random() * 4))::int;

    -- If draw in knockout, use penalties
    IF h_goals = a_goals THEN
        IF random() > 0.5 THEN
            h_pen := 5; a_pen := 4;
            w_id := m.home_team_id;
        ELSE
            h_pen := 4; a_pen := 5;
            w_id := m.away_team_id;
        END IF;
    ELSE
        w_id := CASE WHEN h_goals > a_goals THEN m.home_team_id ELSE m.away_team_id END;
    END IF;

    UPDATE public.beginner_cup_matches 
    SET 
        home_goals = h_goals, 
        away_goals = a_goals, 
        home_penalties = h_pen, 
        away_penalties = a_pen,
        status = 'finished',
        winner_id = w_id,
        played_at = now()
    WHERE id = _match_id;
END;
$$ LANGUAGE plpgsql;

-- Main Sync function for the Cup
CREATE OR REPLACE FUNCTION public.sync_beginner_cup(_user_id UUID)
RETURNS void AS $$
DECLARE
    curr_month INTEGER := EXTRACT(MONTH FROM now())::INTEGER;
    curr_year INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
    curr_day INTEGER := EXTRACT(DAY FROM now())::INTEGER;
    cup_rec RECORD;
    match_rec RECORD;
BEGIN
    -- 1. Ensure Cup exists for current month
    SELECT * INTO cup_rec FROM public.beginner_cup WHERE season_month = curr_month AND season_year = curr_year;
    
    IF cup_rec.id IS NULL THEN
        -- No cup this month yet? Only create if needed (usually handled by replace_bot_with_player)
        RETURN;
    END IF;

    -- 2. If Day >= 10 and no matches generated yet, generate Fase 1
    IF curr_day >= 10 AND NOT EXISTS (SELECT 1 FROM public.beginner_cup_matches WHERE cup_id = cup_rec.id) THEN
        PERFORM public.generate_beginner_cup_fixtures(cup_rec.id);
    END IF;

    -- 3. Simulate matches for past days
    -- Day 10 matches
    IF curr_day > 10 THEN
        FOR match_rec IN SELECT id FROM public.beginner_cup_matches WHERE cup_id = cup_rec.id AND phase = 'Fase 1' AND status = 'scheduled' LOOP
            PERFORM public.simulate_cup_match(match_rec.id);
        END LOOP;
        -- Advance winners to Quartas
        PERFORM public.advance_cup_winners(cup_rec.id, 'Fase 1');
    END IF;

    -- Day 11 matches
    IF curr_day > 11 THEN
        FOR match_rec IN SELECT id FROM public.beginner_cup_matches WHERE cup_id = cup_rec.id AND phase = 'Quartas de Final' AND status = 'scheduled' LOOP
            PERFORM public.simulate_cup_match(match_rec.id);
        END LOOP;
        PERFORM public.advance_cup_winners(cup_rec.id, 'Quartas de Final');
    END IF;

    -- Day 12 matches
    IF curr_day > 12 THEN
        FOR match_rec IN SELECT id FROM public.beginner_cup_matches WHERE cup_id = cup_rec.id AND phase = 'Semifinal' AND status = 'scheduled' LOOP
            PERFORM public.simulate_cup_match(match_rec.id);
        END LOOP;
        PERFORM public.advance_cup_winners(cup_rec.id, 'Semifinal');
    END IF;

    -- Day 13 matches
    IF curr_day > 13 THEN
        FOR match_rec IN SELECT id FROM public.beginner_cup_matches WHERE cup_id = cup_rec.id AND phase = 'Final' AND status = 'scheduled' LOOP
            PERFORM public.simulate_cup_match(match_rec.id);
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;
