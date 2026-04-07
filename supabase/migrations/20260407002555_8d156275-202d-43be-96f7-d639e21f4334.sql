
-- Daily training sessions
CREATE TABLE public.daily_training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  player_id TEXT NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_slot INTEGER NOT NULL DEFAULT 1,
  training_type TEXT NOT NULL DEFAULT 'tecnico',
  focus TEXT NOT NULL DEFAULT 'equilibrado',
  intensity TEXT NOT NULL DEFAULT 'moderado',
  dev_points_earned INTEGER NOT NULL DEFAULT 0,
  fatigue_generated INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, player_id, session_date, session_slot)
);

ALTER TABLE public.daily_training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.daily_training_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.daily_training_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.daily_training_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.daily_training_sessions FOR DELETE USING (auth.uid() = user_id);

-- Player development points
CREATE TABLE public.player_development_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  player_id TEXT NOT NULL,
  attribute TEXT NOT NULL,
  accumulated_points INTEGER NOT NULL DEFAULT 0,
  threshold INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, player_id, attribute)
);

ALTER TABLE public.player_development_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dev points" ON public.player_development_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dev points" ON public.player_development_points FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own dev points" ON public.player_development_points FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own dev points" ON public.player_development_points FOR DELETE USING (auth.uid() = user_id);

-- Add last_training_processed_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_training_processed_at TIMESTAMP WITH TIME ZONE DEFAULT now();
