-- Adicionar colunas necessárias para o sistema de valor de mercado na tabela world_players
ALTER TABLE public.world_players 
ADD COLUMN IF NOT EXISTS market_value BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS potential INTEGER DEFAULT 70,
ADD COLUMN IF NOT EXISTS market_value_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS evolution_trend TEXT DEFAULT 'stable', -- 'up', 'stable', 'down'
ADD COLUMN IF NOT EXISTS reputation INTEGER DEFAULT 50, -- 0-100
ADD COLUMN IF NOT EXISTS salary BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;

-- Garantir que a reputação do clube também exista (se não houver)
ALTER TABLE public.clubs
ADD COLUMN IF NOT EXISTS reputation INTEGER DEFAULT 50;

-- Criar função para calcular o valor de mercado (versão base para uso em triggers ou RPC)
CREATE OR REPLACE FUNCTION public.calculate_player_market_value(
    p_overall INTEGER,
    p_age INTEGER,
    p_potential INTEGER,
    p_reputation INTEGER,
    p_club_reputation INTEGER DEFAULT 50
) RETURNS BIGINT AS $$
DECLARE
    v_base_value BIGINT;
    v_age_multiplier NUMERIC;
    v_potential_multiplier NUMERIC;
    v_reputation_multiplier NUMERIC;
    v_final_value BIGINT;
BEGIN
    -- Valor base baseado no Overall (escala exponencial para elite)
    v_base_value := CASE 
        WHEN p_overall < 60 THEN p_overall * 10000
        WHEN p_overall < 70 THEN 600000 + (p_overall - 60) * 100000
        WHEN p_overall < 80 THEN 1600000 + (p_overall - 70) * 500000
        WHEN p_overall < 90 THEN 6600000 + (p_overall - 80) * 2000000
        ELSE 26600000 + (p_overall - 90) * 10000000
    END;

    -- Multiplicador por Idade
    v_age_multiplier := CASE
        WHEN p_age BETWEEN 15 AND 21 THEN 1.5 -- Jovem promessa
        WHEN p_age BETWEEN 22 AND 28 THEN 1.2 -- Auge
        WHEN p_age BETWEEN 29 AND 32 THEN 0.9 -- Estabilidade
        ELSE 0.6 -- Desvalorização
    END;

    -- Multiplicador por Potencial (impacta mais os jovens)
    v_potential_multiplier := 1.0 + (GREATEST(0, p_potential - p_overall) * 0.05);
    IF p_age > 25 THEN
        v_potential_multiplier := 1.0 + (v_potential_multiplier - 1.0) * 0.2; -- Impacto reduzido após os 25
    END IF;

    -- Multiplicador por Reputação (Jogador e Clube)
    v_reputation_multiplier := 1.0 + (p_reputation * 0.005) + (p_club_reputation * 0.002);

    -- Cálculo Final
    v_final_value := (v_base_value * v_age_multiplier * v_potential_multiplier * v_reputation_multiplier)::BIGINT;
    
    RETURN v_final_value;
END;
$$ LANGUAGE plpgsql;
