-- 1. Create auction_history for completed auctions
CREATE TABLE IF NOT EXISTS public.auction_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID,
    player_id UUID,
    player_name TEXT,
    player_overall INTEGER,
    seller_id UUID,
    seller_club_name TEXT,
    winner_id UUID,
    winner_club_name TEXT,
    final_price BIGINT,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.auction_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view auction history" ON public.auction_history;
CREATE POLICY "Anyone can view auction history" ON public.auction_history FOR SELECT USING (true);

-- 2. Update player_auctions if necessary
ALTER TABLE public.player_auctions ADD COLUMN IF NOT EXISTS player_id UUID;
ALTER TABLE public.player_auctions ADD COLUMN IF NOT EXISTS rarity TEXT DEFAULT 'comum';

-- 3. Function to calculate start price based on OVR
CREATE OR REPLACE FUNCTION public.get_auction_start_price(ovr INTEGER)
RETURNS BIGINT AS $$
DECLARE
    v_ovr INTEGER := COALESCE(ovr, 60);
BEGIN
    IF v_ovr >= 95 THEN RETURN 8000000;
    ELSIF v_ovr >= 90 THEN RETURN 3000000;
    ELSIF v_ovr >= 85 THEN RETURN 1000000;
    ELSIF v_ovr >= 80 THEN RETURN 600000;
    ELSIF v_ovr >= 75 THEN RETURN 350000;
    ELSIF v_ovr >= 70 THEN RETURN 200000;
    ELSIF v_ovr >= 65 THEN RETURN 150000;
    ELSIF v_ovr >= 60 THEN RETURN 100000;
    ELSIF v_ovr >= 55 THEN RETURN 75000;
    ELSE RETURN 50000;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Unified bidding function with anti-sniper and finance limits
CREATE OR REPLACE FUNCTION public.place_auction_bid(_auction_id UUID, _amount BIGINT)
RETURNS JSONB AS $$
DECLARE
    v_auction RECORD;
    v_bidder RECORD;
    v_min_increment BIGINT;
    v_max_budget BIGINT;
    v_extended BOOLEAN := FALSE;
    v_new_expires_at TIMESTAMP WITH TIME ZONE;
    v_user_id UUID := auth.uid();
BEGIN
    -- 1. Get auction details
    SELECT * INTO v_auction FROM public.player_auctions WHERE id = _auction_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'AUCTION_NOT_FOUND'; END IF;
    IF v_auction.status != 'active' THEN RAISE EXCEPTION 'AUCTION_NOT_ACTIVE'; END IF;
    IF v_auction.expires_at < now() THEN RAISE EXCEPTION 'AUCTION_EXPIRED'; END IF;
    IF v_auction.seller_id = v_user_id THEN RAISE EXCEPTION 'CANNOT_BID_OWN_AUCTION'; END IF;

    -- 2. Get bidder details
    SELECT * INTO v_bidder FROM public.clubs WHERE user_id = v_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'CLUB_NOT_FOUND'; END IF;

    -- 3. Check 80% budget limit
    v_max_budget := (v_bidder.budget * 0.8)::BIGINT;
    IF _amount > v_max_budget THEN RAISE EXCEPTION 'BID_OVER_BUDGET_LIMIT'; END IF;

    -- 4. Check minimum increment
    IF v_auction.current_bid < 500000 THEN v_min_increment := 10000;
    ELSIF v_auction.current_bid < 1000000 THEN v_min_increment := 50000;
    ELSE v_min_increment := 100000;
    END IF;

    IF v_auction.current_bidder_id IS NOT NULL AND _amount < (v_auction.current_bid + v_min_increment) THEN
        RAISE EXCEPTION 'BID_TOO_LOW';
    END IF;
    
    IF v_auction.current_bidder_id IS NULL AND _amount < v_auction.min_price THEN
        RAISE EXCEPTION 'BID_TOO_LOW';
    END IF;

    -- 5. Anti-sniper: If bid in last 10 minutes, add 10 minutes
    IF (v_auction.expires_at - now()) < interval '10 minutes' THEN
        v_new_expires_at := now() + interval '10 minutes';
        v_extended := TRUE;
    ELSE
        v_new_expires_at := v_auction.expires_at;
    END IF;

    -- 6. Update auction
    UPDATE public.player_auctions
    SET current_bid = _amount,
        current_bidder_id = v_user_id,
        current_bidder_name = v_bidder.name,
        expires_at = v_new_expires_at
    WHERE id = _auction_id;

    -- 7. Log bid
    INSERT INTO public.auction_bids (auction_id, bidder_id, bidder_name, amount)
    VALUES (_auction_id, v_user_id, v_bidder.name, _amount);

    -- 8. Notify old bidder
    IF v_auction.current_bidder_id IS NOT NULL AND v_auction.current_bidder_id != v_user_id THEN
        INSERT INTO public.user_notifications (user_id, title, message, type)
        VALUES (v_auction.current_bidder_id, 'Lance superado!', 'Seu clube perdeu a liderança no leilão de ' || v_auction.player_name, 'warning');
    END IF;

    RETURN jsonb_build_object('success', true, 'extended', v_extended, 'new_expires_at', v_new_expires_at);
END;
$$ LANGUAGE plpgsql;

-- 5. Process expired auctions
CREATE OR REPLACE FUNCTION public.process_expired_auctions()
RETURNS void AS $$
DECLARE
    v_auction RECORD;
    v_winner_club RECORD;
BEGIN
    FOR v_auction IN 
        SELECT * FROM public.player_auctions 
        WHERE status = 'active' AND (expires_at <= now() OR (extract(dow from now()) = 0 AND extract(hour from now()) >= 17))
    LOOP
        UPDATE public.player_auctions SET status = 'closed' WHERE id = v_auction.id;

        IF v_auction.current_bidder_id IS NOT NULL THEN
            SELECT * INTO v_winner_club FROM public.clubs WHERE user_id = v_auction.current_bidder_id;
            
            UPDATE public.clubs SET budget = budget - v_auction.current_bid WHERE id = v_winner_club.id;
            
            IF NOT v_auction.is_system AND v_auction.seller_id IS NOT NULL THEN
                UPDATE public.clubs SET budget = budget + v_auction.current_bid WHERE user_id = v_auction.seller_id;
                UPDATE public.clubs SET squad = (SELECT jsonb_agg(p) FROM jsonb_array_elements(squad) AS p WHERE (p->>'id') != (v_auction.player_data->>'id')) WHERE user_id = v_auction.seller_id;
            END IF;

            UPDATE public.clubs SET squad = squad || jsonb_build_array(v_auction.player_data) WHERE id = v_winner_club.id;

            INSERT INTO public.auction_history (auction_id, player_id, player_name, player_overall, seller_id, seller_club_name, winner_id, winner_club_name, final_price)
            VALUES (v_auction.id, (v_auction.player_data->>'id')::uuid, v_auction.player_name, v_auction.player_overall, v_auction.seller_id, v_auction.seller_club_name, v_auction.current_bidder_id, v_auction.current_bidder_name, v_auction.current_bid);

            INSERT INTO public.user_notifications (user_id, title, message, type) VALUES (v_auction.current_bidder_id, 'Leilão Vencido!', 'Seu clube venceu o leilão de ' || v_auction.player_name, 'success');
            
            IF NOT v_auction.is_system THEN
                INSERT INTO public.user_notifications (user_id, title, message, type) VALUES (v_auction.seller_id, 'Jogador Vendido!', 'Você vendeu ' || v_auction.player_name || ' por R$ ' || v_auction.current_bid, 'info');
            END IF;

            INSERT INTO public.newspaper_entries (title, content, type) VALUES ('Transferência de Peso!', v_winner_club.name || ' venceu o leilão de ' || v_auction.player_name || ' por R$ ' || v_auction.current_bid, 'transfer');
        ELSE
            INSERT INTO public.free_agents_market (player_data, status) VALUES (v_auction.player_data, 'active');
            INSERT INTO public.newspaper_entries (title, content, type) VALUES ('Mercado de Livres', v_auction.player_name || ' não recebeu propostas no leilão e agora está disponível no mercado de jogadores livres.', 'news');
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
