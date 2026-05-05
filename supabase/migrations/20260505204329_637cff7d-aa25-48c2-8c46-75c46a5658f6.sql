-- 1. Create a function to generate dynamic commentary
CREATE OR REPLACE FUNCTION public.get_match_commentary(
    home_name TEXT, 
    away_name TEXT, 
    home_goals INT, 
    away_goals INT,
    match_data JSONB
) RETURNS TEXT AS $$
DECLARE
    diff INT := home_goals - away_goals;
    abs_diff INT := ABS(home_goals - away_goals);
    winner_name TEXT;
    loser_name TEXT;
BEGIN
    IF home_goals = away_goals THEN
        RETURN 'As equipes de ' || home_name || ' e ' || away_name || ' ficaram no empate após um confronto equilibrado de ' || home_goals || 'x' || away_goals || '.';
    END IF;

    IF diff > 0 THEN
        winner_name := home_name;
        loser_name := away_name;
    ELSE
        winner_name := away_name;
        loser_name := home_name;
    END IF;

    IF abs_diff >= 3 THEN
        RETURN 'Uma goleada impressionante! ' || winner_name || ' dominou completamente e venceu o ' || loser_name || ' por ' || GREATEST(home_goals, away_goals) || 'x' || LEAST(home_goals, away_goals) || '.';
    ELSIF abs_diff = 1 AND (home_goals + away_goals) >= 3 THEN
        RETURN 'Partida muito disputada entre ' || home_name || ' e ' || away_name || ', decidida nos detalhes. Placar final: ' || home_goals || 'x' || away_goals || '.';
    ELSE
        RETURN winner_name || ' venceu com autoridade sobre o ' || loser_name || ' nesta rodada. Resultado: ' || home_goals || 'x' || away_goals || '.';
    END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Trigger function to create newspaper entry after league match
CREATE OR REPLACE FUNCTION public.on_league_match_finished()
RETURNS TRIGGER AS $$
DECLARE
    v_home_name TEXT;
    v_away_name TEXT;
    v_commentary TEXT;
    v_league_name TEXT;
    v_league_id UUID;
BEGIN
    -- Only trigger when status changes to 'finished'
    IF (OLD.status = 'scheduled' OR OLD.status = 'live') AND NEW.status = 'finished' THEN
        
        -- Get names
        SELECT club_name INTO v_home_name FROM public.league_members WHERE user_id = NEW.home_user_id OR (user_id IS NULL AND id::text = NEW.home_user_id::text) LIMIT 1;
        SELECT club_name INTO v_away_name FROM public.league_members WHERE user_id = NEW.away_user_id OR (user_id IS NULL AND id::text = NEW.away_user_id::text) LIMIT 1;
        
        -- Get league info
        SELECT name, id INTO v_league_name, v_league_id FROM public.multiplayer_leagues WHERE id = NEW.league_id;

        -- Generate commentary
        v_commentary := public.get_match_commentary(COALESCE(v_home_name, 'Mandante'), COALESCE(v_away_name, 'Visitante'), NEW.home_goals, NEW.away_goals, NEW.match_data);

        -- Create Newspaper Entry
        INSERT INTO public.newspaper_entries (
            text, 
            category, 
            is_event, 
            image_key
        ) VALUES (
            'RODADA ' || NEW.round || ' - ' || COALESCE(v_league_name, 'Liga') || E'\n' ||
            COALESCE(v_home_name, 'Mandante') || ' ' || NEW.home_goals || ' x ' || NEW.away_goals || ' ' || COALESCE(v_away_name, 'Visitante') || E'\n\n' ||
            v_commentary,
            'RESULTADO',
            true,
            'match_result'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. Apply the trigger
DROP TRIGGER IF EXISTS tr_league_match_newspaper ON public.league_matches;
CREATE TRIGGER tr_league_match_newspaper
AFTER UPDATE ON public.league_matches
FOR EACH ROW
EXECUTE FUNCTION public.on_league_match_finished();

-- 4. Update League Rewards Logic
-- Renamed parameter to avoid reserved keyword 'position'
CREATE OR REPLACE FUNCTION public.calculate_league_reward(p_pos INT)
RETURNS BIGINT AS $$
BEGIN
    RETURN CASE
        WHEN p_pos = 1 THEN 18000000
        WHEN p_pos = 2 THEN 12000000
        WHEN p_pos = 3 THEN 10000000
        WHEN p_pos = 4 THEN 8000000
        WHEN p_pos >= 5 AND p_pos <= 8 THEN (6000000 - (p_pos - 5) * 500000)
        WHEN p_pos >= 9 AND p_pos <= 12 THEN (3000000 - (p_pos - 9) * 250000)
        ELSE 0
    END;
END;
$$ LANGUAGE plpgsql SET search_path = public;
