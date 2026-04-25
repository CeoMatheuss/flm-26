-- Function: close expired auctions, transferring to winner OR moving to free agents market
CREATE OR REPLACE FUNCTION public.close_expired_auctions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _auction RECORD;
  _closed int := 0;
  _to_free int := 0;
  _sold int := 0;
BEGIN
  FOR _auction IN
    SELECT * FROM public.player_auctions
    WHERE status = 'active' AND expires_at <= now()
    FOR UPDATE
  LOOP
    IF _auction.current_bidder_id IS NOT NULL AND _auction.current_bid >= _auction.min_price THEN
      -- Sold: notify winner & seller; mark closed (the actual transfer of squad happens via in-app notification flow)
      UPDATE public.player_auctions
      SET status = 'sold'
      WHERE id = _auction.id;

      INSERT INTO public.user_notifications (user_id, type, title, message, icon, data)
      VALUES (
        _auction.current_bidder_id, 'auction_won',
        '🏆 Leilão vencido!',
        'Você arrematou ' || _auction.player_name || ' por R$ ' || _auction.current_bid::text,
        '🏆',
        jsonb_build_object('auction_id', _auction.id, 'player_data', _auction.player_data, 'amount', _auction.current_bid)
      );
      IF _auction.seller_id IS NOT NULL AND NOT _auction.is_system THEN
        INSERT INTO public.user_notifications (user_id, type, title, message, icon, data)
        VALUES (
          _auction.seller_id, 'auction_sold',
          '💰 Jogador vendido no leilão',
          _auction.player_name || ' vendido por R$ ' || _auction.current_bid::text,
          '💰',
          jsonb_build_object('auction_id', _auction.id, 'amount', _auction.current_bid, 'buyer', _auction.current_bidder_name)
        );
      END IF;
      _sold := _sold + 1;
    ELSE
      -- No bids: move to free agents market for 7 days
      UPDATE public.player_auctions
      SET status = 'expired'
      WHERE id = _auction.id;

      INSERT INTO public.free_agents_market (
        player_data, player_name, player_position, player_age, player_overall,
        visible_stats, origin, origin_club_name, available_from, available_until
      ) VALUES (
        _auction.player_data,
        _auction.player_name,
        COALESCE(_auction.player_data->>'position', 'CM'),
        _auction.player_age,
        _auction.player_overall,
        '{}'::jsonb,
        'auction_unsold',
        _auction.seller_club_name,
        now(),
        now() + interval '7 days'
      );

      IF _auction.seller_id IS NOT NULL AND NOT _auction.is_system THEN
        INSERT INTO public.user_notifications (user_id, type, title, message, icon, data)
        VALUES (
          _auction.seller_id, 'auction_unsold',
          'Leilão sem lances',
          _auction.player_name || ' foi para os Jogadores Livres.',
          '🆓',
          jsonb_build_object('auction_id', _auction.id)
        );
      END IF;
      _to_free := _to_free + 1;
    END IF;
    _closed := _closed + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'closed', _closed,
    'sold', _sold,
    'moved_to_free_agents', _to_free
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_expired_auctions() TO authenticated, service_role;
