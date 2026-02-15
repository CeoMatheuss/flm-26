
-- Multiplayer leagues
CREATE TABLE public.multiplayer_leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  max_members int NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'waiting',
  season int NOT NULL DEFAULT 1,
  current_round int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.multiplayer_leagues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view leagues" ON public.multiplayer_leagues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can insert league" ON public.multiplayer_leagues FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update league" ON public.multiplayer_leagues FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner can delete league" ON public.multiplayer_leagues FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- League members
CREATE TABLE public.league_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.multiplayer_leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  club_name text NOT NULL DEFAULT 'Meu Clube',
  club_logo text NOT NULL DEFAULT '⚽',
  points int NOT NULL DEFAULT 0,
  wins int NOT NULL DEFAULT 0,
  draws int NOT NULL DEFAULT 0,
  losses int NOT NULL DEFAULT 0,
  goals_for int NOT NULL DEFAULT 0,
  goals_against int NOT NULL DEFAULT 0,
  played int NOT NULL DEFAULT 0,
  reputation int NOT NULL DEFAULT 50,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id)
);
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view league members" ON public.league_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join leagues" ON public.league_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own member" ON public.league_members FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can leave leagues" ON public.league_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Chat messages (global per league)
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.multiplayer_leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sender_name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view chat" ON public.chat_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.league_members lm WHERE lm.league_id = chat_messages.league_id AND lm.user_id = auth.uid()));
CREATE POLICY "Members can send chat" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.league_members lm WHERE lm.league_id = chat_messages.league_id AND lm.user_id = auth.uid()));

-- Private messages
CREATE TABLE public.private_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.multiplayer_leagues(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  sender_name text NOT NULL,
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own private messages" ON public.private_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send private messages" ON public.private_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receiver can update read status" ON public.private_messages FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id);

-- Trade proposals
CREATE TABLE public.trade_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.multiplayer_leagues(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  sender_name text NOT NULL,
  proposal_type text NOT NULL DEFAULT 'transfer',
  player_name text NOT NULL,
  player_data jsonb,
  price bigint NOT NULL DEFAULT 0,
  loan_duration int,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.trade_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proposals" ON public.trade_proposals FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send proposals" ON public.trade_proposals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receiver can update proposals" ON public.trade_proposals FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id);
CREATE POLICY "Sender can delete proposals" ON public.trade_proposals FOR DELETE TO authenticated
  USING (auth.uid() = sender_id AND status = 'pending');

-- Rivalries
CREATE TABLE public.rivalries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.multiplayer_leagues(id) ON DELETE CASCADE,
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  matches_played int NOT NULL DEFAULT 0,
  user_a_wins int NOT NULL DEFAULT 0,
  user_b_wins int NOT NULL DEFAULT 0,
  draws int NOT NULL DEFAULT 0,
  intensity text NOT NULL DEFAULT 'neutral',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_a, user_b)
);
ALTER TABLE public.rivalries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view rivalries" ON public.rivalries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.league_members lm WHERE lm.league_id = rivalries.league_id AND lm.user_id = auth.uid()));
CREATE POLICY "System can manage rivalries" ON public.rivalries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "System can update rivalries" ON public.rivalries FOR UPDATE TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.league_members;
