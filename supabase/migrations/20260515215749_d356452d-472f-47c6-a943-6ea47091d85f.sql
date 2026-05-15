-- Add missing columns to youth_prospects for the new redesign
ALTER TABLE public.youth_prospects 
ADD COLUMN IF NOT EXISTS height INTEGER,
ADD COLUMN IF NOT EXISTS weight INTEGER,
ADD COLUMN IF NOT EXISTS secondary_positions TEXT[],
ADD COLUMN IF NOT EXISTS evolution_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS training_intensity TEXT DEFAULT 'moderado',
ADD COLUMN IF NOT EXISTS training_focus TEXT DEFAULT 'geral',
ADD COLUMN IF NOT EXISTS fatigue INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS energy INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS tactical_iq INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS stamina_stat INTEGER DEFAULT 50, -- Renamed to avoid conflict with Player.stamina if needed, but let's use stamina_stat for the attribute
ADD COLUMN IF NOT EXISTS interception INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS contract_status TEXT DEFAULT 'base', -- 'base', 'observado', 'pre-profissional', 'profissional'
ADD COLUMN IF NOT EXISTS player_expectation TEXT DEFAULT 'evoluir';

-- Ensure last_youth_generation_at exists in clubs
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clubs' AND column_name = 'last_youth_generation_at') THEN
        ALTER TABLE public.clubs ADD COLUMN last_youth_generation_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_youth_prospects_club_id ON public.youth_prospects(club_id);
