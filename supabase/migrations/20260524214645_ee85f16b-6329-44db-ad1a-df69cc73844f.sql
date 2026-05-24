-- Simple CREATE IF NOT EXISTS to avoid locking issues on large tables
CREATE TABLE IF NOT EXISTS public.club_scouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    nationality TEXT,
    rarity TEXT DEFAULT 'Médio',
    specialty TEXT,
    favorite_region TEXT,
    potential_eval_rating INTEGER DEFAULT 50,
    discovery_rating INTEGER DEFAULT 50,
    analysis_rating INTEGER DEFAULT 50,
    contract_seasons_left INTEGER DEFAULT 5,
    salary_cents INTEGER DEFAULT 50000,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Separate DDL to avoid multi-statement deadlocks if possible
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own scouts') THEN
        ALTER TABLE public.club_scouts ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can manage their own scouts" ON public.club_scouts FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.clubs WHERE id = club_id));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.shop_scout_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    min_rarity TEXT DEFAULT 'Médio',
    max_rarity TEXT DEFAULT 'Mundial',
    chance_elite FLOAT DEFAULT 0.05,
    chance_mundial FLOAT DEFAULT 0.01,
    icon TEXT DEFAULT 'Users',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed
INSERT INTO public.shop_scout_packs (name, description, price_cents, min_rarity, max_rarity, chance_elite, chance_mundial, icon)
SELECT 'Pack Básico', 'Recrutamento local de olheiros iniciantes.', 5000, 'Médio', 'Bom', 0.0, 0.0, 'Search'
WHERE NOT EXISTS (SELECT 1 FROM public.shop_scout_packs WHERE name = 'Pack Básico');

INSERT INTO public.shop_scout_packs (name, description, price_cents, min_rarity, max_rarity, chance_elite, chance_mundial, icon)
SELECT 'Pack Internacional', 'Busca olheiros com experiência em outros continentes.', 25000, 'Bom', 'Elite', 0.10, 0.02, 'Globe'
WHERE NOT EXISTS (SELECT 1 FROM public.shop_scout_packs WHERE name = 'Pack Internacional');

INSERT INTO public.shop_scout_packs (name, description, price_cents, min_rarity, max_rarity, chance_elite, chance_mundial, icon)
SELECT 'Pack Elite', 'Contrata os melhores analistas de mercado disponíveis.', 100000, 'Excelente', 'Mundial', 0.40, 0.15, 'Crown'
WHERE NOT EXISTS (SELECT 1 FROM public.shop_scout_packs WHERE name = 'Pack Elite');

-- Procedural generator
CREATE OR REPLACE FUNCTION public.generate_random_scout(p_club_id UUID, p_pack_id UUID)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
    v_pack RECORD;
    v_rarity TEXT;
    v_roll FLOAT;
    v_name TEXT;
    v_nat TEXT;
    v_specialty TEXT;
    v_region TEXT;
    v_potential INTEGER;
    v_discovery INTEGER;
    v_analysis INTEGER;
    v_salary INTEGER;
    v_names TEXT[] := ARRAY['Lucas', 'Gabriel', 'Carlos', 'Hans', 'John', 'Pierre', 'Giovanni', 'Enzo', 'Mateo', 'Diego'];
    v_surnames TEXT[] := ARRAY['Silva', 'Santos', 'Müller', 'Smith', 'Dubois', 'Rossi', 'Ferrari', 'Garcia', 'Rodriguez', 'Zidane'];
    v_nats TEXT[] := ARRAY['Brasil', 'Alemanha', 'Inglaterra', 'França', 'Itália', 'Espanha', 'Argentina', 'Uruguai', 'Portugal', 'Holanda'];
    v_specialties TEXT[] := ARRAY['Jovens talentos', 'Atacantes', 'Defensores', 'Goleiros', 'Base/juniores'];
    v_regions TEXT[] := ARRAY['América do Sul', 'Europa', 'Ásia', 'África', 'América do Norte'];
BEGIN
    SELECT * FROM public.shop_scout_packs WHERE id = p_pack_id INTO v_pack;
    v_roll := random();
    
    IF v_roll < v_pack.chance_mundial THEN v_rarity := 'Mundial';
    ELSIF v_roll < v_pack.chance_elite THEN v_rarity := 'Elite';
    ELSIF v_roll < 0.4 THEN v_rarity := 'Excelente';
    ELSIF v_roll < 0.7 THEN v_rarity := 'Bom';
    ELSE v_rarity := 'Médio';
    END IF;

    v_name := v_names[floor(random()*10)+1] || ' ' || v_surnames[floor(random()*10)+1];
    v_nat := v_nats[floor(random()*10)+1];
    v_specialty := v_specialties[floor(random()*5)+1];
    v_region := v_regions[floor(random()*5)+1];
    
    CASE v_rarity
        WHEN 'Mundial' THEN v_potential := 90 + floor(random()*10); v_discovery := 90 + floor(random()*10); v_analysis := 90 + floor(random()*10); v_salary := 500000;
        WHEN 'Elite' THEN v_potential := 80 + floor(random()*10); v_discovery := 80 + floor(random()*10); v_analysis := 80 + floor(random()*10); v_salary := 200000;
        WHEN 'Excelente' THEN v_potential := 70 + floor(random()*10); v_discovery := 70 + floor(random()*10); v_analysis := 70 + floor(random()*10); v_salary := 100000;
        WHEN 'Bom' THEN v_potential := 60 + floor(random()*10); v_discovery := 60 + floor(random()*10); v_analysis := 60 + floor(random()*10); v_salary := 50000;
        ELSE v_potential := 40 + floor(random()*20); v_discovery := 40 + floor(random()*20); v_analysis := 40 + floor(random()*20); v_salary := 20000;
    END CASE;

    INSERT INTO public.club_scouts (club_id, name, nationality, rarity, specialty, favorite_region, potential_eval_rating, discovery_rating, analysis_rating, contract_seasons_left, salary_cents, status)
    VALUES (p_club_id, v_name, v_nat, v_rarity, v_specialty, v_region, v_potential, v_discovery, v_analysis, 5, v_salary, 'active')
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$$ LANGUAGE plpgsql;