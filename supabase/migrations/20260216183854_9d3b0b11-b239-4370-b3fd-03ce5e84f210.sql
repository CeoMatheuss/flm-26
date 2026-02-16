
-- Table to track admin password verification attempts
CREATE TABLE public.admin_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only the user themselves can see their own attempts (for display), but inserts/deletes happen via edge function (service role)
CREATE POLICY "Users can view own attempts" ON public.admin_login_attempts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No direct insert/update/delete from client - only via edge function with service role
