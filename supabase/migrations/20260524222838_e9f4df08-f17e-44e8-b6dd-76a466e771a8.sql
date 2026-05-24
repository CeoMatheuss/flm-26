-- Garantir que a tabela de vendas detalhadas exista
CREATE TABLE IF NOT EXISTS public.uniform_sales_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    launch_id UUID REFERENCES public.club_uniform_launches(id) ON DELETE CASCADE,
    club_id UUID NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.uniform_sales_history ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view sales history of their club" 
ON public.uniform_sales_history FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.clubs 
    WHERE id = public.uniform_sales_history.club_id 
    AND user_id = auth.uid()
));

-- Adicionar colunas extras na tabela de lançamentos se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'club_uniform_launches' AND column_name = 'total_sold') THEN
        ALTER TABLE public.club_uniform_launches ADD COLUMN total_sold INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'club_uniform_launches' AND column_name = 'total_revenue') THEN
        ALTER TABLE public.club_uniform_launches ADD COLUMN total_revenue DECIMAL(12,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'club_uniform_launches' AND column_name = 'hype_score') THEN
        ALTER TABLE public.club_uniform_launches ADD COLUMN hype_score INTEGER DEFAULT 50;
    END IF;
END $$;
