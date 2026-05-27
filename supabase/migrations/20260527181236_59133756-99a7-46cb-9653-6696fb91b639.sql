
-- Add missing foreign keys so PostgREST can embed related tables in the Championships view.

-- 1) world_league_standings.team_id → world_teams.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'world_league_standings_team_id_fkey'
  ) THEN
    -- Clean orphan rows first so the FK can be added
    DELETE FROM public.world_league_standings s
     WHERE NOT EXISTS (SELECT 1 FROM public.world_teams t WHERE t.id = s.team_id);

    ALTER TABLE public.world_league_standings
      ADD CONSTRAINT world_league_standings_team_id_fkey
      FOREIGN KEY (team_id) REFERENCES public.world_teams(id) ON DELETE CASCADE;
  END IF;
END$$;

-- 2) world_player_stats.player_id → world_players.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'world_player_stats_player_id_fkey'
  ) THEN
    DELETE FROM public.world_player_stats ps
     WHERE NOT EXISTS (SELECT 1 FROM public.world_players p WHERE p.id = ps.player_id);

    ALTER TABLE public.world_player_stats
      ADD CONSTRAINT world_player_stats_player_id_fkey
      FOREIGN KEY (player_id) REFERENCES public.world_players(id) ON DELETE CASCADE;
  END IF;
END$$;

-- 3) Helpful indexes for the queries used by ChampionshipsTab
CREATE INDEX IF NOT EXISTS idx_world_league_standings_league_points
  ON public.world_league_standings (league_id, points DESC, goal_diff DESC);

CREATE INDEX IF NOT EXISTS idx_world_player_stats_league_goals
  ON public.world_player_stats (league_id, goals DESC);
