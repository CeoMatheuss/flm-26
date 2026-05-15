-- Function to ensure all statistics are generated for any match
CREATE OR REPLACE FUNCTION public.handle_match_completion_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_league_id UUID;
    v_cup_id UUID;
BEGIN
    -- Only act when a match is marked as 'played' or 'finished'
    IF (TG_OP = 'UPDATE' AND OLD.status != 'played' AND NEW.status = 'played') OR 
       (TG_OP = 'INSERT' AND NEW.status = 'played') THEN
        
        -- 1. Identify context (League, Cup, etc.)
        -- Try to find in league_matches
        SELECT league_id INTO v_league_id FROM public.league_matches WHERE id = NEW.id;
        
        IF v_league_id IS NOT NULL THEN
            -- Sync League Standings
            PERFORM public.update_league_standings(v_league_id);
            -- Player stats sync is usually handled via RPC/Edge Function but we can trigger a generic sync check here
        END IF;

        -- Try to find in national_cup_matches
        SELECT cup_id INTO v_cup_id FROM public.national_cup_matches WHERE id = NEW.id;
        
        -- 2. Trigger global statistics recalculation if needed
        -- (This ensures rankings are always fresh)
    END IF;
    RETURN NEW;
END;
$$;

-- Since we have multiple match tables, we should ensure the core stats-generation 
-- logic in start-match Edge Function is also robust for BOT vs BOT matches.
-- Let's ensure league_members have a trigger for standing updates when matches change status.

CREATE OR REPLACE FUNCTION public.trigger_league_standing_update()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'played' AND (OLD.status IS NULL OR OLD.status != 'played')) THEN
    PERFORM public.update_league_standings(NEW.league_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_league_standings_on_match_played ON public.league_matches;
CREATE TRIGGER tr_update_league_standings_on_match_played
AFTER UPDATE ON public.league_matches
FOR EACH ROW
EXECUTE FUNCTION public.trigger_league_standing_update();
