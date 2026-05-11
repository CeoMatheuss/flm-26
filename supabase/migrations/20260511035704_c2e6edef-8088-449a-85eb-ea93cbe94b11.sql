-- Nenhuma mudança de schema necessária, apenas lógica na Edge Function.
-- Mas vamos garantir que as notificações de prêmio sejam persistentes.
ALTER TABLE public.national_cup_prizes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'paid';