-- Add new columns to world_league_table for advanced stats
ALTER TABLE public.world_league_table 
ADD COLUMN IF NOT EXISTS last_5_games TEXT DEFAULT '-----',
ADD COLUMN IF NOT EXISTS sequence TEXT DEFAULT '-',
ADD COLUMN IF NOT EXISTS win_rate NUMERIC(5,2) DEFAULT 0;

-- Create world_player_stats table
CREATE TABLE IF NOT EXISTS public.world_player_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL, 
    team_id UUID NOT NULL REFERENCES public.world_teams(id) ON DELETE CASCADE,
    league_id UUID NOT NULL REFERENCES public.world_leagues(id) ON DELETE CASCADE,
    season_month INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    matches_played INTEGER DEFAULT 0,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    avg_rating NUMERIC(3,2) DEFAULT 0.0,
    best_rating NUMERIC(3,2) DEFAULT 0.0,
    mvp_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create world_league_news table
CREATE TABLE IF NOT EXISTS public.world_league_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID REFERENCES public.world_leagues(id) ON DELETE CASCADE,
    match_id UUID REFERENCES public.world_matches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'match_report', -- match_report, transfer, injury, fan_reaction
    importance INTEGER DEFAULT 1, -- 1 (low) to 5 (breaking news)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.world_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_league_news ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read player stats" ON public.world_player_stats FOR SELECT USING (true);
CREATE POLICY "Public read league news" ON public.world_league_news FOR SELECT USING (true);

-- Fix league countries and names using world_countries
DO $$
DECLARE
    br_id UUID; es_id UUID; gb_id UUID; it_id UUID; de_id UUID; fr_id UUID; pt_id UUID; ar_id UUID;
BEGIN
    SELECT id INTO br_id FROM public.world_countries WHERE iso_code = 'BR';
    SELECT id INTO es_id FROM public.world_countries WHERE iso_code = 'ES';
    SELECT id INTO gb_id FROM public.world_countries WHERE iso_code = 'GB';
    SELECT id INTO it_id FROM public.world_countries WHERE iso_code = 'IT';
    SELECT id INTO de_id FROM public.world_countries WHERE iso_code = 'DE';
    SELECT id INTO fr_id FROM public.world_countries WHERE iso_code = 'FR';
    SELECT id INTO pt_id FROM public.world_countries WHERE iso_code = 'PT';
    SELECT id INTO ar_id FROM public.world_countries WHERE iso_code = 'AR';

    -- Update world_leagues
    UPDATE public.world_leagues SET country = 'Brasil', country_id = br_id WHERE name ILIKE '%Brasil%' OR name ILIKE '%Brasileirão%';
    UPDATE public.world_leagues SET country = 'Espanha', country_id = es_id WHERE name ILIKE '%LaLiga%' OR name ILIKE '%Espanha%';
    UPDATE public.world_leagues SET country = 'Inglaterra', country_id = gb_id WHERE name ILIKE '%Premier League%' OR name ILIKE '%Inglaterra%';
    UPDATE public.world_leagues SET country = 'Itália', country_id = it_id WHERE name ILIKE '%Serie A%' AND name NOT ILIKE '%Brasil%';
    UPDATE public.world_leagues SET country = 'Alemanha', country_id = de_id WHERE name ILIKE '%Bundesliga%' OR name ILIKE '%Alemanha%';
    UPDATE public.world_leagues SET country = 'França', country_id = fr_id WHERE name ILIKE '%Ligue 1%' OR name ILIKE '%França%';
    UPDATE public.world_leagues SET country = 'Portugal', country_id = pt_id WHERE name ILIKE '%Portugal%';
    UPDATE public.world_leagues SET country = 'Argentina', country_id = ar_id WHERE name ILIKE '%Argentina%' OR name ILIKE '%Profesional%';
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_world_matches_league_round ON public.world_matches(league_id, round);
CREATE INDEX IF NOT EXISTS idx_world_player_stats_league_season ON public.world_player_stats(league_id, season_month, season_year);
CREATE INDEX IF NOT EXISTS idx_world_league_news_league ON public.world_league_news(league_id);
