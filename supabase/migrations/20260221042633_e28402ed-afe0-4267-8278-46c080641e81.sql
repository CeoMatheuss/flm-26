
-- Create loan listings table for online loan market
CREATE TABLE public.loan_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  seller_club_name TEXT NOT NULL DEFAULT '',
  seller_shield JSONB,
  player_data JSONB NOT NULL,
  player_name TEXT NOT NULL,
  player_position TEXT NOT NULL DEFAULT 'MEI',
  player_overall INTEGER NOT NULL,
  player_age INTEGER NOT NULL,
  salary BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  buyer_id UUID,
  buyer_club_name TEXT,
  listed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active loan listings" ON public.loan_listings
FOR SELECT USING (true);

CREATE POLICY "Users can list own players for loan" ON public.loan_listings
FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Involved parties can update loan listings" ON public.loan_listings
FOR UPDATE USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

CREATE POLICY "Users can delete own loan listings" ON public.loan_listings
FOR DELETE USING (auth.uid() = seller_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.loan_listings;
