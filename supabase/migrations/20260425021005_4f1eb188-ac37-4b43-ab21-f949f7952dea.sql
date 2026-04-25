
-- ─────────────────────────────────────────────────────────────
-- 1. beta_access_requests: solicitações de acesso
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.beta_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  message text DEFAULT '',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT beta_access_requests_status_check CHECK (status IN ('pending','approved','rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_beta_access_requests_email_lower
  ON public.beta_access_requests (lower(email));

ALTER TABLE public.beta_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit beta access request"
  ON public.beta_access_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view requests by email"
  ON public.beta_access_requests FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can update beta requests"
  ON public.beta_access_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete beta requests"
  ON public.beta_access_requests FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER beta_access_requests_updated_at
  BEFORE UPDATE ON public.beta_access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- 2. beta_whitelist: emails autorizados
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.beta_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_beta_whitelist_email_lower
  ON public.beta_whitelist (lower(email));

ALTER TABLE public.beta_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can check whitelist"
  ON public.beta_whitelist FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert whitelist"
  ON public.beta_whitelist FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete whitelist"
  ON public.beta_whitelist FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Pré-popula admins na whitelist
INSERT INTO public.beta_whitelist (email)
VALUES ('fcmsistemas7@gmail.com'), ('oitiatudobempedropassos@gmail.com')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. Trigger no auth.users: bloqueia signup fora da whitelist
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_beta_whitelist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sempre permite os admins fixos
  IF NEW.email IN ('fcmsistemas7@gmail.com','oitiatudobempedropassos@gmail.com') THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.beta_whitelist
    WHERE lower(email) = lower(NEW.email)
  ) THEN
    RAISE EXCEPTION 'BETA_NOT_WHITELISTED'
      USING HINT = 'Email não autorizado para o beta. Solicite acesso e aguarde aprovação.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_beta_whitelist_trigger ON auth.users;
CREATE TRIGGER enforce_beta_whitelist_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_beta_whitelist();

-- ─────────────────────────────────────────────────────────────
-- 4. Função: aprovar solicitação (admin) — adiciona à whitelist
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_beta_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve beta requests';
  END IF;

  SELECT email INTO _email FROM public.beta_access_requests WHERE id = _request_id;
  IF _email IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  INSERT INTO public.beta_whitelist (email, approved_by)
  VALUES (_email, auth.uid())
  ON CONFLICT DO NOTHING;

  UPDATE public.beta_access_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_beta_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can reject beta requests';
  END IF;

  UPDATE public.beta_access_requests
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _request_id;
END;
$$;
