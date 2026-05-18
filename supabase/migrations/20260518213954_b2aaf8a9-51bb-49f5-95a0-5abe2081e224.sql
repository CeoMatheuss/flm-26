UPDATE public.world_matches
SET scheduled_at = scheduled_at + INTERVAL '3 hours'
WHERE scheduled_at = '2026-05-18 19:30:00+00'
  AND status = 'scheduled';