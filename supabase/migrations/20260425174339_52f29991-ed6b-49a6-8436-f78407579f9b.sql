-- Schedule weekly auction closing every Sunday 17:00 BRT (20:00 UTC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'close-expired-auctions-weekly') THEN
    PERFORM cron.unschedule('close-expired-auctions-weekly');
  END IF;
END $$;

SELECT cron.schedule(
  'close-expired-auctions-weekly',
  '0 20 * * 0', -- Sundays at 20:00 UTC = 17:00 BRT
  $$ SELECT public.close_expired_auctions(); $$
);