-- Histórico de evolução de atributos por treino (auditoria)
CREATE TABLE IF NOT EXISTS public.player_training_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  attribute TEXT NOT NULL,
  old_value NUMERIC NOT NULL,
  new_value NUMERIC NOT NULL,
  delta NUMERIC GENERATED ALWAYS AS (new_value - old_value) STORED,
  week INTEGER,
  season INTEGER,
  focus TEXT,
  intensity TEXT,
  ct_level INTEGER,
  premium_boost BOOLEAN NOT NULL DEFAULT false,
  age INTEGER,
  stamina INTEGER,
  source TEXT NOT NULL DEFAULT 'training',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pth_user_created ON public.player_training_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pth_user_player ON public.player_training_history (user_id, player_id, created_at DESC);

ALTER TABLE public.player_training_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own training history" ON public.player_training_history;
CREATE POLICY "users read own training history"
ON public.player_training_history
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users insert own training history" ON public.player_training_history;
CREATE POLICY "users insert own training history"
ON public.player_training_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);
