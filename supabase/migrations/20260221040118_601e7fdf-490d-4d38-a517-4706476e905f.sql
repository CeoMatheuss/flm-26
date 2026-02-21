
-- Add seller shield data to transfer listings
ALTER TABLE public.transfer_listings 
ADD COLUMN seller_shield jsonb DEFAULT NULL;
