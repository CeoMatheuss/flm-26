-- 1. Update deliver_shop_item to handle all item types and fix key mismatches
CREATE OR REPLACE FUNCTION public.deliver_shop_item(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_club_id UUID;
    v_user_id UUID;
    v_immediate_fans INTEGER := 0;
    v_immediate_members INTEGER := 0;
    v_immediate_cash BIGINT := 0;
    v_monthly_revenue BIGINT := 0;
    v_duration_days INTEGER := 30;
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

    v_user_id := v_order.user_id;

    -- 2. Obter dados do item
    SELECT * INTO v_item FROM shop_items WHERE id = v_order.item_id;
    
    -- 3. Identificar o clube do usuário
    SELECT id INTO v_club_id FROM clubs WHERE user_id = v_user_id ORDER BY updated_at DESC LIMIT 1;
    IF v_club_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clube não encontrado para o usuário');
    END IF;

    -- 4. Extrair bônus (Prioridade para metadata do pedido, depois item fixo)
    -- Metadata (itens dinâmicos)
    v_immediate_fans := COALESCE((v_order.metadata->'bonus_data'->>'immediate_fans')::INTEGER, (v_order.metadata->'bonus_data'->>'initialFans')::INTEGER, 0);
    v_immediate_members := COALESCE((v_order.metadata->'bonus_data'->>'immediate_members')::INTEGER, (v_order.metadata->'bonus_data'->>'initialMembers')::INTEGER, 0);
    v_immediate_cash := COALESCE((v_order.metadata->'bonus_data'->>'immediate_cash')::BIGINT, 0);
    v_monthly_revenue := COALESCE((v_order.metadata->'bonus_data'->>'monthlyRevenue')::BIGINT, (v_order.metadata->'bonus_data'->>'monthly_revenue')::BIGINT, 0);

    -- Item fixo (se metadata for vazio)
    IF v_item IS NOT NULL THEN
        v_immediate_fans := COALESCE(NULLIF(v_immediate_fans, 0), (v_item.bonus_data->>'immediate_fans')::INTEGER, (v_item.bonus_data->>'initialFans')::INTEGER, 0);
        v_immediate_members := COALESCE(NULLIF(v_immediate_members, 0), (v_item.bonus_data->>'immediate_members')::INTEGER, (v_item.bonus_data->>'initialMembers')::INTEGER, 0);
        v_immediate_cash := COALESCE(NULLIF(v_immediate_cash, 0), (v_item.bonus_data->>'immediate_cash')::BIGINT, 0);
        v_monthly_revenue := COALESCE(NULLIF(v_monthly_revenue, 0), (v_item.bonus_data->>'monthlyRevenue')::BIGINT, (v_item.bonus_data->>'monthly_revenue')::BIGINT, 0);
        v_duration_days := COALESCE(v_item.duration_days, 30);
    END IF;

    -- 5. Aplicar mudanças imediatas no clube
    UPDATE clubs 
    SET 
        fans = COALESCE(fans, 0) + v_immediate_fans,
        total_members = COALESCE(total_members, 0) + v_immediate_members,
        budget = COALESCE(budget, 0) + v_immediate_cash,
        updated_at = NOW()
    WHERE id = v_club_id;

    -- 6. Processar Categorias Específicas
    
    -- SÓCIOS: Atualizar club_memberships para receita recorrente
    IF v_item.category = 'members' OR (v_order.metadata->>'category') = 'members' THEN
        INSERT INTO club_memberships (club_id, total_members, monthly_revenue_cents, updated_at)
        VALUES (v_club_id, v_immediate_members, v_monthly_revenue * 100, NOW())
        ON CONFLICT (club_id) DO UPDATE 
        SET 
            total_members = COALESCE(club_memberships.total_members, 0) + EXCLUDED.total_members,
            monthly_revenue_cents = COALESCE(club_memberships.monthly_revenue_cents, 0) + EXCLUDED.monthly_revenue_cents,
            updated_at = NOW();
    END IF;

    -- PATROCÍNIO: Criar contrato ativo
    IF v_item.category = 'sponsorship' OR (v_order.metadata->>'category') = 'sponsorship' THEN
        INSERT INTO club_sponsorships (
            club_id, sponsor_name, contract_value_cents, started_at, expires_at, is_active, bonus_data
        ) VALUES (
            v_club_id, v_item.name, (v_item.bonus_data->>'dinheiroSemanal')::BIGINT * 100, 
            NOW(), NOW() + (v_duration_days * interval '1 day'), true, v_item.bonus_data
        );
    END IF;

    -- MARKETING / OLHEIROS / TORCIDA: Criar efeitos ativos
    IF v_item.category IN ('marketing', 'scouting', 'fans') OR (v_order.metadata->>'category') IN ('marketing', 'scouting', 'fans') THEN
        INSERT INTO club_active_effects (
            club_id, item_id, category, bonus_data, started_at, expires_at, created_at
        ) VALUES (
            v_club_id, v_item.id, COALESCE(v_item.category, (v_order.metadata->>'category')), 
            v_item.bonus_data, NOW(), NOW() + (v_duration_days * interval '1 day'), NOW()
        );
    END IF;

    -- 7. Marcar como entregue
    UPDATE payment_orders SET delivered = true, updated_at = NOW() WHERE id = p_order_id;

    -- 8. Log administrativo
    INSERT INTO admin_shop_activity (
        user_id, item_id, item_name, amount_cents, status, transaction_id
    ) VALUES (
        v_user_id, v_order.item_id, COALESCE(v_order.metadata->>'item_name', v_item.name), 
        v_order.amount_cents, 'delivered', v_order.payment_id
    );

    -- 9. Notificação para o usuário
    INSERT INTO user_notifications (user_id, type, title, message, importance)
    VALUES (
        v_user_id, 'purchase_delivery', '✅ Produto Entregue!', 
        format('Seu item "%s" foi ativado. %s %s', 
            COALESCE(v_item.name, (v_order.metadata->>'item_name')),
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
        'category', v_item.category
    );
END;
$function$;

-- 2. Update process_daily_shop_bonuses to catch up for offline days
CREATE OR REPLACE FUNCTION public.process_daily_shop_bonuses(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_club_id UUID;
    v_club_name TEXT;
    v_last_process TIMESTAMP WITH TIME ZONE;
    v_now TIMESTAMP WITH TIME ZONE := now();
    v_days_to_process INTEGER;
    v_current_day_iter DATE;
    
    v_total_fans INTEGER := 0;
    v_total_cash BIGINT := 0;
    v_total_uniform_sales BIGINT := 0;
    
    v_day_fans INTEGER;
    v_day_cash BIGINT;
    v_day_uniform_sales BIGINT;
    
    v_effect RECORD;
    v_sponsor RECORD;
    v_uniform RECORD;
    v_members RECORD;
BEGIN
    -- Get user club
    SELECT id, name INTO v_club_id, v_club_name
    FROM public.clubs WHERE user_id = p_user_id;
    
    IF v_club_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Club not found');
    END IF;

    -- Get last process time
    SELECT last_daily_shop_bonus_at INTO v_last_process FROM public.profiles WHERE user_id = p_user_id;

    -- If never processed, start from yesterday to give 1 day of bonus or just mark as now
    IF v_last_process IS NULL THEN
        UPDATE public.profiles SET last_daily_shop_bonus_at = v_now WHERE user_id = p_user_id;
        RETURN jsonb_build_object('success', true, 'message', 'First time initialization complete');
    END IF;

    -- Calculate days passed (date difference)
    v_days_to_process := v_now::date - v_last_process::date;

    IF v_days_to_process < 1 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already processed today');
    END IF;

    -- Limit catch up to 30 days to prevent overflow or abuse
    IF v_days_to_process > 30 THEN
        v_days_to_process := 30;
    END IF;

    -- Loop through each day since last process
    FOR i IN 1..v_days_to_process LOOP
        v_current_day_iter := (v_last_process + (i * interval '1 day'))::date;
        v_day_fans := 0;
        v_day_cash := 0;
        v_day_uniform_sales := 0;

        -- 1. Active Effects (Marketing)
        FOR v_effect IN 
            SELECT * FROM public.club_active_effects 
            WHERE club_id = v_club_id AND (expires_at IS NULL OR expires_at::date >= v_current_day_iter)
        LOOP
            IF v_effect.category = 'marketing' THEN
                v_day_fans := v_day_fans + COALESCE((v_effect.bonus_data->>'torcidaPorDia')::int, 0);
                v_day_cash := v_day_cash + COALESCE((v_effect.bonus_data->>'daily_cash')::bigint, (v_effect.bonus_data->>'dinheiroDia')::bigint, 0);
            END IF;
        END LOOP;

        -- 2. Sponsorships
        FOR v_sponsor IN 
            SELECT * FROM public.club_sponsorships 
            WHERE club_id = v_club_id AND is_active = true AND (expires_at IS NULL OR expires_at::date >= v_current_day_iter)
        LOOP
            v_day_cash := v_day_cash + (v_sponsor.contract_value_cents / 700.0)::bigint;
            -- Bonus diário direto se existir no json
            v_day_cash := v_day_cash + COALESCE((v_sponsor.bonus_data->>'daily_cash')::bigint, 0);
        END LOOP;

        -- 3. Membership
        SELECT * INTO v_members FROM public.club_memberships WHERE club_id = v_club_id;
        IF v_members IS NOT NULL THEN
            v_day_cash := v_day_cash + (v_members.monthly_revenue_cents / 3000.0)::bigint; -- cents to R$
        END IF;

        -- 4. Uniform Sales (Simplified cumulative for catch up)
        FOR v_uniform IN 
            SELECT * FROM public.club_uniform_launches 
            WHERE club_id = v_club_id AND is_active = true AND launched_at::date <= v_current_day_iter
        LOOP
            DECLARE
                v_days_since_launch INTEGER;
                v_decay_factor DOUBLE PRECISION;
                v_sales_today BIGINT;
                v_fans_now INTEGER;
                v_rep_now INTEGER;
            BEGIN
                v_days_since_launch := v_current_day_iter - v_uniform.launched_at::date;
                
                IF v_days_since_launch <= 15 THEN
                    v_decay_factor := 1.0;
                ELSE
                    v_decay_factor := exp(-0.05 * (v_days_since_launch - 15));
                END IF;

                -- Get club state for that iter (using current as approximation)
                SELECT fans, reputation INTO v_fans_now, v_rep_now FROM public.clubs WHERE id = v_club_id;

                v_sales_today := (v_fans_now * (v_rep_now / 100.0) * (v_uniform.hype_score / 100.0) * v_decay_factor * 10)::bigint;
                v_day_uniform_sales := v_day_uniform_sales + v_sales_today;
                
                UPDATE public.club_uniform_launches 
                SET total_sales_cents = total_sales_cents + v_sales_today 
                WHERE id = v_uniform.id;
            END;
        END LOOP;

        -- Accumulate totals
        v_total_fans := v_total_fans + v_day_fans;
        v_total_cash := v_total_cash + v_day_cash + (v_day_uniform_sales / 100);
        
        -- Update club for current day iter so next iteration has updated fans/rep
        UPDATE public.clubs 
        SET fans = fans + v_day_fans, budget = budget + v_day_cash + (v_day_uniform_sales / 100), updated_at = v_now
        WHERE id = v_club_id;
    END LOOP;

    -- Update last process time
    UPDATE public.profiles 
    SET last_daily_shop_bonus_at = v_now 
    WHERE user_id = p_user_id;

    -- News generation for high total sales
    IF v_total_cash > 100000 THEN
        INSERT INTO public.newspaper_entries (user_id, text, category, importance)
        VALUES (p_user_id, format('📈 O %s registrou receitas recordes de merchandising e marketing nos últimos dias!', v_club_name), 'finance', 1);
    END IF;

    -- Final Notification
    IF v_days_to_process > 1 THEN
        INSERT INTO user_notifications (user_id, type, title, message, importance)
        VALUES (
            p_user_id, 'daily_catchup', '📅 Resumo de sua Ausência', 
            format('Enquanto você estava fora (%s dias), seu clube arrecadou R$ %s e conquistou %s novos torcedores.', 
                v_days_to_process, v_total_cash, v_total_fans),
            1
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'days_processed', v_days_to_process,
        'total_fans_added', v_total_fans, 
        'total_cash_added', v_total_cash
    );
END;
$function$;
