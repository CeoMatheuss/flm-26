-- Create the admin shop activity table
CREATE TABLE IF NOT EXISTS public.admin_shop_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    club_name TEXT,
    item_id TEXT,
    item_name TEXT,
    amount_cents BIGINT,
    status TEXT NOT NULL, -- 'attempting', 'pending', 'approved', 'rejected', 'delivered', 'cancelled', 'fraudulent'
    payment_method TEXT, -- 'pix', 'card', 'in_game'
    ip_address TEXT,
    device_info TEXT,
    region TEXT,
    attempt_duration_ms INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_shop_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone logged in can record activity (when they try to buy)
CREATE POLICY "Anyone can record activity" ON public.admin_shop_activity FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: View activity
CREATE POLICY "Admins can view activity" ON public.admin_shop_activity FOR SELECT USING (true);

-- Trigger for updated_at (assuming update_updated_at_column exists as seen in previous turn's truncated code or common patterns)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_admin_shop_activity_updated_at') THEN
        CREATE TRIGGER set_admin_shop_activity_updated_at
        BEFORE UPDATE ON public.admin_shop_activity
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
