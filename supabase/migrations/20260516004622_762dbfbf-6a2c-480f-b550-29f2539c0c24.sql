-- Tabela para armazenar os lançamentos de uniformes
CREATE TABLE public.club_uniform_launches (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    config JSONB NOT NULL, -- Cores, padrões, gola, etc.
    launched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    initial_fans INTEGER NOT NULL,
    initial_reputation INTEGER NOT NULL,
    
    -- Estatísticas acumuladas
    total_sales_count INTEGER DEFAULT 0,
    total_revenue_cents BIGINT DEFAULT 0,
    peak_daily_sales INTEGER DEFAULT 0,
    
    -- Metadados para o hype
    hype_score FLOAT DEFAULT 1.0, -- Começa em 1.0 e decai
    last_sales_update_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar coluna na tabela de clubes para rastrear o uniforme atual
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS current_uniform_launch_id UUID REFERENCES public.club_uniform_launches(id) ON DELETE SET NULL;

-- Habilitar RLS
ALTER TABLE public.club_uniform_launches ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view their own uniform launches" 
ON public.club_uniform_launches 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.clubs 
    WHERE clubs.id = club_uniform_launches.club_id 
    AND clubs.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own uniform launches" 
ON public.club_uniform_launches 
FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM public.clubs 
    WHERE clubs.id = club_id 
    AND clubs.user_id = auth.uid()
));

CREATE POLICY "Users can update their own uniform launches" 
ON public.club_uniform_launches 
FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM public.clubs 
    WHERE clubs.id = club_uniform_launches.club_id 
    AND clubs.user_id = auth.uid()
));

-- Função para calcular as vendas diárias (usada pela interface ou processo em segundo plano)
-- Note: Implementaremos a lógica de cálculo no frontend/edge function por simplicidade de ajuste de balanceamento,
-- mas a tabela está pronta para persistir os resultados.

-- Criar índices para performance
CREATE INDEX idx_uniform_launches_club_id ON public.club_uniform_launches(club_id);
CREATE INDEX idx_uniform_launches_launched_at ON public.club_uniform_launches(launched_at);
