ALTER TABLE public.loan_listings 
ADD COLUMN IF NOT EXISTS loan_terms JSONB;

CREATE TABLE IF NOT EXISTS public.loan_negotiations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES public.loan_listings(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL, -- club sending the proposal/counter
    receiver_id UUID NOT NULL, -- club receiving the proposal/counter
    offered_terms JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, counter
    is_counter_offer BOOLEAN DEFAULT FALSE,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.loan_negotiations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own loan negotiations"
ON public.loan_negotiations FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create loan negotiations"
ON public.loan_negotiations FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own received/sent negotiations"
ON public.loan_negotiations FOR UPDATE
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_loan_negotiations_updated_at
BEFORE UPDATE ON public.loan_negotiations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
