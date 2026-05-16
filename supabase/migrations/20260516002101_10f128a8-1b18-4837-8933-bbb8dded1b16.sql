-- Club Shop Stats table
CREATE TABLE IF NOT EXISTS public.club_shop_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE UNIQUE,
    level INTEGER NOT NULL DEFAULT 1,
    popularity FLOAT NOT NULL DEFAULT 1.0,
    
    -- Financials (in cents to avoid precision issues)
    daily_revenue BIGINT NOT NULL DEFAULT 0,
    weekly_revenue BIGINT NOT NULL DEFAULT 0,
    monthly_revenue BIGINT NOT NULL DEFAULT 0,
    total_revenue BIGINT NOT NULL DEFAULT 0,
    total_profit BIGINT NOT NULL DEFAULT 0,
    
    -- Sales Data
    total_sales INTEGER NOT NULL DEFAULT 0,
    daily_sales_avg FLOAT NOT NULL DEFAULT 0,
    buying_fans INTEGER NOT NULL DEFAULT 0,
    
    -- History (JSON for flexibility in charts)
    revenue_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    last_update TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Club Shop Products (different from game shop items, these are virtual products sold by the club)
CREATE TABLE IF NOT EXISTS public.club_shop_products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    base_price_cents INTEGER NOT NULL,
    category TEXT NOT NULL,
    min_level INTEGER NOT NULL DEFAULT 1,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Initial Products
INSERT INTO public.club_shop_products (id, name, base_price_cents, category, min_level) VALUES
('shirt_official', 'Camisa Oficial', 19900, 'clothing', 1),
('scarf_fan', 'Cachecol do Torcedor', 4900, 'accessory', 1),
('cap_club', 'Boné do Clube', 7900, 'accessory', 1),
('uniform_retro', 'Uniforme Retrô', 24900, 'clothing', 3),
('special_kit', 'Kit Comemorativo', 39900, 'special', 5),
('mug_club', 'Caneca Oficial', 3500, 'home', 1),
('keychain_club', 'Chaveiro do Clube', 1500, 'accessory', 1)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.club_shop_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_shop_products ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own club shop stats"
    ON public.club_shop_stats FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.clubs
        WHERE clubs.id = club_shop_stats.club_id
        AND clubs.user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own club shop stats"
    ON public.club_shop_stats FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.clubs
        WHERE clubs.id = club_shop_stats.club_id
        AND clubs.user_id = auth.uid()
    ));

CREATE POLICY "Everyone can view shop products"
    ON public.club_shop_products FOR SELECT
    USING (true);

-- Trigger to create shop stats when a club is created
CREATE OR REPLACE FUNCTION public.handle_new_club_shop_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.club_shop_stats (club_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_club_created_shop_stats
    AFTER INSERT ON public.clubs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_club_shop_stats();

-- Populate existing clubs
INSERT INTO public.club_shop_stats (club_id)
SELECT id FROM public.clubs
ON CONFLICT (club_id) DO NOTHING;
