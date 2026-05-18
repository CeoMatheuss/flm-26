ALTER TABLE public.world_players ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Brasil';
ALTER TABLE public.world_players ADD COLUMN IF NOT EXISTS stamina_max INTEGER DEFAULT 100;
ALTER TABLE public.world_players ADD COLUMN IF NOT EXISTS resistance INTEGER DEFAULT 50;
