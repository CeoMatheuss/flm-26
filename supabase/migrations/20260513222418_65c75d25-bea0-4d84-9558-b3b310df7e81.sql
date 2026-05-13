-- Add columns to league_player_stats
ALTER TABLE public.league_player_stats 
ADD COLUMN IF NOT EXISTS yellow_cards INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS red_cards INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clean_sheets INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS goals_conceded INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS decisive_passes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS motm_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minutes_played INTEGER DEFAULT 0;

-- Add columns to cup_player_stats
ALTER TABLE public.cup_player_stats 
ADD COLUMN IF NOT EXISTS yellow_cards INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS red_cards INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clean_sheets INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS goals_conceded INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS decisive_passes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS motm_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minutes_played INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player_name TEXT,
ADD COLUMN IF NOT EXISTS team_name TEXT;

-- Add columns to world_player_stats
ALTER TABLE public.world_player_stats 
ADD COLUMN IF NOT EXISTS yellow_cards INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS red_cards INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clean_sheets INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS goals_conceded INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS decisive_passes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minutes_played INTEGER DEFAULT 0;

-- Ensure RLS is enabled and policies exist for reading
ALTER TABLE public.league_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cup_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_player_stats ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Statistics are viewable by everyone' AND polrelid = 'public.league_player_stats'::regclass) THEN
        CREATE POLICY "Statistics are viewable by everyone" ON public.league_player_stats FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Statistics are viewable by everyone' AND polrelid = 'public.cup_player_stats'::regclass) THEN
        CREATE POLICY "Statistics are viewable by everyone" ON public.cup_player_stats FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Statistics are viewable by everyone' AND polrelid = 'public.world_player_stats'::regclass) THEN
        CREATE POLICY "Statistics are viewable by everyone" ON public.world_player_stats FOR SELECT USING (true);
    END IF;
END $$;
