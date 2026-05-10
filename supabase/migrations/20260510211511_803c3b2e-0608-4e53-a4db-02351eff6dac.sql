-- Add target_user_id to admin_logs if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_logs' AND column_name = 'target_user_id') THEN
        ALTER TABLE public.admin_logs ADD COLUMN target_user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Create index for faster club searches and sorting
CREATE INDEX IF NOT EXISTS idx_game_saves_updated_at ON public.game_saves (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_presence_is_online ON public.user_presence (is_online, last_seen DESC);

-- Refine the admin_add_money_to_club RPC
CREATE OR REPLACE FUNCTION public.admin_add_money_to_club(
  p_target_user_id UUID,
  p_amount BIGINT,
  p_reason TEXT DEFAULT 'Ajuste administrativo'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_save_id UUID;
  v_state JSONB;
  v_current BIGINT;
  v_new BIGINT;
  v_club_name TEXT;
BEGIN
  -- Security check: must be admin
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_admin AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Acesso negado: requer privilégios de administrador' USING ERRCODE = '42501';
  END IF;

  -- Validate amount
  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Valor deve ser diferente de zero' USING ERRCODE = '22023';
  END IF;

  -- Lock the row to prevent race conditions
  SELECT id, game_state INTO v_save_id, v_state
  FROM public.game_saves
  WHERE user_id = p_target_user_id
  FOR UPDATE;

  IF v_save_id IS NULL THEN
    RAISE EXCEPTION 'Clube não encontrado para o usuário informado' USING ERRCODE = 'P0002';
  END IF;

  -- Calculate new budget
  v_current := COALESCE((v_state->'club'->>'budget')::BIGINT, 0);
  v_new := GREATEST(0, v_current + p_amount);
  v_club_name := COALESCE(v_state->'club'->>'name', 'Clube');

  -- Update state
  v_state := jsonb_set(
    v_state,
    '{club,budget}',
    to_jsonb(v_new),
    true
  );

  UPDATE public.game_saves
  SET game_state = v_state,
      updated_at = now()
  WHERE id = v_save_id;

  -- Record in logs
  INSERT INTO public.admin_logs (user_id, action, target_user_id, details)
  VALUES (
    v_admin,
    'add_money',
    p_target_user_id,
    jsonb_build_object(
      'amount', p_amount,
      'reason', p_reason,
      'previous_budget', v_current,
      'new_budget', v_new,
      'club_name', v_club_name
    )
  );

  -- Notify the user
  INSERT INTO public.user_notifications (user_id, icon, type, title, message, data)
  VALUES (
    p_target_user_id,
    CASE WHEN p_amount > 0 THEN '💰' ELSE '💸' END,
    'info',
    CASE WHEN p_amount > 0 THEN '💰 Crédito Recebido' ELSE '💸 Débito Administrativo' END,
    'O clube recebeu R$ ' || to_char(ABS(p_amount), 'FM999G999G999G999') || ' da administração. Motivo: ' || p_reason,
    jsonb_build_object('amount', p_amount, 'type', 'admin_adjustment')
  );

  RETURN jsonb_build_object(
    'success', true,
    'club_name', v_club_name,
    'new_budget', v_new,
    'delta', p_amount
  );
END;
$$;