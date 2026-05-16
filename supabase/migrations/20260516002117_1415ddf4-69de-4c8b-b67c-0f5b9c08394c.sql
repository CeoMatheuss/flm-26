-- Update Revenue History Function
CREATE OR REPLACE FUNCTION public.update_shop_revenue_history()
RETURNS TRIGGER AS $$
DECLARE
    new_entry JSONB;
BEGIN
    IF NEW.daily_revenue != OLD.daily_revenue THEN
        new_entry = jsonb_build_object(
            'date', CURRENT_DATE,
            'revenue', NEW.daily_revenue,
            'sales', NEW.total_sales
        );
        
        -- Keep last 30 days
        NEW.revenue_history = (NEW.revenue_history || new_entry);
        IF jsonb_array_length(NEW.revenue_history) > 30 THEN
            NEW.revenue_history = NEW.revenue_history - 0;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Process Daily Shop Sales
CREATE OR REPLACE FUNCTION public.process_club_shop_daily(p_club_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_fans INTEGER;
    v_reputation INTEGER;
    v_level INTEGER;
    v_popularity FLOAT;
    v_base_conversion FLOAT := 0.02; -- 2% of fans buy something
    v_buyers INTEGER;
    v_avg_ticket INTEGER := 4500; -- R$ 45,00 average
    v_daily_rev BIGINT;
    v_profit BIGINT;
    v_result JSONB;
BEGIN
    -- Get club and shop data
    SELECT fans, reputation INTO v_fans, v_reputation FROM public.clubs WHERE id = p_club_id;
    SELECT level, popularity INTO v_level, v_popularity FROM public.club_shop_stats WHERE club_id = p_club_id;
    
    -- Calculate buyers based on fans and popularity/reputation/level
    -- Formula: Fans * (Base Conversion + Level Bonus + Rep Bonus) * Popularity
    v_buyers := floor(v_fans * (v_base_conversion + (v_level * 0.005) + (v_reputation * 0.0001)) * v_popularity);
    
    -- Ensure at least some sales if there are fans
    IF v_fans > 0 AND v_buyers < 1 THEN v_buyers := 1; END IF;
    
    -- Calculate revenue
    v_daily_rev := v_buyers * v_avg_ticket;
    v_profit := floor(v_daily_rev * 0.4); -- 40% margin
    
    -- Update stats
    UPDATE public.club_shop_stats SET
        daily_revenue = v_daily_rev,
        total_revenue = total_revenue + v_daily_rev,
        total_profit = total_profit + v_profit,
        total_sales = total_sales + v_buyers,
        buying_fans = v_buyers,
        weekly_revenue = weekly_revenue + v_daily_rev,
        monthly_revenue = monthly_revenue + v_daily_rev,
        last_update = now(),
        updated_at = now()
    WHERE club_id = p_club_id;
    
    -- Add to club cash
    UPDATE public.clubs SET cash = cash + v_profit WHERE id = p_club_id;
    
    v_result := jsonb_build_object(
        'revenue', v_daily_rev,
        'profit', v_profit,
        'buyers', v_buyers
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Upgrade Shop Level
CREATE OR REPLACE FUNCTION public.upgrade_club_shop(p_club_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_current_level INTEGER;
    v_cost BIGINT;
    v_budget BIGINT;
    v_result JSONB;
BEGIN
    SELECT level INTO v_current_level FROM public.club_shop_stats WHERE club_id = p_club_id;
    
    -- Exponential cost: Level 1->2 = 50k, 2->3 = 150k, 3->4 = 450k...
    v_cost := 50000 * power(3, v_current_level - 1);
    
    SELECT budget INTO v_budget FROM public.clubs WHERE id = p_club_id;
    
    IF v_budget < v_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Orçamento insuficiente. Custo: R$ ' || (v_cost / 100));
    END IF;
    
    -- Deduct cost and level up
    UPDATE public.clubs SET budget = budget - v_cost WHERE id = p_club_id;
    UPDATE public.club_shop_stats SET 
        level = level + 1,
        popularity = popularity + 0.1,
        updated_at = now()
    WHERE club_id = p_club_id;
    
    RETURN jsonb_build_object('success', true, 'new_level', v_current_level + 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
