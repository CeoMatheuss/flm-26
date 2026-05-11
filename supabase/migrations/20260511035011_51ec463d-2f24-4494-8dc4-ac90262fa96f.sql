-- 1. Melhorar rastreamento de origem dos times
ALTER TABLE public.national_cup_teams 
ADD COLUMN IF NOT EXISTS league_id UUID,
ADD COLUMN IF NOT EXISTS division_level INTEGER;

-- 2. Adicionar estatística de times na tabela mestre
ALTER TABLE public.national_cups
ADD COLUMN IF NOT EXISTS total_teams INTEGER DEFAULT 0;

-- 3. Função auxiliar para verificar participação
CREATE OR REPLACE FUNCTION public.is_in_national_cup(_user_id UUID, _cup_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.national_cup_teams 
    WHERE user_id = _user_id AND cup_id = _cup_id
  );
$$;