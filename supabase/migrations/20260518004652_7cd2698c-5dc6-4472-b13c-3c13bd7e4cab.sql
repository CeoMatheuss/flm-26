CREATE OR REPLACE FUNCTION public.recalculate_league_table_from_matches(p_league_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    team_rec RECORD;
    v_wins INT;
    v_draws INT;
    v_losses INT;
    v_played INT;
    v_goals_for INT;
    v_goals_against INT;
    v_points INT;
    v_last5 TEXT;
    v_year INT;
    v_month INT;
BEGIN
    -- Get current season from league
    SELECT season_year, season_month INTO v_year, v_month FROM public.world_leagues WHERE id = p_league_id;

    FOR team_rec IN SELECT id FROM public.world_teams WHERE league_id = p_league_id LOOP
        -- Calcula vitórias, empates, derrotas e gols em casa
        SELECT 
            COALESCE(COUNT(*) FILTER (WHERE home_goals > away_goals), 0),
            COALESCE(COUNT(*) FILTER (WHERE home_goals = away_goals), 0),
            COALESCE(COUNT(*) FILTER (WHERE home_goals < away_goals), 0),
            COALESCE(SUM(home_goals), 0),
            COALESCE(SUM(away_goals), 0)
        INTO v_wins, v_draws, v_losses, v_goals_for, v_goals_against
        FROM public.world_matches 
        WHERE league_id = p_league_id 
          AND home_team_id = team_rec.id 
          AND status = 'finished'
          AND season_year = v_year
          AND season_month = v_month;

        -- Adiciona resultados como visitante
        DECLARE
            v_away_wins INT;
            v_away_draws INT;
            v_away_losses INT;
            v_away_gf INT;
            v_away_ga INT;
        BEGIN
            SELECT 
                COALESCE(COUNT(*) FILTER (WHERE away_goals > home_goals), 0),
                COALESCE(COUNT(*) FILTER (WHERE away_goals = home_goals), 0),
                COALESCE(COUNT(*) FILTER (WHERE away_goals < home_goals), 0),
                COALESCE(SUM(away_goals), 0),
                COALESCE(SUM(home_goals), 0)
            INTO v_away_wins, v_away_draws, v_away_losses, v_away_gf, v_away_ga
            FROM public.world_matches 
            WHERE league_id = p_league_id 
              AND away_team_id = team_rec.id 
              AND status = 'finished'
              AND season_year = v_year
              AND season_month = v_month;

            v_wins := v_wins + v_away_wins;
            v_draws := v_draws + v_away_draws;
            v_losses := v_losses + v_away_losses;
            v_goals_for := v_goals_for + v_away_gf;
            v_goals_against := v_goals_against + v_away_ga;
        END;

        v_played := v_wins + v_draws + v_losses;
        v_points := (v_wins * 3) + v_draws;

        -- Calcula a sequência dos últimos 5 jogos reais
        SELECT string_agg(res, '') FROM (
            SELECT 
                CASE 
                    WHEN (home_team_id = team_rec.id AND home_goals > away_goals) OR (away_team_id = team_rec.id AND away_goals > home_goals) THEN 'V'
                    WHEN home_goals = away_goals THEN 'E'
                    ELSE 'D'
                END as res
            FROM public.world_matches
            WHERE (home_team_id = team_rec.id OR away_team_id = team_rec.id) 
              AND status = 'finished'
              AND season_year = v_year
              AND season_month = v_month
            ORDER BY played_at DESC
            LIMIT 5
        ) sub INTO v_last5;

        -- Atualiza a tabela
        INSERT INTO public.world_league_table (
            league_id, team_id, points, played, wins, draws, losses, goals_for, goals_against, last_5_games,
            season_year, season_month
        ) VALUES (
            p_league_id, team_rec.id, 
            v_points, v_played, v_wins, v_draws, v_losses, v_goals_for, v_goals_against, COALESCE(v_last5, '-----'),
            v_year, v_month
        )
        ON CONFLICT (league_id, team_id) DO UPDATE SET
            points = EXCLUDED.points,
            played = EXCLUDED.played,
            wins = EXCLUDED.wins,
            draws = EXCLUDED.draws,
            losses = EXCLUDED.losses,
            goals_for = EXCLUDED.goals_for,
            goals_against = EXCLUDED.goals_against,
            last_5_games = EXCLUDED.last_5_games;
    END LOOP;
END;
$function$;
