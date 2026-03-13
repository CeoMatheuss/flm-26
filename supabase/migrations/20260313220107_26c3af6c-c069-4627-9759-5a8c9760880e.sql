
-- System settings table for maintenance mode
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read system settings (needed to check maintenance mode)
CREATE POLICY "Anyone authenticated can read system settings"
ON public.system_settings FOR SELECT TO authenticated USING (true);

-- Only admins can manage system settings
CREATE POLICY "Admins can insert system settings"
ON public.system_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update system settings"
ON public.system_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete system settings"
ON public.system_settings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Initialize maintenance_mode setting
INSERT INTO public.system_settings (key, value) VALUES ('maintenance_mode', '{"active": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Game updates table
CREATE TABLE IF NOT EXISTS public.game_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  version text NOT NULL,
  description text NOT NULL DEFAULT '',
  fixes text[] NOT NULL DEFAULT '{}',
  features text[] NOT NULL DEFAULT '{}',
  ai_summary text,
  status text NOT NULL DEFAULT 'draft',
  author_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  published_at timestamp with time zone
);

ALTER TABLE public.game_updates ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view published updates
CREATE POLICY "Anyone can view published updates"
ON public.game_updates FOR SELECT TO authenticated
USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

-- Only admins can create/update/delete
CREATE POLICY "Admins can insert updates"
ON public.game_updates FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update updates"
ON public.game_updates FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete updates"
ON public.game_updates FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
