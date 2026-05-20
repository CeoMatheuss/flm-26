-- Garantir que a tabela clubs tenha a coluna total_members para sincronização rápida
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'clubs' AND COLUMN_NAME = 'total_members') THEN
        ALTER TABLE public.clubs ADD COLUMN total_members INTEGER DEFAULT 0;
    END IF;
END $$;

-- Função para entregar itens da loja (usada pelo Webhook e In-game)
CREATE OR REPLACE FUNCTION public.deliver_shop_item(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_club_id UUID;
    v_immediate_fans INTEGER := 0;
    v_immediate_members INTEGER := 0;
    v_immediate_cash BIGINT := 0;
    v_result JSONB;
BEGIN
    -- 1. Obter dados do pedido
    SELECT * INTO v_order FROM payment_orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado');
    END IF;

    IF v_order.delivered THEN
        RETURN jsonb_build_object('success', true, 'message', 'Pedido já entregue');
    END IF;

    -- 2. Obter dados do item
    SELECT * INTO v_item FROM shop_items WHERE id = v_order.item_id;
    -- Se não for um item fixo, tenta pegar do metadata (itens dinâmicos)
    
    -- 3. Identificar o clube do usuário
    SELECT id INTO v_club_id FROM clubs WHERE user_id = v_order.user_id ORDER BY updated_at DESC LIMIT 1;
    IF v_club_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clube não encontrado para o usuário');
    END IF;

    -- 4. Processar bônus baseado na categoria e metadata
    v_immediate_fans := (v_order.metadata->'bonus_data'->>'immediate_fans')::INTEGER;
    v_immediate_members := (v_order.metadata->'bonus_data'->>'immediate_members')::INTEGER;
    v_immediate_cash := (v_order.metadata->'bonus_data'->>'immediate_cash')::BIGINT;

    -- Se vier do shop_items fixo
    IF v_item IS NOT NULL THEN
        v_immediate_fans := COALESCE(v_immediate_fans, (v_item.bonus_data->>'immediate_fans')::INTEGER, 0);
        v_immediate_members := COALESCE(v_immediate_members, (v_item.bonus_data->>'immediate_members')::INTEGER, 0);
        v_immediate_cash := COALESCE(v_immediate_cash, (v_item.bonus_data->>'immediate_cash')::BIGINT, 0);
    END IF;

    -- 5. Aplicar mudanças no clube
    UPDATE clubs 
    SET 
        fans = COALESCE(fans, 0) + COALESCE(v_immediate_fans, 0),
        total_members = COALESCE(total_members, 0) + COALESCE(v_immediate_members, 0),
        budget = COALESCE(budget, 0) + COALESCE(v_immediate_cash, 0),
        updated_at = NOW()
    WHERE id = v_club_id;

    -- 6. Atualizar club_memberships para receita recorrente se for item de sócios
    IF v_item.category = 'members' OR (v_order.metadata->>'category') = 'members' THEN
        INSERT INTO club_memberships (club_id, total_members, last_update)
        VALUES (v_club_id, v_immediate_members, NOW())
        ON CONFLICT (club_id) DO UPDATE 
        SET 
            total_members = club_memberships.total_members + EXCLUDED.total_members,
            last_update = NOW();
    END IF;

    -- 7. Marcar como entregue
    UPDATE payment_orders SET delivered = true, updated_at = NOW() WHERE id = p_order_id;

    -- 8. Log administrativo
    INSERT INTO admin_shop_activity (
        user_id, item_id, item_name, amount_cents, status, transaction_id
    ) VALUES (
        v_order.user_id, v_order.item_id, COALESCE(v_order.metadata->>'item_name', v_item.name), 
        v_order.amount_cents, 'delivered', v_order.payment_id
    );

    RETURN jsonb_build_object(
        'success', true, 
        'fans_added', v_immediate_fans, 
        'members_added', v_immediate_members,
        'cash_added', v_immediate_cash
    );
END;
$$;
