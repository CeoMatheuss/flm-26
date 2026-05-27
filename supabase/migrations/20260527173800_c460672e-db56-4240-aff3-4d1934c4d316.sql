ALTER TABLE public.world_leagues 
ADD COLUMN IF NOT EXISTS total_matchdays INTEGER DEFAULT 38,
ADD COLUMN IF NOT EXISTS total_slots INTEGER DEFAULT 20;

-- Efficient batch simulation RPC
CREATE OR REPLACE FUNCTION public.batch_simulate_matches(p_match_ids UUID[])
RETURNS VOID AS $$
BEGIN
    UPDATE public.world_matches
    SET 
        home_goals = floor(random() * 4),
        away_goals = floor(random() * 3),
        status = 'finished',
        played_at = now()
    WHERE id = ANY(p_match_ids)
    AND status = 'scheduled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
