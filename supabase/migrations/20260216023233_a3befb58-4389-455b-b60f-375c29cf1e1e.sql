-- Fix infinite recursion in league_members SELECT policy
-- The current policy references league_members itself, causing infinite recursion

-- Drop the recursive policy
DROP POLICY IF EXISTS "Members can view league members" ON public.league_members;

-- Create a non-recursive policy: users can see members of leagues they belong to
-- Using a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.is_league_member(_user_id uuid, _league_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.league_members
    WHERE user_id = _user_id
      AND league_id = _league_id
  )
$$;

-- Recreate the policy using the function
CREATE POLICY "Members can view league members"
ON public.league_members
FOR SELECT
TO authenticated
USING (public.is_league_member(auth.uid(), league_id));