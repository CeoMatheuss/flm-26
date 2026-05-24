-- Expand tournament types to include continental competitions
ALTER TYPE tournament_type ADD VALUE IF NOT EXISTS 'continental';

-- Table to track rounds in a tournament (Group Stage, 16ths, 8ths, etc.)
CREATE TABLE IF NOT EXISTS public.tournament_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- '16 avos', 'Oitavas', 'Quartas', 'Semi', 'Final'
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed'
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tournament_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tournament rounds are viewable by everyone" ON public.tournament_rounds FOR SELECT USING (true);

-- Add continent to tournaments if it doesn't exist (useful for filtering)
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS continent TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_tournament_rounds_tournament ON public.tournament_rounds(tournament_id);
