-- 1. Function to calculate daily uniform sales based on various factors
CREATE OR REPLACE FUNCTION public.calculate_daily_uniform_sales(
    p_club_id UUID,
    p_launch_id UUID
)
RETURNS void AS $$
DECLARE
    v_fans INTEGER;
    v_reputation INTEGER;
    v_hype DOUBLE PRECISION;
    v_days_since_launch INTEGER;
    v_daily_sales INTEGER;
    v_revenue_cents BIGINT;
    v_user_id UUID;
    v_club_name TEXT;
    v_uniform_name TEXT;
    v_last_notified TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get club and launch data
    SELECT c.user_id, c.name, c.fans, c.reputation, l.name, l.hype_score, 
           EXTRACT(DAY FROM (now() - l.launched_at))::INTEGER
    INTO v_user_id, v_club_name, v_fans, v_reputation, v_uniform_name, v_hype, v_days_since_launch
    FROM public.clubs c
    JOIN public.club_uniform_launches l ON l.club_id = c.id
    WHERE l.id = p_launch_id AND c.id = p_club_id;

    IF NOT FOUND THEN RETURN; END IF;

    -- Calculate decay (hype drops over time)
    -- Starts at 1.0, drops towards 0.05 over 60 days
    v_hype := GREATEST(0.05, 1.0 * EXP(-v_days_since_launch / 20.0));
    
    -- Update hype in the record
    UPDATE public.club_uniform_launches 
    SET hype_score = v_hype,
        last_sales_update_at = now()
    WHERE id = p_launch_id;

    -- Daily sales calculation: (Fans * 0.5% base) * (Reputation factor) * Hype
    -- Rep factor: 0.5 to 1.5 based on 0-100 reputation
    v_daily_sales := FLOOR(
        (v_fans * 0.005) * 
        (0.5 + (v_reputation / 100.0)) * 
        v_hype
    );

    -- Random variance (+/- 15%)
    v_daily_sales := FLOOR(v_daily_sales * (0.85 + (random() * 0.3)));
    
    -- Minimum sales if club is active
    IF v_daily_sales < 5 AND v_fans > 1000 THEN v_daily_sales := 5; END IF;

    -- Revenue: R$ 120 base + reputation bonus
    v_revenue_cents := v_daily_sales * (12000 + (v_reputation * 80));

    -- Update statistics
    UPDATE public.club_uniform_launches
    SET total_sales_count = total_sales_count + v_daily_sales,
        total_revenue_cents = total_revenue_cents + v_revenue_cents,
        peak_daily_sales = GREATEST(peak_daily_sales, v_daily_sales)
    WHERE id = p_launch_id;

    -- Add money to club budget
    UPDATE public.clubs
    SET budget = budget + (v_revenue_cents / 100)
    WHERE id = p_club_id;

    -- Record in shop stats
    INSERT INTO public.club_shop_stats (club_id, total_revenue, daily_revenue, total_sales, updated_at)
    VALUES (p_club_id, v_revenue_cents, v_revenue_cents, v_daily_sales, now())
    ON CONFLICT (club_id) DO UPDATE SET
        total_revenue = club_shop_stats.total_revenue + EXCLUDED.total_revenue,
        daily_revenue = EXCLUDED.daily_revenue,
        total_sales = club_shop_stats.total_sales + EXCLUDED.total_sales,
        updated_at = now();

    -- Check for "Flop" status (low hype after some time) and notify user
    IF v_hype < 0.15 AND v_days_since_launch > 15 THEN
        -- Check if we already notified recently (last 7 days)
        SELECT created_at INTO v_last_notified 
        FROM public.user_notifications 
        WHERE user_id = v_user_id AND title = 'Interesse em queda'
        ORDER BY created_at DESC LIMIT 1;

        IF v_last_notified IS NULL OR v_last_notified < now() - INTERVAL '7 days' THEN
            INSERT INTO public.user_notifications (user_id, type, category, title, message, icon)
            VALUES (
                v_user_id, 
                'warning', 
                'Marketing', 
                'Interesse em queda', 
                'Sua torcida perdeu o interesse no uniforme atual. As vendas despencaram! Crie uma nova coleção para voltar a lucrar.', 
                '👕'
            );
            
            INSERT INTO public.newspaper_entries (user_id, text, category, importance)
            VALUES (
                v_user_id,
                format('📉 FLOP! As vendas de camisas do %s caíram drasticamente. Especialistas dizem que o design saturou e a torcida pede novidades.', v_club_name),
                'marketing',
                1
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Cron job to process sales for all active launches every real-time hour (simulating daily cycle in game speed)
-- Since we don't have pg_cron direct access easily here, we'll create a function 
-- that can be triggered by game heartbeats or an edge function.
CREATE OR REPLACE FUNCTION public.process_all_uniform_sales()
RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT club_id, id 
        FROM public.club_uniform_launches 
        WHERE is_active = true 
        AND (last_sales_update_at IS NULL OR last_sales_update_at < now() - INTERVAL '1 hour')
    ) LOOP
        PERFORM public.calculate_daily_uniform_sales(r.club_id, r.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
