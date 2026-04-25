CREATE OR REPLACE FUNCTION public.get_user_stadium_info(_user_id uuid)
RETURNS TABLE(club_name text, stadium_name text, stadium_level int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(gs.club_data->'club'->>'name', '') AS club_name,
    COALESCE(gs.club_data->'club'->>'stadiumName', 'Estádio') AS stadium_name,
    COALESCE((gs.club_data->'infrastructure'->'stadium'->>'level')::int, 1) AS stadium_level
  FROM public.game_saves gs
  WHERE gs.user_id = _user_id
  ORDER BY gs.updated_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_stadium_info(uuid) TO authenticated, anon;