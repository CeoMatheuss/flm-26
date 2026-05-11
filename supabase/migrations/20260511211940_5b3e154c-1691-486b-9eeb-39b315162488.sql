UPDATE public.national_cup_matches
SET scheduled_at = scheduled_at + INTERVAL '1 day',
    updated_at = now()
WHERE status IN ('scheduled','pending')
  AND scheduled_at >= now() - INTERVAL '1 day';