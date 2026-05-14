-- Shop items catalog
CREATE TABLE IF NOT EXISTS public.shop_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- currency, boost, vanity, pack, ticket
    rarity TEXT DEFAULT 'common', -- common, rare, epic, legendary
    price_cents INTEGER NOT NULL,
    bonus_data JSONB DEFAULT '{}'::jsonb,
    image_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User inventory
CREATE TABLE IF NOT EXISTS public.shop_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES public.shop_items(id),
    quantity INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb, -- e.g. expiration for boosts
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payment orders
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    external_reference TEXT UNIQUE, -- Mercado Pago reference
    payment_id TEXT, -- MP payment id after creation
    amount_cents INTEGER NOT NULL,
    item_id TEXT NOT NULL REFERENCES public.shop_items(id),
    status TEXT DEFAULT 'pending', -- pending, approved, rejected, cancelled
    payment_method TEXT, -- pix, credit_card
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Webhook logs
CREATE TABLE IF NOT EXISTS public.payment_webhooks_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payload JSONB,
    topic TEXT,
    resource_id TEXT,
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public items are viewable" ON public.shop_items FOR SELECT USING (active = true);
CREATE POLICY "Users view own inventory" ON public.shop_inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own orders" ON public.payment_orders FOR SELECT USING (auth.uid() = user_id);

-- Seed some new shop items
INSERT INTO public.shop_items (id, name, description, category, rarity, price_cents, image_url, bonus_data) VALUES
('coins_100k', '100k Coins', 'Pacote básico de moedas para o seu clube.', 'currency', 'common', 500, null, '{"coins": 100000}'),
('cash_premium_50', '50 FLM Cash', 'Moeda premium para itens exclusivos.', 'currency', 'rare', 1000, null, '{"cash": 50}'),
('boost_physio', 'Boost Fisioterapia', 'Recuperação 2x mais rápida por 3 dias.', 'boost', 'rare', 300, null, '{"type": "physio_boost", "duration_days": 3}'),
('pack_starter', 'Starter Pack', 'Jogadores prata garantidos + 50k coins.', 'pack', 'epic', 1500, null, '{"coins": 50000, "players_count": 5, "min_rarity": "silver"}')
ON CONFLICT (id) DO NOTHING;
