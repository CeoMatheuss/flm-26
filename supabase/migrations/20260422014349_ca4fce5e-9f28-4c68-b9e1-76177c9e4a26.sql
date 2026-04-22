-- Add tie-breaker rules to friendly invites and tournaments
ALTER TABLE public.friendly_invites
  ADD COLUMN IF NOT EXISTS tie_breaker TEXT NOT NULL DEFAULT 'none';

-- Validate allowed values via trigger (CHECK constraints would lock changes)
CREATE OR REPLACE FUNCTION public.validate_tie_breaker_value()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tie_breaker NOT IN ('none', 'extra_time', 'penalties', 'both') THEN
    RAISE EXCEPTION 'Invalid tie_breaker value. Allowed: none | extra_time | penalties | both';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_tie_breaker_friendly ON public.friendly_invites;
CREATE TRIGGER validate_tie_breaker_friendly
BEFORE INSERT OR UPDATE ON public.friendly_invites
FOR EACH ROW EXECUTE FUNCTION public.validate_tie_breaker_value();

-- Custom tournaments also get the column (cups already use knockouts)
ALTER TABLE public.custom_tournaments
  ADD COLUMN IF NOT EXISTS tie_breaker TEXT NOT NULL DEFAULT 'both';

DROP TRIGGER IF EXISTS validate_tie_breaker_tournament ON public.custom_tournaments;
CREATE TRIGGER validate_tie_breaker_tournament
BEFORE INSERT OR UPDATE ON public.custom_tournaments
FOR EACH ROW EXECUTE FUNCTION public.validate_tie_breaker_value();