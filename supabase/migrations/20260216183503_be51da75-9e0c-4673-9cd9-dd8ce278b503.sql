
-- Add last_match_timestamp column to game_saves for server-side daily match enforcement
ALTER TABLE public.game_saves ADD COLUMN IF NOT EXISTS last_match_timestamp timestamp with time zone DEFAULT NULL;
