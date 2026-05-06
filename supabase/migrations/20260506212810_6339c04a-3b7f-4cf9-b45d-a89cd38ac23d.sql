-- 1. CLEANUP PREVIOUS ATTEMPTS (IF ANY)
DROP TABLE IF EXISTS public.world_standings CASCADE;
DROP TABLE IF EXISTS public.world_matches CASCADE;
DROP TABLE IF EXISTS public.world_league_rounds CASCADE;
DROP TABLE IF EXISTS public.world_teams CASCADE;
DROP TABLE IF EXISTS public.world_divisions CASCADE;
DROP TABLE IF EXISTS public.world_leagues CASCADE;
DROP TABLE IF EXISTS public.countries CASCADE;

-- 2. SCHEMA DEFINITION
CREATE TABLE public.countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE, -- e.g. 'BR', 'ES', 'EN'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.world_leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID REFERENCES public.countries(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(country_id, name)
);

CREATE TABLE public.world_divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID REFERENCES public.world_leagues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level INTEGER NOT NULL, -- 1 = Serie A, 2 = Serie B, etc.
    match_time TIME NOT NULL, -- Fixed time: '19:30', '18:30', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(league_id, level)
);

CREATE TABLE public.world_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    division_id UUID REFERENCES public.world_divisions(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    logo TEXT,
    is_bot BOOLEAN DEFAULT true,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    strength INTEGER DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.world_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    division_id UUID REFERENCES public.world_divisions(id) ON DELETE CASCADE,
    home_team_id UUID REFERENCES public.world_teams(id) ON DELETE CASCADE,
    away_team_id UUID REFERENCES public.world_teams(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_sim_at TIMESTAMP WITH TIME ZONE NOT NULL, -- scheduled_at + 5 minutes
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'live', 'finished'
    home_goals INTEGER DEFAULT 0,
    away_goals INTEGER DEFAULT 0,
    match_data JSONB DEFAULT '{}'::jsonb,
    played_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT unique_match_teams UNIQUE (division_id, round, home_team_id, away_team_id)
);

CREATE TABLE public.world_standings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    division_id UUID REFERENCES public.world_divisions(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.world_teams(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    goals_for INTEGER DEFAULT 0,
    goals_against INTEGER DEFAULT 0,
    goal_difference INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(division_id, team_id)
);

-- 3. RLS POLICIES
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Countries" ON public.countries FOR SELECT USING (true);
CREATE POLICY "Public Read Leagues" ON public.world_leagues FOR SELECT USING (true);
CREATE POLICY "Public Read Divisions" ON public.world_divisions FOR SELECT USING (true);
CREATE POLICY "Public Read Teams" ON public.world_teams FOR SELECT USING (true);
CREATE POLICY "Public Read Matches" ON public.world_matches FOR SELECT USING (true);
CREATE POLICY "Public Read Standings" ON public.world_standings FOR SELECT USING (true);

-- 4. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.update_standings_after_match()
RETURNS TRIGGER AS $$
DECLARE
    home_points INT;
    away_points INT;
    home_win INT;
    away_win INT;
    draw INT;
BEGIN
    IF NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status != 'finished') THEN
        -- Calculate outcomes
        IF NEW.home_goals > NEW.away_goals THEN
            home_points := 3; away_points := 0; home_win := 1; away_win := 0; draw := 0;
        ELSIF NEW.home_goals < NEW.away_goals THEN
            home_points := 0; away_points := 3; home_win := 0; away_win := 1; draw := 0;
        ELSE
            home_points := 1; away_points := 1; home_win := 0; away_win := 0; draw := 1;
        END IF;

        -- Update Home Team
        INSERT INTO public.world_standings (division_id, team_id, points, played, wins, draws, losses, goals_for, goals_against, goal_difference)
        VALUES (NEW.division_id, NEW.home_team_id, home_points, 1, home_win, draw, (CASE WHEN home_points=0 THEN 1 ELSE 0 END), NEW.home_goals, NEW.away_goals, NEW.home_goals - NEW.away_goals)
        ON CONFLICT (division_id, team_id) DO UPDATE SET
            points = world_standings.points + home_points,
            played = world_standings.played + 1,
            wins = world_standings.wins + home_win,
            draws = world_standings.draws + draw,
            losses = world_standings.losses + (CASE WHEN home_points=0 THEN 1 ELSE 0 END),
            goals_for = world_standings.goals_for + NEW.home_goals,
            goals_against = world_standings.goals_against + NEW.away_goals,
            goal_difference = world_standings.goal_difference + (NEW.home_goals - NEW.away_goals),
            updated_at = now();

        -- Update Away Team
        INSERT INTO public.world_standings (division_id, team_id, points, played, wins, draws, losses, goals_for, goals_against, goal_difference)
        VALUES (NEW.division_id, NEW.away_team_id, away_points, 1, away_win, draw, (CASE WHEN away_points=0 THEN 1 ELSE 0 END), NEW.away_goals, NEW.home_goals, NEW.away_goals - NEW.home_goals)
        ON CONFLICT (division_id, team_id) DO UPDATE SET
            points = world_standings.points + away_points,
            played = world_standings.played + 1,
            wins = world_standings.wins + away_win,
            draws = world_standings.draws + draw,
            losses = world_standings.losses + (CASE WHEN away_points=0 THEN 1 ELSE 0 END),
            goals_for = world_standings.goals_for + NEW.away_goals,
            goals_against = world_standings.goals_against + NEW.home_goals,
            goal_difference = world_standings.goal_difference + (NEW.away_goals - NEW.home_goals),
            updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_world_standings
AFTER UPDATE ON public.world_matches
FOR EACH ROW EXECUTE FUNCTION public.update_standings_after_match();

-- 5. INITIAL DATA SEEDING (Countries and Leagues)
INSERT INTO public.countries (name, code) VALUES
('Brasil', 'BR'),
('Espanha', 'ES'),
('Inglaterra', 'EN'),
('Itália', 'IT'),
('Alemanha', 'DE'),
('França', 'FR'),
('Portugal', 'PT'),
('Argentina', 'AR');

-- Insert Leagues and Divisions
DO $$
DECLARE
    br_id UUID; es_id UUID; en_id UUID; it_id UUID; de_id UUID; fr_id UUID; pt_id UUID; ar_id UUID;
BEGIN
    SELECT id INTO br_id FROM public.countries WHERE code = 'BR';
    SELECT id INTO es_id FROM public.countries WHERE code = 'ES';
    SELECT id INTO en_id FROM public.countries WHERE code = 'EN';
    SELECT id INTO it_id FROM public.countries WHERE code = 'IT';
    SELECT id INTO de_id FROM public.countries WHERE code = 'DE';
    SELECT id INTO fr_id FROM public.countries WHERE code = 'FR';
    SELECT id INTO pt_id FROM public.countries WHERE code = 'PT';
    SELECT id INTO ar_id FROM public.countries WHERE code = 'AR';

    -- Brasil
    INSERT INTO public.world_leagues (country_id, name) VALUES (br_id, 'Brasileirão') RETURNING id INTO br_id;
    INSERT INTO public.world_divisions (league_id, name, level, match_time) VALUES
    (br_id, 'Série A', 1, '19:30'),
    (br_id, 'Série B', 2, '18:30'),
    (br_id, 'Série C', 3, '17:30'),
    (br_id, 'Série D', 4, '16:30');

    -- Espanha
    INSERT INTO public.world_leagues (country_id, name) VALUES (es_id, 'LaLiga') RETURNING id INTO es_id;
    INSERT INTO public.world_divisions (league_id, name, level, match_time) VALUES
    (es_id, 'LaLiga', 1, '19:30'),
    (es_id, 'LaLiga 2', 2, '18:30');

    -- Inglaterra
    INSERT INTO public.world_leagues (country_id, name) VALUES (en_id, 'Premier League') RETURNING id INTO en_id;
    INSERT INTO public.world_divisions (league_id, name, level, match_time) VALUES
    (en_id, 'Premier League', 1, '19:30'),
    (en_id, 'Championship', 2, '18:30');

    -- Itália
    INSERT INTO public.world_leagues (country_id, name) VALUES (it_id, 'Serie A') RETURNING id INTO it_id;
    INSERT INTO public.world_divisions (league_id, name, level, match_time) VALUES
    (it_id, 'Serie A', 1, '19:30'),
    (it_id, 'Serie B', 2, '18:30');

    -- Alemanha
    INSERT INTO public.world_leagues (country_id, name) VALUES (de_id, 'Bundesliga') RETURNING id INTO de_id;
    INSERT INTO public.world_divisions (league_id, name, level, match_time) VALUES
    (de_id, 'Bundesliga', 1, '19:30'),
    (de_id, '2. Bundesliga', 2, '18:30');

    -- França
    INSERT INTO public.world_leagues (country_id, name) VALUES (fr_id, 'Ligue 1') RETURNING id INTO fr_id;
    INSERT INTO public.world_divisions (league_id, name, level, match_time) VALUES
    (fr_id, 'Ligue 1', 1, '19:30'),
    (fr_id, 'Ligue 2', 2, '18:30');

    -- Portugal
    INSERT INTO public.world_leagues (country_id, name) VALUES (pt_id, 'Liga Portugal') RETURNING id INTO pt_id;
    INSERT INTO public.world_divisions (league_id, name, level, match_time) VALUES
    (pt_id, 'Liga Portugal', 1, '19:30'),
    (pt_id, 'Liga 2', 2, '18:30');

    -- Argentina
    INSERT INTO public.world_leagues (country_id, name) VALUES (ar_id, 'Liga Profesional') RETURNING id INTO ar_id;
    INSERT INTO public.world_divisions (league_id, name, level, match_time) VALUES
    (ar_id, 'Liga Profesional', 1, '19:30');
END $$;
