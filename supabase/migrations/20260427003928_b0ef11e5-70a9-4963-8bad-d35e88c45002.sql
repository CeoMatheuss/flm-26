-- RPC: verifica disponibilidade de nome de clube e sugere variações
CREATE OR REPLACE FUNCTION public.check_club_name_available(_name text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
  exists_count int;
  suggestions text[] := ARRAY[]::text[];
  candidate text;
  i int;
BEGIN
  normalized := trim(_name);
  IF normalized IS NULL OR length(normalized) = 0 THEN
    RETURN jsonb_build_object('available', false, 'reason', 'empty', 'suggestions', '[]'::jsonb);
  END IF;

  -- Verifica em game_saves (clubes humanos)
  SELECT count(*) INTO exists_count
  FROM public.game_saves
  WHERE lower(trim(coalesce(club_data->>'name',''))) = lower(normalized);

  IF exists_count = 0 THEN
    -- Também verifica em league_members (BOT/humanos em ligas)
    SELECT count(*) INTO exists_count
    FROM public.league_members
    WHERE lower(trim(coalesce(club_name,''))) = lower(normalized);
  END IF;

  IF exists_count = 0 THEN
    RETURN jsonb_build_object('available', true, 'suggestions', '[]'::jsonb);
  END IF;

  -- Gera 3 sugestões: "Nome FC", "Nome 2", "Nome United"
  FOR candidate IN
    SELECT v FROM (VALUES
      (normalized || ' FC'),
      (normalized || ' 2'),
      (normalized || ' United'),
      ('Real ' || normalized),
      (normalized || ' City')
    ) AS t(v)
  LOOP
    SELECT count(*) INTO exists_count
    FROM public.game_saves
    WHERE lower(trim(coalesce(club_data->>'name',''))) = lower(candidate);
    IF exists_count = 0 THEN
      SELECT count(*) INTO exists_count
      FROM public.league_members
      WHERE lower(trim(coalesce(club_name,''))) = lower(candidate);
    END IF;
    IF exists_count = 0 THEN
      suggestions := array_append(suggestions, candidate);
      EXIT WHEN array_length(suggestions, 1) >= 3;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'available', false,
    'reason', 'duplicate',
    'suggestions', to_jsonb(suggestions)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_club_name_available(text) TO anon, authenticated;