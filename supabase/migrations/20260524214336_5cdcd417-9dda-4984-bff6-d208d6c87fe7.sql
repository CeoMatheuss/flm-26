-- Add fields to track payment and status for uniform launches
ALTER TABLE public.club_uniform_launches 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS payment_order_id UUID REFERENCES public.payment_orders(id),
ADD COLUMN IF NOT EXISTS price_cents INTEGER DEFAULT 0;

-- Update RLS to ensure users can manage their drafts
-- Assuming the table already has club_id based on previous context
-- Policy: Only allow viewing official kits for everyone, drafts only for the owner
CREATE POLICY "View official kits" ON public.club_uniform_launches FOR SELECT USING (status = 'official');
CREATE POLICY "Manage own drafts" ON public.club_uniform_launches FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.clubs WHERE id = club_id));

-- Trigger to activate kit sales when payment is approved
CREATE OR REPLACE FUNCTION public.activate_uniform_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND (NEW.metadata->>'item_type' = 'uniform_launch') THEN
        UPDATE public.club_uniform_launches
        SET status = 'official', is_active = true, launched_at = now()
        WHERE id = (NEW.metadata->>'uniform_id')::uuid;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_payment_approved_activate_kit
AFTER UPDATE ON public.payment_orders
FOR EACH ROW
WHEN (OLD.status != 'approved' AND NEW.status = 'approved')
EXECUTE FUNCTION public.activate_uniform_on_payment();