-- 1) live_matches: roster snapshot lock
ALTER TABLE public.live_matches
  ADD COLUMN IF NOT EXISTS roster_locked_at TIMESTAMPTZ;

-- 2) profiles: viewed_awards_season
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS viewed_awards_season INTEGER;

-- 3) season_awards table
CREATE TABLE IF NOT EXISTS public.season_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season integer NOT NULL,
  scope text NOT NULL,
  scope_id uuid,
  award_type text NOT NULL,
  player_name text,
  player_position text,
  player_overall integer,
  user_id uuid,
  club_name text,
  club_logo text,
  stats jsonb DEFAULT '{}'::jsonb,
  score numeric DEFAULT 0,
  ai_image_url text,
  ai_narrative text,
  team_of_season jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS season_awards_unique_idx
  ON public.season_awards (season, scope, COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::uuid), award_type);

CREATE INDEX IF NOT EXISTS season_awards_user_id_idx ON public.season_awards (user_id);
CREATE INDEX IF NOT EXISTS season_awards_season_idx ON public.season_awards (season);

ALTER TABLE public.season_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view awards" ON public.season_awards;
CREATE POLICY "Anyone authenticated can view awards"
  ON public.season_awards
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert awards" ON public.season_awards;
CREATE POLICY "Admins can insert awards"
  ON public.season_awards
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update awards" ON public.season_awards;
CREATE POLICY "Admins can update awards"
  ON public.season_awards
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete awards" ON public.season_awards;
CREATE POLICY "Admins can delete awards"
  ON public.season_awards
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));