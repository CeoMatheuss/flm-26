
-- cup_config
ALTER TABLE public.cup_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read cup config" ON public.cup_config;
DROP POLICY IF EXISTS "Admins manage cup config" ON public.cup_config;
CREATE POLICY "Anyone can read cup config" ON public.cup_config FOR SELECT USING (true);
CREATE POLICY "Admins manage cup config" ON public.cup_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- payment_webhooks_logs
ALTER TABLE public.payment_webhooks_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view payment webhook logs" ON public.payment_webhooks_logs;
CREATE POLICY "Admins can view payment webhook logs" ON public.payment_webhooks_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
-- Remove from realtime publication to prevent payload broadcast
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.payment_webhooks_logs';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- match_simulation_logs: restrict
DROP POLICY IF EXISTS "Admins can view logs" ON public.match_simulation_logs;
DROP POLICY IF EXISTS "System can insert logs" ON public.match_simulation_logs;
CREATE POLICY "Admins can view simulation logs" ON public.match_simulation_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
-- No INSERT policy = only service role can insert

-- match_worker_logs: admin-only SELECT
DROP POLICY IF EXISTS "Admins can view match worker logs" ON public.match_worker_logs;
CREATE POLICY "Admins can view match worker logs" ON public.match_worker_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- transfer_log: remove client INSERT policy
DROP POLICY IF EXISTS "Admins can insert transfer logs" ON public.transfer_log;
