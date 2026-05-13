-- Add image_url to newspaper_entries if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'newspaper_entries' AND COLUMN_NAME = 'image_url') THEN
        ALTER TABLE public.newspaper_entries ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Add importance to newspaper_entries
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'newspaper_entries' AND COLUMN_NAME = 'importance') THEN
        ALTER TABLE public.newspaper_entries ADD COLUMN importance INTEGER DEFAULT 1;
    END IF;
END $$;

-- Add image_url to world_league_news
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'world_league_news' AND COLUMN_NAME = 'image_url') THEN
        ALTER TABLE public.world_league_news ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Ensure cup_news has image_url (it was mentioned in code but let's be sure)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cup_news' AND COLUMN_NAME = 'image_url') THEN
        ALTER TABLE public.cup_news ADD COLUMN image_url TEXT;
    END IF;
END $$;
