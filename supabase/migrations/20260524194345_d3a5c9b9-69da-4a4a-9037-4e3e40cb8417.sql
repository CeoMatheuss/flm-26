-- Upgrade global_ranking table
ALTER TABLE public.global_ranking 
ADD COLUMN IF NOT EXISTS prev_position INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS recent_form JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS titles_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS titles_data JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS winning_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_history JSONB DEFAULT '[]'::jsonb;

-- Create club_ranking_history table
CREATE TABLE IF NOT EXISTS public.club_ranking_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    season INTEGER NOT NULL,
    final_points INTEGER NOT NULL,
    final_position INTEGER NOT NULL,
    titles_won JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.club_ranking_history ENABLE ROW LEVEL SECURITY;

-- Policies for club_ranking_history
CREATE POLICY "Public can view ranking history" ON public.club_ranking_history
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage ranking history" ON public.club_ranking_history
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create a function to update positions (run periodically or on demand)
CREATE OR REPLACE FUNCTION public.update_ranking_positions()
RETURNS void AS $$
BEGIN
    -- Update previous position first
    UPDATE public.global_ranking SET prev_position = pos
    FROM (
        SELECT id, row_number() OVER (ORDER BY ranking_points DESC) as pos
        FROM public.global_ranking
    ) AS ranked
    WHERE public.global_ranking.id = ranked.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
