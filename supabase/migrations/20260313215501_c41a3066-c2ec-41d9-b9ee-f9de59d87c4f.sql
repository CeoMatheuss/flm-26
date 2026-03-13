
ALTER TABLE public.transfer_offers 
ADD COLUMN IF NOT EXISTS decision_deadline timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS decision_status text DEFAULT NULL;

COMMENT ON COLUMN public.transfer_offers.decision_deadline IS 'Deadline for player to decide (6h after club accepts)';
COMMENT ON COLUMN public.transfer_offers.decision_status IS 'awaiting_decision, player_accepted, player_rejected';
