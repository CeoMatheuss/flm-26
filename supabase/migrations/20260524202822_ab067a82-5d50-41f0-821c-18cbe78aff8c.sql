-- Update scouts table with new attributes and regional system
ALTER TABLE public.scouts 
ADD COLUMN IF NOT EXISTS potential_evaluation INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS technical_evaluation INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS analysis_speed INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS regional_knowledge JSONB DEFAULT '[]'::jsonb, -- Array of regions and proficiency
ADD COLUMN IF NOT EXISTS youth_discovery INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS reputation INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS salary INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS contract_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS contract_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS preferred_region TEXT;

-- Update scout levels if needed (existing might be enum)
-- Check if we need to migrate existing level values
DO $$ 
BEGIN 
    -- If level is text, we just keep it, if it's enum we might need to alter it
    -- For now assume text as per usual Lovable patterns
END $$;

-- Table for tracking global scouting market (to generate random scouts)
CREATE TABLE IF NOT EXISTS public.scout_market_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    level TEXT NOT NULL, -- Amador, Regional, Nacional, Internacional, Elite
    specialization TEXT NOT NULL,
    potential_evaluation INTEGER DEFAULT 50,
    technical_evaluation INTEGER DEFAULT 50,
    analysis_speed INTEGER DEFAULT 50,
    youth_discovery INTEGER DEFAULT 50,
    reputation INTEGER DEFAULT 50,
    salary INTEGER NOT NULL,
    preferred_region TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);

-- Enable RLS for market pool
ALTER TABLE public.scout_market_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view market pool" ON public.scout_market_pool FOR SELECT USING (true);

-- Add mission details to scout_missions
ALTER TABLE public.scout_missions
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS target_min_age INTEGER,
ADD COLUMN IF NOT EXISTS target_max_age INTEGER,
ADD COLUMN IF NOT EXISTS target_min_potential INTEGER;

-- Create function to generate a random scout
CREATE OR REPLACE FUNCTION public.generate_random_scout()
RETURNS void AS $$
DECLARE
    v_level TEXT;
    v_prob FLOAT;
    v_salary INTEGER;
    v_base_attr INTEGER;
BEGIN
    v_prob := random();
    
    IF v_prob < 0.05 THEN 
        v_level := 'Elite Mundial'; v_base_attr := 85; v_salary := 50000 + (random() * 50000)::int;
    ELSIF v_prob < 0.15 THEN 
        v_level := 'Internacional'; v_base_attr := 75; v_salary := 20000 + (random() * 25000)::int;
    ELSIF v_prob < 0.35 THEN 
        v_level := 'Nacional'; v_base_attr := 60; v_salary := 8000 + (random() * 10000)::int;
    ELSIF v_prob < 0.65 THEN 
        v_level := 'Regional'; v_base_attr := 45; v_salary := 3000 + (random() * 4000)::int;
    ELSE 
        v_level := 'Amador'; v_base_attr := 20; v_salary := 500 + (random() * 1500)::int;
    END IF;

    INSERT INTO public.scout_market_pool (
        name, country, level, specialization, 
        potential_evaluation, technical_evaluation, analysis_speed, 
        youth_discovery, reputation, salary, preferred_region
    ) VALUES (
        'Olheiro ' || floor(random()*1000)::text, -- Replace with better name generation in app code or complex SQL
        (ARRAY['Brasil', 'Argentina', 'Alemanha', 'Espanha', 'França', 'Inglaterra', 'Portugal', 'Itália', 'Nigéria', 'Japão'])[floor(random()*10)+1],
        v_level,
        (ARRAY['ataque', 'defesa', 'meio', 'jovens', 'geral'])[floor(random()*5)+1],
        (v_base_attr + random()*15)::int,
        (v_base_attr + random()*15)::int,
        (v_base_attr + random()*15)::int,
        (v_base_attr + random()*15)::int,
        (v_base_attr + random()*15)::int,
        v_salary,
        (ARRAY['Brasil', 'América do Sul', 'Europa', 'África', 'Ásia', 'América do Norte'])[floor(random()*6)+1]
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
