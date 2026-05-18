CREATE OR REPLACE FUNCTION public.sync_match_persistence(_match_id UUID)
RETURNS void AS $$
DECLARE
    v_match_row RECORD;
    v_league_match RECORD;
    v_cup_match RECORD;
    v_tournament_match RECORD;
    v_winner_id UUID;
    v_player_id TEXT;
    v_stamina INTEGER;
    v_player_data JSONB;
BEGIN
    -- 1. Get and lock the match row
    SELECT * INTO v_match_row FROM public.live_matches WHERE id = _match_id FOR UPDATE;
    
    IF v_match_row IS NULL OR v_match_row.status != 'finished' OR v_match_row.is_processed THEN
        RETURN;
    END IF;

    -- 2. LEAGUE MATCH SYNC
    SELECT * INTO v_league_match FROM public.world_matches WHERE id = v_match_row.shared_match_id;
    IF v_league_match IS NOT NULL THEN
        UPDATE public.world_matches 
        SET home_goals = v_match_row.home_goals, 
            away_goals = v_match_row.away_goals, 
            status = 'finished', 
            played_at = NOW()
        WHERE id = v_league_match.id;
    END IF;

    -- 3. UPDATE PLAYER STAMINA (Novo)
    -- Extrair o último staminaData dos eventos
    -- O match_data->'events' é um array de eventos, o último evento costuma ter o staminaData final
    FOR v_player_data IN SELECT * FROM jsonb_each(COALESCE(v_match_row.match_data->'staminaData', '{}'::jsonb))
    LOOP
        v_player_id := v_player_data.key;
        v_stamina := v_player_data.value::INTEGER;
        
        UPDATE public.world_players 
        SET stamina = v_stamina 
        WHERE id::text = v_player_id;
    END LOOP;

    -- 4. Mark as processed
    UPDATE public.live_matches SET is_processed = TRUE WHERE id = _match_id;
    
    -- LOG
    INSERT INTO public.admin_logs (action, details)
    VALUES ('match_persistence_sync', jsonb_build_object('match_id', _match_id, 'home', v_match_row.home_team, 'away', v_match_row.away_team));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
