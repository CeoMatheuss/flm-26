-- Adiciona campo para controlar quando o olheiro apareceu no mercado
ALTER TABLE public.scouts 
ADD COLUMN IF NOT EXISTS market_available_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_mission_completed_at TIMESTAMP WITH TIME ZONE;

-- Modifica a função de geração para marcar a data de disponibilidade
CREATE OR REPLACE FUNCTION public.generate_weekly_scout()
RETURNS void AS $$
DECLARE
    new_name TEXT;
    new_country TEXT;
    new_level scout_level;
    new_spec scout_specialization;
    new_eff DOUBLE PRECISION;
    rand_val DOUBLE PRECISION;
BEGIN
    new_name := (ARRAY['Marco Rossi', 'Jean Pierre', 'Hans Müller', 'Lucas Silva', 'Diego Torres', 'Liam Smith', 'Mateo Silva', 'Enzo Ferrari'])[floor(random() * 8 + 1)];
    new_country := (ARRAY['Brasil', 'Argentina', 'Alemanha', 'França', 'Inglaterra', 'Itália', 'Espanha', 'Portugal'])[floor(random() * 8 + 1)];
    
    rand_val := random();
    IF rand_val > 0.95 THEN new_level := 'elite'; new_eff := 0.85 + (random() * 0.15);
    ELSIF rand_val > 0.8 THEN new_level := 'alto'; new_eff := 0.7 + (random() * 0.15);
    ELSIF rand_val > 0.5 THEN new_level := 'médio'; new_eff := 0.5 + (random() * 0.2);
    ELSE new_level := 'baixo'; new_eff := 0.3 + (random() * 0.2);
    END IF;

    new_spec := (ARRAY['ataque', 'defesa', 'meio', 'jovens', 'geral'])[floor(random() * 5 + 1)]::scout_specialization;

    -- Apenas 1 por semana será 'is_free_agent' e terá 'market_available_at' definido como agora
    INSERT INTO public.scouts (name, country, level, specialization, efficiency, is_free_agent, seasons_remaining, market_available_at)
    VALUES (new_name, new_country, new_level, new_spec, new_eff, true, 5, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
