-- Add template_key to news tables
ALTER TABLE public.newspaper_entries ADD COLUMN IF NOT EXISTS template_key TEXT;
ALTER TABLE public.world_league_news ADD COLUMN IF NOT EXISTS template_key TEXT;
ALTER TABLE public.cup_news ADD COLUMN IF NOT EXISTS template_key TEXT;

-- Add metadata column to store dynamic values for the template (JSONB)
ALTER TABLE public.newspaper_entries ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE public.world_league_news ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE public.cup_news ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
