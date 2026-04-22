-- Add lobby state columns to friendly_invites
ALTER TABLE public.friendly_invites
  ADD COLUMN IF NOT EXISTS lobby_opened_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS home_joined BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS away_joined BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_sim_at TIMESTAMP WITH TIME ZONE;

-- Add lobby state columns to league_matches
ALTER TABLE public.league_matches
  ADD COLUMN IF NOT EXISTS lobby_opened_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS home_joined BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS away_joined BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_sim_at TIMESTAMP WITH TIME ZONE;

-- Index to find expired lobbies fast
CREATE INDEX IF NOT EXISTS idx_friendly_invites_auto_sim_at ON public.friendly_invites(auto_sim_at) WHERE auto_sim_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_league_matches_auto_sim_at ON public.league_matches(auto_sim_at) WHERE auto_sim_at IS NOT NULL;