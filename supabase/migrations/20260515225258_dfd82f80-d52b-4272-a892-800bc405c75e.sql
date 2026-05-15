CREATE OR REPLACE FUNCTION public.sync_match_persistence(_match_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_league_id UUID;
    v_cup_id UUID;
    v_tournament_id UUID;
    v_match_type TEXT;
BEGIN
    -- 1. Identify the match in different competition tables
    
    -- League
    SELECT league_id INTO v_league_id FROM public.league_matches WHERE id = _match_id OR id::text = _match_id::text;
    IF v_league_id IS NOT NULL THEN
        PERFORM public.update_league_standings(v_league_id);
    END IF;

    -- National Cup
    SELECT cup_id INTO v_cup_id FROM public.national_cup_matches WHERE id = _match_id OR id::text = _match_id::text;
    -- If it's a cup match, logic for advancing rounds might be needed here if not already handled by triggers
    
    -- Custom Tournament
    SELECT tournament_id INTO v_tournament_id FROM public.custom_tournament_matches WHERE id = _match_id OR id::text = _match_id::text;
    -- Tournament standings update logic could be added here
    
END;
$$;