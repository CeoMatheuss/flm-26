CREATE OR REPLACE FUNCTION public.process_cup_match_results(
  v_match_id UUID,
  v_home_goals INTEGER,
  v_away_goals INTEGER,
  v_is_auto BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cup_id UUID;
    v_home_team_id UUID;
    v_away_team_id UUID;
    v_winner_team_id UUID;
    v_loser_team_id UUID;
    v_prize_amount BIGINT;
    v_rep_gain INTEGER;
    v_round INTEGER;
    v_total_rounds INTEGER;
    v_cup_name TEXT;
    v_home_club_name TEXT;
    v_away_club_name TEXT;
    v_winner_user_id UUID;
    v_save_id UUID;
    v_state JSONB;
    v_current_budget BIGINT;
    v_new_budget BIGINT;
BEGIN
    -- Get match details
    SELECT cup_id, home_team_id, away_team_id, round 
    INTO v_cup_id, v_home_team_id, v_away_team_id, v_round
    FROM public.cup_matches WHERE id = v_match_id;

    SELECT name, total_rounds INTO v_cup_name, v_total_rounds FROM public.cup_competitions WHERE id = v_cup_id;
    SELECT user_id, club_name INTO v_winner_user_id, v_home_club_name FROM public.cup_teams WHERE id = v_home_team_id;
    SELECT club_name INTO v_away_club_name FROM public.cup_teams WHERE id = v_away_team_id;

    -- Determine winner
    IF v_home_goals > v_away_goals THEN
        v_winner_team_id := v_home_team_id;
        v_loser_team_id := v_away_team_id;
        SELECT user_id INTO v_winner_user_id FROM public.cup_teams WHERE id = v_home_team_id;
    ELSE
        v_winner_team_id := v_away_team_id;
        v_loser_team_id := v_home_team_id;
        SELECT user_id INTO v_winner_user_id FROM public.cup_teams WHERE id = v_away_team_id;
    END IF;

    -- Eliminate loser
    UPDATE public.cup_teams SET eliminated = true WHERE id = v_loser_team_id;

    -- Prize calculation
    v_prize_amount := (v_round * 1500000); 
    IF v_round = v_total_rounds THEN
        v_prize_amount := v_prize_amount + 5000000; -- Extra for Champion
    END IF;

    -- Apply to winner if real player
    IF v_winner_user_id IS NOT NULL THEN
        -- Atomic Update to game_saves (JSON state)
        SELECT id, game_state INTO v_save_id, v_state
        FROM public.game_saves
        WHERE user_id = v_winner_user_id
        FOR UPDATE;

        IF v_save_id IS NOT NULL THEN
            v_current_budget := COALESCE((v_state->'club'->>'budget')::BIGINT, 0);
            v_new_budget := v_current_budget + v_prize_amount;
            
            v_state := jsonb_set(
                v_state,
                '{club,budget}',
                to_jsonb(v_new_budget),
                true
            );

            UPDATE public.game_saves
            SET game_state = v_state,
                updated_at = now()
            WHERE id = v_save_id;
            
            -- Also update clubs table for consistency
            UPDATE public.clubs SET budget = v_new_budget WHERE user_id = v_winner_user_id;
        END IF;

        -- Notification
        INSERT INTO public.user_notifications (user_id, title, message, type, icon, data)
        VALUES (
            v_winner_user_id, 
            '💰 Premiação da Copa', 
            'Parabéns! Pela vitória na ' || v_cup_name || ', seu clube recebeu R$ ' || to_char(v_prize_amount, 'FM999G999G999G999') || '.', 
            'success', 
            '🏆',
            jsonb_build_object('amount', v_prize_amount, 'type', 'cup_prize')
        );
    END IF;

    -- Record match in history if not already (auto-sim might have done it, but let's be sure)
    -- Actually we just rely on cup_matches for now.

    -- Generate News
    INSERT INTO public.world_league_news (league_id, title, content, category)
    VALUES (
        (SELECT id FROM public.world_leagues LIMIT 1),
        (CASE WHEN v_home_goals > v_away_goals THEN v_home_club_name ELSE v_away_club_name END) || ' avança na ' || v_cup_name,
        'Em duelo decisivo, o ' || 
        (CASE WHEN v_home_goals > v_away_goals THEN v_home_club_name ELSE v_away_club_name END) || 
        ' superou o adversário por ' || (CASE WHEN v_home_goals > v_away_goals THEN v_home_goals::text || 'x' || v_away_goals::text ELSE v_away_goals::text || 'x' || v_home_goals::text END) ||
        ' e segue vivo na disputa pelo título.',
        'match_report'
    );

    RETURN jsonb_build_object('success', true, 'winner', v_winner_team_id, 'prize', v_prize_amount);
END;
$$;
