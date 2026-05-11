CREATE OR REPLACE FUNCTION public.get_club_shields_by_names(_names text[])
RETURNS TABLE(club_name text, shield jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT DISTINCT ON (cd->'club'->>'name')
    cd->'club'->>'name' AS club_name,
    COALESCE(
      cd->'club'->'shieldConfig',
      cd->'club'->'shield_config',
      cd->'club'->'shield',
      jsonb_build_object(
        'pattern', cd->'club'->>'shieldPattern',
        'shape', cd->'club'->>'shieldShape',
        'icon', cd->'club'->>'shieldIcon',
        'primaryColor', cd->'club'->>'primaryColor',
        'secondaryColor', cd->'club'->>'secondaryColor',
        'detailColor', cd->'club'->>'detailColor',
        'logoUrl', cd->'club'->>'logoUrl'
      )
    ) AS shield
  FROM (
    SELECT club_data AS cd, updated_at
    FROM public.game_saves
    WHERE club_data->'club'->>'name' = ANY(_names)
    ORDER BY updated_at DESC
  ) s
  WHERE cd->'club'->>'name' IS NOT NULL;
$function$;