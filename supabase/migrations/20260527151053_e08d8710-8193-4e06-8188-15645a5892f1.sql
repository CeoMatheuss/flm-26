CREATE OR REPLACE FUNCTION public.finalize_player_transfer(
  p_listing_id UUID,
  p_offer_id UUID,
  p_buyer_id UUID,
  p_buyer_club_name TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_listing RECORD;
  v_offer RECORD;
  v_player_data JSONB;
  v_seller_id UUID;
  v_price BIGINT;
  v_salary INT;
  v_contract INT;
  v_new_player JSONB;
  v_buyer_club TEXT;
BEGIN
  -- 1. Get listing
  SELECT * INTO v_listing FROM public.transfer_listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Anúncio não encontrado');
  END IF;

  IF v_listing.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Anúncio não está mais ativo');
  END IF;

  -- 2. Get offer or use listing data for Buy Now
  IF p_offer_id IS NOT NULL THEN
    SELECT * INTO v_offer FROM public.transfer_offers WHERE id = p_offer_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Proposta não encontrada');
    END IF;
    v_price := v_offer.offered_price;
    v_salary := v_offer.offered_salary;
    v_contract := v_offer.offered_contract_years;
    v_buyer_club := v_offer.buyer_club_name;
  ELSE
    -- Buy Now
    v_price := v_listing.asking_price;
    v_salary := (v_listing.player_data->>'salary')::INT;
    v_contract := 2; -- Default for buy now
    v_buyer_club := COALESCE(p_buyer_club_name, 'Clube Comprador');
  END IF;

  v_seller_id := v_listing.seller_id;
  v_player_data := v_listing.player_data;

  -- 3. Create the player object for the buyer
  v_new_player := v_player_data || jsonb_build_object(
    'salary', v_salary,
    'contract', v_contract,
    'squad_status', 'reserve',
    'squadRole', 'reserva',
    'onTransferList', false,
    'isLoaned', false,
    'signedAt', extract(epoch from now()) * 1000
  );

  -- 4. Update Buyer Save
  UPDATE public.game_saves
  SET club_data = jsonb_set(
    jsonb_set(
      club_data,
      '{club, players}',
      (club_data->'club'->'players') || v_new_player
    ),
    '{club, budget}',
    to_jsonb((club_data->'club'->'budget')::numeric - v_price)
  )
  WHERE user_id = p_buyer_id;

  -- 5. Update Seller Save
  UPDATE public.game_saves
  SET club_data = jsonb_set(
    jsonb_set(
      club_data,
      '{club, players}',
      COALESCE((
        SELECT jsonb_agg(p)
        FROM jsonb_array_elements(club_data->'club'->'players') p
        WHERE (p->>'id') != (v_player_data->>'id')
      ), '[]'::jsonb)
    ),
    '{club, budget}',
    to_jsonb((club_data->'club'->'budget')::numeric + v_price)
  )
  WHERE user_id = v_seller_id;

  -- 6. Update metadata tables
  UPDATE public.transfer_listings SET status = 'sold', sold_at = now() WHERE id = p_listing_id;
  IF p_offer_id IS NOT NULL THEN
    UPDATE public.transfer_offers SET status = 'completed' WHERE id = p_offer_id;
  END IF;
  
  -- 7. Log transfer
  INSERT INTO public.transfer_log (
    player_name, player_overall, from_user_id, to_user_id, 
    from_club_name, to_club_name, price, salary, transfer_type
  ) VALUES (
    v_listing.player_name, v_listing.player_overall, v_seller_id, p_buyer_id,
    v_listing.seller_club_name, v_buyer_club, v_price, v_salary, 'sale'
  );

  RETURN jsonb_build_object('success', true, 'player', v_new_player);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SET search_path = public;
