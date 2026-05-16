ALTER TABLE public.world_matches 
ADD COLUMN IF NOT EXISTS season_month INTEGER,
ADD COLUMN IF NOT EXISTS season_year INTEGER;

-- Atualizar dados existentes se houver
UPDATE public.world_matches 
SET 
  season_month = EXTRACT(MONTH FROM scheduled_at),
  season_year = EXTRACT(YEAR FROM scheduled_at)
WHERE season_month IS NULL;