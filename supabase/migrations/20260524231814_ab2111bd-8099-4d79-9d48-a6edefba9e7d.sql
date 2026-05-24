-- Create table to track the global season state
CREATE TABLE IF NOT EXISTS public.season_system_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    current_season INTEGER NOT NULL DEFAULT 1,
    season_start_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    current_day INTEGER NOT NULL DEFAULT 1,
    phase TEXT NOT NULL DEFAULT 'league', -- 'league', 'mundial', 'transition'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ensure only one record exists
CREATE UNIQUE INDEX IF NOT EXISTS single_season_state ON public.season_system_state ((id IS NOT NULL));

-- Enable RLS
ALTER TABLE public.season_system_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read season state" ON public.season_system_state FOR SELECT USING (true);

-- Add status columns to leagues and standings
ALTER TABLE public.world_leagues ADD COLUMN IF NOT EXISTS is_finished BOOLEAN DEFAULT false;
ALTER TABLE public.world_leagues ADD COLUMN IF NOT EXISTS winner_processed BOOLEAN DEFAULT false;

ALTER TABLE public.world_league_table ADD COLUMN IF NOT EXISTS qualified_for_mundial BOOLEAN DEFAULT false;

-- Function to calculate the current season day
CREATE OR REPLACE FUNCTION public.get_current_season_day()
RETURNS INTEGER AS $$
DECLARE
    v_start TIMESTAMP WITH TIME ZONE;
    v_days INTEGER;
BEGIN
    SELECT season_start_at INTO v_start FROM public.season_system_state LIMIT 1;
    IF v_start IS NULL THEN
        RETURN 1;
    END IF;
    
    v_days := EXTRACT(DAY FROM (now() - v_start)) + 1;
    -- Clamp to 30 days cycle
    RETURN ((v_days - 1) % 30) + 1;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_season_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_season_state_timestamp
BEFORE UPDATE ON public.season_system_state
FOR EACH ROW EXECUTE FUNCTION public.update_season_state_timestamp();

-- Initialize state if empty
INSERT INTO public.season_system_state (current_season, current_day, phase)
VALUES (1, 1, 'league')
ON CONFLICT DO NOTHING;

-- Function to qualify teams for Mundial
CREATE OR REPLACE FUNCTION public.qualify_teams_for_mundial()
RETURNS void AS $$
BEGIN
    -- Reset previous qualifications
    UPDATE public.world_league_table SET qualified_for_mundial = false;

    -- Qualify Champions of Div 1 from each country (assuming division 1 is level 1)
    -- This is a simple logic: Top 1 of each country's Division 1
    WITH champions AS (
        SELECT DISTINCT ON (country) 
            team_id,
            league_id
        FROM public.world_league_table
        WHERE position = 1
        ORDER BY country, position
    )
    UPDATE public.world_league_table
    SET qualified_for_mundial = true
    WHERE team_id IN (SELECT team_id FROM champions);

    -- Also qualify by Ranking (top clubs not already qualified)
    WITH top_ranking AS (
        SELECT id as team_id
        FROM public.world_teams
        WHERE id NOT IN (SELECT team_id FROM public.world_league_table WHERE qualified_for_mundial = true)
        ORDER BY strength DESC
        LIMIT 10 -- Add 10 more based on strength/reputation
    )
    UPDATE public.world_league_table
    SET qualified_for_mundial = true
    WHERE team_id IN (SELECT team_id FROM top_ranking);
END;
$$ LANGUAGE plpgsql;
