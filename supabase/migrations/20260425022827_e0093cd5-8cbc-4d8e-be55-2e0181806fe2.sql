-- Calcula a força (média OVR top 11) do time de qualquer usuário
CREATE OR REPLACE FUNCTION public.get_user_team_strength(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _players jsonb;
  _strength int;
BEGIN
  SELECT (gs.club_data->'players')
    INTO _players
  FROM public.game_saves gs
  WHERE gs.user_id = _user_id
  ORDER BY gs.updated_at DESC
  LIMIT 1;

  IF _players IS NULL OR jsonb_typeof(_players) <> 'array' OR jsonb_array_length(_players) = 0 THEN
    RETURN 60;
  END IF;

  SELECT COALESCE(round(avg(ovr))::int, 60)
    INTO _strength
  FROM (
    SELECT COALESCE(
             NULLIF((p->>'overall'),'')::int,
             NULLIF((p->>'ovr'),'')::int,
             60
           ) AS ovr
    FROM jsonb_array_elements(_players) p
    WHERE COALESCE((p->>'injured')::boolean, false) = false
    ORDER BY ovr DESC
    LIMIT 11
  ) t;

  RETURN COALESCE(_strength, 60);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_team_strength(uuid) TO authenticated, anon;

-- Obtém o "shield" (escudo) público do clube
CREATE OR REPLACE FUNCTION public.get_user_club_shield(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(gs.club_data->'club'->'shield', gs.club_data->'shield')
  FROM public.game_saves gs
  WHERE gs.user_id = _user_id
  ORDER BY gs.updated_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_club_shield(uuid) TO authenticated, anon;

-- Lista de escudos por nome de clube (usado pelo useMatchShields)
CREATE OR REPLACE FUNCTION public.get_club_shields_by_names(_names text[])
RETURNS TABLE(club_name text, shield jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (cd->'club'->>'name')
    cd->'club'->>'name' AS club_name,
    COALESCE(cd->'club'->'shield', cd->'shield') AS shield
  FROM (
    SELECT club_data AS cd, updated_at
    FROM public.game_saves
    WHERE club_data->'club'->>'name' = ANY(_names)
    ORDER BY updated_at DESC
  ) s
  WHERE cd->'club'->>'name' IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_club_shields_by_names(text[]) TO authenticated, anon;