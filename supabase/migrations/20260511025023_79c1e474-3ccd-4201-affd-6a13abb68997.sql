-- Cria a função RPC para adicionar dinheiro (admin only)
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
    v_old_budget BIGINT;
    v_new_budget BIGINT;
    v_club_name TEXT;
    v_admin_id UUID;
    v_result JSONB;
BEGIN
    -- 1. Verifica se quem chama é admin
    v_admin_id := auth.uid();
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Acesso negado: Somente administradores podem realizar esta operação.';
    END IF;

    -- 2. Busca clube do alvo e lock para update
    SELECT budget, name INTO v_old_budget, v_club_name
    FROM public.clubs
    WHERE user_id = p_target_user_id
    FOR UPDATE;

    IF v_club_name IS NULL THEN
        RAISE EXCEPTION 'Clube não encontrado para o usuário informado.';
    END IF;

    -- 3. Atualiza o saldo
    UPDATE public.clubs
    SET budget = budget + p_amount,
        updated_at = now()
    WHERE user_id = p_target_user_id
    RETURNING budget INTO v_new_budget;

    -- 4. Registra no Log de Auditoria
    INSERT INTO public.admin_logs (user_id, action, target_user_id, details)
    VALUES (
        v_admin_id,
        'add_money',
        p_target_user_id,
        jsonb_build_object(
            'amount', p_amount,
            'reason', p_reason,
            'club_name', v_club_name,
            'old_budget', v_old_budget,
            'new_budget', v_new_budget
        )
    );

    -- 5. Envia Notificação (se existir tabela de notificações)
    -- Tenta inserir na tabela de notificações do sistema
    BEGIN
        INSERT INTO public.notifications (user_id, title, message, type, is_read, created_at)
        VALUES (
            p_target_user_id,
            CASE WHEN p_amount >= 0 THEN '💰 Bônus Recebido!' ELSE '💸 Ajuste Financeiro' END,
            'Seu clube recebeu um ajuste de R$ ' || TO_CHAR(p_amount, 'FM999G999G999G999') || '. Motivo: ' || p_reason,
            'finance',
            false,
            now()
        );
    EXCEPTION WHEN OTHERS THEN
        -- Se a tabela de notificações não existir ou falhar, apenas ignora
    END;

    -- 6. Retorna resultado para o frontend
    v_result := jsonb_build_object(
        'success', true,
        'club_name', v_club_name,
        'old_budget', v_old_budget,
        'new_budget', v_new_budget,
        'delta', p_amount
    );

    RETURN v_result;
END;
$$;
