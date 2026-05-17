-- Add tracking columns to live_matches
ALTER TABLE public.live_matches ADD COLUMN IF NOT EXISTS is_processed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.live_matches ADD COLUMN IF NOT EXISTS competition_type TEXT; -- 'league', 'cup', 'friendly'

-- Ensure unique constraint on shared_match_id exists and is correct
-- (If it already exists, this might need care, but for now we ensure logic)
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_matches_shared_unique ON public.live_matches (shared_match_id) WHERE status != 'finished';

-- REFACTOR sync_match_persistence to be ROBUST
CREATE OR REPLACE FUNCTION public.sync_match_persistence(_match_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match_row RECORD;
    v_league_match RECORD;
    v_cup_match RECORD;
    v_tournament_match RECORD;
    v_winner_id UUID;
BEGIN
    -- 1. Get and lock the match row to prevent race conditions
    SELECT * INTO v_match_row FROM public.live_matches WHERE id = _match_id FOR UPDATE;
    
    IF v_match_row IS NULL OR v_match_row.status != 'finished' OR v_match_row.is_processed THEN
        RETURN;
    END IF;

    -- 2. LEAGUE MATCH SYNC (World Matches or Regional League)
    -- Check world_matches (New World System)
    SELECT * INTO v_league_match FROM public.world_matches WHERE id = v_match_row.shared_match_id;
    IF v_league_match IS NOT NULL THEN
        UPDATE public.world_matches 
        SET home_goals = v_match_row.home_goals, 
            away_goals = v_match_row.away_goals, 
            status = 'finished', 
            played_at = NOW()
        WHERE id = v_league_match.id;
        
        -- The world-match-simulator logic usually handles news/stats, 
        -- but we mark it here so the system knows it's done.
    END IF;

    -- Check league_matches (Regional/Multiplayer System)
    SELECT * INTO v_tournament_match FROM public.league_matches WHERE id = v_match_row.shared_match_id;
    IF v_tournament_match IS NOT NULL THEN
        UPDATE public.league_matches 
        SET home_goals = v_match_row.home_goals, 
            away_goals = v_match_row.away_goals, 
            status = 'played', 
            played_at = NOW(),
            match_data = v_match_row.match_data -- JSONB events/stats
        WHERE id = v_tournament_match.id;
        
        PERFORM public.update_league_standings(v_tournament_match.league_id);
    END IF;

    -- 3. NATIONAL CUP SYNC
    SELECT * INTO v_cup_match FROM public.national_cup_matches WHERE id = v_match_row.shared_match_id;
    IF v_cup_match IS NOT NULL THEN
        v_winner_id := CASE 
            WHEN v_match_row.home_goals > v_match_row.away_goals THEN v_cup_match.home_team_id 
            WHEN v_match_row.away_goals > v_match_row.home_goals THEN v_cup_match.away_team_id 
            -- Tie-breaker: penalties (saved in match_data or columns)
            ELSE COALESCE(
                (v_match_row.match_data->>'winner_team_id')::UUID, 
                v_cup_match.home_team_id -- Fallback
            )
        END;

        UPDATE public.national_cup_matches 
        SET home_score = v_match_row.home_goals, 
            away_score = v_match_row.away_goals, 
            status = 'finished', 
            winner_team_id = v_winner_id,
            updated_at = NOW()
        WHERE id = v_cup_match.id;
        
        -- Eliminate the loser
        UPDATE public.national_cup_teams 
        SET eliminated = TRUE 
        WHERE id = (CASE WHEN v_winner_id = v_cup_match.home_team_id THEN v_cup_match.away_team_id ELSE v_cup_match.home_team_id END);
    END IF;

    -- 4. Mark as processed
    UPDATE public.live_matches SET is_processed = TRUE WHERE id = _match_id;

    -- 5. Finalize UI Status (Optional but helpful for realtime)
    -- The status is already 'finished' to get here.
END;
$$;
