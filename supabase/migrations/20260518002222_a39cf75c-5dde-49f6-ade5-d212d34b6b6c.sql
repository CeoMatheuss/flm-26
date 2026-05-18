-- Update live_matches to ensure we can store the new fields in the events JSONB array if needed,
-- but since events is already JSONB, we just need to ensure the simulation and persistence logic handles them.

-- Add persistent injury columns to world_players (if not already present via previous features)
-- These allow injuries to persist across sessions and influence simulation.
ALTER TABLE public.world_players 
ADD COLUMN IF NOT EXISTS injury_type TEXT,
ADD COLUMN IF NOT EXISTS injury_severity TEXT,
ADD COLUMN IF NOT EXISTS injury_weeks_remaining INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS injury_body_part TEXT,
ADD COLUMN IF NOT EXISTS injury_is_relapse BOOLEAN DEFAULT false;

-- Add index for faster injury lookups
CREATE INDEX IF NOT EXISTS idx_world_players_injury ON public.world_players (injury_weeks_remaining) WHERE injury_weeks_remaining > 0;
