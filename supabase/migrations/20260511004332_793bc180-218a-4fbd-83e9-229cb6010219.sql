-- 1. National Cups Definition
CREATE TABLE public.national_cups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    country_code TEXT NOT NULL,
    season INTEGER NOT NULL DEFAULT 1,
    current_round INTEGER NOT NULL DEFAULT 1,
    total_rounds INTEGER NOT NULL DEFAULT 5, -- 32 teams = 5 rounds
    status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, finished
    winner_team_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. National Cup Teams (Participants)
CREATE TABLE public.national_cup_teams (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cup_id UUID NOT NULL REFERENCES public.national_cups(id) ON DELETE CASCADE,
    club_id UUID REFERENCES public.world_teams(id),
    club_name TEXT NOT NULL,
    club_logo TEXT,
    user_id UUID, -- For human players
    strength INTEGER DEFAULT 50,
    is_bot BOOLEAN DEFAULT false,
    eliminated BOOLEAN DEFAULT false,
    seed INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. National Cup Matches (Bracket/Elimination)
CREATE TABLE public.national_cup_matches (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cup_id UUID NOT NULL REFERENCES public.national_cups(id) ON DELETE CASCADE,
    round INTEGER NOT NULL, -- 1 to total_rounds
    bracket_pos INTEGER NOT NULL, -- Position in the tree for UI rendering
    home_team_id UUID NOT NULL REFERENCES public.national_cup_teams(id) ON DELETE CASCADE,
    away_team_id UUID REFERENCES public.national_cup_teams(id) ON DELETE CASCADE,
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    home_penalties INTEGER DEFAULT 0,
    away_penalties INTEGER DEFAULT 0,
    winner_team_id UUID REFERENCES public.national_cup_teams(id),
    status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, live, finished
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    match_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. National Cup Prizes
CREATE TABLE public.national_cup_prizes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cup_id UUID NOT NULL REFERENCES public.national_cups(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.national_cup_teams(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.national_cups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.national_cup_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.national_cup_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.national_cup_prizes ENABLE ROW LEVEL SECURITY;

-- Select policies
CREATE POLICY "Select national_cups" ON public.national_cups FOR SELECT USING (true);
CREATE POLICY "Select national_cup_teams" ON public.national_cup_teams FOR SELECT USING (true);
CREATE POLICY "Select national_cup_matches" ON public.national_cup_matches FOR SELECT USING (true);
CREATE POLICY "Select national_cup_prizes" ON public.national_cup_prizes FOR SELECT USING (true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_national_cups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_national_cups_updated_at
BEFORE UPDATE ON public.national_cups
FOR EACH ROW EXECUTE FUNCTION public.update_national_cups_updated_at();
