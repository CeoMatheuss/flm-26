-- Add control column for auto-simulation timeout in world_matches
ALTER TABLE public.world_matches ADD COLUMN IF NOT EXISTS auto_sim_at TIMESTAMP WITH TIME ZONE;

-- Create an index to speed up the simulator query
CREATE INDEX IF NOT EXISTS idx_world_matches_auto_sim ON public.world_matches (status, scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_world_matches_simulating_timeout ON public.world_matches (status, scheduled_at) WHERE status = 'simulating';

-- Create a helper function to trigger the simulators via RPC if needed
-- This is just a placeholder as we'll use Edge Functions for the heavy lifting
-- but we can use a trigger to set auto_sim_at if it's missing.

CREATE OR REPLACE FUNCTION public.set_auto_sim_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scheduled_at IS NOT NULL AND NEW.auto_sim_at IS NULL THEN
    -- Set auto-sim to 5 minutes after scheduled time
    NEW.auto_sim_at := NEW.scheduled_at + INTERVAL '5 minutes';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_auto_sim_at ON public.world_matches;
CREATE TRIGGER tr_set_auto_sim_at
BEFORE INSERT OR UPDATE OF scheduled_at ON public.world_matches
FOR EACH ROW EXECUTE FUNCTION public.set_auto_sim_at();

-- Update existing scheduled matches
UPDATE public.world_matches 
SET auto_sim_at = scheduled_at + INTERVAL '5 minutes' 
WHERE status = 'scheduled' AND auto_sim_at IS NULL;
