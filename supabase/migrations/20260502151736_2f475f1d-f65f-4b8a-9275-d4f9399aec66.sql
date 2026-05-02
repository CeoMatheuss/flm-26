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
    m.id,
    m.league_id,
    m.user_id,
    m.club_name,
    m.club_logo,
    m.reputation,
    m.budget,
    m.joined_at,
    s.played,
    s.wins,
    s.draws,
    s.losses,
    s.goals_for,
    s.goals_against,
    s.points,
    s.goals_diff,
    ROW_NUMBER() OVER(PARTITION BY s.league_id ORDER BY s.points DESC, s.goals_diff DESC, s.goals_for DESC) as position
FROM aggregated_stats s
JOIN public.league_members m ON s.team_id = m.id;
