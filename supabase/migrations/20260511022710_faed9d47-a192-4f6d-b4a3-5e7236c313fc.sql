CREATE OR REPLACE FUNCTION public.seed_league_data(p_league_id UUID)
RETURNS void AS $$
DECLARE
    team_rec RECORD;
    v_last5 TEXT;
BEGIN
    FOR team_rec IN SELECT id FROM public.world_teams WHERE league_id = p_league_id LOOP
        v_last5 := (ARRAY['V','E','D','V','V', 'D', 'E'])[floor(random() * 7 + 1)] || 
                   (ARRAY['V','E','D','V','V', 'D', 'E'])[floor(random() * 7 + 1)] ||
                   (ARRAY['V','E','D','V','V', 'D', 'E'])[floor(random() * 7 + 1)] ||
                   (ARRAY['V','E','D','V','V', 'D', 'E'])[floor(random() * 7 + 1)] ||
                   (ARRAY['V','E','D','V','V', 'D', 'E'])[floor(random() * 7 + 1)];

        DELETE FROM public.world_league_table WHERE league_id = p_league_id AND team_id = team_rec.id;
        
        INSERT INTO public.world_league_table (
            league_id, team_id, points, played, wins, draws, losses, goals_for, goals_against, last_5_games,
            season_year, season_month
        ) VALUES (
            p_league_id, team_rec.id, 
            floor(random() * 30)::int,
            floor(random() * 10)::int + 10,
            0, 0, 0, 0, 0,
            v_last5,
            2026, 5 -- Ano e mês atuais conforme sistema
        );
            
        UPDATE public.world_league_table 
        SET 
            wins = floor(points / 3),
            draws = points % 3,
            losses = played - floor(points / 3) - (points % 3),
            goals_for = played * 2,
            goals_against = (played * 2) - floor(points / 3) * 2 -- Ajuste para SG bater
        WHERE league_id = p_league_id AND team_id = team_rec.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
