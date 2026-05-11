-- Adiciona coluna de divisão se não existir
ALTER TABLE public.world_leagues 
ADD COLUMN IF NOT EXISTS division INTEGER DEFAULT 1;

-- Função para calcular o horário do jogo baseado na divisão
CREATE OR REPLACE FUNCTION public.calculate_match_scheduled_time(p_league_id UUID, p_date DATE)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    v_division INTEGER;
    v_hour INTEGER;
    v_minute INTEGER;
BEGIN
    SELECT division INTO v_division FROM public.world_leagues WHERE id = p_league_id;
    
    IF v_division = 1 THEN
        -- Divisão 1: Sempre 19:30 BRT (22:30 UTC)
        RETURN (p_date + TIME '22:30:00')::TIMESTAMP WITH TIME ZONE;
    ELSE
        -- Outras divisões: Aleatório a partir das 16:00 BRT (19:00 UTC)
        -- Gera hora entre 19:00 e 23:00 UTC
        v_hour := floor(random() * 5 + 19); 
        v_minute := (ARRAY[0, 15, 30, 45])[floor(random() * 4 + 1)];
        RETURN (p_date + (v_hour || ':' || v_minute || ':00')::TIME)::TIMESTAMP WITH TIME ZONE;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- Ajusta a função de criação de times para verificar lotação da Div 1
CREATE OR REPLACE FUNCTION public.get_available_league_for_country(p_country_id UUID)
RETURNS UUID AS $$
DECLARE
    v_league_id UUID;
BEGIN
    -- Busca uma liga Div 1 que não esteja lotada (max 16 times por simplicidade)
    SELECT id INTO v_league_id 
    FROM public.world_leagues 
    WHERE country_id = p_country_id AND division = 1
    AND (SELECT count(*) FROM public.world_teams WHERE league_id = public.world_leagues.id) < 16
    LIMIT 1;
    
    -- Se não achou Div 1 livre, busca ou cria Div 2
    IF v_league_id IS NULL THEN
        SELECT id INTO v_league_id 
        FROM public.world_leagues 
        WHERE country_id = p_country_id AND division = 2
        AND (SELECT count(*) FROM public.world_teams WHERE league_id = public.world_leagues.id) < 16
        LIMIT 1;
    END IF;
    
    RETURN v_league_id;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;
