-- Enhance national_cup_matches
ALTER TABLE public.national_cup_matches ADD COLUMN IF NOT EXISTS phase_name TEXT;
ALTER TABLE public.national_cup_matches ADD COLUMN IF NOT EXISTS is_second_leg BOOLEAN DEFAULT false;
ALTER TABLE public.national_cup_matches ADD COLUMN IF NOT EXISTS aggregate_home_score INTEGER;
ALTER TABLE public.national_cup_matches ADD COLUMN IF NOT EXISTS aggregate_away_score INTEGER;

-- Enhance national_cup_teams
ALTER TABLE public.national_cup_teams ADD COLUMN IF NOT EXISTS prize_money_earned BIGINT DEFAULT 0;

-- Enhance national_cups
ALTER TABLE public.national_cups ADD COLUMN IF NOT EXISTS season_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.national_cups ADD COLUMN IF NOT EXISTS prize_pool JSONB;

-- Create table for cup news if not exists
CREATE TABLE IF NOT EXISTS public.cup_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cup_id UUID REFERENCES public.national_cups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for cup_news
ALTER TABLE public.cup_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cup news are viewable by everyone" ON public.cup_news FOR SELECT USING (true);

-- Ensure international_matches has similar fields
ALTER TABLE public.international_matches ADD COLUMN IF NOT EXISTS phase_name TEXT;
ALTER TABLE public.international_matches ADD COLUMN IF NOT EXISTS bracket_pos INTEGER;
ALTER TABLE public.international_matches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';

-- Prize money config table (optional, but good for persistence)
CREATE TABLE IF NOT EXISTS public.cup_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cup_type TEXT UNIQUE, -- 'national', 'continental'
    prizes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

INSERT INTO public.cup_config (cup_type, prizes)
VALUES ('national', '{
    "1": 100000,
    "2": 250000,
    "3": 500000,
    "4": 1000000,
    "5": 2000000,
    "6": 5000000,
    "final_runner": 10000000,
    "final_winner": 25000000
}'::jsonb)
ON CONFLICT (cup_type) DO UPDATE SET prizes = EXCLUDED.prizes;
