CREATE OR REPLACE FUNCTION public.replace_bot_with_player(
  _league_id uuid,
  _user_id uuid,
  _club_name text,
  _club_logo text DEFAULT '⚽'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bot_member_id uuid;
  _existing uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Já está na liga?
  SELECT id INTO _existing
  FROM public.league_members
  WHERE league_id = _league_id AND user_id = _user_id
  LIMIT 1;
  IF _existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'ALREADY_IN_LEAGUE', 'member_id', _existing);
  END IF;

  -- Pega o bot mais fraco (faz sentido: jogador novo herda time fraco)
  SELECT id INTO _bot_member_id
  FROM public.league_members
  WHERE league_id = _league_id
    AND is_bot = true
  ORDER BY COALESCE(bot_strength, 50) ASC, random()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF _bot_member_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'NO_BOT_SLOT_AVAILABLE');
  END IF;

  -- Substitui: jogador herda a vaga + estatísticas atuais (rodadas já jogadas).
  UPDATE public.league_members
  SET user_id = _user_id,
      is_bot = false,
      bot_strength = NULL,
      club_name = _club_name,
      club_logo = _club_logo,
      updated_at = now()
  WHERE id = _bot_member_id;

  RETURN jsonb_build_object(
    'success', true,
    'member_id', _bot_member_id,
    'inherited_slot', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.replace_bot_with_player(uuid, uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.replace_bot_with_player(uuid, uuid, text, text) TO authenticated;