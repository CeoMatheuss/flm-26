-- ── TABELA DE ESTATÍSTICAS AGREGADAS ──────────────────────────
CREATE TABLE IF NOT EXISTS public.player_competition_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL,
    competition_id TEXT NOT NULL, -- 'league', 'cup', 'friendly', ou ID da liga mundo
    season INTEGER NOT NULL DEFAULT 1,
    team_id UUID,
    
    games_played INTEGER NOT NULL DEFAULT 0,
    goals INTEGER NOT NULL DEFAULT 0,
    assists INTEGER NOT NULL DEFAULT 0,
    yellow_cards INTEGER NOT NULL DEFAULT 0,
    red_cards INTEGER NOT NULL DEFAULT 0,
    clean_sheets INTEGER NOT NULL DEFAULT 0,
    
    sum_ratings NUMERIC(10,2) NOT NULL DEFAULT 0,
    avg_rating NUMERIC(4,2) GENERATED ALWAYS AS (
        CASE WHEN games_played > 0 THEN sum_ratings / games_played ELSE 0 END
    ) STORED,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(player_id, competition_id, season)
);

-- Indexação para performance de rankings
CREATE INDEX idx_stats_ranking_goals ON public.player_competition_stats (competition_id, goals DESC);
CREATE INDEX idx_stats_ranking_assists ON public.player_competition_stats (competition_id, assists DESC);
CREATE INDEX idx_stats_ranking_rating ON public.player_competition_stats (competition_id, avg_rating DESC) WHERE games_played >= 3;

-- ── REGISTRO DE SINCRONIZAÇÃO (ANTI-DUPLICAÇÃO) ───────────────
CREATE TABLE IF NOT EXISTS public.match_sync_log (
    match_id TEXT PRIMARY KEY,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ── FUNÇÃO ATÔMICA DE PROCESSAMENTO ──────────────────────────
CREATE OR REPLACE FUNCTION public.sync_player_match_stats(
    _match_id TEXT,
    _competition_id TEXT,
    _season INTEGER,
    _player_stats JSONB -- Array de {player_id, team_id, goals, assists, rating, yellow_card, red_card, is_gk, clean_sheet}
) RETURNS VOID AS $$
DECLARE
    _stat_row RECORD;
BEGIN
    -- 1. Verificar se já foi sincronizado
    IF EXISTS (SELECT 1 FROM public.match_sync_log WHERE match_id = _match_id) THEN
        RETURN;
    END IF;

    -- 2. Processar cada jogador
    FOR _stat_row IN SELECT * FROM jsonb_to_recordset(_player_stats) AS x(
        player_id UUID, team_id UUID, goals INTEGER, assists INTEGER, 
        rating NUMERIC, yellow_card BOOLEAN, red_card INTEGER, 
        is_gk BOOLEAN, clean_sheet BOOLEAN
    ) LOOP
        INSERT INTO public.player_competition_stats (
            player_id, competition_id, season, team_id,
            games_played, goals, assists, yellow_cards, red_cards, clean_sheets, sum_ratings
        ) VALUES (
            _stat_row.player_id, _competition_id, _season, _stat_row.team_id,
            1, _stat_row.goals, _stat_row.assists, 
            CASE WHEN _stat_row.yellow_card THEN 1 ELSE 0 END,
            _stat_row.red_card,
            CASE WHEN _stat_row.is_gk AND _stat_row.clean_sheet THEN 1 ELSE 0 END,
            _stat_row.rating
        )
        ON CONFLICT (player_id, competition_id, season) DO UPDATE SET
            games_played = public.player_competition_stats.games_played + 1,
            goals = public.player_competition_stats.goals + EXCLUDED.goals,
            assists = public.player_competition_stats.assists + EXCLUDED.assists,
            yellow_cards = public.player_competition_stats.yellow_cards + EXCLUDED.yellow_cards,
            red_cards = public.player_competition_stats.red_cards + EXCLUDED.red_cards,
            clean_sheets = public.player_competition_stats.clean_sheets + EXCLUDED.clean_sheets,
            sum_ratings = public.player_competition_stats.sum_ratings + EXCLUDED.sum_ratings,
            updated_at = now();
    END LOOP;

    -- 3. Marcar partida como sincronizada
    INSERT INTO public.match_sync_log (match_id) VALUES (_match_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Habilitar RLS e permissões básicas
ALTER TABLE public.player_competition_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Estatísticas visíveis para todos" ON public.player_competition_stats FOR SELECT USING (true);

ALTER TABLE public.match_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Logs visíveis para admin" ON public.match_sync_log FOR SELECT USING (true);
