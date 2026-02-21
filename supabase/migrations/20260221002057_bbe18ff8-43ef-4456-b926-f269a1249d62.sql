
-- Fix overly permissive INSERT policy - scope to user's own alerts
DROP POLICY "Authenticated can insert alerts" ON public.abuse_alerts;

CREATE POLICY "Users can insert own alerts"
ON public.abuse_alerts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
