-- Auction Outbid Notification Trigger
CREATE OR REPLACE FUNCTION public.notify_auction_outbid()
RETURNS TRIGGER AS $$
DECLARE
    previous_bidder_id UUID;
    player_name TEXT;
    auction_owner_id UUID;
BEGIN
    -- Find the previous highest bidder
    SELECT user_id INTO previous_bidder_id 
    FROM public.auction_bids 
    WHERE auction_id = NEW.auction_id 
    AND id != NEW.id
    ORDER BY amount DESC 
    LIMIT 1;

    -- Get player name and owner
    SELECT p.name, c.user_id INTO player_name, auction_owner_id
    FROM public.player_auctions a
    JOIN public.world_players p ON a.player_id = p.id
    JOIN public.clubs c ON p.club_id = c.id
    WHERE a.id = NEW.auction_id;

    -- Notify previous bidder
    IF previous_bidder_id IS NOT NULL AND previous_bidder_id != NEW.user_id THEN
        INSERT INTO public.user_notifications (user_id, title, message, type, category, priority, icon)
        VALUES (
            previous_bidder_id,
            'Lance Superado! ⚠️',
            'Seu lance por ' || player_name || ' foi superado por R$' || (NEW.amount/1000000)::text || 'M.',
            'danger',
            'Transferências',
            'high',
            '⚒️'
        );
    END IF;

    -- Notify owner that someone bid
    IF auction_owner_id IS NOT NULL AND auction_owner_id != NEW.user_id THEN
        INSERT INTO public.user_notifications (user_id, title, message, type, category, priority, icon)
        VALUES (
            auction_owner_id,
            'Novo Lance! 💰',
            'Seu jogador ' || player_name || ' recebeu um lance de R$' || (NEW.amount/1000000)::text || 'M.',
            'info',
            'Transferências',
            'medium',
            '💸'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auction_bid_inserted ON public.auction_bids;
CREATE TRIGGER on_auction_bid_inserted
AFTER INSERT ON public.auction_bids
FOR EACH ROW EXECUTE FUNCTION public.notify_auction_outbid();


-- Transfer Offer Notification Trigger
CREATE OR REPLACE FUNCTION public.notify_transfer_offer()
RETURNS TRIGGER AS $$
DECLARE
    seller_id UUID;
    player_name TEXT;
    sender_club_name TEXT;
BEGIN
    SELECT p.name, c.user_id INTO player_name, seller_id
    FROM public.world_players p
    JOIN public.clubs c ON p.club_id = c.id
    WHERE p.id = NEW.player_id;

    SELECT name INTO sender_club_name FROM public.clubs WHERE id = NEW.sender_club_id;

    IF seller_id IS NOT NULL THEN
        INSERT INTO public.user_notifications (user_id, title, message, type, category, priority, icon)
        VALUES (
            seller_id,
            'Proposta Recebida 📝',
            sender_club_name || ' enviou uma proposta por ' || player_name || '.',
            'info',
            'Transferências',
            'medium',
            '📄'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_transfer_offer_inserted ON public.transfer_offers;
CREATE TRIGGER on_transfer_offer_inserted
AFTER INSERT ON public.transfer_offers
FOR EACH ROW EXECUTE FUNCTION public.notify_transfer_offer();


-- Player Injury/Suspension Notification (Simulated for now when state changes)
CREATE OR REPLACE FUNCTION public.notify_player_status_change()
RETURNS TRIGGER AS $$
DECLARE
    owner_id UUID;
BEGIN
    SELECT user_id INTO owner_id FROM public.clubs WHERE id = NEW.club_id;
    
    IF owner_id IS NOT NULL THEN
        -- Injury
        IF NEW.injury IS NOT NULL AND (OLD.injury IS NULL OR NEW.injury->>'weeksRemaining' != OLD.injury->>'weeksRemaining') THEN
            INSERT INTO public.user_notifications (user_id, title, message, type, category, priority, icon)
            VALUES (
                owner_id,
                'Departamento Médico 🏥',
                NEW.name || ' sofreu uma lesão e ficará fora por ' || (NEW.injury->>'weeksRemaining') || ' rodadas.',
                'danger',
                'Clube',
                'high',
                '🏥'
            );
        END IF;
        
        -- Suspension
        IF NEW.is_suspended = true AND OLD.is_suspended = false THEN
            INSERT INTO public.user_notifications (user_id, title, message, type, category, priority, icon)
            VALUES (
                owner_id,
                'Suspensão 🟥',
                NEW.name || ' está suspenso para a próxima partida.',
                'danger',
                'Jogos',
                'medium',
                '🟥'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_player_status_change ON public.world_players;
CREATE TRIGGER on_player_status_change
AFTER UPDATE ON public.world_players
FOR EACH ROW EXECUTE FUNCTION public.notify_player_status_change();
