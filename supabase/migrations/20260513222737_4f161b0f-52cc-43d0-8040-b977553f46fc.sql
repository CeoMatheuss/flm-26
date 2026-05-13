-- Function to update league standings with form
CREATE OR REPLACE FUNCTION public.update_league_standings(_league_id UUID) 
RETURNS VOID AS $$
BEGIN
    -- Reset current standings
    UPDATE public.league_members
    SET points = 0, wins = 0, draws = 0, losses = 0, goals_for = 0, goals_against = 0, played = 0, last_5_games = '-----'
    WHERE league_id = _league_id;

    -- Update based on all 'played' matches
    WITH match_results AS (
        SELECT 
            home_team_id as team_id,
            home_goals as gf,
            away_goals as ga,
            CASE WHEN home_goals > away_goals THEN 3 WHEN home_goals = away_goals THEN 1 ELSE 0 END as pts,
            CASE WHEN home_goals > away_goals THEN 'V' WHEN home_goals = away_goals THEN 'E' ELSE 'D' END as result,
            played_at
        FROM public.league_matches
        WHERE league_id = _league_id AND status = 'played'
        
        UNION ALL
        
        SELECT 
            away_team_id as team_id,
            away_goals as gf,
            home_goals as ga,
            CASE WHEN away_goals > home_goals THEN 3 WHEN away_goals = home_goals THEN 1 ELSE 0 END as pts,
            CASE WHEN away_goals > home_goals THEN 'V' WHEN away_goals = home_goals THEN 'E' ELSE 'D' END as result,
            played_at
        FROM public.league_matches
        WHERE league_id = _league_id AND status = 'played'
    ),
    aggregated AS (
        SELECT 
            team_id,
            SUM(pts) as total_pts,
            COUNT(CASE WHEN result = 'V' THEN 1 END) as total_w,
            COUNT(CASE WHEN result = 'E' THEN 1 END) as total_d,
            COUNT(CASE WHEN result = 'D' THEN 1 END) as total_l,
            SUM(gf) as total_gf,
            SUM(ga) as total_ga,
            COUNT(*) as total_played,
            -- Calculate last 5 games
            (
                SELECT string_agg(res, '')
                FROM (
                    SELECT result as res
                    FROM match_results mr2
                    WHERE mr2.team_id = match_results.team_id
                    ORDER BY mr2.played_at DESC
                    LIMIT 5
                ) s
            ) as form
        FROM match_results
        GROUP BY team_id
    )
    UPDATE public.league_members lm
    SET 
        points = agg.total_pts,
        wins = agg.total_w,
        draws = agg.total_d,
        losses = agg.total_l,
        goals_for = agg.total_gf,
        goals_against = agg.total_ga,
        played = agg.total_played,
        last_5_games = COALESCE(agg.form, '-----')
    FROM aggregated agg
    WHERE lm.id = agg.team_id AND lm.league_id = _league_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
