
-- Tabela para salvar notícias do jornal com persistência
CREATE TABLE public.newspaper_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  narration TEXT,
  is_event BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.newspaper_entries ENABLE ROW LEVEL SECURITY;

-- Users can view own newspaper entries
CREATE POLICY "Users can view own newspaper entries"
ON public.newspaper_entries FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert own newspaper entries
CREATE POLICY "Users can insert own newspaper entries"
ON public.newspaper_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete own newspaper entries
CREATE POLICY "Users can delete own newspaper entries"
ON public.newspaper_entries FOR DELETE
USING (auth.uid() = user_id);

-- Index for efficient querying
CREATE INDEX idx_newspaper_entries_user_created ON public.newspaper_entries (user_id, created_at DESC);
