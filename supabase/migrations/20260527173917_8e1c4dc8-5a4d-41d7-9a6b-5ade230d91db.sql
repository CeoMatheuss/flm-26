CREATE OR REPLACE FUNCTION public.fix_world_match_schedules(p_league_id UUID, p_target_time TIME)
RETURNS VOID AS $$
BEGIN
    UPDATE public.world_matches
    SET scheduled_at = (scheduled_at::date + p_target_time)::timestamp with time zone
    WHERE league_id = p_league_id
    AND status = 'scheduled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
