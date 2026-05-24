-- Adicionar novas colunas para o ranking avançado se elas não existirem
ALTER TABLE public.global_ranking 
ADD COLUMN IF NOT EXISTS goals_for INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS goals_against INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS division TEXT,
ADD COLUMN IF NOT EXISTS coach_name TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS season_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_draws INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_losses INTEGER DEFAULT 0;

-- Criar um índice para performance de busca no ranking
CREATE INDEX IF NOT EXISTS idx_global_ranking_points ON public.global_ranking (ranking_points DESC);

-- Função para calcular pontos de ranking com base na partida
CREATE OR REPLACE FUNCTION public.calculate_ranking_points(
    p_competition_type TEXT,
    p_result TEXT, -- 'V', 'E', 'D'
    p_opponent_ovr INTEGER,
    p_my_ovr INTEGER,
    p_winning_streak INTEGER DEFAULT 0
) RETURNS INTEGER AS $$
DECLARE
    v_base_points INTEGER;
    v_multiplier NUMERIC;
    v_ovr_diff INTEGER;
    v_final_points INTEGER;
BEGIN
    -- Definir multiplicador por competição
    v_multiplier := CASE p_competition_type
        WHEN 'mundial' THEN 2.0
        WHEN 'continental' THEN 1.6
        WHEN 'copa_nacional' THEN 1.4
        WHEN 'liga' THEN 1.0
        WHEN 'amistoso' THEN 0.5
        ELSE 1.0
    END;

    -- Pontos base pelo resultado
    v_base_points := CASE p_result
        WHEN 'V' THEN 25
        WHEN 'E' THEN 10
        WHEN 'D' THEN -15
        ELSE 0
    END;

    -- Ajuste por diferença de OVR (recompensa ganhar de times fortes, penaliza perder para fracos)
    v_ovr_diff := p_opponent_ovr - p_my_ovr;
    
    IF p_result = 'V' THEN
        -- Bônus por ganhar de time mais forte
        IF v_ovr_diff > 0 THEN
            v_base_points := v_base_points + (v_ovr_diff / 2);
        END IF;
        
        -- Bônus de sequência (streak)
        IF p_winning_streak >= 3 THEN
            v_base_points := v_base_points * 1.25;
        END IF;
    ELSIF p_result = 'D' THEN
        -- Penalidade maior por perder de time mais fraco
        IF v_ovr_diff < 0 THEN
            v_base_points := v_base_points + (v_ovr_diff / 2);
        END IF;
    END IF;

    v_final_points := ROUND(v_base_points * v_multiplier);
    
    RETURN v_final_points;
END;
$$ LANGUAGE plpgsql;

-- Trigger para garantir que apenas clubes reais entrem no ranking (se houver uma tabela que distingua)
-- Como a tabela clubs já tem user_id, assumimos que quem tem user_id é real.
-- Vamos criar um trigger que atualiza o ranking sempre que um clube é criado ou atualizado.

CREATE OR REPLACE FUNCTION public.sync_club_to_ranking()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.global_ranking (
        user_id, 
        club_name, 
        ranking_points, 
        country, 
        coach_name
    )
    VALUES (
        NEW.user_id, 
        NEW.name, 
        1000, -- Pontuação inicial
        NEW.country,
        (SELECT display_name FROM public.profiles WHERE id = NEW.user_id)
    )
    ON CONFLICT (user_id) DO UPDATE SET
        club_name = EXCLUDED.club_name,
        country = EXCLUDED.country,
        coach_name = (SELECT display_name FROM public.profiles WHERE id = NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_club_to_ranking ON public.clubs;
CREATE TRIGGER tr_sync_club_to_ranking
AFTER INSERT OR UPDATE OF name, country ON public.clubs
FOR EACH ROW
EXECUTE FUNCTION public.sync_club_to_ranking();
