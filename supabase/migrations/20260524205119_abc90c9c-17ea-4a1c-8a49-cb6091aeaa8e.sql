-- 1. Refresh the function to ensure it's up to date and correct
CREATE OR REPLACE FUNCTION public.process_daily_stamina_recovery()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    v_updated_count INTEGER;
BEGIN
    -- Update all players with less than 100 stamina
    UPDATE public.world_players
    SET 
        stamina = LEAST(100, COALESCE(stamina, 0) + 30),
        last_stamina_recovery = now()
    WHERE stamina < 100 OR stamina IS NULL;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    -- Log the action for verification
    -- Check if admin_logs exists first, if not create a simple one or skip
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_logs') THEN
        INSERT INTO public.admin_logs (action, details)
        VALUES ('daily_stamina_recovery', 'Recuperação de +30% aplicada a ' || v_updated_count || ' jogadores.');
    END IF;
    
    -- Also log to a system status table if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_status') THEN
        INSERT INTO public.system_status (key, value, last_updated)
        VALUES ('last_stamina_recovery_run', now()::text, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, last_updated = EXCLUDED.last_updated;
    END IF;
END;
$function$;

-- 2. Ensure the cron job is correctly scheduled at 00:00 UTC
-- First, try to remove existing job to avoid duplication
SELECT cron.unschedule('daily-stamina-recovery') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-stamina-recovery');

-- Schedule the job
SELECT cron.schedule('daily-stamina-recovery', '0 0 * * *', 'SELECT public.process_daily_stamina_recovery()');

-- 3. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.process_daily_stamina_recovery() TO service_role;
GRANT EXECUTE ON FUNCTION public.process_daily_stamina_recovery() TO postgres;
