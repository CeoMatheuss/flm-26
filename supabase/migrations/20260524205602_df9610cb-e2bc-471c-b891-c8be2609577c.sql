-- Table to track market updates
CREATE TABLE IF NOT EXISTS public.scout_market_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    last_refresh TIMESTAMP WITH TIME ZONE DEFAULT now(),
    refresh_interval_days INTEGER DEFAULT 15
);

-- Ensure there is a config row
INSERT INTO public.scout_market_config (last_refresh)
SELECT now() WHERE NOT EXISTS (SELECT 1 FROM public.scout_market_config);

-- Function to refresh the scout market
CREATE OR REPLACE FUNCTION public.refresh_scout_market()
RETURNS void AS $$
DECLARE
    v_last_refresh TIMESTAMP WITH TIME ZONE;
    v_interval INTEGER;
BEGIN
    SELECT last_refresh, refresh_interval_days INTO v_last_refresh, v_interval FROM public.scout_market_config LIMIT 1;
    
    -- If 15 days passed OR market is empty, refresh
    IF (v_last_refresh + (v_interval || ' days')::interval <= now()) OR (NOT EXISTS (SELECT 1 FROM public.scout_market_pool)) THEN
        -- Clear old market
        DELETE FROM public.scout_market_pool;
        
        -- Insert 2 random scouts
        -- Level is weighted or random. Let's pick random levels for "habilidade aleatória"
        INSERT INTO public.scout_market_pool (
            id, name, country, level, specialization, 
            potential_evaluation, technical_evaluation, analysis_speed, 
            youth_discovery, reputation, salary, preferred_region, 
            efficiency, expires_at
        )
        SELECT 
            gen_random_uuid(),
            'Olheiro ' || chr(65 + (random() * 25)::int) || chr(97 + (random() * 25)::int),
            CASE (random() * 5)::int 
                WHEN 0 THEN 'Brasil' 
                WHEN 1 THEN 'Argentina' 
                WHEN 2 THEN 'Espanha' 
                WHEN 3 THEN 'Inglaterra' 
                WHEN 4 THEN 'Itália' 
                ELSE 'Alemanha' 
            END,
            (ARRAY['Amador', 'Regional', 'Nacional', 'Internacional', 'Elite Mundial'])[floor(random() * 5 + 1)],
            (ARRAY['ataque', 'defesa', 'meio', 'jovens', 'geral'])[floor(random() * 5 + 1)],
            (random() * 100)::int,
            (random() * 100)::int,
            (random() * 100)::int,
            (random() * 100)::int,
            (random() * 100)::int,
            (random() * 10000 + 1000)::int,
            (ARRAY['Brasil', 'América do Sul', 'Europa', 'África', 'Ásia', 'América do Norte'])[floor(random() * 6 + 1)],
            random(),
            now() + interval '15 days'
        FROM generate_series(1, 2);
        
        -- Update last refresh timestamp
        UPDATE public.scout_market_config SET last_refresh = now();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger/Cron equivalent: Since we can't easily set up pg_cron here without extension, 
-- we will call this function inside the useScouting hook on fetch or via a small background RPC if needed.
-- But the best way is to have it run when the market is queried.

CREATE OR REPLACE FUNCTION public.get_scout_market()
RETURNS SETOF public.scout_market_pool AS $$
BEGIN
    PERFORM public.refresh_scout_market();
    RETURN QUERY SELECT * FROM public.scout_market_pool;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for config
ALTER TABLE public.scout_market_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for all users" ON public.scout_market_config FOR SELECT USING (true);
