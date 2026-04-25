-- Reverter a policy permissiva que reabriu o vazamento
DROP POLICY IF EXISTS "Public club profile read" ON public.game_saves;
DROP VIEW IF EXISTS public.public_club_profiles;

-- Função SECURITY DEFINER: expõe apenas campos públicos do clube
CREATE OR REPLACE FUNCTION public.get_public_club_profile(_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  updated_at timestamptz,
  club_name text,
  club_logo text,
  country text,
  stadium text,
  reputation int,
  fans int,
  members int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    gs.user_id,
    gs.updated_at,
    gs.club_data->>'name'              AS club_name,
    gs.club_data->>'logo'              AS club_logo,
    gs.club_data->>'country'           AS country,
    gs.club_data->>'stadium'           AS stadium,
    (gs.club_data->>'reputation')::int AS reputation,
    (gs.club_data->>'fans')::int       AS fans,
    (gs.club_data->>'members')::int    AS members
  FROM public.game_saves gs
  WHERE gs.user_id = _user_id
  ORDER BY gs.updated_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_club_profile(uuid) TO authenticated, anon;