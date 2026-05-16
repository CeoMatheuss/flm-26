CREATE TABLE IF NOT EXISTS public.player_negotiations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    offered_salary INTEGER NOT NULL,
    offered_duration INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'counter_offer'
    response_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for background processing
CREATE INDEX IF NOT EXISTS idx_player_negotiations_response_at ON public.player_negotiations(response_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_player_negotiations_user_id ON public.player_negotiations(user_id);

-- Enable RLS
ALTER TABLE public.player_negotiations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own negotiations" ON public.player_negotiations
    USING (user_id = auth.uid());
