-- 1. Criar novo Mundial se necessário ou atualizar o existente
DO $$
DECLARE
    v_cup_id UUID;
BEGIN
    -- Verificar se já existe um Mundial ativo
    SELECT id INTO v_cup_id FROM public.world_cup_competitions WHERE status = 'active' LIMIT 1;
    
    IF v_cup_id IS NULL THEN
        INSERT INTO public.world_cup_competitions (name, status, created_at)
        VALUES ('Mundial de Clubes FLM 26', 'active', now())
        RETURNING id INTO v_cup_id;
    END IF;

    -- 2. Atualizar cronograma de todas as partidas desse mundial para iniciar em 20/06/2026
    -- Quartas de final: 20/06
    UPDATE public.world_cup_matches 
    SET scheduled_at = '2026-06-20 18:00:00+00' 
    WHERE cup_id = v_cup_id AND stage = 'quarter-finals';

    -- Semifinais: 22/06
    UPDATE public.world_cup_matches 
    SET scheduled_at = '2026-06-22 18:00:00+00' 
    WHERE cup_id = v_cup_id AND stage = 'semi-finals';

    -- Final: 24/06
    UPDATE public.world_cup_matches 
    SET scheduled_at = '2026-06-24 18:00:00+00' 
    WHERE cup_id = v_cup_id AND stage = 'final';

END $$;

-- 3. Garantir que as tabelas de Mundial tenham colunas para prorrogação se não existirem
-- (Assumindo que world_cup_matches já tem colunas de gols normais e pênaltis)
ALTER TABLE public.world_cup_matches ADD COLUMN IF NOT EXISTS has_extra_time BOOLEAN DEFAULT false;
ALTER TABLE public.world_cup_matches ADD COLUMN IF NOT EXISTS home_extra_goals INTEGER DEFAULT 0;
ALTER TABLE public.world_cup_matches ADD COLUMN IF NOT EXISTS away_extra_goals INTEGER DEFAULT 0;
