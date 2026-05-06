
-- 1. Dedupe game_saves: keep latest per user
DELETE FROM public.game_saves a USING public.game_saves b
WHERE a.user_id = b.user_id AND a.updated_at < b.updated_at;

-- 2. UNIQUE constraint to prevent silent duplicates AND enable upsert
ALTER TABLE public.game_saves ADD CONSTRAINT game_saves_user_id_unique UNIQUE (user_id);

-- 3. Replace bot RPC: prefer same country, fallback global
CREATE OR REPLACE FUNCTION public.replace_bot_with_player(_league_id uuid, _user_id uuid, _club_name text, _club_logo text DEFAULT '⚽')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bot_member_id uuid;
  _existing uuid;
  _user_country text;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT id INTO _existing FROM public.league_members
  WHERE league_id = _league_id AND user_id = _user_id LIMIT 1;
  IF _existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'ALREADY_IN_LEAGUE', 'member_id', _existing);
  END IF;

  -- Resolve user country from game_saves
  SELECT club_data->'club'->>'country' INTO _user_country
  FROM public.game_saves WHERE user_id = _user_id LIMIT 1;

  -- Prefer bot from same country (if column exists), then weakest
  SELECT id INTO _bot_member_id
  FROM public.league_members
  WHERE league_id = _league_id AND is_bot = true
  ORDER BY
    CASE WHEN _user_country IS NOT NULL AND COALESCE(country, '') = _user_country THEN 0 ELSE 1 END,
    COALESCE(bot_strength, 50) ASC,
    random()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF _bot_member_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'NO_BOT_SLOT_AVAILABLE');
  END IF;

  UPDATE public.league_members
  SET user_id = _user_id, is_bot = false, bot_strength = NULL,
      club_name = _club_name, club_logo = _club_logo
  WHERE id = _bot_member_id;

  RETURN jsonb_build_object('success', true, 'member_id', _bot_member_id);
EXCEPTION WHEN undefined_column THEN
  -- Fallback se 'country' não existe em league_members
  SELECT id INTO _bot_member_id
  FROM public.league_members
  WHERE league_id = _league_id AND is_bot = true
  ORDER BY COALESCE(bot_strength, 50) ASC, random()
  LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF _bot_member_id IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'NO_BOT_SLOT_AVAILABLE'); END IF;
  UPDATE public.league_members SET user_id = _user_id, is_bot = false, bot_strength = NULL,
    club_name = _club_name, club_logo = _club_logo WHERE id = _bot_member_id;
  RETURN jsonb_build_object('success', true, 'member_id', _bot_member_id);
END;
$$;

REVOKE ALL ON FUNCTION public.replace_bot_with_player(uuid, uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.replace_bot_with_player(uuid, uuid, text, text) TO authenticated;

-- 4. Enable realtime on world_matches & world_league_table
ALTER TABLE public.world_matches REPLICA IDENTITY FULL;
ALTER TABLE public.world_league_table REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.world_matches;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.world_league_table;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
