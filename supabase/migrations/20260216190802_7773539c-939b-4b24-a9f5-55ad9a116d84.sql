
-- Create user_presence table for online/offline tracking
CREATE TABLE public.user_presence (
  user_id uuid PRIMARY KEY,
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  is_online boolean NOT NULL DEFAULT true
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see presence
CREATE POLICY "Authenticated can view presence"
  ON public.user_presence FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can upsert their own presence
CREATE POLICY "Users can upsert own presence"
  ON public.user_presence FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presence"
  ON public.user_presence FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
