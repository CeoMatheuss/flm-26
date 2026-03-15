-- Fix 1: loan_listings SELECT - change from public to authenticated
DROP POLICY IF EXISTS "Anyone can view active loan listings" ON public.loan_listings;
CREATE POLICY "Authenticated users can view active loan listings"
ON public.loan_listings
FOR SELECT
TO authenticated
USING (true);

-- Fix 2: system_settings SELECT - restrict to admin only
DROP POLICY IF EXISTS "Anyone authenticated can view system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Anyone can view system settings" ON public.system_settings;

-- Find and drop any existing SELECT policy on system_settings
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'system_settings' AND schemaname = 'public' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.system_settings', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Only admins can view system settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Also fix the other loan_listings policies from public to authenticated
DROP POLICY IF EXISTS "Involved parties can update loan listings" ON public.loan_listings;
CREATE POLICY "Involved parties can update loan listings"
ON public.loan_listings
FOR UPDATE
TO authenticated
USING ((auth.uid() = seller_id) OR (auth.uid() = buyer_id));

DROP POLICY IF EXISTS "Users can delete own loan listings" ON public.loan_listings;
CREATE POLICY "Users can delete own loan listings"
ON public.loan_listings
FOR DELETE
TO authenticated
USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Users can list own players for loan" ON public.loan_listings;
CREATE POLICY "Users can list own players for loan"
ON public.loan_listings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = seller_id);