-- Fix potential missing columns in game_saves that were mentioned in earlier context as causing errors.

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_saves' AND column_name = 'game_state') THEN
        ALTER TABLE public.game_saves ADD COLUMN game_state JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_saves' AND column_name = 'country') THEN
        ALTER TABLE public.game_saves ADD COLUMN country TEXT;
    END IF;
END $$;