-- Add tracking to profiles for daily bonus processing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_daily_shop_bonus_at TIMESTAMP WITH TIME ZONE;

-- Function to process daily shop bonuses
CREATE OR REPLACE FUNCTION public.process_daily_shop_bonuses(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_club_id UUID;
    v_purchase RECORD;
    v_bonus_data JSONB;
    v_daily_fans INTEGER := 0;
    v_daily_members INTEGER := 0;
    v_daily_cash BIGINT := 0;
    v_last_process TIMESTAMP WITH TIME ZONE;
    v_now TIMESTAMP WITH TIME ZONE := now();
    v_result JSONB;
BEGIN
    -- Get user club and last process time
    SELECT id INTO v_club_id FROM public.clubs WHERE user_id = p_user_id;
    SELECT last_daily_shop_bonus_at INTO v_last_process FROM public.profiles WHERE user_id = p_user_id;

    -- Only process once per day (UTC)
    IF v_last_process IS NOT NULL AND v_last_process::date = v_now::date THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already processed today');
    END IF;

    -- Find active purchases for this user
    FOR v_purchase IN 
        SELECT p.id, p.product_id, sp.bonus_data, sp.category
        FROM public.shop_purchases p
        JOIN public.shop_products sp ON p.product_id = sp.id
        WHERE p.user_id = p_user_id 
          AND p.status = 'completed'
          AND (p.expires_at IS NULL OR p.expires_at > v_now)
    LOOP
        v_bonus_data := v_purchase.bonus_data;
        
        -- Marketing (Fans)
        IF v_purchase.category = 'marketing' THEN
            v_daily_fans := v_daily_fans + floor(random() * (v_bonus_data->>'max_daily_fans')::int + (v_bonus_data->>'min_daily_fans')::int);
        END IF;

        -- Memberships (Members - stored in infrastructure or club meta, here we increase fans/reputation as proxy for now or add to club metadata if it exists)
        IF v_purchase.category = 'memberships' THEN
            -- In FLM, "members" usually impact stadium revenue. We'll add them to reputation/fans for now as simplified bonus
            v_daily_members := v_daily_members + (v_bonus_data->>'daily_members')::int;
        END IF;

        -- Sponsorships (Cash)
        IF v_purchase.category = 'sponsorships' THEN
            v_daily_cash := v_daily_cash + (v_bonus_data->>'daily_cash')::bigint;
        END IF;
    END LOOP;

    -- Apply changes to club
    IF v_club_id IS NOT NULL THEN
        UPDATE public.clubs 
        SET 
            fans = fans + v_daily_fans + v_daily_members,
            budget = budget + v_daily_cash,
            updated_at = v_now
        WHERE id = v_club_id;
    END IF;

    -- Update last process time
    UPDATE public.profiles 
    SET last_daily_shop_bonus_at = v_now 
    WHERE user_id = p_user_id;

    v_result := jsonb_build_object(
        'success', true, 
        'fans_added', v_daily_fans, 
        'members_added', v_daily_members, 
        'cash_added', v_daily_cash
    );

    -- Log to notifications
    IF v_daily_fans > 0 OR v_daily_cash > 0 THEN
        INSERT INTO public.user_notifications (user_id, icon, title, message, type)
        VALUES (
            p_user_id, 
            '🏪', 
            'Bônus Diário da Loja', 
            format('Seus investimentos renderam: +%s torcedores e R$ %s em patrocínio!', (v_daily_fans + v_daily_members), v_daily_cash), 
            'success'
        );
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
