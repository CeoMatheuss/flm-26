
-- Table to store server-side match simulations
CREATE TABLE public.live_matches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  match_id text NOT NULL,
  home_team text NOT NULL,
  away_team text NOT NULL,
  home_strength numeric NOT NULL DEFAULT 60,
  away_strength numeric NOT NULL DEFAULT 60,
  stadium_name text NOT NULL DEFAULT 'Estádio',
  stadium_capacity integer NOT NULL DEFAULT 5000,
  is_home boolean NOT NULL DEFAULT true,
  competition text NOT NULL DEFAULT 'Amistoso',
  status text NOT NULL DEFAULT 'live',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  duration_seconds integer NOT NULL DEFAULT 720,
  home_goals integer NOT NULL DEFAULT 0,
  away_goals integer NOT NULL DEFAULT 0,
  current_minute integer NOT NULL DEFAULT 0,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  player_ratings jsonb NOT NULL DEFAULT '{}'::jsonb,
  home_players jsonb NOT NULL DEFAULT '[]'::jsonb,
  tactics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.live_matches ENABLE ROW LEVEL SECURITY;

-- Users can only see their own matches
CREATE POLICY "Users can view their own live matches"
ON public.live_matches FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own matches (via edge function with service role, but also allow direct)
CREATE POLICY "Users can create their own live matches"
ON public.live_matches FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own matches
CREATE POLICY "Users can update their own live matches"
ON public.live_matches FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own matches
CREATE POLICY "Users can delete their own live matches"
ON public.live_matches FOR DELETE
USING (auth.uid() = user_id);

-- Index for fast lookup of active matches
CREATE INDEX idx_live_matches_user_status ON public.live_matches (user_id, status);

-- Enable realtime for live score updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_matches;
