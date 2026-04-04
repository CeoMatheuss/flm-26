
-- Admin logs table
CREATE TABLE public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view logs" ON public.admin_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert logs" ON public.admin_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_admin_logs_created ON public.admin_logs (created_at DESC);

-- Open friendly slots table
CREATE TABLE public.open_friendly_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  club_name text NOT NULL DEFAULT '',
  stadium_name text NOT NULL DEFAULT 'Arena',
  stadium_capacity integer NOT NULL DEFAULT 5000,
  status text NOT NULL DEFAULT 'open',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.open_friendly_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view open slots" ON public.open_friendly_slots
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create own slots" ON public.open_friendly_slots
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own slots" ON public.open_friendly_slots
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own slots" ON public.open_friendly_slots
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Also allow game_saves to be read by anyone authenticated (for club profile viewing)
CREATE POLICY "Anyone authenticated can view saves for profiles" ON public.game_saves
  FOR SELECT TO authenticated
  USING (true);

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view own saves" ON public.game_saves;
