-- Corrigir ativação de uniforme após aprovação de pagamento
CREATE OR REPLACE FUNCTION public.activate_uniform_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'approved'
       AND COALESCE(NEW.metadata->>'item_type', '') = 'uniform_launch'
       AND COALESCE(NEW.metadata->>'uniform_id', '') <> '' THEN
        UPDATE public.club_uniform_launches
        SET
            status = 'approved',
            launched_at = COALESCE(launched_at, now()),
            payment_order_id = NEW.id,
            hype_score = GREATEST(COALESCE(hype_score, 0), 100),
            last_sales_update_at = COALESCE(last_sales_update_at, now())
        WHERE id = (NEW.metadata->>'uniform_id')::uuid;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_payment_approved_activate_kit ON public.payment_orders;
CREATE TRIGGER on_payment_approved_activate_kit
AFTER UPDATE ON public.payment_orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved')
EXECUTE FUNCTION public.activate_uniform_on_payment();

-- Unificar lançamento de uniforme com o entregador da Loja FLM
CREATE OR REPLACE FUNCTION public.deliver_shop_item(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_club_id UUID;
    v_user_id UUID;
    v_uniform_id UUID;
    v_immediate_fans INTEGER := 0;
    v_immediate_members INTEGER := 0;
    v_immediate_cash BIGINT := 0;
    v_monthly_revenue BIGINT := 0;
    v_duration_days INTEGER := 30;
BEGIN
    SELECT * INTO v_order FROM public.payment_orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado');
    END IF;

    IF COALESCE(v_order.delivered, false) THEN
        RETURN jsonb_build_object('success', true, 'message', 'Pedido já entregue', 'already_delivered', true);
    END IF;

    v_user_id := v_order.user_id;

    SELECT * INTO v_item FROM public.shop_items WHERE id = v_order.item_id;

    SELECT id INTO v_club_id
    FROM public.clubs
    WHERE user_id = v_user_id
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_club_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clube não encontrado para o usuário');
    END IF;

    IF COALESCE(v_order.metadata->>'item_type', '') = 'uniform_launch' THEN
        v_uniform_id := NULLIF(v_order.metadata->>'uniform_id', '')::uuid;

        IF v_uniform_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Lançamento de uniforme não identificado');
        END IF;

        UPDATE public.club_uniform_launches
        SET
            status = 'approved',
            launched_at = COALESCE(launched_at, now()),
            payment_order_id = v_order.id,
            hype_score = GREATEST(COALESCE(hype_score, 0), 100),
            last_sales_update_at = COALESCE(last_sales_update_at, now())
        WHERE id = v_uniform_id
          AND club_id = v_club_id;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Lançamento de uniforme não encontrado para este clube');
        END IF;

        UPDATE public.clubs
        SET current_uniform_launch_id = v_uniform_id,
            updated_at = now()
        WHERE id = v_club_id;

        UPDATE public.payment_orders
        SET delivered = true,
            status = 'approved',
            updated_at = now()
        WHERE id = p_order_id;

        INSERT INTO public.admin_shop_activity (
            user_id, item_id, item_name, amount_cents, status, payment_method, transaction_id, metadata
        ) VALUES (
            v_user_id,
            v_order.item_id,
            COALESCE(v_order.metadata->>'item_name', 'Lançamento de Uniforme'),
            v_order.amount_cents,
            'delivered',
            COALESCE(v_order.payment_method, v_order.metadata->>'checkout_type', 'pix'),
            v_order.payment_id,
            v_order.metadata
        );

        INSERT INTO public.user_notifications (user_id, type, category, priority, title, message, icon, data)
        VALUES (
            v_user_id,
            'success',
            'Marketing',
            'high',
            'Uniforme Lançado!',
            'Seu novo uniforme foi lançado oficialmente e já está conectado à Loja FLM.',
            '👕',
            jsonb_build_object('order_id', p_order_id, 'uniform_id', v_uniform_id, 'delivered', true)
        );

        RETURN jsonb_build_object(
            'success', true,
            'category', 'uniform',
            'uniform_id', v_uniform_id,
            'message', 'Uniforme lançado com sucesso'
        );
    END IF;

    v_immediate_fans := COALESCE((v_order.metadata->'bonus_data'->>'immediate_fans')::INTEGER, (v_order.metadata->'bonus_data'->>'initialFans')::INTEGER, 0);
    v_immediate_members := COALESCE((v_order.metadata->'bonus_data'->>'immediate_members')::INTEGER, (v_order.metadata->'bonus_data'->>'initialMembers')::INTEGER, 0);
    v_immediate_cash := COALESCE((v_order.metadata->'bonus_data'->>'immediate_cash')::BIGINT, 0);
    v_monthly_revenue := COALESCE((v_order.metadata->'bonus_data'->>'monthlyRevenue')::BIGINT, (v_order.metadata->'bonus_data'->>'monthly_revenue')::BIGINT, 0);

    IF v_item IS NOT NULL THEN
        v_immediate_fans := COALESCE(NULLIF(v_immediate_fans, 0), (v_item.bonus_data->>'immediate_fans')::INTEGER, (v_item.bonus_data->>'initialFans')::INTEGER, 0);
        v_immediate_members := COALESCE(NULLIF(v_immediate_members, 0), (v_item.bonus_data->>'immediate_members')::INTEGER, (v_item.bonus_data->>'initialMembers')::INTEGER, 0);
        v_immediate_cash := COALESCE(NULLIF(v_immediate_cash, 0), (v_item.bonus_data->>'immediate_cash')::BIGINT, 0);
        v_monthly_revenue := COALESCE(NULLIF(v_monthly_revenue, 0), (v_item.bonus_data->>'monthlyRevenue')::BIGINT, (v_item.bonus_data->>'monthly_revenue')::BIGINT, 0);
        v_duration_days := COALESCE(v_item.duration_days, 30);
    END IF;

    UPDATE public.clubs
    SET fans = COALESCE(fans, 0) + v_immediate_fans,
        total_members = COALESCE(total_members, 0) + v_immediate_members,
        budget = COALESCE(budget, 0) + v_immediate_cash,
        updated_at = now()
    WHERE id = v_club_id;

    IF (v_item.category = 'members') OR ((v_order.metadata->>'category') = 'members') THEN
        INSERT INTO public.club_memberships (club_id, total_members, monthly_revenue_cents, updated_at)
        VALUES (v_club_id, v_immediate_members, v_monthly_revenue * 100, now())
        ON CONFLICT (club_id) DO UPDATE
        SET total_members = COALESCE(public.club_memberships.total_members, 0) + EXCLUDED.total_members,
            monthly_revenue_cents = COALESCE(public.club_memberships.monthly_revenue_cents, 0) + EXCLUDED.monthly_revenue_cents,
            updated_at = now();
    END IF;

    IF (v_item.category = 'sponsorship') OR ((v_order.metadata->>'category') = 'sponsorship') THEN
        INSERT INTO public.club_sponsorships (
            club_id, sponsor_name, contract_value_cents, started_at, expires_at, is_active, bonus_data
        ) VALUES (
            v_club_id,
            COALESCE(v_item.name, v_order.metadata->>'item_name'),
            COALESCE((v_item.bonus_data->>'dinheiroSemanal')::BIGINT, 0) * 100,
            now(),
            now() + (v_duration_days * interval '1 day'),
            true,
            COALESCE(v_item.bonus_data, v_order.metadata->'bonus_data')
        );
    END IF;

    IF COALESCE(v_item.category, v_order.metadata->>'category') IN ('marketing', 'scouting', 'fans') THEN
        INSERT INTO public.club_active_effects (
            club_id, item_id, category, bonus_data, started_at, expires_at, created_at
        ) VALUES (
            v_club_id,
            v_order.item_id,
            COALESCE(v_item.category, v_order.metadata->>'category'),
            COALESCE(v_item.bonus_data, v_order.metadata->'bonus_data'),
            now(),
            now() + (v_duration_days * interval '1 day'),
            now()
        );
    END IF;

    UPDATE public.payment_orders
    SET delivered = true,
        updated_at = now()
    WHERE id = p_order_id;

    INSERT INTO public.admin_shop_activity (
        user_id, item_id, item_name, amount_cents, status, payment_method, transaction_id, metadata
    ) VALUES (
        v_user_id,
        v_order.item_id,
        COALESCE(v_order.metadata->>'item_name', v_item.name),
        v_order.amount_cents,
        'delivered',
        COALESCE(v_order.payment_method, v_order.metadata->>'checkout_type', 'unknown'),
        v_order.payment_id,
        v_order.metadata
    );

    INSERT INTO public.user_notifications (user_id, type, title, message, importance)
    VALUES (
        v_user_id,
        'purchase_delivery',
        '✅ Produto Entregue!',
        format('Seu item "%s" foi ativado. %s %s',
            COALESCE(v_item.name, v_order.metadata->>'item_name'),
            CASE WHEN v_immediate_fans > 0 THEN format('+%s torcedores. ', v_immediate_fans) ELSE '' END,
            CASE WHEN v_immediate_members > 0 THEN format('+%s sócios. ', v_immediate_members) ELSE '' END
        ),
        2
    );

    RETURN jsonb_build_object(
        'success', true,
        'fans_added', v_immediate_fans,
        'members_added', v_immediate_members,
        'cash_added', v_immediate_cash,
        'category', COALESCE(v_item.category, v_order.metadata->>'category')
    );
END;
$$;