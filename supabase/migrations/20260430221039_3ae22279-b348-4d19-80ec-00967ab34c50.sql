ALTER TABLE public.league_members
  ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bot_strength integer;

-- Marca como bot todo membro cujo user_id NÃO existe em auth.users (são UUIDs sintéticos)
UPDATE public.league_members lm
SET is_bot = true,
    bot_strength = COALESCE(bot_strength, 60 + floor(random()*21)::int)
WHERE lm.is_bot = false
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = lm.user_id);

CREATE INDEX IF NOT EXISTS idx_league_members_is_bot ON public.league_members(league_id, is_bot);