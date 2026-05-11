CREATE TABLE IF NOT EXISTS public.cup_player_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cup_id UUID REFERENCES public.national_cups(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.world_players(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.world_teams(id) ON DELETE CASCADE,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    matches_played INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(cup_id, player_id)
);

ALTER TABLE public.cup_player_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cup player stats are viewable by everyone" ON public.cup_player_stats FOR SELECT USING (true);
