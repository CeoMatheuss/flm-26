-- Add premium currency to clubs
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS cash BIGINT DEFAULT 0;

-- Update shop_items with more metadata
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS duration_days INTEGER;
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS min_fans INTEGER DEFAULT 0;

-- Ensure payment_orders has necessary fields
ALTER TABLE public.payment_orders ADD COLUMN IF NOT EXISTS delivered BOOLEAN DEFAULT FALSE;

-- Create a table for inventory if not already correct
-- (Based on previous read_query, it exists, but let's make sure it's robust)
CREATE TABLE IF NOT EXISTS public.shop_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can view active shop items" ON public.shop_items
    FOR SELECT USING (active = true);

CREATE POLICY "Users can view their own inventory" ON public.shop_inventory
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own payment orders" ON public.payment_orders
    FOR SELECT USING (auth.uid() = user_id);

-- Function to handle item delivery (called from webhook)
CREATE OR REPLACE FUNCTION public.deliver_shop_item(p_order_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
BEGIN
    SELECT * INTO v_order FROM public.payment_orders WHERE id = p_order_id FOR UPDATE;
    
    IF v_order IS NULL OR v_order.status != 'approved' OR v_order.delivered = TRUE THEN
        RETURN FALSE;
    END IF;

    SELECT * INTO v_item FROM public.shop_items WHERE id = v_order.item_id;

    -- Update Order status
    UPDATE public.payment_orders SET delivered = TRUE, updated_at = now() WHERE id = p_order_id;

    -- Delivery Logic based on item category/bonus_data
    IF v_item.category = 'cash' THEN
        UPDATE public.clubs SET cash = cash + (v_item.bonus_data->>'amount')::bigint 
        WHERE user_id = v_order.user_id;
    ELSIF v_item.category = 'coins' THEN
        UPDATE public.clubs SET budget = budget + (v_item.bonus_data->>'amount')::bigint 
        WHERE user_id = v_order.user_id;
    ELSE
        -- Default: add to inventory
        INSERT INTO public.shop_inventory (user_id, item_id, quantity, expires_at)
        VALUES (
            v_order.user_id, 
            v_item.id, 
            COALESCE((v_item.bonus_data->>'quantity')::int, 1),
            CASE WHEN v_item.duration_days IS NOT NULL THEN now() + (v_item.duration_days || ' days')::interval ELSE NULL END
        )
        ON CONFLICT (user_id, item_id) DO UPDATE 
        SET quantity = shop_inventory.quantity + EXCLUDED.quantity,
            updated_at = now();
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
