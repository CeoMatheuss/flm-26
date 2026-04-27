-- Add negotiation terms to existing loan_listings
ALTER TABLE public.loan_listings
  ADD COLUMN IF NOT EXISTS salary_payer text NOT NULL DEFAULT 'buyer',
  ADD COLUMN IF NOT EXISTS salary_split_pct integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loan_fee bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS open_to_offers boolean NOT NULL DEFAULT true;

-- Validate values
ALTER TABLE public.loan_listings
  DROP CONSTRAINT IF EXISTS loan_listings_salary_payer_check;
ALTER TABLE public.loan_listings
  ADD CONSTRAINT loan_listings_salary_payer_check
  CHECK (salary_payer IN ('seller','buyer','split'));

ALTER TABLE public.loan_listings
  DROP CONSTRAINT IF EXISTS loan_listings_split_check;
ALTER TABLE public.loan_listings
  ADD CONSTRAINT loan_listings_split_check
  CHECK (salary_split_pct BETWEEN 0 AND 100);

ALTER TABLE public.loan_listings
  DROP CONSTRAINT IF EXISTS loan_listings_loan_fee_check;
ALTER TABLE public.loan_listings
  ADD CONSTRAINT loan_listings_loan_fee_check
  CHECK (loan_fee >= 0);

-- New: counter-offers table
CREATE TABLE IF NOT EXISTS public.loan_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.loan_listings(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  buyer_club_name text NOT NULL DEFAULT '',
  -- proposed terms
  offered_salary_payer text NOT NULL DEFAULT 'buyer',
  offered_salary_split_pct integer NOT NULL DEFAULT 0,
  offered_loan_fee bigint NOT NULL DEFAULT 0,
  message text DEFAULT '',
  -- counter from seller (optional)
  counter_salary_payer text,
  counter_salary_split_pct integer,
  counter_loan_fee bigint,
  counter_message text,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loan_offers_status_check
    CHECK (status IN ('pending','accepted','rejected','countered','expired','cancelled')),
  CONSTRAINT loan_offers_payer_check
    CHECK (offered_salary_payer IN ('seller','buyer','split')),
  CONSTRAINT loan_offers_counter_payer_check
    CHECK (counter_salary_payer IS NULL OR counter_salary_payer IN ('seller','buyer','split')),
  CONSTRAINT loan_offers_split_check
    CHECK (offered_salary_split_pct BETWEEN 0 AND 100),
  CONSTRAINT loan_offers_counter_split_check
    CHECK (counter_salary_split_pct IS NULL OR counter_salary_split_pct BETWEEN 0 AND 100),
  CONSTRAINT loan_offers_fee_check
    CHECK (offered_loan_fee >= 0),
  CONSTRAINT loan_offers_counter_fee_check
    CHECK (counter_loan_fee IS NULL OR counter_loan_fee >= 0),
  CONSTRAINT loan_offers_no_self
    CHECK (seller_id <> buyer_id)
);

CREATE INDEX IF NOT EXISTS loan_offers_listing_idx ON public.loan_offers(listing_id);
CREATE INDEX IF NOT EXISTS loan_offers_buyer_status_idx ON public.loan_offers(buyer_id, status);
CREATE INDEX IF NOT EXISTS loan_offers_seller_status_idx ON public.loan_offers(seller_id, status);

-- Trigger to keep updated_at fresh
DROP TRIGGER IF EXISTS trg_loan_offers_updated_at ON public.loan_offers;
CREATE TRIGGER trg_loan_offers_updated_at
BEFORE UPDATE ON public.loan_offers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.loan_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties can view loan offers" ON public.loan_offers;
CREATE POLICY "Parties can view loan offers"
ON public.loan_offers
FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Buyers can create loan offers" ON public.loan_offers;
CREATE POLICY "Buyers can create loan offers"
ON public.loan_offers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id AND buyer_id <> seller_id);

DROP POLICY IF EXISTS "Parties can update loan offers" ON public.loan_offers;
CREATE POLICY "Parties can update loan offers"
ON public.loan_offers
FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Buyers can cancel pending loan offers" ON public.loan_offers;
CREATE POLICY "Buyers can cancel pending loan offers"
ON public.loan_offers
FOR DELETE
TO authenticated
USING (auth.uid() = buyer_id AND status = 'pending');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.loan_offers;