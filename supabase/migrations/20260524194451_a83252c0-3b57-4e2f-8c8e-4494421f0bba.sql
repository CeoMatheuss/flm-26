-- Improved variation tracking
CREATE OR REPLACE FUNCTION public.snapshot_ranking_positions()
RETURNS void AS $$
BEGIN
    -- Move current effective rank to prev_position
    UPDATE public.global_ranking SET prev_position = sub.pos
    FROM (
        SELECT id, row_number() OVER (ORDER BY ranking_points DESC) as pos
        FROM public.global_ranking
    ) sub
    WHERE public.global_ranking.id = sub.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
