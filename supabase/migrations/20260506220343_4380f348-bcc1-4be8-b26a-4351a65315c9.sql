-- FINAL COMPREHENSIVE REBUILD
DROP VIEW IF EXISTS public.world_league_table CASCADE;
DROP TABLE IF EXISTS public.world_matches CASCADE;
DROP TABLE IF EXISTS public.world_league_table CASCADE;
DROP TABLE IF EXISTS public.world_teams CASCADE;
DROP TABLE IF EXISTS public.world_leagues CASCADE;
DROP TABLE IF EXISTS public.world_countries CASCADE;
DROP TABLE IF EXISTS public.beginner_cup_participants CASCADE;
DROP TABLE IF EXISTS public.beginner_cup CASCADE;

-- 1. Base Structure
CREATE TABLE public.world_countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    iso_code TEXT UNIQUE,
    flag_emoji TEXT
);

CREATE TABLE public.world_leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID REFERENCES public.world_countries(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    division INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.world_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    league_id UUID REFERENCES public.world_leagues(id),
    name TEXT NOT NULL,
    logo TEXT,
    is_bot BOOLEAN DEFAULT false,
    strength INTEGER DEFAULT 70,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

CREATE TABLE public.world_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID REFERENCES public.world_leagues(id),
    home_team_id UUID REFERENCES public.world_teams(id),
    away_team_id UUID REFERENCES public.world_teams(id),
    round INTEGER NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished')),
    home_goals INTEGER DEFAULT 0,
    away_goals INTEGER DEFAULT 0,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    played_at TIMESTAMP WITH TIME ZONE,
    match_data JSONB,
    season_month INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE UNIQUE INDEX idx_world_matches_unique_round_home ON public.world_matches (home_team_id, round, season_month, season_year);
CREATE UNIQUE INDEX idx_world_matches_unique_round_away ON public.world_matches (away_team_id, round, season_month, season_year);

CREATE TABLE public.world_league_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID REFERENCES public.world_leagues(id),
    team_id UUID REFERENCES public.world_teams(id),
    season_month INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    goals_for INTEGER DEFAULT 0,
    goals_against INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(team_id, season_month, season_year)
);

CREATE TABLE public.beginner_cup (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_month INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(season_month, season_year)
);

CREATE TABLE public.beginner_cup_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cup_id UUID REFERENCES public.beginner_cup(id),
    team_id UUID REFERENCES public.world_teams(id),
    status TEXT DEFAULT 'playing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(cup_id, team_id)
);

-- 2. Initial Data
INSERT INTO public.world_countries (name, iso_code, flag_emoji) VALUES
('Brasil', 'BR', '🇧🇷'),
('Espanha', 'ES', '🇪🇸'),
('Inglaterra', 'GB', '🇬🇧'),
('Itália', 'IT', '🇮🇹'),
('Alemanha', 'DE', '🇩🇪'),
('França', 'FR', '🇫🇷'),
('Portugal', 'PT', '🇵🇹'),
('Argentina', 'AR', '🇦🇷');

INSERT INTO public.world_leagues (country_id, name, division)
SELECT id, 'Brasileirão Série A', 1 FROM public.world_countries WHERE name = 'Brasil' UNION ALL
SELECT id, 'LaLiga', 1 FROM public.world_countries WHERE name = 'Espanha' UNION ALL
SELECT id, 'Premier League', 1 FROM public.world_countries WHERE name = 'Inglaterra' UNION ALL
SELECT id, 'Serie A', 1 FROM public.world_countries WHERE name = 'Itália' UNION ALL
SELECT id, 'Bundesliga', 1 FROM public.world_countries WHERE name = 'Alemanha' UNION ALL
SELECT id, 'Ligue 1', 1 FROM public.world_countries WHERE name = 'França' UNION ALL
SELECT id, 'Liga Portugal', 1 FROM public.world_countries WHERE name = 'Portugal' UNION ALL
SELECT id, 'Liga Profesional', 1 FROM public.world_countries WHERE name = 'Argentina';

-- 3. Correct League Rotation Logic
CREATE OR REPLACE FUNCTION public.generate_league_fixtures(_league_id UUID, _month INTEGER, _year INTEGER)
RETURNS void AS $$
DECLARE
    team_ids UUID[];
    num_teams INTEGER := 16;
    num_rounds INTEGER := 30;
    r INTEGER;
    i INTEGER;
    home_idx INTEGER;
    away_idx INTEGER;
    temp_teams UUID[];
    match_date TIMESTAMP WITH TIME ZONE;
    league_name_val TEXT;
    new_team_id UUID;
BEGIN
    SELECT name INTO league_name_val FROM public.world_leagues WHERE id = _league_id;

    FOR i IN 1..num_teams LOOP
        INSERT INTO public.world_teams (league_id, name, is_bot, strength)
        VALUES (_league_id, 'BOT ' || league_name_val || ' ' || i, true, 65 + (random() * 15)::int)
        RETURNING id INTO new_team_id;
        team_ids := array_append(team_ids, new_team_id);
    END LOOP;

    FOR r IN 1..num_rounds LOOP
        match_date := make_timestamptz(_year, _month, LEAST(r, 28), 19, 30, 0);
        
        FOR i IN 0..(num_teams / 2 - 1) LOOP
            home_idx := i + 1;
            away_idx := num_teams - i;
            
            IF r % 2 = 0 THEN
                INSERT INTO public.world_matches (league_id, home_team_id, away_team_id, round, scheduled_at, season_month, season_year)
                VALUES (_league_id, team_ids[away_idx], team_ids[home_idx], r, match_date, _month, _year) ON CONFLICT DO NOTHING;
            ELSE
                INSERT INTO public.world_matches (league_id, home_team_id, away_team_id, round, scheduled_at, season_month, season_year)
                VALUES (_league_id, team_ids[home_idx], team_ids[away_idx], r, match_date, _month, _year) ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
        
        -- Correct rotation: Keep first team, move last to second position
        team_ids := team_ids[1:1] || team_ids[num_teams:num_teams] || team_ids[2:num_teams-1];
    END LOOP;

    FOR i IN 1..num_teams LOOP
        INSERT INTO public.world_league_table (league_id, team_id, season_month, season_year)
        VALUES (_league_id, team_ids[i], _month, _year) ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Bot-to-Player Dynamic Replacement
CREATE OR REPLACE FUNCTION public.replace_bot_with_player(_user_id UUID, _team_name TEXT, _logo TEXT)
RETURNS UUID AS $$
DECLARE
    target_team_id UUID;
    curr_month INTEGER := EXTRACT(MONTH FROM now())::INTEGER;
    curr_year INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
BEGIN
    SELECT id INTO target_team_id FROM public.world_teams WHERE user_id = _user_id;
    IF target_team_id IS NOT NULL THEN RETURN target_team_id; END IF;

    SELECT id INTO target_team_id FROM public.world_teams WHERE is_bot = true LIMIT 1;
    
    IF target_team_id IS NOT NULL THEN
        UPDATE public.world_teams SET user_id = _user_id, name = _team_name, logo = _logo, is_bot = false, updated_at = now() WHERE id = target_team_id;
        RETURN target_team_id;
    ELSE
        INSERT INTO public.world_teams (user_id, name, logo, is_bot) VALUES (_user_id, _team_name, _logo, false) RETURNING id INTO target_team_id;
        INSERT INTO public.beginner_cup (season_month, season_year) VALUES (curr_month, curr_year) ON CONFLICT (season_month, season_year) DO NOTHING;
        INSERT INTO public.beginner_cup_participants (cup_id, team_id) 
        SELECT id, target_team_id FROM public.beginner_cup WHERE season_month = curr_month AND season_year = curr_year ON CONFLICT DO NOTHING;
        RETURN target_team_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Final Initialization
DO $$
DECLARE
    league_rec RECORD;
    curr_month INTEGER := EXTRACT(MONTH FROM now())::INTEGER;
    curr_year INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
BEGIN
    FOR league_rec IN SELECT id FROM public.world_leagues LOOP
        PERFORM public.generate_league_fixtures(league_rec.id, curr_month, curr_year);
    END LOOP;
END $$;

ALTER TABLE public.world_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_league_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read" ON public.world_countries FOR SELECT USING (true);
CREATE POLICY "Public Read" ON public.world_leagues FOR SELECT USING (true);
CREATE POLICY "Public Read" ON public.world_teams FOR SELECT USING (true);
CREATE POLICY "Public Read" ON public.world_matches FOR SELECT USING (true);
CREATE POLICY "Public Read" ON public.world_league_table FOR SELECT USING (true);

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
