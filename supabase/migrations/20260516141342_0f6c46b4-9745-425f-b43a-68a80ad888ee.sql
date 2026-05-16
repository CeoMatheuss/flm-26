CREATE OR REPLACE FUNCTION public.process_daily_shop_bonuses(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_club_id UUID;
    v_club_name TEXT;
    v_club_fans INTEGER;
    v_club_reputation INTEGER;
    v_effect RECORD;
    v_sponsor RECORD;
    v_uniform RECORD;
    v_daily_fans INTEGER := 0;
    v_daily_cash BIGINT := 0;
    v_uniform_sales BIGINT := 0;
    v_last_process TIMESTAMP WITH TIME ZONE;
    v_now TIMESTAMP WITH TIME ZONE := now();
    v_result JSONB;
BEGIN
    -- Get user club
    SELECT id, name, fans, reputation INTO v_club_id, v_club_name, v_club_fans, v_club_reputation 
    FROM public.clubs WHERE user_id = p_user_id;
    
    IF v_club_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Club not found');
    END IF;

    -- Get last process time
    SELECT last_daily_shop_bonus_at INTO v_last_process FROM public.profiles WHERE user_id = p_user_id;

    -- Only process once per day
    IF v_last_process IS NOT NULL AND v_last_process::date = v_now::date THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already processed today');
    END IF;

    -- 1. Process Active Effects (Marketing, etc.)
    FOR v_effect IN 
        SELECT * FROM public.club_active_effects 
        WHERE club_id = v_club_id AND (expires_at IS NULL OR expires_at > v_now)
    LOOP
        -- Marketing (Fans Gain)
        IF v_effect.category = 'marketing' THEN
            v_daily_fans := v_daily_fans + COALESCE((v_effect.bonus_data->>'torcidaPorDia')::int, 0);
        END IF;
    END LOOP;

    -- 2. Process Sponsorships (Recurring Cash)
    FOR v_sponsor IN 
        SELECT * FROM public.club_sponsorships 
        WHERE club_id = v_club_id AND is_active = true AND (expires_at IS NULL OR expires_at > v_now)
    LOOP
        -- Weekly payments divided by 7 for daily tick
        v_daily_cash := v_daily_cash + (v_sponsor.contract_value_cents / 700.0)::bigint;
    END LOOP;

    -- 3. Uniform Sales (Decay logic)
    FOR v_uniform IN 
        SELECT * FROM public.club_uniform_launches 
        WHERE club_id = v_club_id AND is_active = true
    LOOP
        -- Formula: fans * reputation_factor * hype * decay
        DECLARE
            v_days_since_launch INTEGER;
            v_decay_factor DOUBLE PRECISION;
            v_sales_today BIGINT;
        BEGIN
            v_days_since_launch := extract(day from (v_now - v_uniform.launched_at));
            
            -- High sales first 15 days, then decay
            IF v_days_since_launch <= 15 THEN
                v_decay_factor := 1.0;
            ELSE
                v_decay_factor := exp(-0.05 * (v_days_since_launch - 15)); -- Exponential decay
            END IF;

            v_sales_today := (v_club_fans * (v_club_reputation / 100.0) * (v_uniform.hype_score / 100.0) * v_decay_factor * 10)::bigint;
            v_uniform_sales := v_uniform_sales + v_sales_today;
            
            -- Update total sales in DB
            UPDATE public.club_uniform_launches 
            SET total_sales_cents = total_sales_cents + v_sales_today 
            WHERE id = v_uniform.id;
        END;
    END LOOP;

    -- 4. Membership Revenue
    DECLARE
        v_members RECORD;
        v_membership_cash BIGINT := 0;
    BEGIN
        SELECT * INTO v_members FROM public.club_memberships WHERE club_id = v_club_id;
        IF v_members IS NOT NULL THEN
            v_membership_cash := (v_members.monthly_revenue_cents / 30)::bigint;
            v_daily_cash := v_daily_cash + v_membership_cash;
        END IF;
    END;

    -- Apply changes to club
    UPDATE public.clubs 
    SET 
        fans = fans + v_daily_fans,
        budget = budget + (v_daily_cash + (v_uniform_sales / 100.0)),
        updated_at = v_now
    WHERE id = v_club_id;

    -- Update last process time
    UPDATE public.profiles 
    SET last_daily_shop_bonus_at = v_now 
    WHERE user_id = p_user_id;

    -- News generation for high sales
    IF v_uniform_sales > 1000000 THEN -- R$ 10k in sales
        INSERT INTO public.newspaper_entries (user_id, text, category, importance)
        VALUES (p_user_id, format('👕 Sucesso de vendas! O novo uniforme do %s é um fenômeno nas lojas oficiais.', v_club_name), 'finance', 2);
    END IF;

    v_result := jsonb_build_object(
        'success', true, 
        'fans_added', v_daily_fans, 
        'cash_added', v_daily_cash + (v_uniform_sales / 100.0),
        'uniform_sales', v_uniform_sales
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
