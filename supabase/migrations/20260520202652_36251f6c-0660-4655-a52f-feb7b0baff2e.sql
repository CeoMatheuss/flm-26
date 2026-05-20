
CREATE OR REPLACE FUNCTION public.recompute_player_competition_stats(p_league_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season int;
  v_comp text := p_league_id::text;
BEGIN
  SELECT COALESCE(MAX(season_year), 1) INTO v_season
  FROM world_matches WHERE league_id = p_league_id;

  DELETE FROM player_competition_stats
   WHERE competition_id = v_comp AND season = COALESCE(v_season, 1);

  WITH scorers AS (
    SELECT (s->>'id')::uuid AS player_id
    FROM world_matches m
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m.match_data->'homeScorers','[]'::jsonb)) s
    WHERE m.league_id = p_league_id AND m.status = 'finished' AND s ? 'id'
    UNION ALL
    SELECT (s->>'id')::uuid
    FROM world_matches m
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m.match_data->'awayScorers','[]'::jsonb)) s
    WHERE m.league_id = p_league_id AND m.status = 'finished' AND s ? 'id'
  ),
  goals_agg AS (SELECT player_id, COUNT(*) AS goals FROM scorers GROUP BY player_id),
  ratings AS (
    SELECT (kv.key)::uuid AS player_id, (kv.value)::text::numeric AS rating
    FROM world_matches m
    CROSS JOIN LATERAL jsonb_each(COALESCE(m.match_data->'playerRatings','{}'::jsonb)) kv
    WHERE m.league_id = p_league_id AND m.status = 'finished'
      AND jsonb_typeof(m.match_data->'playerRatings') = 'object'
  ),
  ratings_agg AS (SELECT player_id, COUNT(*) AS games, SUM(rating) AS sum_r FROM ratings GROUP BY player_id),
  combined AS (
    SELECT COALESCE(g.player_id, r.player_id) AS player_id,
           COALESCE(g.goals, 0) AS goals,
           COALESCE(r.games, 0) AS games_played,
           COALESCE(r.sum_r, 0) AS sum_ratings
    FROM goals_agg g FULL OUTER JOIN ratings_agg r ON r.player_id = g.player_id
  )
  INSERT INTO player_competition_stats
    (player_id, competition_id, season, team_id, games_played, goals, assists, yellow_cards, red_cards, clean_sheets, sum_ratings)
  SELECT c.player_id, v_comp, COALESCE(v_season, 1),
         wp.team_id,
         GREATEST(c.games_played, c.goals)::int,
         c.goals::int, 0, 0, 0, 0,
         c.sum_ratings::numeric
  FROM combined c
  LEFT JOIN world_players wp ON wp.id = c.player_id
  WHERE c.player_id IS NOT NULL;
END;
$$;

DO $$
DECLARE l uuid;
BEGIN
  FOR l IN SELECT DISTINCT league_id FROM world_matches WHERE status='finished' AND league_id IS NOT NULL
  LOOP
    PERFORM public.recompute_player_competition_stats(l);
  END LOOP;
END $$;
