CREATE OR REPLACE FUNCTION public.admin_add_money_to_club(
  p_target_user_id uuid,
  p_amount bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_is_admin boolean;
  v_save_id uuid;
  v_state jsonb;
  v_current bigint;
  v_new bigint;
  v_club_name text;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT public.has_role(v_admin, 'admin'::app_role) INTO v_is_admin;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Acesso negado: requer admin' USING ERRCODE = '42501';
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Valor inválido' USING ERRCODE = '22023';
  END IF;

  IF abs(p_amount) > 1000000000 THEN
    RAISE EXCEPTION 'Valor excede o limite (±R$ 1B por operação)' USING ERRCODE = '22023';
  END IF;

  -- Lock atômico na linha do save
  SELECT id, game_state INTO v_save_id, v_state
  FROM public.game_saves
  WHERE user_id = p_target_user_id
  FOR UPDATE;

  IF v_save_id IS NULL THEN
    RAISE EXCEPTION 'Save do clube não encontrado' USING ERRCODE = 'P0002';
  END IF;

  v_current := COALESCE((v_state->'club'->>'budget')::bigint, 0);
  v_new := GREATEST(0, v_current + p_amount);
  v_club_name := COALESCE(v_state->'club'->>'name', 'Clube');

  v_state := jsonb_set(
    v_state,
    '{club,budget}',
    to_jsonb(v_new),
    true
  );

  UPDATE public.game_saves
  SET game_state = v_state
  WHERE id = v_save_id;

  -- Log auditável
  INSERT INTO public.admin_logs (admin_id, action, target_user_id, details)
  VALUES (
    v_admin,
    'add_money',
    p_target_user_id,
    jsonb_build_object(
      'amount', p_amount,
      'previous_budget', v_current,
      'new_budget', v_new,
      'club_name', v_club_name
    )
  );

  -- Notifica o jogador
  INSERT INTO public.user_notifications (user_id, icon, type, title, message)
  VALUES (
    p_target_user_id,
    CASE WHEN p_amount > 0 THEN '💰' ELSE '⚠️' END,
    CASE WHEN p_amount > 0 THEN 'success' ELSE 'warning' END,
    CASE WHEN p_amount > 0 THEN 'Crédito da Administração' ELSE 'Ajuste da Administração' END,
    'Saldo ajustado em R$ ' || p_amount::text || '. Novo saldo: R$ ' || v_new::text || '.'
  );

  RETURN jsonb_build_object(
    'success', true,
    'club_name', v_club_name,
    'previous_budget', v_current,
    'new_budget', v_new,
    'delta', p_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_add_money_to_club(uuid, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_add_money_to_club(uuid, bigint) TO authenticated;