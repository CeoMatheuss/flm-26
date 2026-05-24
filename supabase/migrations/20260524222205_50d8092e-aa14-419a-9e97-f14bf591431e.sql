-- Tipos de torneio
DO $$ BEGIN
    CREATE TYPE tournament_type AS ENUM ('world_cup', 'continental', 'national');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabela principal de Torneios (Mundial, etc)
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type tournament_type NOT NULL,
    season INTEGER NOT NULL,
    host_country TEXT,
    status TEXT DEFAULT 'scheduled', -- scheduled, group_stage, knockout, finished
    winner_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grupos do Torneio
CREATE TABLE IF NOT EXISTS public.tournament_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- 'Group A', etc
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Times nos Grupos (Classificação)
CREATE TABLE IF NOT EXISTS public.tournament_group_standings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.tournament_groups(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.world_teams(id) ON DELETE CASCADE,
    played INTEGER DEFAULT 0,
    won INTEGER DEFAULT 0,
    drawn INTEGER DEFAULT 0,
    lost INTEGER DEFAULT 0,
    goals_for INTEGER DEFAULT 0,
    goals_against INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Partidas do Torneio
CREATE TABLE IF NOT EXISTS public.tournament_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.tournament_groups(id) ON DELETE CASCADE,
    stage TEXT NOT NULL, -- 'group', 'round_16', 'quarter', 'semi', 'final'
    home_team_id UUID REFERENCES public.world_teams(id) ON DELETE CASCADE,
    away_team_id UUID REFERENCES public.world_teams(id) ON DELETE CASCADE,
    home_goals INTEGER,
    away_goals INTEGER,
    is_penalty_shootout BOOLEAN DEFAULT false,
    home_penalty_goals INTEGER,
    away_penalty_goals INTEGER,
    status TEXT DEFAULT 'scheduled', -- scheduled, live, finished
    scheduled_at TIMESTAMP WITH TIME ZONE,
    winner_id UUID REFERENCES public.world_teams(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Histórico de Campeões
CREATE TABLE IF NOT EXISTS public.tournament_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_name TEXT NOT NULL,
    season INTEGER NOT NULL,
    winner_id UUID REFERENCES public.world_teams(id),
    runner_up_id UUID REFERENCES public.world_teams(id),
    score TEXT,
    host_country TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Hall da Fama / Estatísticas Individuais do Torneio
CREATE TABLE IF NOT EXISTS public.tournament_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.world_players(id) ON DELETE CASCADE,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    yellow_cards INTEGER DEFAULT 0,
    red_cards INTEGER DEFAULT 0,
    rating DECIMAL(4,2),
    is_mvp BOOLEAN DEFAULT false,
    is_best_gk BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_group_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_stats ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura Pública
CREATE POLICY "Public read access for tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Public read access for tournament_groups" ON public.tournament_groups FOR SELECT USING (true);
CREATE POLICY "Public read access for tournament_group_standings" ON public.tournament_group_standings FOR SELECT USING (true);
CREATE POLICY "Public read access for tournament_matches" ON public.tournament_matches FOR SELECT USING (true);
CREATE POLICY "Public read access for tournament_history" ON public.tournament_history FOR SELECT USING (true);
CREATE POLICY "Public read access for tournament_stats" ON public.tournament_stats FOR SELECT USING (true);
