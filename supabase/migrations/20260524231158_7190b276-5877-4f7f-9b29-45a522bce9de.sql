CREATE OR REPLACE FUNCTION public.update_player_after_match(
    _player_id UUID,
    _rating NUMERIC,
    _goals INTEGER,
    _assists INTEGER,
    _clean_sheet BOOLEAN,
    _competition TEXT
) RETURNS JSONB AS $$
DECLARE
    p_morale INTEGER;
    p_reputation NUMERIC;
    p_market_value BIGINT;
    p_season_ratings NUMERIC[];
    morale_delta INTEGER;
    rep_delta NUMERIC;
    value_mult NUMERIC;
BEGIN
    -- 1. Fetch current player data
    SELECT morale, reputation, market_value, season_ratings 
    INTO p_morale, p_reputation, p_market_value, p_season_ratings
    FROM public.players 
    WHERE id = _player_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Player not found');
    END IF;

    -- 2. Calculate deltas based on rating
    -- Morale
    IF _rating >= 7.5 THEN morale_delta := 5;
    ELSIF _rating <= 5.0 THEN morale_delta := -5;
    ELSE morale_delta := 0;
    END IF;

    -- Reputation
    IF _rating >= 8.5 THEN rep_delta := 0.5;
    ELSIF _rating <= 4.0 THEN rep_delta := -0.3;
    ELSE rep_delta := 0;
    END IF;

    -- Market Value
    IF _rating >= 9.0 THEN value_mult := 1.02;
    ELSIF _rating >= 8.0 THEN value_mult := 1.01;
    ELSIF _rating <= 4.0 THEN value_mult := 0.98;
    ELSE value_mult := 1.0;
    END IF;

    -- 3. Apply updates
    UPDATE public.players 
    SET 
        morale = GREATEST(0, LEAST(100, COALESCE(morale, 70) + morale_delta)),
        reputation = GREATEST(0, LEAST(100, COALESCE(reputation, 50) + rep_delta)),
        market_value = ROUND(COALESCE(market_value, 100000) * value_mult),
        season_ratings = array_append(COALESCE(season_ratings, '{}'), _rating),
        goals = COALESCE(goals, 0) + _goals,
        assists = COALESCE(assists, 0) + _assists,
        games_played = COALESCE(games_played, 0) + 1
    WHERE id = _player_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;