-- 1. Create a table specifically for detailed shop activity auditing
CREATE TABLE IF NOT EXISTS public.admin_shop_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    club_name TEXT,
    item_id TEXT REFERENCES public.shop_items(id) ON DELETE SET NULL,
    item_name TEXT,
    amount_cents INTEGER,
    status TEXT NOT NULL,
    payment_method TEXT,
    transaction_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS and restrict to admins
ALTER TABLE public.admin_shop_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view shop activity"
ON public.admin_shop_activity
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Function to automatically log activity from payment_orders
CREATE OR REPLACE FUNCTION public.log_shop_activity_from_order()
RETURNS TRIGGER AS $$
DECLARE
    v_club_name TEXT;
    v_item_name TEXT;
BEGIN
    -- Try to get club name
    SELECT name INTO v_club_name FROM public.clubs WHERE user_id = NEW.user_id LIMIT 1;
    
    -- Try to get item name if not in metadata
    IF NEW.metadata->>'item_name' IS NULL AND NEW.item_id IS NOT NULL THEN
        SELECT name INTO v_item_name FROM public.shop_items WHERE id = NEW.item_id LIMIT 1;
    ELSE
        v_item_name := NEW.metadata->>'item_name';
    END IF;

    INSERT INTO public.admin_shop_activity (
        user_id,
        club_name,
        item_id,
        item_name,
        amount_cents,
        status,
        payment_method,
        transaction_id,
        metadata
    ) VALUES (
        NEW.user_id,
        v_club_name,
        NEW.item_id,
        v_item_name,
        NEW.amount_cents,
        NEW.status,
        COALESCE(NEW.metadata->>'checkout_type', 'unknown'),
        NEW.payment_id,
        NEW.metadata
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Trigger for new and updated orders
DROP TRIGGER IF EXISTS on_payment_order_activity ON public.payment_orders;
CREATE TRIGGER on_payment_order_activity
AFTER INSERT OR UPDATE ON public.payment_orders
FOR EACH ROW
EXECUTE FUNCTION public.log_shop_activity_from_order();
