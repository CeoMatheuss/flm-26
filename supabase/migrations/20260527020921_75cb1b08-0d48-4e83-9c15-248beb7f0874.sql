
CREATE OR REPLACE FUNCTION public.close_expired_auctions()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _auction RECORD;
  _closed int := 0;
  _to_free int := 0;
  _sold int := 0;
  _money text;
  _importance int;
  _headline text;
  _ovr int;
  _meta jsonb;
BEGIN
  FOR _auction IN
    SELECT * FROM public.player_auctions
    WHERE status = 'active' AND expires_at <= now()
    FOR UPDATE
  LOOP
    IF _auction.current_bidder_id IS NOT NULL AND _auction.current_bid >= _auction.min_price THEN
      UPDATE public.player_auctions SET status = 'sold' WHERE id = _auction.id;

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

      -- ============================================================
      -- 📰 NOTÍCIA AUTOMÁTICA: Leilão arrematado
      -- ============================================================
      _ovr := COALESCE(_auction.player_overall, 0);
      IF _auction.current_bid >= 1000000 THEN
        _money := 'R$ ' || ROUND(_auction.current_bid::numeric / 1000000.0, 1)::text || 'M';
      ELSE
        _money := 'R$ ' || ROUND(_auction.current_bid::numeric / 1000.0, 0)::text || 'k';
      END IF;
      _importance := 1;
      IF _ovr >= 78 OR _auction.current_bid >= 5000000 THEN _importance := 2; END IF;
      IF _ovr >= 85 OR _auction.current_bid >= 20000000 THEN _importance := 3; END IF;

      _headline := CASE (floor(random() * 3))::int
        WHEN 0 THEN '🏆 LEILÃO! ' || COALESCE(_auction.current_bidder_name, 'Clube comprador') ||
                    ' arremata ' || _auction.player_name || ' (OVR ' || _ovr::text || ') por ' || _money
        WHEN 1 THEN '🔨 Martelo batido: ' || _auction.player_name ||
                    ' é do ' || COALESCE(_auction.current_bidder_name, 'novo clube') ||
                    ' após disputa acirrada no leilão (' || _money || ')'
        ELSE        '💸 ' || COALESCE(_auction.current_bidder_name, 'Clube vencedor') ||
                    ' dá o lance vencedor por ' || _auction.player_name ||
                    ' (OVR ' || _ovr::text || ') no leilão — ' || _money
      END;

      _meta := jsonb_build_object(
        'kind', 'auction_won',
        'player_name', _auction.player_name,
        'player_overall', _ovr,
        'from_club', _auction.seller_club_name,
        'to_club', _auction.current_bidder_name,
        'value', _auction.current_bid,
        'auction_id', _auction.id
      );

      -- Notícia para o vencedor
      INSERT INTO public.newspaper_entries (user_id, category, text, is_event, importance, metadata)
      VALUES (_auction.current_bidder_id, 'TRANSFERÊNCIA', _headline, true, _importance, _meta);

      -- Notícia para o vendedor (se humano)
      IF _auction.seller_id IS NOT NULL AND NOT _auction.is_system THEN
        INSERT INTO public.newspaper_entries (user_id, category, text, is_event, importance, metadata)
        VALUES (_auction.seller_id, 'TRANSFERÊNCIA', _headline, true, _importance, _meta);
      END IF;

      _sold := _sold + 1;
    ELSE
      UPDATE public.player_auctions SET status = 'expired' WHERE id = _auction.id;

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

  RETURN jsonb_build_object('closed', _closed, 'sold', _sold, 'to_free', _to_free);
END;
$function$;
