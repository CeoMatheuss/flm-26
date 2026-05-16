-- 1. Expand clubs table to track fans/members metrics better
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS total_members INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagement_rate DECIMAL DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS sales_bonus_multiplier DECIMAL DEFAULT 1.0;

-- 2. Update deliver_shop_item to handle the new impacts
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
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_duration_days INTEGER;
    v_immediate_cash INTEGER;
    v_new_fans INTEGER;
    v_new_members INTEGER;
    v_sales_bonus DECIMAL;
BEGIN
    SELECT po.* INTO v_order FROM public.payment_orders po WHERE po.id = p_order_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
    IF v_order.delivered THEN RETURN jsonb_build_object('success', true, 'message', 'Already delivered'); END IF;

    SELECT si.* INTO v_item FROM public.shop_items si WHERE si.id = v_order.item_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Item not found'); END IF;

    SELECT id INTO v_club_id FROM public.clubs WHERE user_id = v_order.user_id;
    IF v_club_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Club not found'); END IF;

    v_duration_days := COALESCE(v_item.duration_days, 30);
    v_expires_at := now() + (v_duration_days || ' days')::INTERVAL;

    CASE v_item.category
        WHEN 'members' THEN
            -- Extract impacts from bonus_data
            v_new_members := COALESCE((v_item.bonus_data->>'initialMembers')::integer, 100);
            v_new_fans := COALESCE((v_item.bonus_data->>'initialFans')::integer, 500);
            v_sales_bonus := COALESCE((v_item.bonus_data->>'salesMultiplier')::decimal, 1.1);

            -- Apply impacts to club
            UPDATE public.clubs SET 
                total_members = total_members + v_new_members,
                fans = fans + v_new_fans,
                sales_bonus_multiplier = GREATEST(sales_bonus_multiplier, v_sales_bonus),
                engagement_rate = LEAST(engagement_rate + 2.0, 15.0)
            WHERE id = v_club_id;

            -- Membership specific record
            INSERT INTO public.club_memberships (
                club_id, active_plan_id, total_members, monthly_revenue_cents, happiness
            ) VALUES (
                v_club_id, v_item.id, v_new_members,
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
            WHERE id = v_club_id;

            INSERT INTO public.club_active_effects (club_id, item_id, category, bonus_data, expires_at)
            VALUES (v_club_id, v_item.id, 'marketing', v_item.bonus_data, v_expires_at);

        WHEN 'sponsorship' THEN
            INSERT INTO public.club_sponsorships (club_id, sponsor_name, contract_value_cents, payment_type, bonus_data, expires_at)
            VALUES (v_club_id, v_item.name, COALESCE((v_item.bonus_data->>'dinheiroSemanal')::numeric, 0) * 100, 'weekly', v_item.bonus_data, v_expires_at);
            
            v_immediate_cash := COALESCE((v_item.bonus_data->>'immediate_cash')::integer, 0);
            IF v_immediate_cash > 0 THEN
                UPDATE public.clubs SET budget = budget + v_immediate_cash WHERE id = v_club_id;
            END IF;
        
        ELSE
            INSERT INTO public.club_active_effects (club_id, item_id, category, bonus_data, expires_at)
            VALUES (v_club_id, v_item.id, v_item.category, v_item.bonus_data, v_expires_at);
    END CASE;

    UPDATE public.payment_orders SET delivered = TRUE, status = 'approved' WHERE id = p_order_id;

    INSERT INTO public.newspaper_entries (user_id, text, category, importance)
    VALUES (v_order.user_id, format('O clube anunciou a aquisição de: %s. A torcida está empolgada!', v_item.name), 'finance', 2);

    RETURN jsonb_build_object('success', true, 'delivered_at', now());
END;
$$;

-- 3. Function to process merchandise sales with multipliers
CREATE OR REPLACE FUNCTION public.calculate_merch_sales(p_club_id UUID, p_base_amount BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_multiplier DECIMAL;
    v_members_bonus DECIMAL;
    v_total_members INTEGER;
BEGIN
    SELECT sales_bonus_multiplier, total_members INTO v_multiplier, v_total_members FROM public.clubs WHERE id = p_club_id;
    
    -- Bonus based on members volume (0.1% per 1000 members)
    v_members_bonus := 1.0 + (v_total_members::decimal / 100000.0);
    
    RETURN (p_base_amount::decimal * v_multiplier * v_members_bonus)::bigint;
END;
$$;
