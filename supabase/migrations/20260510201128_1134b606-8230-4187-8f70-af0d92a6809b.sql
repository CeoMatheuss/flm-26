CREATE OR REPLACE FUNCTION public.process_cup_match_results(v_match_id UUID, v_home_goals INTEGER, v_away_goals INTEGER)
RETURNS VOID AS $$
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
    v_cup_name TEXT;
    v_home_club_name TEXT;
    v_away_club_name TEXT;
BEGIN
    -- Get match details
    SELECT cup_id, home_team_id, away_team_id, round 
    INTO v_cup_id, v_home_team_id, v_away_team_id, v_round
    FROM public.cup_matches WHERE id = v_match_id;

    SELECT name INTO v_cup_name FROM public.cup_competitions WHERE id = v_cup_id;
    SELECT user_id, club_name INTO v_home_user_id, v_home_club_name FROM public.cup_teams WHERE id = v_home_team_id;
    SELECT user_id, club_name INTO v_away_user_id, v_away_club_name FROM public.cup_teams WHERE id = v_away_team_id;

    -- Determine winner
    IF v_home_goals > v_away_goals THEN
        v_winner_team_id := v_home_team_id;
        v_loser_team_id := v_away_team_id;
    ELSE
        v_winner_team_id := v_away_team_id;
        v_loser_team_id := v_home_team_id;
    END IF;

    -- Eliminate loser
    UPDATE public.cup_teams SET eliminated = true WHERE id = v_loser_team_id;

    -- Prize and reputation based on round
    -- Fase 3 (1): 100k, Oitavas (2): 250k, Quartas (3): 500k, Semi (4): 1M, Final (5): 5M
    v_prize_amount := CASE 
        WHEN v_round = 1 THEN 100000 
        WHEN v_round = 2 THEN 250000 
        WHEN v_round = 3 THEN 500000 
        WHEN v_round = 4 THEN 1000000 
        WHEN v_round = 5 THEN 5000000 
        ELSE 50000 
    END;

    v_rep_gain := CASE 
        WHEN v_round = 5 THEN 10 
        WHEN v_round >= 3 THEN 5 
        ELSE 2 
    END;

    -- Apply to winner if real player
    IF v_winner_team_id = v_home_team_id AND v_home_user_id IS NOT NULL THEN
        -- Add prize (we use a rough proxy here as actual budget is in JSON club_data)
        -- In a real scenario, this would trigger a budget update in the save
        -- For now we record it in notifications/logs
        INSERT INTO public.user_notifications (user_id, title, message, type, icon)
        VALUES (v_home_user_id, 'Premiação: ' || v_cup_name, 'Sua equipe venceu e recebeu R$ ' || (v_prize_amount/1000)::text || 'k de bônus!', 'success', '💰');
    ELSIF v_winner_team_id = v_away_team_id AND v_away_user_id IS NOT NULL THEN
        INSERT INTO public.user_notifications (user_id, title, message, type, icon)
        VALUES (v_away_user_id, 'Premiação: ' || v_cup_name, 'Sua equipe venceu e recebeu R$ ' || (v_prize_amount/1000)::text || 'k de bônus!', 'success', '💰');
    END IF;

    -- Generate News
    INSERT INTO public.world_league_news (league_id, title, content, category)
    VALUES (
        (SELECT id FROM public.world_leagues LIMIT 1), -- Global news
        v_home_club_name || ' ' || v_home_goals::text || 'x' || v_away_goals::text || ' ' || v_away_club_name,
        'Em partida eletrizante pela ' || v_cup_name || ', o ' || 
        (CASE WHEN v_home_goals > v_away_goals THEN v_home_club_name ELSE v_away_club_name END) || 
        ' garantiu a classificação para a próxima fase.',
        'match_report'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
