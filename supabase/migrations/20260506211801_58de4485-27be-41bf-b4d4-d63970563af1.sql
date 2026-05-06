-- 1. BETA WHITELIST: Restrict SELECT to admins, add safe RPC for client checks
DROP POLICY IF EXISTS "Anyone can check whitelist" ON public.beta_whitelist;

CREATE POLICY "Admins can view whitelist"
ON public.beta_whitelist
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.check_beta_access(_email text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lower text := lower(trim(_email));
  _whitelisted boolean;
  _status text;
BEGIN
  IF _lower = '' OR _lower IS NULL THEN
    RETURN jsonb_build_object('whitelisted', false, 'status', null);
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.beta_whitelist WHERE lower(email) = _lower)
    INTO _whitelisted;

  SELECT status INTO _status
  FROM public.beta_access_requests
  WHERE lower(email) = _lower
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object('whitelisted', _whitelisted, 'status', _status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_beta_access(text) TO anon, authenticated;

-- 2. BETA ACCESS REQUESTS: Restrict SELECT to admins (INSERT remains public for new requests)
DROP POLICY IF EXISTS "Anyone can view requests by email" ON public.beta_access_requests;

CREATE POLICY "Admins can view all beta requests"
ON public.beta_access_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. FREE AGENT OFFERS: Restrict SELECT to involved parties
DROP POLICY IF EXISTS "Anyone authenticated can view offers" ON public.free_agent_offers;

CREATE POLICY "Involved parties can view offers"
ON public.free_agent_offers
FOR SELECT
USING (auth.uid() = buyer_id OR auth.uid() = agent_id);

CREATE POLICY "Admins can view all free agent offers"
ON public.free_agent_offers
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. TRANSFER LOG: Remove user INSERT; restrict to admins (server logic uses service role)
DROP POLICY IF EXISTS "Users can insert transfer logs" ON public.transfer_log;

CREATE POLICY "Admins can insert transfer logs"
ON public.transfer_log
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
