
CREATE OR REPLACE FUNCTION public.cwc_update_standings(
  _home_id uuid, _away_id uuid,
  _hg int, _ag int, _hp int, _ap int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE club_world_cup_teams
  SET played = played + 1,
      wins = wins + CASE WHEN _hp = 3 THEN 1 ELSE 0 END,
      draws = draws + CASE WHEN _hp = 1 THEN 1 ELSE 0 END,
      losses = losses + CASE WHEN _hp = 0 THEN 1 ELSE 0 END,
      goals_for = goals_for + _hg,
      goals_against = goals_against + _ag,
      points = points + _hp
  WHERE id = _home_id;

  UPDATE club_world_cup_teams
  SET played = played + 1,
      wins = wins + CASE WHEN _ap = 3 THEN 1 ELSE 0 END,
      draws = draws + CASE WHEN _ap = 1 THEN 1 ELSE 0 END,
      losses = losses + CASE WHEN _ap = 0 THEN 1 ELSE 0 END,
      goals_for = goals_for + _ag,
      goals_against = goals_against + _hg,
      points = points + _ap
  WHERE id = _away_id;
END;
$$;
