-- Create a table for active effects (marketing, temporary buffs, etc.)
CREATE TABLE IF NOT EXISTS public.club_active_effects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    category TEXT NOT NULL, -- marketing, buff, etc.
    bonus_data JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_club_active_effects_club_id ON public.club_active_effects(club_id);
CREATE INDEX IF NOT EXISTS idx_club_active_effects_expires_at ON public.club_active_effects(expires_at);

-- Create a table for club sponsorships (specifically)
CREATE TABLE IF NOT EXISTS public.club_sponsorships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    sponsor_name TEXT NOT NULL,
    contract_value_cents BIGINT NOT NULL, -- Total value or weekly/monthly base
    payment_type TEXT NOT NULL, -- 'weekly', 'monthly', 'immediate'
    bonus_data JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create a table for club membership status (Sócios)
CREATE TABLE IF NOT EXISTS public.club_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE UNIQUE,
    total_members INTEGER DEFAULT 0,
    active_plan_id TEXT, -- basic, silver, gold, etc.
    monthly_revenue_cents BIGINT DEFAULT 0,
    churn_rate DOUBLE PRECISION DEFAULT 0.0,
    happiness DOUBLE PRECISION DEFAULT 100.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create a table for uniform launch slots
CREATE TABLE IF NOT EXISTS public.club_uniform_launches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    season_year INTEGER NOT NULL,
    uniform_type TEXT NOT NULL, -- 'home', 'away', 'third'
    design_data JSONB DEFAULT '{}'::jsonb,
    hype_score DOUBLE PRECISION DEFAULT 0.0,
    total_sales_cents BIGINT DEFAULT 0,
    launched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.club_active_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_sponsorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_uniform_launches ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own club's active effects" ON public.club_active_effects
    USING (club_id IN (SELECT id FROM public.clubs WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their own club's sponsorships" ON public.club_sponsorships
    USING (club_id IN (SELECT id FROM public.clubs WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their own club's memberships" ON public.club_memberships
    USING (club_id IN (SELECT id FROM public.clubs WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their own club's uniform launches" ON public.club_uniform_launches
    USING (club_id IN (SELECT id FROM public.clubs WHERE user_id = auth.uid()));

-- Function to update membership stats based on club performance
CREATE OR REPLACE FUNCTION public.process_daily_store_updates()
RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    -- This function would ideally be called by a cron job
    -- 1. Process Marketing (Fan Gain)
    UPDATE public.clubs c
    SET fans = c.fans + (ae.bonus_data->>'torcidaPorDia')::int
    FROM public.club_active_effects ae
    WHERE ae.club_id = c.id
    AND ae.category = 'marketing'
    AND ae.expires_at > now();

    -- 2. Process Sponsorship Payments (Weekly/Daily if simplified)
    -- For now, let's say daily_cash from bonus_data is added to budget
    UPDATE public.clubs c
    SET budget = c.budget + (s.contract_value_cents / 100.0 / 30.0) -- Daily fraction if 30 days
    FROM public.club_sponsorships s
    WHERE s.club_id = c.id
    AND s.is_active = true
    AND s.expires_at > now();

    -- 3. Uniform Sales Decay (Simplified: Add a fraction of hyped revenue)
    UPDATE public.clubs c
    SET budget = c.budget + (ul.hype_score * c.fans * 0.01) -- Simplified formula
    FROM public.club_uniform_launches ul
    WHERE ul.club_id = c.id
    AND ul.is_active = true
    AND ul.launched_at > now() - interval '15 days';

    -- Cleanup expired effects
    DELETE FROM public.club_active_effects WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;
