-- 1. Arrumar as partidas da rodada 21 para amanhã (2026-05-21)
UPDATE public.world_matches
SET scheduled_at = '2026-05-21 22:30:00+00',
    auto_sim_at = '2026-05-21 22:35:00+00'
WHERE round = 21;

-- 2. Limpar estatísticas atuais
DELETE FROM public.player_competition_stats;

-- 3. Inserir dados simulados/reais
WITH scorers AS (
    SELECT 
        (jsonb_array_elements(match_data->'homeScorers')->>'id')::uuid as player_id,
        league_id,
        home_team_id as team_id,
        count(*) as goals
    FROM world_matches
    WHERE status = 'finished' AND match_data->'homeScorers' IS NOT NULL
    GROUP BY 1, 2, 3
    UNION ALL
    SELECT 
        (jsonb_array_elements(match_data->'awayScorers')->>'id')::uuid as player_id,
        league_id,
        away_team_id as team_id,
        count(*) as goals
    FROM world_matches
    WHERE status = 'finished' AND match_data->'awayScorers' IS NOT NULL
    GROUP BY 1, 2, 3
),
aggregated_scorers AS (
    SELECT player_id, league_id, team_id, sum(goals) as total_goals
    FROM scorers
    GROUP BY player_id, league_id, team_id
),
random_stats AS (
    SELECT 
        p.id as player_id,
        t.league_id,
        t.id as team_id,
        floor(random() * 5 + 1)::int as assists,
        (15 + floor(random() * 5)::int) as games_played,
        (7.0 + random() * 2.5)::numeric(10,2) as target_avg
    FROM world_players p
    JOIN world_teams t ON p.team_id = t.id
    WHERE t.league_id IS NOT NULL
    LIMIT 100
)
INSERT INTO public.player_competition_stats (player_id, competition_id, team_id, goals, assists, sum_ratings, games_played, season)
SELECT 
    COALESCE(s.player_id, rs.player_id),
    COALESCE(s.league_id, rs.league_id)::text,
    COALESCE(s.team_id, rs.team_id),
    COALESCE(s.total_goals, 0)::int,
    COALESCE(rs.assists, floor(random() * 3)::int),
    (COALESCE(rs.target_avg, (6.5 + random() * 2.0)::numeric(10,2)) * COALESCE(rs.games_played, 18))::numeric,
    COALESCE(rs.games_played, 18),
    2026
FROM aggregated_scorers s
FULL OUTER JOIN random_stats rs ON s.player_id = rs.player_id AND s.league_id = rs.league_id;
