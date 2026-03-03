
-- Match reports table
CREATE TABLE public.match_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  match_history_id uuid REFERENCES public.match_history(id) ON DELETE CASCADE,
  competition text NOT NULL DEFAULT 'Amistoso',
  home_team text NOT NULL,
  away_team text NOT NULL,
  home_goals integer NOT NULL DEFAULT 0,
  away_goals integer NOT NULL DEFAULT 0,
  result text NOT NULL DEFAULT 'draw',
  report_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ranking_impact integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.match_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON public.match_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports" ON public.match_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User notifications table
CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  icon text NOT NULL DEFAULT '🔔',
  data jsonb DEFAULT NULL,
  read_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.user_notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON public.user_notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.user_notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON public.user_notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
