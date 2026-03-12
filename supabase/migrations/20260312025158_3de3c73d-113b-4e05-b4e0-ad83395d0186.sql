
-- Create newspaper reactions table
CREATE TABLE public.newspaper_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.newspaper_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (entry_id, user_id, emoji)
);

ALTER TABLE public.newspaper_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions on own entries"
  ON public.newspaper_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.newspaper_entries ne
      WHERE ne.id = newspaper_reactions.entry_id AND ne.user_id = auth.uid()
    )
    OR auth.uid() = user_id
  );

CREATE POLICY "Users can add reactions"
  ON public.newspaper_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
  ON public.newspaper_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
