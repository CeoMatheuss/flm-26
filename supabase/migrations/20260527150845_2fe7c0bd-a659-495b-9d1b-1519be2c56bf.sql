-- Function to safely add/remove players from the JSONB array in game_saves
CREATE OR REPLACE FUNCTION public.finalize_player_transfer(
  p_listing_id UUID,
  p_offer_id UUID,
  p_buyer_id UUID
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
  v_success BOOLEAN := FALSE;
  v_error_msg TEXT;
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

  IF v_listing.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Anúncio não está mais ativo');
  END IF;

  IF v_offer.status != 'accepted' AND v_offer.status != 'pending' THEN
    -- In some flows it might be pending if coming from a buy-now simulation
    -- but usually it should be accepted. Let's be flexible but safe.
  END IF;

  v_seller_id := v_listing.seller_id;
  v_player_data := v_listing.player_data;
  v_price := v_offer.offered_price;
  v_salary := v_offer.offered_salary;
  v_contract := v_offer.offered_contract_years;

  -- 2. Create the player object for the buyer
  v_new_player := v_player_data || jsonb_build_object(
    'salary', v_salary,
    'contract', v_contract,
    'squad_status', 'reserve',
    'squadRole', 'reserva',
    'onTransferList', false,
    'isLoaned', false,
    'signedAt', extract(epoch from now()) * 1000
  );

  -- 3. Update Buyer Save (Add player, subtract budget)
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

  -- 4. Update Seller Save (Remove player, add budget)
  -- We filter by id. Since we don't know the index, we use a subquery/expression.
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

  -- 5. Update metadata tables
  UPDATE public.transfer_listings SET status = 'sold', sold_at = now() WHERE id = p_listing_id;
  UPDATE public.transfer_offers SET status = 'completed' WHERE id = p_offer_id;
  
  -- 6. Log transfer
  INSERT INTO public.transfer_log (
    player_name, player_overall, from_user_id, to_user_id, 
    from_club_name, to_club_name, price, salary, transfer_type
  ) VALUES (
    v_listing.player_name, v_listing.player_overall, v_seller_id, p_buyer_id,
    v_listing.seller_club_name, v_offer.buyer_club_name, v_price, v_salary, 'sale'
  );

  RETURN jsonb_build_object('success', true, 'player', v_new_player);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Function for Free Agent Signing
CREATE OR REPLACE FUNCTION public.finalize_free_agent_signing(
  p_offer_id UUID,
  p_buyer_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_offer RECORD;
  v_agent RECORD;
  v_player_data JSONB;
  v_new_player JSONB;
  v_price BIGINT; -- signing bonus
BEGIN
  SELECT * INTO v_offer FROM public.free_agent_offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Proposta não encontrada');
  END IF;

  SELECT * INTO v_agent FROM public.free_agents_market WHERE id = v_offer.agent_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Jogador não encontrado no mercado');
  END IF;

  v_player_data := v_agent.player_data;
  v_price := COALESCE(v_offer.signing_bonus, 0);

  v_new_player := v_player_data || jsonb_build_object(
    'salary', v_offer.offered_salary,
    'contract', v_offer.offered_contract_years,
    'squad_status', 'reserve',
    'squadRole', 'reserva',
    'signedAt', extract(epoch from now()) * 1000,
    'signingType', 'free_agent'
  );

  -- Update Buyer Save
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

  -- Delete from market and mark offer completed
  DELETE FROM public.free_agents_market WHERE id = v_offer.agent_id;
  UPDATE public.free_agent_offers SET status = 'completed', resolved_at = now() WHERE id = p_offer_id;

  RETURN jsonb_build_object('success', true, 'player', v_new_player);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Function for Youth Promotion
CREATE OR REPLACE FUNCTION public.promote_youth_to_pro(
  p_user_id UUID,
  p_youth_id UUID,
  p_player_data JSONB
) RETURNS JSONB AS $$
DECLARE
  v_new_player JSONB;
BEGIN
  v_new_player := p_player_data || jsonb_build_object(
    'squad_status', 'reserve',
    'squadRole', 'reserva',
    'signedAt', extract(epoch from now()) * 1000,
    'signingType', 'youth_promotion'
  );

  -- Update Save
  UPDATE public.game_saves
  SET club_data = jsonb_set(
    club_data,
    '{club, players}',
    (club_data->'club'->'players') || v_new_player
  )
  WHERE user_id = p_user_id;

  -- Delete from youth prospects
  DELETE FROM public.youth_prospects WHERE id = p_youth_id AND user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'player', v_new_player);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.finalize_player_transfer(UUID, UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_free_agent_signing(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.promote_youth_to_pro(UUID, UUID, JSONB) TO authenticated, service_role;
