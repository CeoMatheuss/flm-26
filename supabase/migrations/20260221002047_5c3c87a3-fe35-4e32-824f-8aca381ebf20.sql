
-- Anti-abuse alerts table
CREATE TABLE public.abuse_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alert_type text NOT NULL DEFAULT 'suspicious_transfer',
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.abuse_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can view alerts
CREATE POLICY "Admins can view abuse alerts"
ON public.abuse_alerts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update alerts (mark as reviewed)
CREATE POLICY "Admins can update abuse alerts"
ON public.abuse_alerts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- System/edge functions can insert alerts (service role)
CREATE POLICY "Authenticated can insert alerts"
ON public.abuse_alerts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admins can delete alerts
CREATE POLICY "Admins can delete abuse alerts"
ON public.abuse_alerts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
