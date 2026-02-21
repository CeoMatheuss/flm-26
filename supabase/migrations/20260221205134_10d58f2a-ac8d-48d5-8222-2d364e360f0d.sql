
-- Global ranking table: all clubs start at 0 points
CREATE TABLE public.global_ranking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  club_name text NOT NULL DEFAULT '',
  ranking_points integer NOT NULL DEFAULT 0,
  games_played integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  last_change integer NOT NULL DEFAULT 0,
  current_competition text NOT NULL DEFAULT 'Nenhuma',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_ranking ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view the full ranking
CREATE POLICY "Anyone authenticated can view ranking"
ON public.global_ranking FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can insert their own ranking entry
CREATE POLICY "Users can insert own ranking"
ON public.global_ranking FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own ranking
CREATE POLICY "Users can update own ranking"
ON public.global_ranking FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime for ranking updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_ranking;

-- Trigger for updated_at
CREATE TRIGGER update_global_ranking_updated_at
BEFORE UPDATE ON public.global_ranking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
