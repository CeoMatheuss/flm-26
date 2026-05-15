-- Tabela para configurações de premiação (Admin pode editar)
CREATE TABLE IF NOT EXISTS public.prize_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_type TEXT NOT NULL, -- 'league' ou 'cup'
    competition_id UUID, -- NULL se for configuração padrão para o tipo
    rank_or_phase TEXT NOT NULL, -- '1', '2', 'round_16', 'quarter', etc.
    amount BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de histórico de premiações pagas
CREATE TABLE IF NOT EXISTS public.tournament_prizes_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    competition_type TEXT NOT NULL, -- 'league' ou 'cup'
    competition_name TEXT,
    competition_id UUID,
    phase_or_rank TEXT,
    amount BIGINT NOT NULL,
    season_year INTEGER,
    season_month INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Impedir pagamentos duplicados para a mesma fase/clube/temporada
    UNIQUE(club_id, competition_id, phase_or_rank, season_year, season_month)
);

-- Ativar RLS
ALTER TABLE public.prize_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_prizes_history ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Prize configs are viewable by everyone" ON public.prize_configurations FOR SELECT USING (true);
CREATE POLICY "Prize history is viewable by the club owner" ON public.tournament_prizes_history FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND user_id = auth.uid())
);

-- Função para processar pagamento de premiação com segurança
CREATE OR REPLACE FUNCTION public.process_tournament_prize(
    p_club_id UUID,
    p_comp_type TEXT,
    p_comp_name TEXT,
    p_comp_id UUID,
    p_phase_rank TEXT,
    p_amount BIGINT,
    p_year INTEGER,
    p_month INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_already_paid BOOLEAN;
BEGIN
    -- Verificar se já foi pago (Anti-duplicação)
    SELECT EXISTS (
        SELECT 1 FROM public.tournament_prizes_history 
        WHERE club_id = p_club_id 
        AND competition_id = p_comp_id 
        AND phase_or_rank = p_phase_rank
        AND season_year = p_year
        AND season_month = p_month
    ) INTO v_already_paid;

    IF v_already_paid THEN
        RETURN FALSE;
    END IF;

    -- Registrar histórico
    INSERT INTO public.tournament_prizes_history (
        club_id, competition_type, competition_name, competition_id, phase_or_rank, amount, season_year, season_month
    ) VALUES (
        p_club_id, p_comp_type, p_comp_name, p_comp_id, p_phase_rank, p_amount, p_year, p_month
    );

    -- Atualizar saldo do clube
    UPDATE public.clubs 
    SET budget = budget + p_amount,
        cash = cash + p_amount
    WHERE id = p_club_id;

    -- Gerar notificação
    INSERT INTO public.user_notifications (
        user_id, title, message, type
    ) 
    SELECT user_id, 'Premiação Recebida', 
           'Seu clube recebeu ' || (p_amount / 1000)::text || 'K como premiação de ' || p_comp_name || ' (' || p_phase_rank || ').',
           'finance'
    FROM public.clubs WHERE id = p_club_id;

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao processar premiação: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inserir alguns valores padrão de exemplo
INSERT INTO public.prize_configurations (competition_type, rank_or_phase, amount) VALUES
('cup', 'round_32', 100000),
('cup', 'round_16', 250000),
('cup', 'quarter', 500000),
('cup', 'semi', 1000000),
('cup', 'winner', 5000000),
('cup', 'runner_up', 2000000),
('league', '1', 10000000),
('league', '2', 7000000),
('league', '3', 5000000),
('league', '4', 3000000),
('league', 'min_participation', 500000);
