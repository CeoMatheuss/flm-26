CREATE OR REPLACE FUNCTION public.finalize_loan_transfer(
  p_listing_id UUID,
  p_offer_id UUID,
  p_buyer_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_listing RECORD;
  v_offer RECORD;
  v_player_data JSONB;
  v_seller_id UUID;
  v_salary INT;
  v_new_player JSONB;
  v_loaned_out_player JSONB;
BEGIN
  -- 1. Get listing and offer
  SELECT * INTO v_listing FROM public.transfer_listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Anúncio não encontrado');
  END IF;

  SELECT * INTO v_offer FROM public.transfer_offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Proposta não encontrada');
  END IF;

  v_seller_id := v_listing.seller_id;
  v_player_data := v_listing.player_data;
  v_salary := v_offer.offered_salary;

  -- 2. Create the player object for the buyer (loaned in)
  v_new_player := v_player_data || jsonb_build_object(
    'salary', v_salary,
    'contract', v_offer.offered_contract_years,
    'squad_status', 'reserve',
    'squadRole', 'reserva',
    'isLoaned', true,
    'isReceivedLoan', true,
    'signedAt', extract(epoch from now()) * 1000,
    'signingType', 'loan_in'
  );

  -- 3. Create the player object for the seller (loaned out)
  v_loaned_out_player := v_player_data || jsonb_build_object(
    'isLoaned', true,
    'onLoanList', false,
    'squad_status', 'reserve',
    'squadRole', 'reserva'
  );

  -- 4. Update Buyer Save (Add player)
  UPDATE public.game_saves
  SET club_data = jsonb_set(
    club_data,
    '{club, players}',
    (club_data->'club'->'players') || v_new_player
  )
  WHERE user_id = p_buyer_id;

  -- 5. Update Seller Save (Mark as loaned out)
  UPDATE public.game_saves
  SET club_data = jsonb_set(
    club_data,
    '{club, players}',
    COALESCE((
      SELECT jsonb_agg(CASE WHEN (p->>'id') = (v_player_data->>'id') THEN v_loaned_out_player ELSE p END)
      FROM jsonb_array_elements(club_data->'club'->'players') p
    ), '[]'::jsonb)
  )
  WHERE user_id = v_seller_id;

  -- 6. Update metadata tables
  UPDATE public.transfer_listings SET status = 'loaned', sold_at = now() WHERE id = p_listing_id;
  UPDATE public.transfer_offers SET status = 'completed' WHERE id = p_offer_id;
  
  -- 7. Log transfer
  INSERT INTO public.transfer_log (
    player_name, player_overall, from_user_id, to_user_id, 
    from_club_name, to_club_name, price, salary, transfer_type
  ) VALUES (
    v_listing.player_name, v_listing.player_overall, v_seller_id, p_buyer_id,
    v_listing.seller_club_name, v_offer.buyer_club_name, 0, v_salary, 'loan'
  );

  RETURN jsonb_build_object('success', true, 'player', v_new_player);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SET search_path = public;

GRANT EXECUTE ON FUNCTION public.finalize_loan_transfer(UUID, UUID, UUID) TO authenticated, service_role;
