-- Ensure free_agents_market has potential (it's in player_data but let's make it a column for easy search)
ALTER TABLE public.free_agents_market ADD COLUMN IF NOT EXISTS player_potential INTEGER;

-- Function to transition expired auction to free agent
CREATE OR REPLACE FUNCTION public.handle_expired_auction_to_free_agent()
RETURNS void AS $$
DECLARE
    auction_rec RECORD;
    player_json JSONB;
BEGIN
    FOR auction_rec IN 
        SELECT * FROM public.player_auctions 
        WHERE (status = 'active' AND expires_at < now()) OR (status = 'expired' AND current_bidder_id IS NULL)
    LOOP
        -- Check if it truly has no bidder (if status was 'expired' but had bidder, it should be processed as sale elsewhere)
        IF auction_rec.current_bidder_id IS NULL THEN
            player_json := auction_rec.player_data;
            
            -- Ensure player_data has the latest status
            player_json := player_json || '{"status": "Livre"}'::jsonb;

            INSERT INTO public.free_agents_market (
                player_data,
                player_name,
                player_position,
                player_age,
                player_overall,
                player_potential,
                visible_stats,
                origin,
                origin_club_name,
                created_at
            ) VALUES (
                player_json,
                auction_rec.player_name,
                (player_json->>'position'),
                auction_rec.player_age,
                auction_rec.player_overall,
                (player_json->>'potential')::integer,
                jsonb_build_object(
                    'name', auction_rec.player_name,
                    'age', auction_rec.player_age,
                    'position', (player_json->>'position'),
                    'overall', auction_rec.player_overall
                ),
                'auction_expired',
                auction_rec.seller_club_name,
                now()
            );

            -- Mark auction as processed or delete
            DELETE FROM public.player_auctions WHERE id = auction_rec.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
