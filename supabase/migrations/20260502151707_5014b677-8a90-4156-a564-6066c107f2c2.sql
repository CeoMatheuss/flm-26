DROP VIEW IF EXISTS public.league_standings;

CREATE VIEW public.league_standings AS
WITH team_stats AS (
    SELECT 
        league_id,
        home_user_id as team_id,
        COUNT(*) filter (where status = 'played') as played,
        COUNT(*) filter (where status = 'played' and home_goals > away_goals) as wins,
        COUNT(*) filter (where status = 'played' and home_goals = away_goals) as draws,
        COUNT(*) filter (where status = 'played' and home_goals < away_goals) as losses,
        SUM(COALESCE(home_goals, 0)) as goals_for,
        SUM(COALESCE(away_goals, 0)) as goals_against
    FROM public.league_matches
    GROUP BY league_id, home_user_id
    
    UNION ALL
    
    SELECT 
        league_id,
        away_user_id as team_id,
        COUNT(*) filter (where status = 'played') as played,
        COUNT(*) filter (where status = 'played' and away_goals > home_goals) as wins,
        COUNT(*) filter (where status = 'played' and away_goals = home_goals) as draws,
        COUNT(*) filter (where status = 'played' and away_goals < home_goals) as losses,
        SUM(COALESCE(away_goals, 0)) as goals_for,
        SUM(COALESCE(home_goals, 0)) as goals_against
    FROM public.league_matches
    GROUP BY league_id, away_user_id
),
aggregated_stats AS (
    SELECT 
        league_id,
        team_id,
        SUM(played) as played,
        SUM(wins) as wins,
        SUM(draws) as draws,
        SUM(losses) as losses,
        SUM(goals_for) as goals_for,
        SUM(goals_against) as goals_against,
        (SUM(wins) * 3 + SUM(draws)) as points,
        (SUM(goals_for) - SUM(goals_against)) as goals_diff
    FROM team_stats
    GROUP BY league_id, team_id
)
SELECT 
    m.*,
    s.played as matches_played,
    s.wins as matches_wins,
    s.draws as matches_draws,
    s.losses as matches_losses,
    s.goals_for as matches_goals_for,
    s.goals_against as matches_goals_against,
    s.points as matches_points,
    s.goals_diff as matches_goals_diff,
    ROW_NUMBER() OVER(PARTITION BY s.league_id ORDER BY s.points DESC, s.goals_diff DESC, s.goals_for DESC) as position
FROM aggregated_stats s
JOIN public.league_members m ON s.team_id = m.id;
