-- Ensure delivered column exists
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS delivered BOOLEAN DEFAULT FALSE;

-- Create or replace delivery function
CREATE OR REPLACE FUNCTION public.deliver_shop_item(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_club_id UUID;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_duration_days INTEGER;
    v_immediate_cash INTEGER;
BEGIN
    -- 1. Get order and item details
    SELECT po.* INTO v_order FROM public.payment_orders po WHERE po.id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found');
    END IF;

    IF v_order.delivered THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already delivered');
    END IF;

    SELECT si.* INTO v_item FROM public.shop_items si WHERE si.id = v_order.item_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Item not found');
    END IF;

    -- 2. Get club ID for the user
    SELECT id INTO v_club_id FROM public.clubs WHERE user_id = v_order.user_id;
    
    IF v_club_id IS NULL THEN
        -- Fallback if club table not yet synced
        RETURN jsonb_build_object('success', false, 'error', 'Club not found for user');
    END IF;

    -- 3. Calculate expiration
    v_duration_days := COALESCE(v_item.duration_days, 30);
    v_expires_at := now() + (v_duration_days || ' days')::INTERVAL;

    -- 4. Logic by category
    CASE v_item.category
        WHEN 'sponsorship' THEN
            -- Add to club_sponsorships
            INSERT INTO public.club_sponsorships (
                club_id, 
                sponsor_name, 
                contract_value_cents, 
                payment_type, 
                bonus_data, 
                expires_at
            ) VALUES (
                v_club_id,
                v_item.name,
                COALESCE((v_item.bonus_data->>'dinheiroSemanal')::numeric, 0) * 100,
                'weekly',
                v_item.bonus_data,
                v_expires_at
            );

            -- Check for immediate cash bonus
            v_immediate_cash := COALESCE((v_item.bonus_data->>'immediate_cash')::integer, 0);
            IF v_immediate_cash > 0 THEN
                UPDATE public.clubs SET budget = budget + v_immediate_cash WHERE id = v_club_id;
            END IF;

        WHEN 'marketing' THEN
            -- Add to active effects
            INSERT INTO public.club_active_effects (
                club_id,
                item_id,
                category,
                bonus_data,
                expires_at
            ) VALUES (
                v_club_id,
                v_item.id,
                'marketing',
                v_item.bonus_data,
                v_expires_at
            );

        WHEN 'stickers' THEN
            -- For stickers, we could grant special packs or just mark as active
            -- Stickers usually are one-time items or per-purchase
            -- We'll track it in active effects for now to show "Active" in UI
            INSERT INTO public.club_active_effects (
                club_id,
                item_id,
                category,
                bonus_data,
                expires_at
            ) VALUES (
                v_club_id,
                v_item.id,
                'stickers',
                v_item.bonus_data,
                v_expires_at
            );

        WHEN 'uniform' THEN
            -- Unlock uniform editor
            INSERT INTO public.club_active_effects (
                club_id,
                item_id,
                category,
                bonus_data,
                expires_at
            ) VALUES (
                v_club_id,
                v_item.id,
                'uniform',
                v_item.bonus_data,
                v_expires_at
            );

        WHEN 'members' THEN
            -- Update club membership status
            INSERT INTO public.club_memberships (
                club_id,
                active_plan_id,
                total_members,
                monthly_revenue_cents,
                happiness
            ) VALUES (
                v_club_id,
                v_item.id,
                COALESCE((v_item.bonus_data->>'initialMembers')::integer, 100),
                COALESCE((v_item.bonus_data->>'monthlyRevenue')::numeric, 0) * 100,
                100
            ) ON CONFLICT (club_id) DO UPDATE SET
                active_plan_id = v_item.id,
                happiness = 100;

        ELSE
            -- Generic handler for other items
            INSERT INTO public.club_active_effects (
                club_id,
                item_id,
                category,
                bonus_data,
                expires_at
            ) VALUES (
                v_club_id,
                v_item.id,
                v_item.category,
                v_item.bonus_data,
                v_expires_at
            );
    END CASE;

    -- 5. Mark as delivered
    UPDATE public.payment_orders SET delivered = TRUE, status = 'approved' WHERE id = p_order_id;

    -- 6. Log in club history or news
    INSERT INTO public.newspaper_entries (
        user_id,
        text,
        category,
        importance
    ) VALUES (
        v_order.user_id,
        format('O clube anunciou a aquisição de: %s. Um marco importante para o futuro do time!', v_item.name),
        'finance',
        2
    );

    RETURN jsonb_build_object('success', true, 'delivered_at', now());
END;
$$;
