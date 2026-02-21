
-- Transfer listings: players listed for sale by real users
CREATE TABLE public.transfer_listings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL,
  seller_club_name text NOT NULL DEFAULT '',
  league_id uuid REFERENCES public.multiplayer_leagues(id) ON DELETE CASCADE,
  player_data jsonb NOT NULL,
  player_name text NOT NULL,
  player_position text NOT NULL DEFAULT 'MEI',
  player_overall integer NOT NULL,
  player_age integer NOT NULL,
  asking_price bigint NOT NULL,
  status text NOT NULL DEFAULT 'active',
  listed_at timestamp with time zone NOT NULL DEFAULT now(),
  sold_at timestamp with time zone,
  buyer_id uuid,
  buyer_club_name text,
  cooldown_until timestamp with time zone,
  transfer_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.transfer_listings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view active listings
CREATE POLICY "Anyone can view active listings"
ON public.transfer_listings FOR SELECT
TO authenticated
USING (true);

-- Users can list their own players
CREATE POLICY "Users can list own players"
ON public.transfer_listings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = seller_id);

-- Users can update own listings (cancel/delist)
CREATE POLICY "Users can update own listings"
ON public.transfer_listings FOR UPDATE
TO authenticated
USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

-- Users can delete own listings
CREATE POLICY "Users can delete own listings"
ON public.transfer_listings FOR DELETE
TO authenticated
USING (auth.uid() = seller_id);

-- Transfer offers: proposals from buyers
CREATE TABLE public.transfer_offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.transfer_listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  buyer_club_name text NOT NULL DEFAULT '',
  offered_price bigint NOT NULL,
  offered_salary bigint NOT NULL DEFAULT 0,
  offered_contract_years integer NOT NULL DEFAULT 2,
  bonus_goals bigint NOT NULL DEFAULT 0,
  bonus_assists bigint NOT NULL DEFAULT 0,
  bonus_games bigint NOT NULL DEFAULT 0,
  bonus_titles bigint NOT NULL DEFAULT 0,
  signing_bonus bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone
);

ALTER TABLE public.transfer_offers ENABLE ROW LEVEL SECURITY;

-- Buyer and seller can view offers
CREATE POLICY "Involved parties can view offers"
ON public.transfer_offers FOR SELECT
TO authenticated
USING (
  auth.uid() = buyer_id OR
  EXISTS (SELECT 1 FROM public.transfer_listings tl WHERE tl.id = listing_id AND tl.seller_id = auth.uid())
);

-- Buyers can make offers
CREATE POLICY "Buyers can make offers"
ON public.transfer_offers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id);

-- Sellers can respond, buyers can cancel
CREATE POLICY "Parties can update offers"
ON public.transfer_offers FOR UPDATE
TO authenticated
USING (
  auth.uid() = buyer_id OR
  EXISTS (SELECT 1 FROM public.transfer_listings tl WHERE tl.id = listing_id AND tl.seller_id = auth.uid())
);

-- Transfer log for anti-abuse tracking
CREATE TABLE public.transfer_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name text NOT NULL,
  player_overall integer NOT NULL,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  from_club_name text NOT NULL DEFAULT '',
  to_club_name text NOT NULL DEFAULT '',
  price bigint NOT NULL,
  salary bigint NOT NULL DEFAULT 0,
  transfer_type text NOT NULL DEFAULT 'sale',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.transfer_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view transfer logs"
ON public.transfer_log FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- System inserts via edge function (service role)
CREATE POLICY "Involved parties can view own logs"
ON public.transfer_log FOR SELECT
TO authenticated
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Authenticated can insert own logs
CREATE POLICY "Users can insert transfer logs"
ON public.transfer_log FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Validation trigger for transfer listings
CREATE OR REPLACE FUNCTION public.validate_transfer_listing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF length(NEW.player_name) > 100 THEN
    RAISE EXCEPTION 'Player name too long';
  END IF;
  IF NEW.asking_price < 0 THEN
    RAISE EXCEPTION 'Price cannot be negative';
  END IF;
  IF NEW.player_overall < 1 OR NEW.player_overall > 99 THEN
    RAISE EXCEPTION 'Invalid overall rating';
  END IF;
  IF NEW.player_age < 15 OR NEW.player_age > 45 THEN
    RAISE EXCEPTION 'Invalid player age';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_transfer_listing_trigger
BEFORE INSERT OR UPDATE ON public.transfer_listings
FOR EACH ROW EXECUTE FUNCTION public.validate_transfer_listing();

-- Validation trigger for transfer offers
CREATE OR REPLACE FUNCTION public.validate_transfer_offer()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.offered_price < 0 THEN
    RAISE EXCEPTION 'Offered price cannot be negative';
  END IF;
  IF NEW.offered_salary < 0 THEN
    RAISE EXCEPTION 'Offered salary cannot be negative';
  END IF;
  IF NEW.offered_contract_years < 1 OR NEW.offered_contract_years > 5 THEN
    RAISE EXCEPTION 'Contract must be 1-5 years';
  END IF;
  -- Prevent self-offers
  IF EXISTS (SELECT 1 FROM public.transfer_listings tl WHERE tl.id = NEW.listing_id AND tl.seller_id = NEW.buyer_id) THEN
    RAISE EXCEPTION 'Cannot make offer on your own listing';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_transfer_offer_trigger
BEFORE INSERT ON public.transfer_offers
FOR EACH ROW EXECUTE FUNCTION public.validate_transfer_offer();

-- Enable realtime for transfer tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.transfer_listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transfer_offers;
