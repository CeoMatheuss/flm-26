-- Table for global player ranking
CREATE TABLE IF NOT EXISTS public.global_player_ranking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.world_players(id) ON DELETE CASCADE UNIQUE,
    ranking_points NUMERIC DEFAULT 0,
    seasonal_points NUMERIC DEFAULT 0,
    reputation_score INTEGER DEFAULT 0, -- 0-100
    reputation_level TEXT DEFAULT 'Local', -- Local, Nacional, Continental, Mundial
    prev_position INTEGER,
    current_position INTEGER,
    position_rank INTEGER,
    total_goals INTEGER DEFAULT 0,
    total_assists INTEGER DEFAULT 0,
    total_clean_sheets INTEGER DEFAULT 0,
    avg_rating NUMERIC DEFAULT 0,
    mvp_count INTEGER DEFAULT 0,
    last_update TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast ranking queries
CREATE INDEX IF NOT EXISTS idx_player_ranking_points ON public.global_player_ranking(ranking_points DESC);
CREATE INDEX IF NOT EXISTS idx_player_reputation ON public.global_player_ranking(reputation_score DESC);

-- Enable RLS
ALTER TABLE public.global_player_ranking ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read rankings
CREATE POLICY "Rankings are viewable by everyone" 
ON public.global_player_ranking FOR SELECT USING (true);

-- Function to calculate player ranking points
CREATE OR REPLACE FUNCTION public.calculate_player_ranking_points()
RETURNS void AS $$
DECLARE
    p_record RECORD;
    v_score NUMERIC;
    v_reputation INTEGER;
    v_level TEXT;
    v_new_value BIGINT;
BEGIN
    -- Update stats first from world_player_stats (which aggregates seasonal performance)
    FOR p_record IN 
        SELECT 
            wp.id, 
            wp.overall, 
            wp.potential, 
            wp.age,
            wp.position,
            COALESCE(SUM(wps.goals), 0) as goals,
            COALESCE(SUM(wps.assists), 0) as assists,
            COALESCE(SUM(wps.clean_sheets), 0) as clean_sheets,
            COALESCE(AVG(wps.avg_rating), 0) as avg_rating,
            COALESCE(SUM(wps.mvp_count), 0) as mvp_count
        FROM public.world_players wp
        LEFT JOIN public.world_player_stats wps ON wp.id = wps.player_id
        GROUP BY wp.id
    LOOP
        -- Formula for ranking points
        -- Base: Overall * 2
        -- Rating: (AvgRating - 5) * 20 (only if > 5)
        -- Goals: Weight 10
        -- Assists: Weight 6
        -- Clean Sheets: Weight 8 (if DF/GK)
        -- MVP: Weight 15
        
        v_score := (p_record.overall * 1.5) + 
                   (GREATEST(p_record.avg_rating - 5, 0) * 25) + 
                   (p_record.goals * 12) + 
                   (p_record.assists * 8) + 
                   (p_record.mvp_count * 20);
                   
        IF p_record.position IN ('Goleiro', 'Zagueiro', 'Lateral Esquerdo', 'Lateral Direito') THEN
            v_score := v_score + (p_record.clean_sheets * 15);
        END IF;

        -- Reputation calculation based on score
        v_reputation := LEAST(ROUND(v_score / 15), 100);
        
        IF v_reputation >= 90 THEN v_level := 'Mundial';
        ELSIF v_reputation >= 70 THEN v_level := 'Continental';
        ELSIF v_reputation >= 40 THEN v_level := 'Nacional';
        ELSE v_level := 'Local';
        END IF;

        -- Upsert into global_player_ranking
        INSERT INTO public.global_player_ranking (
            player_id, ranking_points, total_goals, total_assists, total_clean_sheets, avg_rating, mvp_count, reputation_score, reputation_level, last_update
        ) VALUES (
            p_record.id, v_score, p_record.goals, p_record.assists, p_record.clean_sheets, p_record.avg_rating, p_record.mvp_count, v_reputation, v_level, now()
        )
        ON CONFLICT (player_id) DO UPDATE SET
            ranking_points = EXCLUDED.ranking_points,
            total_goals = EXCLUDED.total_goals,
            total_assists = EXCLUDED.total_assists,
            total_clean_sheets = EXCLUDED.total_clean_sheets,
            avg_rating = EXCLUDED.avg_rating,
            mvp_count = EXCLUDED.mvp_count,
            reputation_score = EXCLUDED.reputation_score,
            reputation_level = EXCLUDED.reputation_level,
            last_update = now();

        -- Update world_players reputation and market value
        -- Market value formula: (Overall^2 * Potential/100 * (1 + Reputation/50)) / (Age/20 if Age > 30 else 1)
        v_new_value := (p_record.overall * p_record.overall * 5000 * (p_record.potential::numeric / 80.0) * (1.0 + v_reputation::numeric / 100.0));
        
        IF p_record.age > 30 THEN
            v_new_value := v_new_value / (1.0 + (p_record.age - 30)::numeric / 5.0);
        END IF;
        
        -- Cap value at reasonable levels if needed, but let's keep it dynamic
        UPDATE public.world_players 
        SET 
            reputation = v_reputation,
            market_value = v_new_value
        WHERE id = p_record.id;
    END LOOP;

    -- Update positions after all points are updated
    WITH RankedPlayers AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY ranking_points DESC) as pos
        FROM public.global_player_ranking
    )
    UPDATE public.global_player_ranking gpr
    SET 
        prev_position = gpr.current_position,
        current_position = rp.pos
    FROM RankedPlayers rp
    WHERE gpr.id = rp.id;
    
    -- Update position-specific ranks
    WITH PosRankedPlayers AS (
        SELECT gpr.id, wp.position, ROW_NUMBER() OVER (PARTITION BY wp.position ORDER BY gpr.ranking_points DESC) as p_pos
        FROM public.global_player_ranking gpr
        JOIN public.world_players wp ON gpr.player_id = wp.id
    )
    UPDATE public.global_player_ranking gpr
    SET position_rank = prp.p_pos
    FROM PosRankedPlayers prp
    WHERE gpr.id = prp.id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call calculation after stats updates (throttled/limited if needed, but for now simple)
-- In a real scenario, this might be too heavy for a trigger on every single stat change.
-- We'll create it but maybe use a cron if performance issues arise.
CREATE OR REPLACE FUNCTION public.trigger_calculate_rankings()
RETURNS trigger AS $$
BEGIN
    -- We'll execute this via an async-like pattern or just direct call for now
    -- Optimization: only calculate for the specific player if possible, 
    -- but ranks depend on others, so full update is sometimes needed.
    PERFORM public.calculate_player_ranking_points();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- For now, let's just make it a manual-friendly function and update from the app or specific events.
-- Dropping the trigger idea to avoid performance bottlenecks on every stat update.
-- Instead, we can call it after match simulations.
