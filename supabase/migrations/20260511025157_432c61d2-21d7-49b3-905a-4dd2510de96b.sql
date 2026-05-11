-- 1. Garante a existência da tabela de logs administrativos
CREATE TABLE IF NOT EXISTS public.admin_finance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    target_user_id UUID REFERENCES auth.users(id),
    amount BIGINT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Habilita RLS nos logs
ALTER TABLE public.admin_finance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view finance logs" ON public.admin_finance_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 3. Função Principal: Gerenciamento de Saldo Admin
CREATE OR REPLACE FUNCTION public.execute_admin_money_transfer(
    p_target_id UUID,
    p_value BIGINT,
    p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
    v_old_bal BIGINT;
    v_new_bal BIGINT;
    v_club_name TEXT;
BEGIN
    -- Validação de Admin
    v_admin_id := auth.uid();
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Ação não autorizada. Apenas administradores podem gerenciar finanças.';
    END IF;

    -- Busca clube e lock
    SELECT budget, name INTO v_old_bal, v_club_name
    FROM public.clubs
    WHERE user_id = p_target_id
    FOR UPDATE;

    IF v_club_name IS NULL THEN
        RAISE EXCEPTION 'O usuário alvo não possui um clube ativo.';
    END IF;

    -- Executa Transação
    UPDATE public.clubs
    SET budget = budget + p_value,
        updated_at = now()
    WHERE user_id = p_target_id
    RETURNING budget INTO v_new_bal;

    -- Log de Auditoria
    INSERT INTO public.admin_finance_logs (admin_id, target_user_id, amount, reason)
    VALUES (v_admin_id, p_target_id, p_value, p_description);

    -- Notificação de Sistema
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        p_target_id,
        '💼 Movimentação Administrativa',
        'Seu saldo foi alterado em R$ ' || TO_CHAR(p_value, 'FM999G999G999G999') || '. Motivo: ' || p_description,
        'finance'
    );

    RETURN jsonb_build_object(
        'status', 'success',
        'club', v_club_name,
        'previous_balance', v_old_bal,
        'current_balance', v_new_bal,
        'difference', p_value
    );
END;
$$;
