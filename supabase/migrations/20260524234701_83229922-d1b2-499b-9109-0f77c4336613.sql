-- Tabelas para o Mundial de Clubes

CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'world_cup', 'continental_cup', etc.
    season INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'finished'
    host_country TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tournament_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- 'Grupo A', 'Grupo B', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tournament_group_standings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.tournament_groups(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.world_league_teams(id) ON DELETE CASCADE,
    played INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    goals_for INTEGER DEFAULT 0,
    goals_against INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tournament_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.tournament_groups(id) ON DELETE SET NULL,
    stage TEXT NOT NULL, -- 'group', 'round_of_16', 'quarter_finals', 'semi_finals', 'final'
    home_team_id UUID REFERENCES public.world_league_teams(id) ON DELETE CASCADE,
    away_team_id UUID REFERENCES public.world_league_teams(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'live', 'finished'
    home_goals INTEGER DEFAULT 0,
    away_goals INTEGER DEFAULT 0,
    stadium TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tournament_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_name TEXT NOT NULL,
    season INTEGER NOT NULL,
    winner_id UUID REFERENCES public.world_league_teams(id),
    runner_up_id UUID REFERENCES public.world_league_teams(id),
    host_country TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_group_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_history ENABLE ROW LEVEL SECURITY;

-- Políticas de visualização pública
CREATE POLICY "Visualização pública de torneios" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Visualização pública de grupos" ON public.tournament_groups FOR SELECT USING (true);
CREATE POLICY "Visualização pública de classificações" ON public.tournament_group_standings FOR SELECT USING (true);
CREATE POLICY "Visualização pública de partidas de torneio" ON public.tournament_matches FOR SELECT USING (true);
CREATE POLICY "Visualização pública do histórico" ON public.tournament_history FOR SELECT USING (true);

-- Índices para performance
CREATE INDEX idx_tournament_matches_tournament_id ON public.tournament_matches(tournament_id);
CREATE INDEX idx_tournament_matches_status ON public.tournament_matches(status);
CREATE INDEX idx_tournament_group_standings_group_id ON public.tournament_group_standings(group_id);
