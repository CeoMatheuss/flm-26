CREATE OR REPLACE FUNCTION public.deliver_shop_item(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_club RECORD;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_duration_days INTEGER;
    v_immediate_cash INTEGER;
    v_new_fans INTEGER;
    v_new_members INTEGER;
    v_sales_bonus DECIMAL;
    v_sub_type TEXT;
BEGIN
    SELECT po.* INTO v_order FROM public.payment_orders po WHERE po.id = p_order_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
    IF v_order.delivered THEN RETURN jsonb_build_object('success', true, 'message', 'Already delivered'); END IF;

    SELECT si.* INTO v_item FROM public.shop_items si WHERE si.id = v_order.item_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Item not found'); END IF;

    SELECT * INTO v_club FROM public.clubs WHERE user_id = v_order.user_id;
    IF v_club.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Club not found'); END IF;

    -- VALIDAÇÃO DE TORCIDA (anti-abuso: bloqueia ativação se torcida caiu entre compra e entrega)
    IF v_item.category = 'sponsorship' AND COALESCE(v_club.fans, 0) < COALESCE(v_item.min_fans, 0) THEN
        UPDATE public.payment_orders SET status = 'refunded', delivered = false,
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('refund_reason', 'insufficient_fans', 'required_fans', v_item.min_fans, 'club_fans', v_club.fans)
        WHERE id = p_order_id;
        INSERT INTO public.user_notifications (user_id, type, category, priority, title, message, icon, data)
        VALUES (v_order.user_id, 'warning', 'Financeiro', 'high',
                'Patrocínio não ativado',
                format('O patrocínio "%s" exige %s torcedores. Você tem %s. O pedido foi marcado para estorno.', v_item.name, v_item.min_fans, v_club.fans),
                '⚠️', jsonb_build_object('order_id', p_order_id, 'item_id', v_item.id));
        RETURN jsonb_build_object('success', false, 'error', 'insufficient_fans');
    END IF;

    v_duration_days := COALESCE(v_item.duration_days, 30);
    v_expires_at := now() + (v_duration_days || ' days')::INTERVAL;
    v_sub_type := COALESCE(v_item.bonus_data->>'sub_type', v_item.category);

    CASE v_item.category
        WHEN 'members' THEN
            v_new_members := COALESCE((v_item.bonus_data->>'initialMembers')::integer, 100);
            v_new_fans := COALESCE((v_item.bonus_data->>'initialFans')::integer, 500);
            v_sales_bonus := COALESCE((v_item.bonus_data->>'salesMultiplier')::decimal, 1.1);
            UPDATE public.clubs SET 
                total_members = total_members + v_new_members,
                fans = fans + v_new_fans,
                sales_bonus_multiplier = GREATEST(sales_bonus_multiplier, v_sales_bonus),
                engagement_rate = LEAST(engagement_rate + 2.0, 15.0)
            WHERE id = v_club.id;
            INSERT INTO public.club_memberships (
                club_id, active_plan_id, total_members, monthly_revenue_cents, happiness
            ) VALUES (
                v_club.id, v_item.id, v_new_members,
                COALESCE((v_item.bonus_data->>'monthlyRevenue')::numeric, 0) * 100,
                100
            ) ON CONFLICT (club_id) DO UPDATE SET
                active_plan_id = v_item.id,
                total_members = public.club_memberships.total_members + EXCLUDED.total_members,
                happiness = 100;

        WHEN 'marketing' THEN
            UPDATE public.clubs SET 
                engagement_rate = LEAST(engagement_rate + 1.5, 20.0),
                fans = fans + COALESCE((v_item.bonus_data->>'immediate_fans')::integer, 200)
            WHERE id = v_club.id;
            INSERT INTO public.club_active_effects (club_id, item_id, category, bonus_data, expires_at)
            VALUES (v_club.id, v_item.id, 'marketing', v_item.bonus_data, v_expires_at);

        WHEN 'sponsorship' THEN
            INSERT INTO public.club_sponsorships (club_id, sponsor_name, contract_value_cents, payment_type, bonus_data, expires_at)
            VALUES (v_club.id, v_item.name, COALESCE((v_item.bonus_data->>'dinheiroSemanal')::numeric, 0) * 100, 'weekly', v_item.bonus_data, v_expires_at);

            v_immediate_cash := COALESCE((v_item.bonus_data->>'immediate_cash')::integer, 0);
            IF v_immediate_cash > 0 THEN
                UPDATE public.clubs SET budget = budget + v_immediate_cash WHERE id = v_club.id;
            END IF;

            -- Notificação enriquecida de patrocínio
            INSERT INTO public.user_notifications (user_id, type, category, priority, title, message, icon, data)
            VALUES (v_order.user_id, 'success', 'Patrocínio', 'high',
                    format('Novo patrocínio: %s', v_item.name),
                    format('Contrato (%s) assinado. Bônus imediato: R$ %s. Renda diária ativada.',
                           upper(v_sub_type),
                           to_char(v_immediate_cash, 'FM999G999G999')),
                    '🤝',
                    jsonb_build_object('order_id', p_order_id, 'item_id', v_item.id, 'sub_type', v_sub_type));

        ELSE
            INSERT INTO public.club_active_effects (club_id, item_id, category, bonus_data, expires_at)
            VALUES (v_club.id, v_item.id, v_item.category, v_item.bonus_data, v_expires_at);
    END CASE;

    UPDATE public.payment_orders SET delivered = TRUE, status = 'approved' WHERE id = p_order_id;

    INSERT INTO public.newspaper_entries (user_id, text, category, importance)
    VALUES (v_order.user_id, format('O clube anunciou a aquisição de: %s. A torcida está empolgada!', v_item.name), 'finance', 2);

    RETURN jsonb_build_object('success', true, 'delivered_at', now());
END;
$function$;