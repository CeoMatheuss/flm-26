-- 1. Fix world_matches for Division 1
UPDATE public.world_matches wm
SET kickoff_at = (kickoff_at::date + time '19:30:00')::timestamp with time zone
FROM public.world_leagues wl
WHERE wm.league_id = wl.id
  AND wl.division = 1
  AND wm.status = 'scheduled';

-- 2. Deduplicate world_matches
DELETE FROM public.world_matches
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY league_id, matchday, home_team_id, away_team_id ORDER BY created_at ASC) as row_num
        FROM public.world_matches
    ) t
    WHERE t.row_num > 1
);

-- 3. Ensure 16 teams in world_leagues (by adding bots to world_league_teams if needed)
-- This is more complex because world_league_teams is a separate table.
-- For now, let's just make sure we don't have broken data.
