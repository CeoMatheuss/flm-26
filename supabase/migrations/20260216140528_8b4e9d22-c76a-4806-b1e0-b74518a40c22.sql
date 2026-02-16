
-- Create league_awards table for storing season awards
CREATE TABLE public.league_awards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID NOT NULL REFERENCES public.multiplayer_leagues(id) ON DELETE CASCADE,
  season INTEGER NOT NULL DEFAULT 1,
  award_type TEXT NOT NULL, -- 'artilheiro', 'assistente', 'melhor_time'
  user_id UUID NOT NULL,
  player_name TEXT,
  value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.league_awards ENABLE ROW LEVEL SECURITY;

-- Members of the league can view awards
CREATE POLICY "Members can view league awards"
ON public.league_awards
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM league_members lm
    WHERE lm.league_id = league_awards.league_id
    AND lm.user_id = auth.uid()
  )
);

-- League members can insert awards (for end-of-season calculation)
CREATE POLICY "Members can insert league awards"
ON public.league_awards
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM league_members lm
    WHERE lm.league_id = league_awards.league_id
    AND lm.user_id = auth.uid()
  )
);
