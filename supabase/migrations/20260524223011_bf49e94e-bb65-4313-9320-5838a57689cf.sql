-- Criar planos se não existirem
CREATE TABLE IF NOT EXISTS public.membership_plans (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    monthly_price DECIMAL(12,2) NOT NULL,
    benefits TEXT[] DEFAULT '{}',
    min_reputation_required INTEGER DEFAULT 0,
    bonus_multiplier DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir planos padrão se a tabela estiver vazia
INSERT INTO public.membership_plans (name, monthly_price, benefits, min_reputation_required, bonus_multiplier)
SELECT 'Bronze', 20.00, ARRAY['Desconto em ingressos', 'Acesso a conteúdos exclusivos'], 0, 1.0
WHERE NOT EXISTS (SELECT 1 FROM public.membership_plans WHERE name = 'Bronze');

INSERT INTO public.membership_plans (name, monthly_price, benefits, min_reputation_required, bonus_multiplier)
SELECT 'Prata', 50.00, ARRAY['Desconto maior em ingressos', 'Prioridade na compra', 'Camisa retrô anual'], 20, 1.05
WHERE NOT EXISTS (SELECT 1 FROM public.membership_plans WHERE name = 'Prata');

INSERT INTO public.membership_plans (name, monthly_price, benefits, min_reputation_required, bonus_multiplier)
SELECT 'Ouro', 120.00, ARRAY['Ingressos grátis (setor lateral)', 'Acesso ao CT', 'Voto em consultas do clube'], 50, 1.15
WHERE NOT EXISTS (SELECT 1 FROM public.membership_plans WHERE name = 'Ouro');

INSERT INTO public.membership_plans (name, monthly_price, benefits, min_reputation_required, bonus_multiplier)
SELECT 'Diamante', 350.00, ARRAY['Camarote em todos os jogos', 'Experiências VIP', 'Kit oficial anual completo'], 80, 1.30
WHERE NOT EXISTS (SELECT 1 FROM public.membership_plans WHERE name = 'Diamante');

-- Ajustar club_memberships para suportar múltiplos planos por clube
-- Se a tabela já existir e tiver uma estrutura diferente, vamos adaptá-la
DO $$ 
BEGIN
    -- Se a tabela existir e tiver 'active_plan_id', vamos criar uma nova tabela de junção 'club_membership_stats'
    -- para manter a compatibilidade ou simplesmente garantir que ela funcione para o novo sistema.
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'club_memberships') THEN
        -- Adicionar coluna plan_id se não existir
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'club_memberships' AND column_name = 'plan_id') THEN
            ALTER TABLE public.club_memberships ADD COLUMN plan_id UUID REFERENCES public.membership_plans(id);
            ALTER TABLE public.club_memberships ADD COLUMN member_count INTEGER DEFAULT 0;
            -- Tentar migrar dados se possível, ou apenas limpar se for ambiente de dev
        END IF;
    END IF;
END $$;

-- Tabela de histórico de receita (se não existir)
CREATE TABLE IF NOT EXISTS public.membership_revenue_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    member_total INTEGER NOT NULL,
    month_year DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS e criar políticas se não existirem
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_revenue_history ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read membership_plans') THEN
        CREATE POLICY "Public read membership_plans" ON public.membership_plans FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read membership_revenue_history') THEN
        CREATE POLICY "Public read membership_revenue_history" ON public.membership_revenue_history FOR SELECT USING (true);
    END IF;
END $$;

-- Função de processamento
CREATE OR REPLACE FUNCTION public.process_monthly_membership_revenue()
RETURNS void AS $$
DECLARE
    club_record RECORD;
    plan_record RECORD;
    total_revenue DECIMAL(15,2);
    total_members INTEGER;
    current_month_start DATE := date_trunc('month', now())::DATE;
BEGIN
    FOR club_record IN SELECT id, budget FROM public.clubs LOOP
        total_revenue := 0;
        total_members := 0;
        
        -- Verificar se já foi processado este mês
        IF EXISTS (SELECT 1 FROM public.membership_revenue_history WHERE club_id = club_record.id AND month_year = current_month_start) THEN
            CONTINUE;
        END IF;

        -- Calcular receita baseada nos sócios atuais (ajustado para a estrutura detectada)
        -- Assumimos agora que club_memberships tem club_id, plan_id e member_count
        FOR plan_record IN 
            SELECT cm.member_count, mp.monthly_price, mp.bonus_multiplier 
            FROM public.club_memberships cm
            JOIN public.membership_plans mp ON cm.plan_id = mp.id
            WHERE cm.club_id = club_record.id
        LOOP
            total_revenue := total_revenue + (plan_record.member_count * plan_record.monthly_price * plan_record.bonus_multiplier);
            total_members := total_members + COALESCE(plan_record.member_count, 0);
        END LOOP;

        IF total_revenue > 0 THEN
            -- Atualizar orçamento do clube
            UPDATE public.clubs SET budget = budget + total_revenue WHERE id = club_record.id;
            
            -- Registrar histórico
            INSERT INTO public.membership_revenue_history (club_id, amount, member_total, month_year)
            VALUES (club_record.id, total_revenue, total_members, current_month_start);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
