-- 1. Create a function to handle post-match processing for World Matches
CREATE OR REPLACE FUNCTION public.after_world_match_finished()
RETURNS TRIGGER AS $$
DECLARE
    v_pending INT;
    v_current_round INT;
BEGIN
    -- Only run if status changed to 'finished'
    IF (OLD.status IS NULL OR OLD.status != 'finished') AND NEW.status = 'finished' THEN
        
        -- 1. Update Standings
        PERFORM public.recalculate_league_table_from_matches(NEW.league_id);
        
        -- 2. Check if all matches in current round are finished
        SELECT current_round INTO v_current_round FROM public.world_leagues WHERE id = NEW.league_id;
        
        -- Use the correct column name from the table (round)
        SELECT count(*) INTO v_pending 
        FROM public.world_matches 
        WHERE league_id = NEW.league_id AND round = v_current_round AND status != 'finished';
        
        -- 3. If no pending matches, advance round
        IF v_pending = 0 THEN
            UPDATE public.world_leagues 
            SET current_round = current_round + 1 
            WHERE id = NEW.league_id;
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a function to handle post-match processing for League Matches (User Leagues)
CREATE OR REPLACE FUNCTION public.after_league_match_finished()
RETURNS TRIGGER AS $$
DECLARE
    v_pending INT;
    v_current_round INT;
BEGIN
    -- Only run if status changed to 'finished' or 'played' (different tables use different terminologies)
    IF (OLD.status IS NULL OR (OLD.status != 'finished' AND OLD.status != 'played')) AND (NEW.status = 'finished' OR NEW.status = 'played') THEN
        
        -- 1. Update Standings
        PERFORM public.update_league_standings(NEW.league_id);
        
        -- 2. Check if all matches in current round are finished
        SELECT current_round INTO v_current_round FROM public.multiplayer_leagues WHERE id = NEW.league_id;
        
        SELECT count(*) INTO v_pending 
        FROM public.league_matches 
        WHERE league_id = NEW.league_id AND round = v_current_round AND (status != 'finished' AND status != 'played');
        
        -- 3. If no pending matches, advance round
        IF v_pending = 0 THEN
            UPDATE public.multiplayer_leagues 
            SET current_round = current_round + 1 
            WHERE id = NEW.league_id;
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure the triggers exist and are correctly assigned
DROP TRIGGER IF EXISTS tr_after_world_match_finished ON public.world_matches;
CREATE TRIGGER tr_after_world_match_finished
AFTER UPDATE ON public.world_matches
FOR EACH ROW
EXECUTE FUNCTION public.after_world_match_finished();

DROP TRIGGER IF EXISTS tr_after_league_match_finished ON public.league_matches;
CREATE TRIGGER tr_after_league_match_finished
AFTER UPDATE ON public.league_matches
FOR EACH ROW
EXECUTE FUNCTION public.after_league_match_finished();

-- 4. RPC to force advance a round if stuck
CREATE OR REPLACE FUNCTION public.force_advance_league_round(_league_id UUID, _is_world BOOLEAN DEFAULT true)
RETURNS VOID AS $$
BEGIN
    IF _is_world THEN
        UPDATE public.world_leagues SET current_round = current_round + 1 WHERE id = _league_id;
    ELSE
        UPDATE public.multiplayer_leagues SET current_round = current_round + 1 WHERE id = _league_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
