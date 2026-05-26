CREATE POLICY "Users can insert their own club shop stats"
ON public.club_shop_stats
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clubs
    WHERE clubs.id = club_shop_stats.club_id
      AND clubs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own club shop stats"
ON public.club_shop_stats
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clubs
    WHERE clubs.id = club_shop_stats.club_id
      AND clubs.user_id = auth.uid()
  )
);