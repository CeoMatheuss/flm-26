-- Create match_history table to permanently store all matches
CREATE TABLE public.match_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  match_type text NOT NULL DEFAULT 'friendly', -- 'friendly', 'league', 'cup'
  competition text NOT NULL DEFAULT 'Amistoso',
  home_team text NOT NULL,
  away_team text NOT NULL,
  home_goals integer NOT NULL DEFAULT 0,
  away_goals integer NOT NULL DEFAULT 0,
  is_home boolean NOT NULL DEFAULT true,
  stadium_name text NOT NULL DEFAULT 'Estádio',
  stadium_capacity integer NOT NULL DEFAULT 5000,
  played_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Replay data (events in order)
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Post-match report
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  player_ratings jsonb NOT NULL DEFAULT '{}'::jsonb,
  home_players jsonb NOT NULL DEFAULT '[]'::jsonb,
  goal_scorers jsonb NOT NULL DEFAULT '[]'::jsonb,
  man_of_the_match text,
  
  -- Reference to live_match
  live_match_id uuid,
  
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own match history
CREATE POLICY "Users can view own match history"
  ON public.match_history FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own match history
CREATE POLICY "Users can insert own match history"
  ON public.match_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for fast queries
CREATE INDEX idx_match_history_user_id ON public.match_history(user_id);
CREATE INDEX idx_match_history_played_at ON public.match_history(user_id, played_at DESC);