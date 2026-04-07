
-- Add tutorial_completed to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tutorial_completed boolean NOT NULL DEFAULT false;

-- Create player_missions table
CREATE TABLE public.player_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  target_value integer NOT NULL DEFAULT 1,
  reward_amount bigint NOT NULL DEFAULT 50000,
  category text NOT NULL DEFAULT 'general',
  icon text NOT NULL DEFAULT '🎯',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.player_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view missions"
  ON public.player_missions FOR SELECT
  TO authenticated
  USING (true);

-- Create mission_progress table
CREATE TABLE public.mission_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mission_id uuid NOT NULL REFERENCES public.player_missions(id) ON DELETE CASCADE,
  current_value integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_id)
);

ALTER TABLE public.mission_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON public.mission_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.mission_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.mission_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Seed initial missions
INSERT INTO public.player_missions (title, description, target_value, reward_amount, category, icon) VALUES
  ('Primeiro Passo', 'Complete o tutorial do jogo', 1, 100000, 'tutorial', '📖'),
  ('Goleador', 'Marque 10 gols em partidas', 10, 200000, 'match', '⚽'),
  ('Invicto', 'Vença 5 partidas seguidas', 5, 300000, 'match', '🔥'),
  ('Negociador', 'Contrate 3 jogadores no mercado', 3, 150000, 'market', '🤝'),
  ('Construtor', 'Faça 5 upgrades na infraestrutura', 5, 250000, 'infra', '🏗️'),
  ('Treinador', 'Complete 10 sessões de treino', 10, 200000, 'training', '🏋️'),
  ('Estrategista', 'Vença 3 partidas com formações diferentes', 3, 150000, 'tactics', '📐'),
  ('Popular', 'Alcance 50.000 torcedores', 1, 500000, 'fans', '👥');
