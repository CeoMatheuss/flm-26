-- Função para sincronizar partidas finalizadas com o histórico
CREATE OR REPLACE FUNCTION public.sync_match_to_history()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_club_name TEXT;
    v_competition TEXT;
    v_is_home BOOLEAN;
    v_stadium TEXT;
    v_home_club_name TEXT;
    v_away_club_name TEXT;
BEGIN
    -- Só processa se o status mudou para 'finished'
    IF NEW.status = 'finished' AND OLD.status != 'finished' THEN
        
        -- Busca informações do time da casa
        SELECT user_id, name INTO v_user_id, v_home_club_name 
        FROM public.world_teams WHERE id = NEW.home_team_id;
        
        -- Busca informações do time de fora
        SELECT name INTO v_away_club_name 
        FROM public.world_teams WHERE id = NEW.away_team_id;

        -- Identifica se o usuário é o dono de algum dos times
        -- (No caso de multiplayer, pode haver dois usuários, mas o histórico é individual)
        
        -- Caso o mandante seja o usuário
        IF v_user_id IS NOT NULL THEN
            INSERT INTO public.match_history (
                user_id, match_type, competition, home_team, away_team, 
                home_goals, away_goals, is_home, stadium_name, played_at
            ) VALUES (
                v_user_id, 'league', 'Liga', v_home_club_name, v_away_club_name,
                NEW.home_goals, NEW.away_goals, TRUE, NEW.stadium, NOW()
            );
        END IF;

        -- Busca informações do time de fora para ver se é outro usuário
        SELECT user_id INTO v_user_id FROM public.world_teams WHERE id = NEW.away_team_id;
        
        IF v_user_id IS NOT NULL THEN
            INSERT INTO public.match_history (
                user_id, match_type, competition, home_team, away_team, 
                home_goals, away_goals, is_home, stadium_name, played_at
            ) VALUES (
                v_user_id, 'league', 'Liga', v_home_club_name, v_away_club_name,
                NEW.home_goals, NEW.away_goals, FALSE, NEW.stadium, NOW()
            );
        END IF;

        -- Atualiza a tabela da liga automaticamente para ambos os times
        -- Mandante
        UPDATE public.world_league_table 
        SET played = played + 1,
            wins = wins + CASE WHEN NEW.home_goals > NEW.away_goals THEN 1 ELSE 0 END,
            draws = draws + CASE WHEN NEW.home_goals = NEW.away_goals THEN 1 ELSE 0 END,
            losses = losses + CASE WHEN NEW.home_goals < NEW.away_goals THEN 1 ELSE 0 END,
            goals_for = goals_for + NEW.home_goals,
            goals_against = goals_against + NEW.away_goals,
            points = points + CASE WHEN NEW.home_goals > NEW.away_goals THEN 3 
                                   WHEN NEW.home_goals = NEW.away_goals THEN 1 ELSE 0 END
        WHERE team_id = NEW.home_team_id;

        -- Visitante
        UPDATE public.world_league_table 
        SET played = played + 1,
            wins = wins + CASE WHEN NEW.away_goals > NEW.home_goals THEN 1 ELSE 0 END,
            draws = draws + CASE WHEN NEW.away_goals = NEW.home_goals THEN 1 ELSE 0 END,
            losses = losses + CASE WHEN NEW.away_goals < NEW.home_goals THEN 1 ELSE 0 END,
            goals_for = goals_for + NEW.away_goals,
            goals_against = goals_against + NEW.home_goals,
            points = points + CASE WHEN NEW.away_goals > NEW.home_goals THEN 3 
                                   WHEN NEW.away_goals = NEW.home_goals THEN 1 ELSE 0 END
        WHERE team_id = NEW.away_team_id;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para world_matches
DROP TRIGGER IF EXISTS tr_sync_match_history ON public.world_matches;
CREATE TRIGGER tr_sync_match_history
AFTER UPDATE ON public.world_matches
FOR EACH ROW EXECUTE FUNCTION public.sync_match_to_history();
