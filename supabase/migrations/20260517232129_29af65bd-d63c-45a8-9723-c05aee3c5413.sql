UPDATE public.live_matches
SET status = 'finished',
    current_minute = GREATEST(current_minute, 90)
WHERE status = 'live'
  AND started_at < now() - ((duration_seconds + 60) * interval '1 second');

CREATE OR REPLACE FUNCTION public.finalize_stale_live_matches()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.live_matches
  SET status = 'finished',
      current_minute = GREATEST(current_minute, 90)
  WHERE status = 'live'
    AND started_at < now() - ((duration_seconds + 60) * interval '1 second');
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;