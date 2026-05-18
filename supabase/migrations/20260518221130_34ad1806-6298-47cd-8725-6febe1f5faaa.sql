-- Agendar job diário via pg_cron
-- Nota: 0 0 * * * significa meia-noite todos os dias
SELECT cron.schedule('daily-stamina-recovery', '0 0 * * *', 'SELECT public.process_daily_stamina_recovery()');
