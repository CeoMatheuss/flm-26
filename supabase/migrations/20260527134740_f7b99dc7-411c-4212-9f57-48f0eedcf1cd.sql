ALTER TABLE public.auth_verification_codes 
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS delivery_error TEXT;

-- Index for anti-flood checks
CREATE INDEX IF NOT EXISTS idx_auth_verification_codes_email_created_at ON public.auth_verification_codes(email, created_at DESC);
