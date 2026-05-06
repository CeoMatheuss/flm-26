-- Ensure RLS is enabled and policies exist
DO $$
BEGIN
    -- League Matches
    ALTER TABLE public.league_matches ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'league_matches' AND policyname = 'League matches are viewable by everyone') THEN
        CREATE POLICY "League matches are viewable by everyone" ON public.league_matches FOR SELECT USING (true);
    END IF;

    -- World League Teams
    ALTER TABLE public.world_league_teams ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'world_league_teams' AND policyname = 'World league teams are viewable by everyone') THEN
        CREATE POLICY "World league teams are viewable by everyone" ON public.world_league_teams FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'world_league_teams' AND policyname = 'Users can join a league (insert team)') THEN
        CREATE POLICY "Users can join a league (insert team)" ON public.world_league_teams FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Ensure Foreign Keys for Edge Function joins
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'league_matches_home_team_id_fkey') THEN
        ALTER TABLE public.league_matches ADD CONSTRAINT league_matches_home_team_id_fkey FOREIGN KEY (home_team_id) REFERENCES public.world_league_teams(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'league_matches_away_team_id_fkey') THEN
        ALTER TABLE public.league_matches ADD CONSTRAINT league_matches_away_team_id_fkey FOREIGN KEY (away_team_id) REFERENCES public.world_league_teams(id) ON DELETE CASCADE;
    END IF;
END $$;
