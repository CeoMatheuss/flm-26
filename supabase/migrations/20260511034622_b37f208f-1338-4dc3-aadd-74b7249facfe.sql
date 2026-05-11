-- 1. Ajustes na tabela national_cups para suportar horário fixo
ALTER TABLE public.national_cups 
ADD COLUMN IF NOT EXISTS kickoff_time TIME WITHOUT TIME ZONE DEFAULT '12:00:00';

-- 2. Função para simular partidas vencidas automaticamente (segurança para o cron)
CREATE OR REPLACE FUNCTION public.simulate_overdue_cup_matches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Esta função apenas marca como 'live' jogos que já passaram do horário
  -- A simulação real dos eventos deve ser feita pela Edge Function para manter a lógica do motor de jogo
  UPDATE public.national_cup_matches
  SET status = 'live'
  WHERE status = 'scheduled'
    AND scheduled_at <= now();
END;
$$;