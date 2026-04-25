
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
  _bidder_budget bigint;
  _max_allowed bigint;
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

  IF _auction.seller_id = _user AND NOT _auction.is_system AND NOT _is_admin THEN
    RAISE EXCEPTION 'CANNOT_BID_OWN_AUCTION';
  END IF;

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

  -- 80% budget cap (skip for admins)
  IF NOT _is_admin THEN
    SELECT COALESCE((club_data->>'budget')::bigint, 0)
      INTO _bidder_budget
    FROM public.game_saves
    WHERE user_id = _user
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;

    IF _bidder_budget IS NULL THEN _bidder_budget := 0; END IF;
    _max_allowed := (_bidder_budget * 80) / 100;

    IF _amount > _max_allowed THEN
      RAISE EXCEPTION 'BID_OVER_BUDGET_LIMIT' USING DETAIL = _max_allowed::text;
    END IF;
  END IF;

  SELECT COALESCE(display_name, 'Manager')
    INTO _bidder_name
  FROM public.profiles
  WHERE user_id = _user
  LIMIT 1;
  IF _bidder_name IS NULL THEN _bidder_name := 'Manager'; END IF;

  IF (_auction.expires_at - _now) <= interval '5 minutes' THEN
    _new_expires := _auction.expires_at + interval '10 minutes';
  ELSE
    _new_expires := _auction.expires_at;
  END IF;

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

  UPDATE public.player_auctions
  SET current_bid = _amount,
      current_bidder_id = _user,
      current_bidder_name = _bidder_name,
      expires_at = _new_expires
  WHERE id = _auction_id;

  INSERT INTO public.auction_bids (auction_id, bidder_id, bidder_name, amount)
  VALUES (_auction_id, _user, _bidder_name, _amount);

  RETURN jsonb_build_object('ok', true, 'new_bid', _amount, 'expires_at', _new_expires);
END;
$$;
