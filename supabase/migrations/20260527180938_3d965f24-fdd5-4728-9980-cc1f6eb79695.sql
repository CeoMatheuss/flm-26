CREATE OR REPLACE FUNCTION public.sync_world_league_standings(_league_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_season_year int;
BEGIN
    SELECT season_year INTO v_season_year FROM public.world_leagues WHERE id = _league_id;
    v_season_year := COALESCE(v_season_year, 1);

    INSERT INTO public.world_league_standings (league_id, team_id, season_year, played, wins, draws, losses, goals_for, goals_against, points, goal_diff)
    SELECT 
        m.league_id,
        t.id as team_id,
        v_season_year,
        COUNT(m.id) as played,
        COUNT(CASE WHEN (m.home_team_id = t.id AND m.home_goals > m.away_goals) OR (m.away_team_id = t.id AND m.away_goals > m.home_goals) THEN 1 END) as wins,
        COUNT(CASE WHEN m.home_goals = m.away_goals THEN 1 END) as draws,
        COUNT(CASE WHEN (m.home_team_id = t.id AND m.home_goals < m.away_goals) OR (m.away_team_id = t.id AND m.away_goals < m.home_goals) THEN 1 END) as losses,
        SUM(CASE WHEN m.home_team_id = t.id THEN m.home_goals ELSE m.away_goals END) as goals_for,
        SUM(CASE WHEN m.home_team_id = t.id THEN m.away_goals ELSE m.home_goals END) as goals_against,
        SUM(CASE 
            WHEN (m.home_team_id = t.id AND m.home_goals > m.away_goals) OR (m.away_team_id = t.id AND m.away_goals > m.home_goals) THEN 3
            WHEN m.home_goals = m.away_goals THEN 1
            ELSE 0
        END) as points,
        SUM(CASE WHEN m.home_team_id = t.id THEN m.home_goals - m.away_goals ELSE m.away_goals - m.home_goals END) as goal_diff
    FROM public.world_matches m
    JOIN public.world_teams t ON t.id IN (m.home_team_id, m.away_team_id)
    WHERE m.league_id = _league_id AND m.status = 'finished'
    GROUP BY m.league_id, t.id
    ON CONFLICT (league_id, team_id, season_year) DO UPDATE SET
        played = EXCLUDED.played,
        wins = EXCLUDED.wins,
        draws = EXCLUDED.draws,
        losses = EXCLUDED.losses,
        goals_for = EXCLUDED.goals_for,
        goals_against = EXCLUDED.goals_against,
        points = EXCLUDED.points,
        goal_diff = EXCLUDED.goal_diff,
        updated_at = now();
END;
$function$;
