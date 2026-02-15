
-- Table to sync each member's squad to their league
CREATE TABLE public.league_squads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID NOT NULL REFERENCES public.multiplayer_leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  squad_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  tactics_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id)
);

ALTER TABLE public.league_squads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view league squads"
  ON public.league_squads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM league_members lm
    WHERE lm.league_id = league_squads.league_id AND lm.user_id = auth.uid()
  ));

CREATE POLICY "Users can upsert own squad"
  ON public.league_squads FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM league_members lm
    WHERE lm.league_id = league_squads.league_id AND lm.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own squad"
  ON public.league_squads FOR UPDATE
  USING (auth.uid() = user_id);

-- Table to store online match schedule and results
CREATE TABLE public.league_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID NOT NULL REFERENCES public.multiplayer_leagues(id) ON DELETE CASCADE,
  round INTEGER NOT NULL DEFAULT 1,
  home_user_id UUID NOT NULL,
  away_user_id UUID NOT NULL,
  home_goals INTEGER,
  away_goals INTEGER,
  match_data JSONB, -- stores detailed match events
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, ready, played
  played_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.league_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view league matches"
  ON public.league_matches FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM league_members lm
    WHERE lm.league_id = league_matches.league_id AND lm.user_id = auth.uid()
  ));

CREATE POLICY "Members can insert league matches"
  ON public.league_matches FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM league_members lm
    WHERE lm.league_id = league_matches.league_id AND lm.user_id = auth.uid()
  ));

CREATE POLICY "Participants can update matches"
  ON public.league_matches FOR UPDATE
  USING (auth.uid() = home_user_id OR auth.uid() = away_user_id);

-- Add season_status to multiplayer_leagues
ALTER TABLE public.multiplayer_leagues ADD COLUMN IF NOT EXISTS season_status TEXT NOT NULL DEFAULT 'registration';
-- registration -> in_progress -> playoffs -> finished

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.league_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.league_squads;
