-- Add game_state column to relevant tables to ensure compatibility and fix the "column does not exist" error.

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'live_matches' AND column_name = 'game_state') THEN
        ALTER TABLE public.live_matches ADD COLUMN game_state JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'league_matches' AND column_name = 'game_state') THEN
        ALTER TABLE public.league_matches ADD COLUMN game_state JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cup_matches' AND column_name = 'game_state') THEN
        ALTER TABLE public.cup_matches ADD COLUMN game_state JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'world_matches' AND column_name = 'game_state') THEN
        ALTER TABLE public.world_matches ADD COLUMN game_state JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'continental_matches' AND column_name = 'game_state') THEN
        ALTER TABLE public.continental_matches ADD COLUMN game_state JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;