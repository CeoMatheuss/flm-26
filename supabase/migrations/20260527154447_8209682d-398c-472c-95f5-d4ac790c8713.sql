ALTER TABLE public.transfer_offers
  ADD COLUMN IF NOT EXISTS counter_offer jsonb,
  ADD COLUMN IF NOT EXISTS negotiation_closed boolean NOT NULL DEFAULT false;