-- 1. Add is_system flag for admin/system-created auctions
ALTER TABLE public.player_auctions
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

-- 2. Bid history table
CREATE TABLE IF NOT EXISTS public.auction_bids (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id uuid NOT NULL REFERENCES public.player_auctions(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL,
  bidder_name text NOT NULL,
  amount bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_bids_auction ON public.auction_bids (auction_id, created_at DESC);

ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view bids" ON public.auction_bids;
CREATE POLICY "Anyone authenticated can view bids"
  ON public.auction_bids FOR SELECT
  TO authenticated
  USING (true);

-- Inserts only via SECURITY DEFINER RPC; no direct insert policy.

-- 3. Helper: next Sunday at 17:00 (server tz)
CREATE OR REPLACE FUNCTION public.next_sunday_17()
RETURNS timestamptz
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  base_date date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  candidate timestamptz;
  dow int;
BEGIN
  dow := extract(dow FROM base_date)::int; -- 0 = Sunday
  -- days until Sunday
  candidate := ((base_date + ((7 - dow) % 7))::text || ' 17:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
  -- if today IS Sunday but already past 17:00, use next Sunday
  IF candidate <= now() THEN
    candidate := candidate + interval '7 days';
  END IF;
  RETURN candidate;
END;
$$;

-- 4. Default expires_at = next Sunday 17:00
ALTER TABLE public.player_auctions
  ALTER COLUMN expires_at SET DEFAULT public.next_sunday_17();

-- 5. RPC: place_auction_bid
CREATE OR REPLACE FUNCTION public.place_auction_bid(_auction_id uuid, _amount bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _auction RECORD;
  _user uuid := auth.uid();
  _bidder_name text;
  _min_increment bigint;
  _required_min bigint;
  _new_expires timestamptz;
  _now timestamptz := now();
  _is_admin boolean;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT * INTO _auction FROM public.player_auctions WHERE id = _auction_id FOR UPDATE;
  IF _auction IS NULL THEN
    RAISE EXCEPTION 'AUCTION_NOT_FOUND';
  END IF;

  IF _auction.status <> 'active' THEN
    RAISE EXCEPTION 'AUCTION_CLOSED';
  END IF;

  IF _auction.expires_at <= _now THEN
    RAISE EXCEPTION 'AUCTION_EXPIRED';
  END IF;

  _is_admin := public.has_role(_user, 'admin');

  -- Self-bid forbidden, EXCEPT system auctions or when admin owns the seller_id (admin-created)
  IF _auction.seller_id = _user AND NOT _auction.is_system AND NOT _is_admin THEN
    RAISE EXCEPTION 'CANNOT_BID_OWN_AUCTION';
  END IF;

  -- Compute minimum required bid
  -- If no current_bidder yet, min is min_price; otherwise min_price + tiered increment
  IF _auction.current_bidder_id IS NULL THEN
    _required_min := _auction.min_price;
  ELSE
    _min_increment := CASE
      WHEN _auction.current_bid < 200000     THEN 10000
      WHEN _auction.current_bid < 500000     THEN 25000
      WHEN _auction.current_bid < 1000000    THEN 50000
      WHEN _auction.current_bid < 5000000    THEN 100000
      WHEN _auction.current_bid < 20000000   THEN 250000
      ELSE 500000
    END;
    _required_min := _auction.current_bid + _min_increment;
  END IF;

  IF _amount < _required_min THEN
    RAISE EXCEPTION 'BID_TOO_LOW' USING DETAIL = _required_min::text;
  END IF;

  -- Get bidder display name from profiles
  SELECT COALESCE(display_name, 'Manager')
    INTO _bidder_name
  FROM public.profiles
  WHERE user_id = _user
  LIMIT 1;
  IF _bidder_name IS NULL THEN _bidder_name := 'Manager'; END IF;

  -- Anti-snipe: if bid placed in last 5 minutes before expiry, extend by 10 minutes
  IF (_auction.expires_at - _now) <= interval '5 minutes' THEN
    _new_expires := _auction.expires_at + interval '10 minutes';
  ELSE
    _new_expires := _auction.expires_at;
  END IF;

  -- Notify previous bidder if exists and is not the same user
  IF _auction.current_bidder_id IS NOT NULL AND _auction.current_bidder_id <> _user THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, icon, data)
    VALUES (
      _auction.current_bidder_id,
      'auction_outbid',
      'Lance superado!',
      'Seu lance em ' || _auction.player_name || ' foi superado. Novo lance: R$ ' || (_amount/1000)::text || 'k por ' || _bidder_name || '.',
      '🔨',
      jsonb_build_object(
        'auction_id', _auction.id,
        'player_name', _auction.player_name,
        'previous_bid', _auction.current_bid,
        'new_bid', _amount,
        'new_bidder', _bidder_name
      )
    );
  END IF;

  -- Apply update
  UPDATE public.player_auctions
  SET current_bid = _amount,
      current_bidder_id = _user,
      current_bidder_name = _bidder_name,
      expires_at = _new_expires
  WHERE id = _auction_id;

  -- Insert into history
  INSERT INTO public.auction_bids (auction_id, bidder_id, bidder_name, amount)
  VALUES (_auction_id, _user, _bidder_name, _amount);

  RETURN jsonb_build_object(
    'success', true,
    'amount', _amount,
    'new_expires_at', _new_expires,
    'extended', _new_expires <> _auction.expires_at
  );
END;
$$;

-- 6. Realtime
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_bids';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;