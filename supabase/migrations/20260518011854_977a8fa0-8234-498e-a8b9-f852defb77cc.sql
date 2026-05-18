-- 1. Tabela de Disponibilidade (Lesões e Suspensões)
CREATE TABLE IF NOT EXISTS public.world_player_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.world_players(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.world_teams(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('injury', 'suspension')),
    reason TEXT,
    rounds_remaining INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(player_id, type)
);

-- 2. Tabela de Classificação Oficial (Sincronizada)
CREATE TABLE IF NOT EXISTS public.world_league_standings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL,
    team_id UUID NOT NULL,
    points INTEGER DEFAULT 0,
    played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    goals_for INTEGER DEFAULT 0,
    goals_against INTEGER DEFAULT 0,
    goal_diff INTEGER DEFAULT 0,
    season_year INTEGER NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(league_id, team_id, season_year)
);

-- 3. Adicionar colunas de controle em world_matches
ALTER TABLE public.world_matches 
ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS match_data JSONB DEFAULT '{}'::jsonb;

-- 4. Função para atualizar tabela de classificação (Atomic Update)
CREATE OR REPLACE FUNCTION public.update_world_league_standings()
RETURNS TRIGGER AS $$
DECLARE
    h_win INT := 0;
    h_draw INT := 0;
    h_loss INT := 0;
    a_win INT := 0;
    a_draw INT := 0;
    a_loss INT := 0;
BEGIN
    IF (NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status != 'finished') AND NEW.synced = false) THEN
        -- Determinar resultado
        IF NEW.home_goals > NEW.away_goals THEN h_win := 1; a_loss := 1;
        ELSIF NEW.home_goals < NEW.away_goals THEN h_loss := 1; a_win := 1;
        ELSE h_draw := 1; a_draw := 1;
        END IF;

        -- Update Mandante
        INSERT INTO public.world_league_standings (league_id, team_id, season_year, points, played, wins, draws, losses, goals_for, goals_against, goal_diff)
        VALUES (NEW.league_id, NEW.home_team_id, NEW.season_year, (h_win*3 + h_draw), 1, h_win, h_draw, h_loss, NEW.home_goals, NEW.away_goals, (NEW.home_goals - NEW.away_goals))
        ON CONFLICT (league_id, team_id, season_year) DO UPDATE SET
            points = world_league_standings.points + excluded.points,
            played = world_league_standings.played + 1,
            wins = world_league_standings.wins + h_win,
            draws = world_league_standings.draws + h_draw,
            losses = world_league_standings.losses + h_loss,
            goals_for = world_league_standings.goals_for + excluded.goals_for,
            goals_against = world_league_standings.goals_against + excluded.goals_against,
            goal_diff = world_league_standings.goal_diff + (excluded.goals_for - excluded.goals_against),
            updated_at = now();

        -- Update Visitante
        INSERT INTO public.world_league_standings (league_id, team_id, season_year, points, played, wins, draws, losses, goals_for, goals_against, goal_diff)
        VALUES (NEW.league_id, NEW.away_team_id, NEW.season_year, (a_win*3 + a_draw), 1, a_win, a_draw, a_loss, NEW.away_goals, NEW.home_goals, (NEW.away_goals - NEW.home_goals))
        ON CONFLICT (league_id, team_id, season_year) DO UPDATE SET
            points = world_league_standings.points + excluded.points,
            played = world_league_standings.played + 1,
            wins = world_league_standings.wins + a_win,
            draws = world_league_standings.draws + a_draw,
            losses = world_league_standings.losses + a_loss,
            goals_for = world_league_standings.goals_for + excluded.goals_for,
            goals_against = world_league_standings.goals_against + excluded.goals_against,
            goal_diff = world_league_standings.goal_diff + (excluded.goals_for - excluded.goals_against),
            updated_at = now();

        NEW.synced := true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para tabela
DROP TRIGGER IF EXISTS trigger_update_standings ON public.world_matches;
CREATE TRIGGER trigger_update_standings
BEFORE UPDATE ON public.world_matches
FOR EACH ROW EXECUTE FUNCTION public.update_world_league_standings();

-- 5. Enable RLS
ALTER TABLE public.world_player_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_league_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select for all" ON public.world_player_availability FOR SELECT USING (true);
CREATE POLICY "Allow select for all league standings" ON public.world_league_standings FOR SELECT USING (true);
