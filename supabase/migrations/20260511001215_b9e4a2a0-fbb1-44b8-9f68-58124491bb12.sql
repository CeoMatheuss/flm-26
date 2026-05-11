-- 1. Tabela Principal de Copas Nacionais
CREATE TABLE IF NOT EXISTS public.national_cups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    country_code TEXT NOT NULL,
    season INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'finished'
    current_round INTEGER NOT NULL DEFAULT 1,
    total_rounds INTEGER NOT NULL DEFAULT 6, -- Ex: 64 times = 6 rodadas
    winner_team_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Times Inscritos na Copa
CREATE TABLE IF NOT EXISTS public.national_cup_teams (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cup_id UUID REFERENCES public.national_cups(id) ON DELETE CASCADE,
    club_name TEXT NOT NULL,
    user_id UUID, -- NULL se for BOT
    club_logo TEXT,
    strength INTEGER DEFAULT 60,
    eliminated BOOLEAN DEFAULT false,
    seed INTEGER, -- Para sorteio
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Partidas da Copa (Chaveamento Mata-Mata)
CREATE TABLE IF NOT EXISTS public.national_cup_matches (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cup_id UUID REFERENCES public.national_cups(id) ON DELETE CASCADE,
    round INTEGER NOT NULL, -- 1=32 avos, 2=16 avos, 3=Oitavas, etc.
    bracket_pos INTEGER NOT NULL, -- Posição na árvore para chaveamento fixo
    home_team_id UUID REFERENCES public.national_cup_teams(id) ON DELETE SET NULL,
    away_team_id UUID REFERENCES public.national_cup_teams(id) ON DELETE SET NULL,
    home_goals INTEGER,
    away_goals INTEGER,
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'live', 'finished'
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    played_at TIMESTAMP WITH TIME ZONE,
    match_data JSONB DEFAULT '{}', -- Para eventos, escalações, etc.
    winner_team_id UUID REFERENCES public.national_cup_teams(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Premiações por Fase
CREATE TABLE IF NOT EXISTS public.national_cup_prizes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cup_type TEXT NOT NULL DEFAULT 'national',
    round INTEGER NOT NULL,
    money_prize BIGINT NOT NULL,
    reputation_bonus INTEGER NOT NULL,
    description TEXT
);

-- 5. Habilitar RLS
ALTER TABLE public.national_cups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.national_cup_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.national_cup_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.national_cup_prizes ENABLE ROW LEVEL SECURITY;

-- 6. Políticas (Públicas para leitura, protegidas para escrita via functions)
CREATE POLICY "Public Read National Cups" ON public.national_cups FOR SELECT USING (true);
CREATE POLICY "Public Read National Cup Teams" ON public.national_cup_teams FOR SELECT USING (true);
CREATE POLICY "Public Read National Cup Matches" ON public.national_cup_matches FOR SELECT USING (true);
CREATE POLICY "Public Read National Cup Prizes" ON public.national_cup_prizes FOR SELECT USING (true);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_cup_matches_cup_id ON public.national_cup_matches(cup_id);
CREATE INDEX IF NOT EXISTS idx_cup_teams_cup_id ON public.national_cup_teams(cup_id);
CREATE INDEX IF NOT EXISTS idx_cup_matches_status ON public.national_cup_matches(status);

-- Função de timestamp
CREATE OR REPLACE FUNCTION public.update_national_cups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_national_cups_updated_at
BEFORE UPDATE ON public.national_cups
FOR EACH ROW EXECUTE FUNCTION public.update_national_cups_updated_at();
