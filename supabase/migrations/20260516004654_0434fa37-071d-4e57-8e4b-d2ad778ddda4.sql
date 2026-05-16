-- Adicionar contador de lançamentos disponíveis
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS uniform_launches_available INTEGER DEFAULT 0;

-- Atualizar a função de entrega para lidar com a categoria 'uniform'
CREATE OR REPLACE FUNCTION public.deliver_shop_item(p_order_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_club_id UUID;
BEGIN
    -- 1. Buscar pedido com LOCK para evitar concorrência (Race Conditions)
    SELECT * INTO v_order FROM public.payment_orders WHERE id = p_order_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado', 'status', 'NOT_FOUND');
    END IF;

    -- 2. Validar Status (Só libera se for approved/PAID)
    IF v_order.status != 'approved' AND v_order.status != 'paid' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pagamento não confirmado', 'current_status', v_order.status);
    END IF;

    -- 3. Anti-Duplicação (Verificar se já foi entregue)
    IF v_order.delivered IS TRUE THEN
        RETURN jsonb_build_object('success', true, 'message', 'O produto já foi liberado anteriormente', 'already_delivered', true);
    END IF;

    -- 4. Buscar detalhes do item comprado
    SELECT * INTO v_item FROM public.shop_items WHERE id = v_order.item_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Configuração do item não encontrada');
    END IF;

    -- 5. Buscar o clube vinculado ao usuário
    SELECT id INTO v_club_id FROM public.clubs WHERE user_id = v_order.user_id;

    -- 6. Lógica de Liberação Baseada no Tipo de Produto
    CASE v_item.category
        WHEN 'finance' THEN
            -- Liberação de Créditos/Dinheiro no Jogo
            UPDATE public.clubs 
            SET budget = budget + COALESCE((v_item.bonus_data->>'value')::numeric, 0),
                updated_at = now()
            WHERE id = v_club_id;
            
        WHEN 'marketing' THEN
            -- Liberação de Torcedores (Expansão de marca)
            UPDATE public.clubs 
            SET fans = fans + COALESCE((v_item.bonus_data->>'value')::integer, 0),
                updated_at = now()
            WHERE id = v_club_id;
            
        WHEN 'premium' THEN
            -- Ativação de Assinatura Premium
            INSERT INTO public.premium_users (user_id, expires_at)
            VALUES (v_order.user_id, now() + interval '30 days')
            ON CONFLICT (user_id) 
            DO UPDATE SET expires_at = GREATEST(premium_users.expires_at, now()) + interval '30 days';
            
        WHEN 'uniform' THEN
            -- Liberação de Slots de Lançamento de Uniforme
            UPDATE public.clubs 
            SET uniform_launches_available = uniform_launches_available + 1,
                updated_at = now()
            WHERE id = v_club_id;
            
        ELSE
            -- Item de Inventário Genérico
            INSERT INTO public.shop_inventory (user_id, item_id, quantity)
            VALUES (v_order.user_id, v_item.id, 1)
            ON CONFLICT (user_id, item_id) 
            DO UPDATE SET quantity = shop_inventory.quantity + 1, updated_at = now();
    END CASE;

    -- 7. Atualizar Status de Entrega e Persistir Timestamp
    UPDATE public.payment_orders 
    SET delivered = true, 
        updated_at = now() 
    WHERE id = p_order_id;

    -- 8. Registrar Logs de Auditoria para Segurança
    INSERT INTO public.admin_logs (action, details)
    VALUES ('AUTO_DELIVERY', jsonb_build_object(
        'order_id', p_order_id, 
        'user_id', v_order.user_id, 
        'item_name', v_item.name,
        'category', v_item.category,
        'released_at', now()
    ));

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Produto liberado com sucesso', 
        'item', v_item.name,
        'released_at', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
