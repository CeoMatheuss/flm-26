-- Lock down premium_users: prevent users from self-granting premium status.
-- Only admins (or SECURITY DEFINER server flows) may write to this table.

DROP POLICY IF EXISTS "Users can insert own premium" ON public.premium_users;
DROP POLICY IF EXISTS "Users can update own premium" ON public.premium_users;

-- SELECT remains: owners and admins (already in place).
-- No user-facing INSERT/UPDATE/DELETE policies. Writes must go through
-- SECURITY DEFINER functions or service-role edge functions that verify
-- payment server-side before activating premium.

-- Admin escape hatch for manual ops (already had update; add insert).
CREATE POLICY "Admins can insert any premium"
ON public.premium_users
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any premium"
ON public.premium_users
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));