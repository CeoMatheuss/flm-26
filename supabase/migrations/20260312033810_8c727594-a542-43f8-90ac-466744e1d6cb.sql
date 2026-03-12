
-- Custom Tournaments table
CREATE TABLE public.custom_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  format text NOT NULL DEFAULT 'league', -- 'league', 'knockout', 'group_knockout'
  status text NOT NULL DEFAULT 'draft', -- 'draft', 'registration', 'in_progress', 'finished', 'cancelled'
  created_by uuid NOT NULL,
  max_teams integer NOT NULL DEFAULT 8,
  total_rounds integer NOT NULL DEFAULT 1,
  current_round integer NOT NULL DEFAULT 0,
  prize_1st bigint NOT NULL DEFAULT 0,
  prize_2nd bigint NOT NULL DEFAULT 0,
  prize_3rd bigint NOT NULL DEFAULT 0,
  match_duration_seconds integer NOT NULL DEFAULT 720,
  match_interval_hours integer NOT NULL DEFAULT 24,
  start_date timestamp with time zone,
  match_time text DEFAULT '20:00', -- HH:MM format for daily matches
  country text DEFAULT 'Brasil',
  season integer NOT NULL DEFAULT 1,
  rules_text text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tournament Teams table (real players + bots)
CREATE TABLE public.custom_tournament_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.custom_tournaments(id) ON DELETE CASCADE,
  user_id uuid, -- NULL for bot teams
  is_bot boolean NOT NULL DEFAULT false,
  bot_name text DEFAULT '',
  bot_strength integer DEFAULT 60, -- 20-99
  bot_squad jsonb DEFAULT '[]'::jsonb,
  club_name text NOT NULL DEFAULT '',
  club_logo text DEFAULT '⚽',
  points integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  goals_for integer NOT NULL DEFAULT 0,
  goals_against integer NOT NULL DEFAULT 0,
  played integer NOT NULL DEFAULT 0,
  group_letter text DEFAULT NULL, -- for group stage: 'A', 'B', etc.
  eliminated boolean NOT NULL DEFAULT false,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

-- Tournament Matches table
CREATE TABLE public.custom_tournament_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.custom_tournaments(id) ON DELETE CASCADE,
  round integer NOT NULL DEFAULT 1,
  stage text DEFAULT 'group', -- 'group', 'round_of_16', 'quarter', 'semi', 'final'
  home_team_id uuid NOT NULL REFERENCES public.custom_tournament_teams(id) ON DELETE CASCADE,
  away_team_id uuid NOT NULL REFERENCES public.custom_tournament_teams(id) ON DELETE CASCADE,
  home_goals integer,
  away_goals integer,
  match_data jsonb,
  scheduled_at timestamp with time zone,
  played_at timestamp with time zone,
  status text NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'live', 'finished'
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_tournament_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_tournaments
CREATE POLICY "Anyone authenticated can view tournaments"
  ON public.custom_tournaments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can create tournaments"
  ON public.custom_tournaments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tournaments"
  ON public.custom_tournaments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tournaments"
  ON public.custom_tournaments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for custom_tournament_teams
CREATE POLICY "Anyone authenticated can view tournament teams"
  ON public.custom_tournament_teams FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage tournament teams"
  ON public.custom_tournament_teams FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

CREATE POLICY "Admins can update tournament teams"
  ON public.custom_tournament_teams FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

CREATE POLICY "Admins can delete tournament teams"
  ON public.custom_tournament_teams FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for custom_tournament_matches
CREATE POLICY "Anyone authenticated can view tournament matches"
  ON public.custom_tournament_matches FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage tournament matches"
  ON public.custom_tournament_matches FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tournament matches"
  ON public.custom_tournament_matches FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tournament matches"
  ON public.custom_tournament_matches FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
