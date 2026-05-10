-- 1. Reset broken cup data
DELETE FROM public.cup_matches;
DELETE FROM public.cup_teams;
DELETE FROM public.cup_competitions;

-- 2. New Round Advancement
CREATE OR REPLACE FUNCTION public.advance_cup_round(_cup_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cup RECORD;
    v_winners uuid[] := ARRAY[]::uuid[];
    v_winner_id uuid;
    v_i int;
    v_match_date timestamp with time zone;
    v_next_round int;
BEGIN
    SELECT * INTO v_cup FROM cup_competitions WHERE id = _cup_id;
    IF NOT FOUND OR v_cup.status = 'finished' THEN RETURN; END IF;

    IF EXISTS (SELECT 1 FROM cup_matches WHERE cup_id = _cup_id AND round = v_cup.current_round AND status != 'finished') THEN
        RETURN;
    END IF;

    FOR v_winner_id IN 
        SELECT CASE WHEN home_goals > away_goals THEN home_team_id ELSE away_team_id END
        FROM cup_matches 
        WHERE cup_id = _cup_id AND round = v_cup.current_round
    LOOP
        v_winners := array_append(v_winners, v_winner_id);
    END LOOP;

    v_next_round := v_cup.current_round + 1;

    IF v_next_round > v_cup.total_rounds OR array_length(v_winners, 1) < 2 THEN
        UPDATE cup_competitions SET status = 'finished' WHERE id = _cup_id;
        RETURN;
    END IF;

    v_match_date := (CURRENT_DATE + interval '1 day' + time '12:00:00')::timestamp with time zone;

    FOR v_i IN 1..(array_length(v_winners, 1) / 2) LOOP
        INSERT INTO cup_matches (
          cup_id, round, leg, home_team_id, away_team_id, scheduled_at, status
        ) VALUES (
          _cup_id, v_next_round, 1, v_winners[v_i*2-1], v_winners[v_i*2], v_match_date, 'scheduled'
        );
    END LOOP;

    UPDATE cup_competitions SET current_round = v_next_round WHERE id = _cup_id;
END;
$$;