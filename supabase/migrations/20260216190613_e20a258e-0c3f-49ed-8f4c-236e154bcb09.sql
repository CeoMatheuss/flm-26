
-- Allow all authenticated users to search profiles by display_name
CREATE POLICY "Authenticated users can search profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
