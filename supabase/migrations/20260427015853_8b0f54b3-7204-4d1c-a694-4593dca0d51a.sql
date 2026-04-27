ALTER TABLE public.newspaper_entries
  ADD COLUMN IF NOT EXISTS image_key TEXT;

CREATE INDEX IF NOT EXISTS idx_newspaper_entries_event_image
  ON public.newspaper_entries (created_at DESC)
  WHERE is_event = true;