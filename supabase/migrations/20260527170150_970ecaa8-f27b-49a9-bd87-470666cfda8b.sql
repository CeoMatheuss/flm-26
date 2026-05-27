-- Add division hierarchy columns to world_leagues if not exist
ALTER TABLE public.world_leagues 
ADD COLUMN IF NOT EXISTS tier_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS division_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS division_name TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_world_leagues_country_tier ON public.world_leagues(country, tier_level);

-- Procedure to generate calendar for a 16-team league (30 rounds, home and away)
CREATE OR REPLACE FUNCTION public.generate_world_league_calendar(p_league_id UUID, p_start_date TIMESTAMP WITH TIME ZONE, p_match_time TIME)
RETURNS VOID AS $$
DECLARE
    team_ids UUID[];
    num_teams INTEGER;
    num_rounds INTEGER;
    matches_per_round INTEGER;
    r INTEGER;
    m INTEGER;
    home_idx INTEGER;
    away_idx INTEGER;
    temp_team UUID;
    scheduled_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get teams in the league
    SELECT ARRAY_AGG(team_id) INTO team_ids FROM public.world_league_teams WHERE league_id = p_league_id;
    num_teams := array_length(team_ids, 1);
    
    IF num_teams < 2 THEN RETURN; END IF;
    
    num_rounds := (num_teams - 1) * 2;
    matches_per_round := num_teams / 2;
    
    -- Clear existing matches for this league
    DELETE FROM public.world_matches WHERE league_id = p_league_id AND status = 'scheduled';
    
    -- Round robin scheduling algorithm (Circle method)
    FOR r IN 1..num_rounds LOOP
        scheduled_time := p_start_date + (r - 1) * INTERVAL '1 day';
        scheduled_time := (scheduled_time::date + p_match_time)::timestamp with time zone;
        
        FOR m IN 1..matches_per_round LOOP
            home_idx := m;
            away_idx := num_teams - m + 1;
            
            IF r > (num_teams - 1) THEN
                INSERT INTO public.world_matches (league_id, home_team_id, away_team_id, round, scheduled_at, status)
                VALUES (p_league_id, team_ids[away_idx], team_ids[home_idx], r, scheduled_time, 'scheduled');
            ELSE
                INSERT INTO public.world_matches (league_id, home_team_id, away_team_id, round, scheduled_at, status)
                VALUES (p_league_id, team_ids[home_idx], team_ids[away_idx], r, scheduled_time, 'scheduled');
            END IF;
        END LOOP;
        
        -- Rotate teams (keep first team fixed)
        temp_team := team_ids[num_teams];
        FOR m IN REVERSE num_teams..3 LOOP
            team_ids[m] := team_ids[m-1];
        END LOOP;
        team_ids[2] := temp_team;
    END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Initialize common world leagues metadata
-- We'll use a new table 'world_league_config' since world_divisions is linked to league_id
CREATE TABLE IF NOT EXISTS public.world_league_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country TEXT NOT NULL,
    tier_level INTEGER NOT NULL,
    division_name TEXT NOT NULL,
    match_time TIME NOT NULL,
    max_teams INTEGER DEFAULT 16,
    UNIQUE(country, tier_level)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.world_league_config TO authenticated;
GRANT ALL ON public.world_league_config TO service_role;
ALTER TABLE public.world_league_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public league config is viewable by everyone" ON public.world_league_config FOR SELECT USING (true);

INSERT INTO public.world_league_config (country, tier_level, division_name, match_time) VALUES
('Brasil', 1, 'Campeonato Brasileiro Série A', '21:00:00'),
('Brasil', 2, 'Campeonato Brasileiro Série B', '20:30:00'),
('Brasil', 3, 'Campeonato Brasileiro Série C', '19:30:00'),
('Brasil', 4, 'Campeonato Brasileiro Série D', '18:30:00'),
('Brasil', 5, 'Campeonato Brasileiro Série E', '17:00:00'),
('Inglaterra', 1, 'Premier League', '20:00:00'),
('Inglaterra', 2, 'EFL Championship', '19:30:00'),
('Inglaterra', 3, 'League One', '18:30:00'),
('Inglaterra', 4, 'League Two', '17:30:00'),
('Inglaterra', 5, 'National League', '16:30:00'),
('Espanha', 1, 'LaLiga', '21:30:00'),
('Espanha', 2, 'LaLiga 2', '20:00:00'),
('Itália', 1, 'Serie A', '20:45:00'),
('Itália', 2, 'Serie B', '19:00:00'),
('Alemanha', 1, 'Bundesliga', '20:30:00'),
('Alemanha', 2, 'Bundesliga 2', '18:30:00'),
('França', 1, 'Ligue 1', '21:00:00'),
('França', 2, 'Ligue 2', '19:00:00')
ON CONFLICT (country, tier_level) DO UPDATE SET 
match_time = EXCLUDED.match_time,
division_name = EXCLUDED.division_name;
