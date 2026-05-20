
CREATE OR REPLACE FUNCTION public.trg_recompute_stats_on_match_finish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'finished' AND (OLD.status IS DISTINCT FROM 'finished') AND NEW.league_id IS NOT NULL THEN
    PERFORM public.recompute_player_competition_stats(NEW.league_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS world_matches_recompute_stats ON public.world_matches;
CREATE TRIGGER world_matches_recompute_stats
AFTER UPDATE ON public.world_matches
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_stats_on_match_finish();
