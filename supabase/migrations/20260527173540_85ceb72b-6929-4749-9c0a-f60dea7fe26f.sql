-- Global configuration for the world system
CREATE TABLE IF NOT EXISTS public.world_system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    global_round INTEGER NOT NULL DEFAULT 1,
    current_season INTEGER NOT NULL DEFAULT 1,
    last_processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.world_system_config TO authenticated;
GRANT ALL ON public.world_system_config TO service_role;

-- Enable RLS
ALTER TABLE public.world_system_config ENABLE ROW LEVEL SECURITY;

-- Allow read for everyone
CREATE POLICY "Public read for system config" ON public.world_system_config FOR SELECT USING (true);

-- Initialize if empty
INSERT INTO public.world_system_config (global_round, current_season)
SELECT 27, 1
WHERE NOT EXISTS (SELECT 1 FROM public.world_system_config);

-- Add missing columns to world_leagues if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='world_leagues' AND column_name='status') THEN
        ALTER TABLE public.world_leagues ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- Function to get global round
CREATE OR REPLACE FUNCTION public.get_global_server_round()
RETURNS INTEGER AS $$
    SELECT global_round FROM public.world_system_config LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_world_system_config_updated_at
BEFORE UPDATE ON public.world_system_config
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
