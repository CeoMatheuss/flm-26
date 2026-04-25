DROP VIEW IF EXISTS public.public_club_profiles;

CREATE VIEW public.public_club_profiles
WITH (security_invoker = true)
AS
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
FROM public.game_saves gs;

GRANT SELECT ON public.public_club_profiles TO authenticated, anon;

-- Política dedicada para que a view consiga ler dados públicos via security invoker.
-- Cria uma policy SELECT específica para clube público (somente colunas seguras já filtradas pela view).
DROP POLICY IF EXISTS "Public club profile read" ON public.game_saves;
CREATE POLICY "Public club profile read"
ON public.game_saves
FOR SELECT
TO authenticated, anon
USING (true);