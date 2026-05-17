-- ============================================================
-- 1) DELIVER_SHOP_ITEM (universal: bônus imediatos para TODAS categorias + registro de efeito ativo)
-- ============================================================
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
    v_immediate_cash NUMERIC;
    v_immediate_fans INTEGER;
    v_immediate_members INTEGER;
    v_sales_bonus NUMERIC;
    v_sub_type TEXT;
    v_save_id UUID;
    v_club_data JSONB;
BEGIN
    SELECT po.* INTO v_order FROM public.payment_orders po WHERE po.id = p_order_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
    IF v_order.delivered THEN RETURN jsonb_build_object('success', true, 'message', 'Already delivered'); END IF;

    SELECT si.* INTO v_item FROM public.shop_items si WHERE si.id = v_order.item_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Item not found'); END IF;

    SELECT * INTO v_club FROM public.clubs WHERE user_id = v_order.user_id;
    IF v_club.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Club not found'); END IF;

    -- Anti-abuso: patrocínio exige torcida mínima no momento da entrega
    IF v_item.category = 'sponsorship' AND COALESCE(v_club.fans, 0) < COALESCE(v_item.min_fans, 0) THEN
        UPDATE public.payment_orders SET status = 'refunded', delivered = false,
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('refund_reason','insufficient_fans','required_fans',v_item.min_fans,'club_fans',v_club.fans)
        WHERE id = p_order_id;
        INSERT INTO public.user_notifications (user_id, type, category, priority, title, message, icon, data)
        VALUES (v_order.user_id, 'warning', 'Financeiro', 'high',
                'Patrocínio não ativado',
                format('O patrocínio "%s" exige %s torcedores. Você tem %s. O pedido foi marcado para estorno.', v_item.name, v_item.min_fans, v_club.fans),
                '⚠️', jsonb_build_object('order_id', p_order_id, 'item_id', v_item.id));
        RETURN jsonb_build_object('success', false, 'error', 'insufficient_fans');
    END IF;

    v_duration_days   := COALESCE(v_item.duration_days, 30);
    v_expires_at      := now() + (v_duration_days || ' days')::INTERVAL;
    v_sub_type        := COALESCE(v_item.bonus_data->>'sub_type', v_item.category);
    v_immediate_cash  := COALESCE((v_item.bonus_data->>'immediate_cash')::numeric, 0);
    v_immediate_fans  := COALESCE((v_item.bonus_data->>'immediate_fans')::integer, 0);
    v_immediate_members := COALESCE((v_item.bonus_data->>'initialMembers')::integer, COALESCE((v_item.bonus_data->>'immediate_members')::integer, 0));
    v_sales_bonus     := COALESCE((v_item.bonus_data->>'salesMultiplier')::numeric, 0);

    -- Aplica bônus imediatos para QUALQUER categoria
    IF v_immediate_cash > 0 OR v_immediate_fans > 0 OR v_immediate_members > 0 OR v_sales_bonus > 0 THEN
        UPDATE public.clubs SET
            budget                 = budget + v_immediate_cash,
            fans                   = fans + v_immediate_fans,
            total_members          = COALESCE(total_members, 0) + v_immediate_members,
            sales_bonus_multiplier = GREATEST(COALESCE(sales_bonus_multiplier, 1.0), v_sales_bonus)
        WHERE id = v_club.id;
    END IF;

    -- Lógica específica por categoria (mantém comportamento atual + acrescenta)
    IF v_item.category = 'members' THEN
        INSERT INTO public.club_memberships (club_id, active_plan_id, total_members, monthly_revenue_cents, happiness)
        VALUES (v_club.id, v_item.id, GREATEST(v_immediate_members, 0),
                COALESCE((v_item.bonus_data->>'monthlyRevenue')::numeric, 0) * 100, 100)
        ON CONFLICT (club_id) DO UPDATE SET
            active_plan_id = v_item.id,
            total_members  = public.club_memberships.total_members + EXCLUDED.total_members,
            monthly_revenue_cents = GREATEST(public.club_memberships.monthly_revenue_cents, EXCLUDED.monthly_revenue_cents),
            happiness      = 100;

    ELSIF v_item.category = 'sponsorship' THEN
        INSERT INTO public.club_sponsorships (club_id, sponsor_name, contract_value_cents, payment_type, bonus_data, expires_at, is_active)
        VALUES (v_club.id, v_item.name, COALESCE((v_item.bonus_data->>'dinheiroSemanal')::numeric, 0) * 100, 'weekly', v_item.bonus_data, v_expires_at, true);

    ELSIF v_item.category = 'uniform' THEN
        -- Desbloqueia editor de uniformes no save mais recente
        SELECT id, club_data INTO v_save_id, v_club_data
        FROM public.game_saves WHERE user_id = v_order.user_id
        ORDER BY updated_at DESC LIMIT 1;
        IF v_save_id IS NOT NULL THEN
            v_club_data := COALESCE(v_club_data, '{}'::jsonb);
            v_club_data := jsonb_set(v_club_data,'{clubProfile}', COALESCE(v_club_data->'clubProfile','{}'::jsonb),true);
            v_club_data := jsonb_set(v_club_data,'{clubProfile,uniformsUnlocked}', 'true'::jsonb, true);
            UPDATE public.game_saves SET club_data = v_club_data, updated_at = now() WHERE id = v_save_id;
        END IF;
    END IF;

    -- SEMPRE registra como efeito ativo (com prazo) para aparecer em "Produtos Ativos"
    INSERT INTO public.club_active_effects (club_id, item_id, category, bonus_data, expires_at)
    VALUES (v_club.id, v_item.id, v_item.category,
            COALESCE(v_item.bonus_data, '{}'::jsonb) || jsonb_build_object('name', v_item.name, 'sub_type', v_sub_type),
            v_expires_at);

    -- Marca pedido entregue
    UPDATE public.payment_orders SET delivered = TRUE, status = 'approved' WHERE id = p_order_id;

    -- Notificação unificada
    INSERT INTO public.user_notifications (user_id, type, category, priority, title, message, icon, data)
    VALUES (v_order.user_id, 'success', 'Loja', 'high',
            'Produto ativado',
            format('"%s" foi ativado. Bônus: R$ %s · +%s torcedores · +%s sócios. Válido por %s dias.',
                v_item.name,
                to_char(v_immediate_cash, 'FM999G999G999'),
                v_immediate_fans, v_immediate_members, v_duration_days),
            '📦',
            jsonb_build_object('order_id', p_order_id, 'item_id', v_item.id, 'category', v_item.category, 'expires_at', v_expires_at));

    -- Notícia do clube
    INSERT INTO public.newspaper_entries (user_id, text, category, importance)
    VALUES (v_order.user_id, format('O clube oficializou: %s. Benefícios em vigor por %s dias.', v_item.name, v_duration_days), 'finance', 2);

    RETURN jsonb_build_object('success', true, 'delivered_at', now(), 'expires_at', v_expires_at);
END;
$function$;

-- ============================================================
-- 2) EXPIRE_SHOP_EFFECTS (rotina de expiração automática)
-- ============================================================
CREATE OR REPLACE FUNCTION public.expire_shop_effects()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_eff RECORD;
    v_spon RECORD;
    v_user_id UUID;
    v_count_eff INTEGER := 0;
    v_count_spon INTEGER := 0;
BEGIN
    -- Patrocínios vencidos
    FOR v_spon IN
        SELECT s.*, c.user_id AS uid
        FROM public.club_sponsorships s
        JOIN public.clubs c ON c.id = s.club_id
        WHERE s.is_active = true AND s.expires_at IS NOT NULL AND s.expires_at < now()
    LOOP
        UPDATE public.club_sponsorships SET is_active = false WHERE id = v_spon.id;
        INSERT INTO public.user_notifications (user_id, type, category, priority, title, message, icon, data)
        VALUES (v_spon.uid, 'info', 'Patrocínio', 'normal',
                'Patrocínio expirado',
                format('O contrato com "%s" chegou ao fim. Receita encerrada.', v_spon.sponsor_name),
                '⏳', jsonb_build_object('sponsorship_id', v_spon.id));
        v_count_spon := v_count_spon + 1;
    END LOOP;

    -- Efeitos ativos vencidos
    FOR v_eff IN
        SELECT e.*, c.user_id AS uid
        FROM public.club_active_effects e
        JOIN public.clubs c ON c.id = e.club_id
        WHERE e.expires_at IS NOT NULL AND e.expires_at < now()
    LOOP
        DELETE FROM public.club_active_effects WHERE id = v_eff.id;
        INSERT INTO public.user_notifications (user_id, type, category, priority, title, message, icon, data)
        VALUES (v_eff.uid, 'info', 'Loja', 'normal',
                'Produto expirou',
                format('"%s" terminou. Benefícios encerrados automaticamente.',
                       COALESCE(v_eff.bonus_data->>'name', v_eff.category)),
                '⏳', jsonb_build_object('effect_id', v_eff.id, 'category', v_eff.category));
        v_count_eff := v_count_eff + 1;
    END LOOP;

    RETURN jsonb_build_object('expired_effects', v_count_eff, 'expired_sponsorships', v_count_spon);
END;
$function$;

-- ============================================================
-- 3) CRON: rodar a cada 5 minutos
-- ============================================================
DO $$
BEGIN
    PERFORM cron.unschedule('expire-shop-effects-5min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
    'expire-shop-effects-5min',
    '*/5 * * * *',
    $$ SELECT public.expire_shop_effects(); $$
);