
-- Table for game bans (different from chat bans - this bans from the entire game)
CREATE TABLE public.game_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  banned_by UUID NOT NULL,
  reason TEXT DEFAULT '',
  duration_months INTEGER NOT NULL DEFAULT 1,
  banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.game_bans ENABLE ROW LEVEL SECURITY;

-- Only admins can manage game bans
CREATE POLICY "Admins can view game bans"
ON public.game_bans FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert game bans"
ON public.game_bans FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete game bans"
ON public.game_bans FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can check if they are banned
CREATE POLICY "Users can check own ban"
ON public.game_bans FOR SELECT
USING (auth.uid() = user_id);

CREATE INDEX idx_game_bans_user ON public.game_bans (user_id, expires_at DESC);
