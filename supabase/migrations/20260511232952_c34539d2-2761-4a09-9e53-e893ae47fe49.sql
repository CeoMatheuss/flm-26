ALTER TABLE public.cup_player_stats 
ADD COLUMN IF NOT EXISTS avg_rating NUMERIC DEFAULT 6.0;

-- Optional: Update existing records to have a default rating if needed
UPDATE public.cup_player_stats SET avg_rating = 6.0 WHERE avg_rating IS NULL;