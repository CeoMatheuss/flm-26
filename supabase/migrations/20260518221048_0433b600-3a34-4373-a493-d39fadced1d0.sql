-- Adicionar stamina e morale como colunas reais para performance e precisão
ALTER TABLE public.world_players 
ADD COLUMN IF NOT EXISTS stamina INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS morale INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS last_stamina_recovery TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Garantir que stamina não saia do range 0-100
ALTER TABLE public.world_players 
ADD CONSTRAINT world_players_stamina_check CHECK (stamina >= 0 AND stamina <= 100);

-- Função de Recuperação Diária de Stamina (+30%)
CREATE OR REPLACE FUNCTION public.process_daily_stamina_recovery()
RETURNS void AS $$
BEGIN
    UPDATE public.world_players
    SET 
        stamina = LEAST(100, stamina + 30),
        last_stamina_recovery = now()
    WHERE stamina < 100;
    
    INSERT INTO public.admin_logs (action, details)
    VALUES ('daily_stamina_recovery', 'Processada recuperação de +30% para todos os jogadores do mundo.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
