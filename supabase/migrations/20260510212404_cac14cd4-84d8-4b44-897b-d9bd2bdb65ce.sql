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
    v_home_user_id UUID;
    v_away_user_id UUID;
    v_prize_amount BIGINT;
    v_rep_gain INTEGER;
    v_round INTEGER;
    v_total_rounds INTEGER;
    v_cup_name TEXT;
    v_home_club_name TEXT;
    v_away_club_name TEXT;
    v_winner_user_id UUID;
BEGIN
    -- Get match details
    SELECT cup_id, home_team_id, away_team_id, round 
    INTO v_cup_id, v_home_team_id, v_away_team_id, v_round
    FROM public.cup_matches WHERE id = v_match_id;

    SELECT name, total_rounds INTO v_cup_name, v_total_rounds FROM public.cup_competitions WHERE id = v_cup_id;
    SELECT user_id, club_name INTO v_home_user_id, v_home_club_name FROM public.cup_teams WHERE id = v_home_team_id;
    SELECT user_id, club_name INTO v_away_user_id, v_away_club_name FROM public.cup_teams WHERE id = v_away_team_id;

    -- Determine winner
    IF v_home_goals > v_away_goals THEN
        v_winner_team_id := v_home_team_id;
        v_loser_team_id := v_away_team_id;
        v_winner_user_id := v_home_user_id;
    ELSE
        v_winner_team_id := v_away_team_id;
        v_loser_team_id := v_home_team_id;
        v_winner_user_id := v_away_user_id;
    END IF;

    -- Eliminate loser
    UPDATE public.cup_teams SET eliminated = true WHERE id = v_loser_team_id;

    -- Prize and reputation based on remaining phases
    -- Using a scale: Phase 1 (1M), Phase 2 (2M)... Final (10M)
    -- Or just specific tiers if easier
    v_prize_amount := (v_round * 1000000); 
    IF v_round = v_total_rounds THEN
        v_prize_amount := 10000000; -- Extra for Champion
    END IF;

    v_rep_gain := 2 + (v_round * 2);

    -- Apply to winner if real player
    IF v_winner_user_id IS NOT NULL THEN
        -- Add prize via admin_add_money_to_club RPC (if it supports nested calls or direct logic)
        -- For now we do a direct state update if we can, or just notifications for the frontend to handle
        INSERT INTO public.user_notifications (user_id, title, message, type, icon, data)
        VALUES (
            v_winner_user_id, 
            '💰 Vitória na Copa: ' || v_cup_name, 
            'Sua equipe avançou e recebeu R$ ' || to_char(v_prize_amount, 'FM999G999G999G999') || ' de premiação!', 
            'success', 
            '🏆',
            jsonb_build_object('amount', v_prize_amount, 'type', 'cup_prize')
        );
        
        -- Try to update actual budget in game_saves if we have the JSON state
        -- This is safer done in frontend when notification is received or via a dedicated sync
    END IF;

    -- Generate News
    INSERT INTO public.world_league_news (league_id, title, content, category)
    VALUES (
        (SELECT id FROM public.world_leagues LIMIT 1),
        v_home_club_name || ' ' || v_home_goals::text || 'x' || v_away_goals::text || ' ' || v_away_club_name,
        'Em partida emocionante pela ' || v_cup_name || ', o ' || 
        (CASE WHEN v_home_goals > v_away_goals THEN v_home_club_name ELSE v_away_club_name END) || 
        ' carimbou sua vaga para a ' || (v_round + 1)::text || 'ª fase.',
        'match_report'
    );

    RETURN jsonb_build_object('success', true, 'winner', v_winner_team_id);
END;
$$;
