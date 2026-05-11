-- 1. Tabela Mestre das Copas
CREATE TABLE public.national_cups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    country_code TEXT NOT NULL, -- 'Brasil', 'Espanha', etc (nome completo para bater com world_leagues)
    season INTEGER NOT NULL DEFAULT 1,
    current_round INTEGER NOT NULL DEFAULT 1,
    total_rounds INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'finished')),
    winner_team_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(country_code, season)
);

-- 2. Participantes da Copa
CREATE TABLE public.national_cup_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cup_id UUID REFERENCES public.national_cups(id) ON DELETE CASCADE NOT NULL,
    club_id UUID NOT NULL, -- ID do time em world_teams
    club_name TEXT NOT NULL,
    club_logo TEXT,
    user_id UUID, -- NULL se for bot
    strength INTEGER DEFAULT 50,
    is_bot BOOLEAN DEFAULT true,
    eliminated BOOLEAN DEFAULT false,
    seed INTEGER, -- Posição no sorteio inicial
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Partidas da Copa (Mata-Mata)
CREATE TABLE public.national_cup_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cup_id UUID REFERENCES public.national_cups(id) ON DELETE CASCADE NOT NULL,
    round INTEGER NOT NULL, -- 1=32 avos, 2=16 avos... ou Round count real
    bracket_pos INTEGER NOT NULL, -- Posição na chave daquela rodada
    home_team_id UUID REFERENCES public.national_cup_teams(id) ON DELETE CASCADE,
    away_team_id UUID REFERENCES public.national_cup_teams(id) ON DELETE CASCADE,
    home_score INTEGER,
    away_score INTEGER,
    home_penalties INTEGER,
    away_penalties INTEGER,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished')),
    winner_team_id UUID REFERENCES public.national_cup_teams(id),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    stadium TEXT,
    match_data JSONB, -- Estatísticas completas (gols, chutes, etc)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Premiações
CREATE TABLE public.national_cup_prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cup_id UUID REFERENCES public.national_cups(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES public.national_cup_teams(id) ON DELETE CASCADE NOT NULL,
    amount BIGINT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.national_cups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.national_cup_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.national_cup_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.national_cup_prizes ENABLE ROW LEVEL SECURITY;

-- Select Policies (Publico)
CREATE POLICY "Copas são visíveis por todos" ON public.national_cups FOR SELECT USING (true);
CREATE POLICY "Times da copa são visíveis por todos" ON public.national_cup_teams FOR SELECT USING (true);
CREATE POLICY "Jogos da copa são visíveis por todos" ON public.national_cup_matches FOR SELECT USING (true);
CREATE POLICY "Prêmios da copa são visíveis por todos" ON public.national_cup_prizes FOR SELECT USING (true);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_national_cups_updated_at BEFORE UPDATE ON public.national_cups FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_national_cup_matches_updated_at BEFORE UPDATE ON public.national_cup_matches FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();