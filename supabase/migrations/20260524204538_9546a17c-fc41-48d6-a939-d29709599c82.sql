CREATE OR REPLACE FUNCTION public.process_daily_shop_bonuses(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
    v_total_shop_profit BIGINT := 0;
    
    v_day_fans INTEGER;
    v_day_cash BIGINT;
    v_day_uniform_sales BIGINT;
    v_day_shop_profit BIGINT := 0;
    
    v_effect RECORD;
    v_sponsor RECORD;
    v_uniform RECORD;
    v_members RECORD;
    v_shop_stats RECORD;
BEGIN
    -- Get user club
    SELECT id, name INTO v_club_id, v_club_name
    FROM public.clubs WHERE user_id = p_user_id ORDER BY updated_at DESC LIMIT 1;
    
    IF v_club_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Club not found');
    END IF;

    -- Get last process time
    SELECT last_daily_shop_bonus_at INTO v_last_process FROM public.profiles WHERE user_id = p_user_id;

    -- If never processed, start from yesterday
    IF v_last_process IS NULL THEN
        UPDATE public.profiles SET last_daily_shop_bonus_at = v_now WHERE user_id = p_user_id;
        RETURN jsonb_build_object('success', true, 'message', 'First time initialization complete');
    END IF;

    -- Calculate days passed (date difference)
    v_days_to_process := v_now::date - v_last_process::date;

    IF v_days_to_process < 1 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already processed today');
    END IF;

    -- Limit catch up to 30 days
    IF v_days_to_process > 30 THEN
        v_days_to_process := 30;
    END IF;

    -- Loop through each day since last process
    FOR i IN 1..v_days_to_process LOOP
        v_current_day_iter := (v_last_process + (i * interval '1 day'))::date;
        v_day_fans := 0;
        v_day_cash := 0;
        v_day_uniform_sales := 0;
        v_day_shop_profit := 0;

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
            v_day_cash := v_day_cash + COALESCE((v_sponsor.bonus_data->>'daily_cash')::bigint, 0);
        END LOOP;

        -- 3. Membership
        SELECT * INTO v_members FROM public.club_memberships WHERE club_id = v_club_id;
        IF v_members IS NOT NULL THEN
            v_day_cash := v_day_cash + (v_members.monthly_revenue_cents / 3000.0)::bigint;
        END IF;

        -- 4. Club Shop Daily Processing (Logic from process_club_shop_daily integrated)
        SELECT * INTO v_shop_stats FROM public.club_shop_stats WHERE club_id = v_club_id;
        IF v_shop_stats IS NOT NULL THEN
            DECLARE
                v_fans_now INTEGER;
                v_rep_now INTEGER;
                v_buyers INTEGER;
                v_daily_rev BIGINT;
                v_profit BIGINT;
            BEGIN
                SELECT fans, reputation INTO v_fans_now, v_rep_now FROM public.clubs WHERE id = v_club_id;
                -- 2% base conversion + level and reputation bonuses
                v_buyers := floor(v_fans_now * (0.02 + (v_shop_stats.level * 0.005) + (v_rep_now * 0.0001)) * v_shop_stats.popularity);
                IF v_fans_now > 0 AND v_buyers < 1 THEN v_buyers := 1; END IF;
                
                v_daily_rev := v_buyers * 4500; -- R$ 45,00 avg
                v_profit := floor(v_daily_rev * 0.4); -- 40% margin
                
                v_day_shop_profit := v_profit;
                
                -- Update shop stats table
                UPDATE public.club_shop_stats SET
                    daily_revenue = v_daily_rev,
                    total_revenue = total_revenue + v_daily_rev,
                    total_profit = total_profit + v_profit,
                    total_sales = total_sales + v_buyers,
                    buying_fans = v_buyers,
                    weekly_revenue = weekly_revenue + v_daily_rev,
                    monthly_revenue = monthly_revenue + v_daily_rev,
                    last_update = v_now,
                    updated_at = v_now
                WHERE id = v_shop_stats.id;
            END;
        END IF;

        -- 5. Uniform Sales
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
                IF v_days_since_launch <= 15 THEN v_decay_factor := 1.0;
                ELSE v_decay_factor := exp(-0.05 * (v_days_since_launch - 15)); END IF;

                SELECT fans, reputation INTO v_fans_now, v_rep_now FROM public.clubs WHERE id = v_club_id;
                v_sales_today := (v_fans_now * (v_rep_now / 100.0) * (v_uniform.hype_score / 100.0) * v_decay_factor * 10)::bigint;
                v_day_uniform_sales := v_day_uniform_sales + v_sales_today;
                
                UPDATE public.club_uniform_launches SET total_sales_cents = total_sales_cents + v_sales_today WHERE id = v_uniform.id;
            END;
        END LOOP;

        -- Accumulate totals
        v_total_fans := v_total_fans + v_day_fans;
        v_total_cash := v_total_cash + v_day_cash + (v_day_uniform_sales / 100) + v_day_shop_profit;
        v_total_shop_profit := v_total_shop_profit + v_day_shop_profit;
        
        -- Update club
        UPDATE public.clubs 
        SET fans = fans + v_day_fans, budget = budget + v_day_cash + (v_day_uniform_sales / 100) + v_day_shop_profit, updated_at = v_now
        WHERE id = v_club_id;
    END LOOP;

    -- Update last process time
    UPDATE public.profiles SET last_daily_shop_bonus_at = v_now WHERE user_id = p_user_id;

    -- News and Notifications
    IF v_total_cash > 100000 THEN
        INSERT INTO public.newspaper_entries (user_id, text, category, importance)
        VALUES (p_user_id, format('📈 O %s registrou receitas recordes de merchandising e marketing nos últimos dias!', v_club_name), 'finance', 1);
    END IF;

    IF v_days_to_process > 1 THEN
        INSERT INTO user_notifications (user_id, type, title, message, importance)
        VALUES (
            p_user_id, 'daily_catchup', '📅 Resumo de sua Ausência', 
            format('Enquanto você estava fora (%s dias), seu clube arrecadou R$ %s (incluindo R$ %s da loja oficial) e conquistou %s novos torcedores.', 
                v_days_to_process, v_total_cash, v_total_shop_profit, v_total_fans),
            1
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'days_processed', v_days_to_process,
        'total_fans_added', v_total_fans, 
        'total_cash_added', v_total_cash,
        'shop_profit', v_total_shop_profit
    );
END;
$function$;
