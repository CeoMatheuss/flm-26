-- Create auth_verification_codes table
CREATE TABLE IF NOT EXISTS public.auth_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    used_at TIMESTAMP WITH TIME ZONE,
    attempts INTEGER DEFAULT 0,
    UNIQUE(email, code)
);

-- Enable RLS
ALTER TABLE public.auth_verification_codes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own codes" 
ON public.auth_verification_codes 
FOR SELECT 
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_auth_codes_email ON public.auth_verification_codes(email);
CREATE INDEX idx_auth_codes_user_id ON public.auth_verification_codes(user_id);

-- Ensure user_notifications has link column if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_notifications' AND column_name='link') THEN
        ALTER TABLE public.user_notifications ADD COLUMN link TEXT;
    END IF;
END $$;

-- Policies for user_notifications if they don't exist
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'Users can view their own notifications') THEN
        CREATE POLICY "Users can view their own notifications" 
        ON public.user_notifications 
        FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'Users can update their own notifications') THEN
        CREATE POLICY "Users can update their own notifications" 
        ON public.user_notifications 
        FOR UPDATE 
        USING (auth.uid() = user_id);
    END IF;
END $$;
