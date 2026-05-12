-- Check and add category/priority to user_notifications if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'category') THEN
        ALTER TABLE public.user_notifications ADD COLUMN category TEXT DEFAULT 'Club';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'priority') THEN
        ALTER TABLE public.user_notifications ADD COLUMN priority TEXT DEFAULT 'medium';
    END IF;
END $$;

-- Ensure tables exist and have RLS
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    icon TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    category TEXT DEFAULT 'Club',
    priority TEXT DEFAULT 'medium',
    data JSONB,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" 
ON public.user_notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.user_notifications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.notification_read_state (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_key TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (user_id, notification_key)
);

ALTER TABLE public.notification_read_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own read state" 
ON public.notification_read_state FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own read state" 
ON public.notification_read_state FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own read state" 
ON public.notification_read_state FOR UPDATE 
USING (auth.uid() = user_id);
