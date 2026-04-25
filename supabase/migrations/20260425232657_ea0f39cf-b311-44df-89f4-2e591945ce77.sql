
CREATE OR REPLACE FUNCTION public.get_user_upcoming_matches(_user_id uuid, _limit int DEFAULT 10)
RETURNS TABLE (
  competition_type text,
  competition_name text,
  priority int,
  match_id uuid,
  stage text,
  home_club text,
  away_club text,
  is_home boolean,
  scheduled_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH all_matches AS (
    -- 1. Mundial de Clubes
    SELECT 
      'world_cup'::text AS competition_type,
      cwc.name AS competition_name,
      1 AS priority,
      cwcm.id AS match_id,
      cwcm.stage AS stage,
      home.club_name AS home_club,
      away.club_name AS away_club,
      (home.user_id = _user_id) AS is_home,
      cwcm.scheduled_at
    FROM club_world_cup_matches cwcm
    JOIN club_world_cups cwc ON cwc.id = cwcm.cup_id
    JOIN club_world_cup_teams home ON home.id = cwcm.home_team_id
    JOIN club_world_cup_teams away ON away.id = cwcm.away_team_id
    WHERE cwcm.status = 'scheduled'
      AND (home.user_id = _user_id OR away.user_id = _user_id)

    UNION ALL

    -- 2. Continental
    SELECT
      'continental'::text,
      ('Continental ' || INITCAP(cc.tier) || ' · ' || cc.continent),
      CASE WHEN cc.tier = 'principal' THEN 2 ELSE 3 END,
      cm.id,
      cm.stage,
      ht.club_name,
      at.club_name,
      (ht.user_id = _user_id),
      cm.scheduled_at
    FROM continental_matches cm
    JOIN continental_competitions cc ON cc.id = cm.competition_id
    JOIN continental_teams ht ON ht.id = cm.home_team_id
    JOIN continental_teams at ON at.id = cm.away_team_id
    WHERE cm.status = 'scheduled'
      AND (ht.user_id = _user_id OR at.user_id = _user_id)

    UNION ALL

    -- 3. Copa Nacional
    SELECT
      'national_cup'::text,
      cc.name,
      4,
      cm.id,
      CASE cc.current_round
        WHEN 1 THEN 'R32' WHEN 2 THEN 'R16' WHEN 3 THEN 'Quartas'
        WHEN 4 THEN 'Semi' WHEN 5 THEN 'Final'
        ELSE 'R' || cc.current_round::text
      END,
      ht.club_name,
      at.club_name,
      (ht.user_id = _user_id),
      cm.scheduled_at
    FROM cup_matches cm
    JOIN cup_competitions cc ON cc.id = cm.cup_id
    JOIN cup_teams ht ON ht.id = cm.home_team_id
    JOIN cup_teams at ON at.id = cm.away_team_id
    WHERE cm.status = 'scheduled'
      AND cc.cup_type = 'national'
      AND (ht.user_id = _user_id OR at.user_id = _user_id)

    UNION ALL

    -- 4. Liga
    SELECT
      'league'::text,
      ml.name,
      5,
      lm.id,
      'Rodada ' || lm.round::text,
      hm.club_name,
      am.club_name,
      (lm.home_user_id = _user_id),
      lm.auto_sim_at
    FROM league_matches lm
    JOIN multiplayer_leagues ml ON ml.id = lm.league_id
    JOIN league_members hm ON hm.league_id = lm.league_id AND hm.user_id = lm.home_user_id
    JOIN league_members am ON am.league_id = lm.league_id AND am.user_id = lm.away_user_id
    WHERE lm.status = 'scheduled'
      AND lm.auto_sim_at IS NOT NULL
      AND (lm.home_user_id = _user_id OR lm.away_user_id = _user_id)
  )
  SELECT * FROM all_matches
  ORDER BY scheduled_at ASC, priority ASC
  LIMIT _limit;
$$;
