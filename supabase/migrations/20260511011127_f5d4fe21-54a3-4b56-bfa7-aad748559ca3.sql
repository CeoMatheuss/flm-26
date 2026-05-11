ALTER TABLE public.national_cup_matches ADD COLUMN IF NOT EXISTS stadium TEXT;
ALTER TABLE public.world_matches ADD COLUMN IF NOT EXISTS stadium TEXT;