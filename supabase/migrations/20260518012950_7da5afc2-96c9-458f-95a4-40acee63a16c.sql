-- World Sync Engine Migration

-- 1. Tabela de Estado de Sincronização (Source of Truth)
CREATE TABLE IF NOT EXISTS public.world_sync_state (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_round INT DEFAULT 1,
    squad_checksum TEXT, -- Hash do elenco atual
    standings_checksum TEXT, -- Hash da tabela
    last_sync_at TIMESTAMPTZ DEFAULT now(),
    sync_version BIGINT DEFAULT 1,
    is_locked BOOLEAN DEFAULT false, -- Global lock para operações críticas
    locked_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Fila Global de Eventos (Idempotência e Prevenção de Duplicação)
CREATE TABLE IF NOT EXISTS public.world_event_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    event_hash TEXT UNIQUE NOT NULL, -- Impede reprocessamento do mesmo evento
    processed_at TIMESTAMPTZ DEFAULT now(),
    match_id UUID,
    round INT
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_world_event_queue_user_hash ON public.world_event_queue(user_id, event_hash);
CREATE INDEX IF NOT EXISTS idx_world_event_queue_match ON public.world_event_queue(match_id);

-- 4. Habilitar RLS
ALTER TABLE public.world_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_event_queue ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de RLS
CREATE POLICY "Users can manage their own sync state" 
ON public.world_sync_state FOR ALL TO authenticated 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own event queue" 
ON public.world_event_queue FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own event queue" 
ON public.world_event_queue FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 6. Função para calcular Checksums de Integridade (Security Definer)
CREATE OR REPLACE FUNCTION public.get_world_integrity_checksums(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _squad_hash TEXT;
    _standings_hash TEXT;
    _team_id UUID;
BEGIN
    SELECT id INTO _team_id FROM public.world_teams WHERE user_id = _user_id;
    
    -- Checksum do Elenco (IDs + OVR + Status)
    SELECT md5(string_agg(id::text || ovr::text || status, ',' ORDER BY id))
    INTO _squad_hash
    FROM public.world_players
    WHERE team_id = _team_id;

    -- Checksum da Tabela (Pontos + Jogos + Gols)
    SELECT md5(string_agg(team_id::text || points::text || played::text || goals_for::text, ',' ORDER BY points DESC, goals_diff DESC))
    INTO _standings_hash
    FROM public.world_league_standings
    WHERE league_id = (SELECT league_id FROM public.league_members WHERE user_id = _user_id LIMIT 1);

    RETURN jsonb_build_object(
        'squad_checksum', COALESCE(_squad_hash, 'empty'),
        'standings_checksum', COALESCE(_standings_hash, 'empty'),
        'timestamp', now()
    );
END;
$$;

-- 7. RPC para Processamento Atômico de Eventos (Prevenção de Race Conditions)
CREATE OR REPLACE FUNCTION public.push_world_sync_event(
    _event_type TEXT,
    _payload JSONB,
    _event_hash TEXT,
    _match_id UUID DEFAULT NULL,
    _round INT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Se o hash já existe, ignora (idempotência)
    IF EXISTS (SELECT 1 FROM public.world_event_queue WHERE event_hash = _event_hash AND user_id = auth.uid()) THEN
        RETURN FALSE;
    END IF;

    -- Tenta adquirir lock no estado de sincronização
    UPDATE public.world_sync_state 
    SET is_locked = true, 
        locked_at = now()
    WHERE user_id = auth.uid() 
      AND (is_locked = false OR locked_at < now() - interval '1 minute');

    -- Insere na fila
    INSERT INTO public.world_event_queue (user_id, event_type, payload, event_hash, match_id, round)
    VALUES (auth.uid(), _event_type, _payload, _event_hash, _match_id, _round);

    -- Libera lock e atualiza versão
    UPDATE public.world_sync_state 
    SET is_locked = false, 
        sync_version = sync_version + 1,
        last_sync_at = now()
    WHERE user_id = auth.uid();

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    -- Garante liberação do lock em erro
    UPDATE public.world_sync_state SET is_locked = false WHERE user_id = auth.uid();
    RAISE;
END;
$$;

-- 8. Trigger para inicializar world_sync_state ao criar time
CREATE OR REPLACE FUNCTION public.init_world_sync_state()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.world_sync_state (user_id) VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_init_world_sync ON public.world_teams;
CREATE TRIGGER tr_init_world_sync
AFTER INSERT ON public.world_teams
FOR EACH ROW EXECUTE FUNCTION public.init_world_sync_state();
