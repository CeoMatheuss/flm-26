
-- Premium users table
CREATE TABLE public.premium_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pix_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.premium_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own premium" ON public.premium_users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own premium" ON public.premium_users FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own premium" ON public.premium_users FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can check premium status" ON public.premium_users FOR SELECT USING (true);

-- Drop the restrictive SELECT first, then keep the public one
DROP POLICY "Users can view own premium" ON public.premium_users;

-- Player auctions table
CREATE TABLE public.player_auctions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  seller_club_name TEXT NOT NULL DEFAULT '',
  player_data JSONB NOT NULL,
  player_name TEXT NOT NULL,
  player_overall INTEGER NOT NULL,
  player_age INTEGER NOT NULL,
  min_price BIGINT NOT NULL,
  current_bid BIGINT NOT NULL DEFAULT 0,
  current_bidder_id UUID,
  current_bidder_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.player_auctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view auctions" ON public.player_auctions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create auctions" ON public.player_auctions FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Users can update auctions" ON public.player_auctions FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Realtime for auctions
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_auctions;

-- Validation trigger for auctions
CREATE OR REPLACE FUNCTION public.validate_auction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.player_overall < 65 THEN
    RAISE EXCEPTION 'Player must be 65+ overall for auction';
  END IF;
  IF NEW.player_age > 35 THEN
    RAISE EXCEPTION 'Player must be 35 years old or younger';
  END IF;
  IF NEW.min_price < 0 THEN
    RAISE EXCEPTION 'Minimum price cannot be negative';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_auction_trigger
BEFORE INSERT ON public.player_auctions
FOR EACH ROW EXECUTE FUNCTION public.validate_auction();
