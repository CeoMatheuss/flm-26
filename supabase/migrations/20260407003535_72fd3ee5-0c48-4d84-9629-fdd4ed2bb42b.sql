
-- Fix: allow all authenticated users to read system_settings
DROP POLICY IF EXISTS "Only admins can view system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can view system settings" ON public.system_settings;
CREATE POLICY "Authenticated can read system settings" ON public.system_settings FOR SELECT TO authenticated USING (true);
