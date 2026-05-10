-- Create clubs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.clubs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'Brasil',
    stadium_name TEXT DEFAULT 'Estádio Municipal',
    primary_color TEXT DEFAULT '#2563EB',
    secondary_color TEXT DEFAULT '#FFFFFF',
    detail_color TEXT DEFAULT '#DC2626',
    logo_url TEXT,
    fans INTEGER DEFAULT 1000,
    reputation INTEGER DEFAULT 65,
    budget BIGINT DEFAULT 1000000,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS for clubs
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Policies for clubs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own club') THEN
        CREATE POLICY "Users can view their own club" ON public.clubs FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own club') THEN
        CREATE POLICY "Users can insert their own club" ON public.clubs FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own club') THEN
        CREATE POLICY "Users can update their own club" ON public.clubs FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Add country column to world_teams if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'world_teams' AND column_name = 'country') THEN
        ALTER TABLE public.world_teams ADD COLUMN country TEXT DEFAULT 'Brasil';
    END IF;
END $$;

-- Add country column to league_members if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'league_members' AND column_name = 'country') THEN
        ALTER TABLE public.league_members ADD COLUMN country TEXT DEFAULT 'Brasil';
    END IF;
END $$;

-- Add updated_at trigger for clubs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_clubs_updated_at') THEN
        CREATE TRIGGER update_clubs_updated_at
        BEFORE UPDATE ON public.clubs
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
