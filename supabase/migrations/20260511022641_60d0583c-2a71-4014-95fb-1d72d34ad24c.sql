-- Função para inicializar a tabela da liga com dados fictícios para teste/visualização
CREATE OR REPLACE FUNCTION public.seed_league_data(p_league_id UUID)
RETURNS void AS $$
DECLARE
    team_rec RECORD;
BEGIN
    FOR team_rec IN SELECT id FROM public.world_teams WHERE league_id = p_league_id LOOP
        -- Insere ou atualiza dados base
        INSERT INTO public.world_league_table (
            league_id, team_id, points, played, wins, draws, losses, goals_for, goals_against, last_5_games
        ) VALUES (
            p_league_id, team_rec.id, 
            floor(random() * 20)::int, -- pontos aleatórios
            floor(random() * 10)::int + 5, -- jogos
            0, 0, 0, 0, 0,
            (ARRAY['V','E','D','V','V', 'D', 'E'])[floor(random() * 7 + 1)] || 
            (ARRAY['V','E','D','V','V', 'D', 'E'])[floor(random() * 7 + 1)] ||
            (ARRAY['V','E','D','V','V', 'D', 'E'])[floor(random() * 7 + 1)] ||
            (ARRAY['V','E','D','V','V', 'D', 'E'])[floor(random() * 7 + 1)] ||
            (ARRAY['V','E','D','V','V', 'D', 'E'])[floor(random() * 7 + 1)]
        )
        ON CONFLICT (league_id, team_id) DO UPDATE SET
            points = EXCLUDED.points,
            played = EXCLUDED.played,
            last_5_games = EXCLUDED.last_5_games;
            
        -- Recalcula wins/draws/losses baseado nos pontos (apenas para simulação visual)
        UPDATE public.world_league_table 
        SET 
            wins = floor(points / 3),
            draws = points % 3,
            losses = played - floor(points / 3) - (points % 3),
            goals_for = played * 2,
            goals_against = played + floor(random() * 5)
        WHERE league_id = p_league_id AND team_id = team_rec.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
