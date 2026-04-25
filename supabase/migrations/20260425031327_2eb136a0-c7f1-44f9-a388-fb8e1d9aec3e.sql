-- 1) Realtime para open_friendly_slots
ALTER TABLE public.open_friendly_slots REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.open_friendly_slots;

-- 2) Índice para filtros rápidos
CREATE INDEX IF NOT EXISTS idx_open_friendly_slots_status ON public.open_friendly_slots(status, created_at DESC);

-- 3) Função SECURITY DEFINER atômica de aceite
-- Ela faz UPDATE...WHERE status='open' RETURNING — apenas o primeiro aceite vence,
-- contornando RLS (que só permite o dono atualizar) e impedindo qualquer corrida
CREATE OR REPLACE FUNCTION public.accept_open_friendly_slot(_slot_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user uuid := auth.uid();
  _slot RECORD;
  _my_club_name text;
  _my_stadium_name text;
  _my_stadium_level int;
  _my_capacity int;
  _stadium_caps int[] := ARRAY[5000,8000,12000,18000,25000,32000,40000,50000,60000,72000,82000,90000,100000,110000,120000];
  _invite_id uuid;
  _match_dt timestamptz := now() + interval '5 minutes';
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Lock + reserva atômica: somente o PRIMEIRO request consegue mudar 'open' → 'matched'
  UPDATE public.open_friendly_slots
     SET status = 'matched'
   WHERE id = _slot_id
     AND status = 'open'
     AND user_id <> _user
   RETURNING * INTO _slot;

  IF _slot IS NULL THEN
    -- Diagnóstico: por que falhou?
    SELECT * INTO _slot FROM public.open_friendly_slots WHERE id = _slot_id;
    IF _slot IS NULL THEN
      RAISE EXCEPTION 'SLOT_NOT_FOUND';
    ELSIF _slot.user_id = _user THEN
      RAISE EXCEPTION 'CANNOT_ACCEPT_OWN_SLOT';
    ELSE
      RAISE EXCEPTION 'SLOT_ALREADY_TAKEN';
    END IF;
  END IF;

  -- Busca info do clube do aceitante (auth.uid())
  SELECT club_name, stadium_name, stadium_level
    INTO _my_club_name, _my_stadium_name, _my_stadium_level
  FROM public.get_user_stadium_info(_user) LIMIT 1;

  _my_club_name := COALESCE(_my_club_name, 'Manager');
  _my_stadium_name := COALESCE(_my_stadium_name, 'Estádio');
  _my_stadium_level := COALESCE(_my_stadium_level, 1);
  _my_capacity := _stadium_caps[LEAST(GREATEST(_my_stadium_level,1),15)];

  -- Cria invite já aceito (sender = dono do slot, receiver = quem aceitou)
  INSERT INTO public.friendly_invites (
    sender_id, receiver_id,
    sender_club_name, receiver_club_name,
    sender_stadium, receiver_stadium,
    sender_stadium_capacity, receiver_stadium_capacity,
    home_team_id, match_date, status, tie_breaker
  ) VALUES (
    _slot.user_id, _user,
    _slot.club_name, _my_club_name,
    _slot.stadium_name, _my_stadium_name,
    _slot.stadium_capacity, _my_capacity,
    _slot.user_id, _match_dt, 'accepted', 'none'
  ) RETURNING id INTO _invite_id;

  -- Notifica o dono do slot
  INSERT INTO public.user_notifications (user_id, type, title, message, icon, data)
  VALUES (
    _slot.user_id,
    'friendly_accepted',
    'Amistoso aceito!',
    _my_club_name || ' aceitou sua partida aberta.',
    '⚽',
    jsonb_build_object('invite_id', _invite_id, 'opponent', _my_club_name)
  );

  RETURN jsonb_build_object(
    'success', true,
    'invite_id', _invite_id,
    'opponent_club', _slot.club_name
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.accept_open_friendly_slot(uuid) TO authenticated;