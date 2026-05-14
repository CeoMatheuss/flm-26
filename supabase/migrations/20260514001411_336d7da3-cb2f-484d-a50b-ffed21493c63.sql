-- Create shop_products table
CREATE TABLE IF NOT EXISTS public.shop_products (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL, -- marketing, memberships, sponsorships, customization
    name TEXT NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL DEFAULT 1, -- R$ 0,01 = 1 cent
    duration_days INTEGER,
    min_fans_required INTEGER DEFAULT 0,
    bonus_data JSONB DEFAULT '{}'::jsonb, -- Store bonus details like daily fans/members/money
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create shop_purchases table
CREATE TABLE IF NOT EXISTS public.shop_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.shop_products(id),
    status TEXT NOT NULL DEFAULT 'completed', -- completed, expired
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_bonus_claim_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_purchases ENABLE ROW LEVEL SECURITY;

-- Policies for shop_products (everyone can read)
CREATE POLICY "Everyone can view active shop products" 
ON public.shop_products FOR SELECT 
USING (active = true);

-- Policies for shop_purchases (users can only see their own)
CREATE POLICY "Users can view their own purchases" 
ON public.shop_purchases FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchases" 
ON public.shop_purchases FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Updated at triggers
CREATE TRIGGER set_shop_products_updated_at
BEFORE UPDATE ON public.shop_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_shop_purchases_updated_at
BEFORE UPDATE ON public.shop_purchases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed products
INSERT INTO public.shop_products (id, category, name, description, price_cents, duration_days, min_fans_required, bonus_data) VALUES
-- Marketing
('mkt_small', 'marketing', 'Campanha Pequena', 'Atrai novos torcedores diariamente.', 1, 5, 0, '{"min_daily_fans": 50, "max_daily_fans": 500}'),
('mkt_medium', 'marketing', 'Campanha Média', 'Aumenta consideravelmente sua base de fãs.', 1, 5, 100, '{"min_daily_fans": 500, "max_daily_fans": 2000}'),
('mkt_large', 'marketing', 'Campanha Grande', 'Marketing massivo para grandes clubes.', 1, 5, 500, '{"min_daily_fans": 2000, "max_daily_fans": 5000}'),
-- Memberships
('member_bronze', 'memberships', 'Plano Bronze', 'Início do programa de sócios.', 1, 7, 0, '{"daily_members": 25}'),
('member_silver', 'memberships', 'Plano Prata', 'Fidelização intermediária de sócios.', 1, 7, 100, '{"daily_members": 75}'),
('member_gold', 'memberships', 'Plano Ouro', 'Crescimento sólido de sócios.', 1, 7, 300, '{"daily_members": 150}'),
('member_diamond', 'memberships', 'Plano Diamond', 'Prestígio e muitos sócios novos.', 1, 7, 700, '{"daily_members": 350}'),
('member_elite', 'memberships', 'Plano Elite FLM', 'O ápice do programa de sócios.', 1, 7, 1500, '{"daily_members": 750}'),
-- Sponsorships
('sponsor_betmaster', 'sponsorships', 'BetMaster', 'Patrocinador confiável com bônus diário.', 1, 30, 50, '{"immediate_cash": 100000, "daily_cash": 15000}'),
('sponsor_rexbet', 'sponsorships', 'RexBet', 'Focado em grandes parcerias.', 1, 30, 100, '{"immediate_cash": 300000, "daily_cash": 25000}'),
('sponsor_brazucabet', 'sponsorships', 'BrazucaBet', 'O patrocinador da torcida.', 1, 30, 250, '{"immediate_cash": 500000, "daily_cash": 40000}'),
('sponsor_maxwin', 'sponsorships', 'MaxWin', 'Máximo retorno para o seu clube.', 1, 30, 500, '{"immediate_cash": 800000, "daily_cash": 60000}'),
('sponsor_golbet', 'sponsorships', 'GolBet', 'Goleada de lucros para o seu time.', 1, 30, 1000, '{"immediate_cash": 1500000, "daily_cash": 120000}'),
('sponsor_elite', 'sponsorships', 'FLM Sponsor Elite', 'Patrocínio exclusivo para a elite.', 1, 30, 3000, '{"immediate_cash": 3000000, "daily_cash": 250000}'),
-- Customization
('custom_badge', 'customization', 'Badge Premium', 'Badge exclusiva para mostrar seu status.', 1, NULL, 0, '{"type": "exclusive_badge"}'),
('custom_name', 'customization', 'Nome Colorido', 'Altere a cor do nome do seu clube.', 1, NULL, 0, '{"type": "colored_name"}')
ON CONFLICT (id) DO UPDATE SET
    category = EXCLUDED.category,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    bonus_data = EXCLUDED.bonus_data,
    min_fans_required = EXCLUDED.min_fans_required;
