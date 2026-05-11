-- Função para gerar um olheiro aleatório
CREATE OR REPLACE FUNCTION public.generate_random_scout()
RETURNS void AS $$
DECLARE
    new_name TEXT;
    new_country TEXT;
    new_level scout_level;
    new_spec scout_specialization;
    new_eff DOUBLE PRECISION;
    rand_val DOUBLE PRECISION;
BEGIN
    -- Nomes e países aleatórios simplificados
    new_name := (ARRAY['Marco Rossi', 'Jean Pierre', 'Hans Müller', 'Lucas Silva', 'Diego Torres', 'Liam Smith'])[floor(random() * 6 + 1)];
    new_country := (ARRAY['Brasil', 'Argentina', 'Alemanha', 'França', 'Inglaterra', 'Itália'])[floor(random() * 6 + 1)];
    
    rand_val := random();
    IF rand_val > 0.95 THEN new_level := 'elite'; new_eff := 0.85 + (random() * 0.15);
    ELSIF rand_val > 0.8 THEN new_level := 'alto'; new_eff := 0.7 + (random() * 0.15);
    ELSIF rand_val > 0.5 THEN new_level := 'médio'; new_eff := 0.5 + (random() * 0.2);
    ELSE new_level := 'baixo'; new_eff := 0.3 + (random() * 0.2);
    END IF;

    new_spec := (ARRAY['ataque', 'defesa', 'meio', 'jovens', 'geral'])[floor(random() * 5 + 1)]::scout_specialization;

    INSERT INTO public.scouts (name, country, level, specialization, efficiency, is_free_agent, seasons_remaining)
    VALUES (new_name, new_country, new_level, new_spec, new_eff, true, 5);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
