
-- Allow all authenticated users to read newspaper entries (global news)
DROP POLICY IF EXISTS "Users can view own newspaper entries" ON public.newspaper_entries;
CREATE POLICY "Anyone authenticated can view newspaper entries"
  ON public.newspaper_entries FOR SELECT
  TO authenticated
  USING (true);

-- Also allow reactions on any entry (not just own)
DROP POLICY IF EXISTS "Users can view reactions on own entries" ON public.newspaper_reactions;
CREATE POLICY "Anyone authenticated can view reactions"
  ON public.newspaper_reactions FOR SELECT
  TO authenticated
  USING (true);
