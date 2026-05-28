-- CUSTOM TYPES
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TYPE public.world_league_status AS ENUM ('pending', 'in_progress', 'finished');

CREATE TYPE public.world_match_status AS ENUM ('scheduled', 'live', 'finished', 'postponed');

CREATE TYPE public.world_competition_status AS ENUM ('locked', 'pending', 'in_progress', 'finished');

CREATE TYPE scout_level AS ENUM ('baixo', 'médio', 'alto', 'elite');

CREATE TYPE scout_specialization AS ENUM ('ataque', 'defesa', 'meio', 'jovens', 'geral');

CREATE TYPE mission_type AS ENUM ('local', 'global', 'posição', 'promessas');

CREATE TYPE mission_status AS ENUM ('em_andamento', 'concluída', 'cancelada');

CREATE TYPE public.card_type AS ENUM ('yellow', 'red');

CREATE TYPE squad_status_type AS ENUM ('starter', 'bench', 'reserve', 'injured', 'suspended');

CREATE TYPE squad_status_type AS ENUM ('starter', 'bench', 'reserve', 'injured', 'suspended');

CREATE TYPE tournament_type AS ENUM ('world_cup', 'continental', 'national');

-- ==================== TABLE: public.chat_messages ====================
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

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;



-- ==================== TABLE: public.clubs ====================
-- Create clubs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.clubs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'Brasil',
    stadium_name TEXT DEFAULT 'Estádio Municipal',
    primary_color TEXT DEFAULT '#2563EB',
    secondary_color TEXT DEFAULT '#FFFFFF',
    detail_color TEXT DEFAULT '#DC2626',
    logo_url TEXT,
    fans INTEGER DEFAULT 1000,
    reputation INTEGER DEFAULT 65,
    budget BIGINT DEFAULT 1000000,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS for clubs
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Policies for clubs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own club') THEN
        CREATE POLICY "Users can view their own club" ON public.clubs FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own club') THEN
        CREATE POLICY "Users can insert their own club" ON public.clubs FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own club') THEN
        CREATE POLICY "Users can update their own club" ON public.clubs FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

ALTER TABLE public.clubs
ADD COLUMN shield_config JSONB;

-- Add premium currency to clubs
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS cash BIGINT DEFAULT 0;

-- Add column to track youth generation cycle
ALTER TABLE public.clubs 
ADD COLUMN last_youth_generation_at TIMESTAMP WITH TIME ZONE;

-- Ensure last_youth_generation_at exists in clubs
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clubs' AND column_name = 'last_youth_generation_at') THEN
        ALTER TABLE public.clubs ADD COLUMN last_youth_generation_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;

-- Adicionar coluna na tabela de clubes para rastrear o uniforme atual
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS current_uniform_launch_id UUID REFERENCES public.club_uniform_launches(id) ON DELETE SET NULL;

-- Adicionar contador de lançamentos disponíveis
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS uniform_launches_available INTEGER DEFAULT 0;

-- Garantir que a reputação do clube também exista (se não houver)
ALTER TABLE public.clubs
ADD COLUMN IF NOT EXISTS reputation INTEGER DEFAULT 50;

-- Add bankruptcy tracking columns to clubs
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS bankrupt_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS consecutive_negative_days INTEGER DEFAULT 0;

-- Garantir que a tabela clubs tenha a coluna total_members para sincronização rápida
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'clubs' AND COLUMN_NAME = 'total_members') THEN
        ALTER TABLE public.clubs ADD COLUMN total_members INTEGER DEFAULT 0;
    END IF;
END $$;



-- ==================== TABLE: public.league_members ====================
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

ALTER PUBLICATION supabase_realtime ADD TABLE public.league_members;

CREATE POLICY "Members can view league members"
ON public.league_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.league_members lm
    WHERE lm.league_id = league_members.league_id
    AND lm.user_id = auth.uid()
  )
);

-- Add budget column to league_members for persistent online finance
ALTER TABLE public.league_members ADD COLUMN IF NOT EXISTS budget BIGINT NOT NULL DEFAULT 5000000;

ALTER TABLE public.league_members
  ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bot_strength integer;

ALTER TABLE public.league_members ALTER COLUMN user_id DROP NOT NULL;

-- Add country column to league_members if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'league_members' AND column_name = 'country') THEN
        ALTER TABLE public.league_members ADD COLUMN country TEXT DEFAULT 'Brasil';
    END IF;
END $$;



-- ==================== TABLE: public.match_history ====================
-- Create match_history table to permanently store all matches
CREATE TABLE public.match_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  match_type text NOT NULL DEFAULT 'friendly', -- 'friendly', 'league', 'cup'
  competition text NOT NULL DEFAULT 'Amistoso',
  home_team text NOT NULL,
  away_team text NOT NULL,
  home_goals integer NOT NULL DEFAULT 0,
  away_goals integer NOT NULL DEFAULT 0,
  is_home boolean NOT NULL DEFAULT true,
  stadium_name text NOT NULL DEFAULT 'Estádio',
  stadium_capacity integer NOT NULL DEFAULT 5000,
  played_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Replay data (events in order)
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Post-match report
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  player_ratings jsonb NOT NULL DEFAULT '{}'::jsonb,
  home_players jsonb NOT NULL DEFAULT '[]'::jsonb,
  goal_scorers jsonb NOT NULL DEFAULT '[]'::jsonb,
  man_of_the_match text,
  
  -- Reference to live_match
  live_match_id uuid,
  
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own match history
CREATE POLICY "Users can view own match history"
  ON public.match_history FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own match history
CREATE POLICY "Users can insert own match history"
  ON public.match_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.match_history ALTER COLUMN stadium_name SET DEFAULT 'Estádio';

-- 4) match_history extras
ALTER TABLE public.match_history
  ADD COLUMN IF NOT EXISTS narrative_id uuid REFERENCES public.match_narratives(id),
  ADD COLUMN IF NOT EXISTS event_diversity_score numeric,
  ADD COLUMN IF NOT EXISTS man_of_the_match jsonb;



-- ==================== TABLE: public.multiplayer_leagues ====================
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

-- Add season_status to multiplayer_leagues
ALTER TABLE public.multiplayer_leagues ADD COLUMN IF NOT EXISTS season_status TEXT NOT NULL DEFAULT 'registration';

-- Add country column to multiplayer_leagues
ALTER TABLE public.multiplayer_leagues ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'Brasil';

-- Add region column for auto-created leagues naming
ALTER TABLE public.multiplayer_leagues ADD COLUMN IF NOT EXISTS auto_created boolean NOT NULL DEFAULT false;

-- Add season scheduling and league type fields
ALTER TABLE public.multiplayer_leagues 
  ADD COLUMN IF NOT EXISTS league_type text NOT NULL DEFAULT 'main',
  ADD COLUMN IF NOT EXISTS season_start timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS season_end timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_rounds integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS round_interval_hours integer NOT NULL DEFAULT 24;

-- Add division column to multiplayer_leagues
ALTER TABLE public.multiplayer_leagues ADD COLUMN division INTEGER DEFAULT 1;

-- =============================================
-- 1. Adicionar colunas em multiplayer_leagues
-- =============================================
ALTER TABLE public.multiplayer_leagues
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'nacional',
  ADD COLUMN IF NOT EXISTS tier_level INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS season_month INT,
  ADD COLUMN IF NOT EXISTS season_year INT,
  ADD COLUMN IF NOT EXISTS match_time TEXT DEFAULT '20:00';

-- 1. Ensure exactly 16 teams rule
ALTER TABLE public.multiplayer_leagues 
ADD COLUMN IF NOT EXISTS division_level INTEGER DEFAULT 1,
ALTER COLUMN max_members SET DEFAULT 16;

-- Add prizes_paid column to multiplayer_leagues if it doesn't exist
ALTER TABLE public.multiplayer_leagues ADD COLUMN IF NOT EXISTS prizes_paid BOOLEAN DEFAULT FALSE;



-- ==================== TABLE: public.profiles ====================
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Allow all authenticated users to search profiles by display_name
CREATE POLICY "Authenticated users can search profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add tutorial_completed to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tutorial_completed boolean NOT NULL DEFAULT false;

-- Add last_training_processed_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_training_processed_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2) profiles: viewed_awards_season
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS viewed_awards_season INTEGER;

-- Add tracking to profiles for daily bonus processing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_daily_shop_bonus_at TIMESTAMP WITH TIME ZONE;

-- Adicionar campos de timestamp para controle offline no perfil do usuário
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_online_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_offline_processed_at TIMESTAMP WITH TIME ZONE DEFAULT now();



-- ==================== TABLE: public.trade_proposals ====================
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

ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_proposals;

CREATE POLICY "Users can send proposals"
  ON public.trade_proposals FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM league_members lm
      WHERE lm.league_id = trade_proposals.league_id AND lm.user_id = auth.uid()
    )
  );



-- ==================== TABLE: public.world_matches ====================
-- ───────────── world_matches (calendário) ─────────────
CREATE TABLE IF NOT EXISTS public.world_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.world_leagues(id) ON DELETE CASCADE,
  season int NOT NULL,
  matchday int NOT NULL CHECK (matchday BETWEEN 1 AND 30),
  home_team_id uuid NOT NULL REFERENCES public.world_league_teams(id) ON DELETE CASCADE,
  away_team_id uuid NOT NULL REFERENCES public.world_league_teams(id) ON DELETE CASCADE,
  kickoff_at timestamptz NOT NULL,
  home_goals int,
  away_goals int,
  status public.world_match_status NOT NULL DEFAULT 'scheduled',
  match_data jsonb,
  played_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (home_team_id <> away_team_id)
);

ALTER TABLE public.world_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "world_matches_select_all" ON public.world_matches FOR SELECT USING (true);

CREATE POLICY "world_matches_admin_all" ON public.world_matches FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. UNIQUE CONSTRAINT
ALTER TABLE public.world_matches DROP CONSTRAINT IF EXISTS world_matches_unique_round;

ALTER TABLE public.world_matches ADD CONSTRAINT world_matches_unique_round UNIQUE (home_team_id, away_team_id, matchday);

-- 5. Add unique constraint (correct column is matchday)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_match_per_matchday'
    ) THEN
        ALTER TABLE public.world_matches 
        ADD CONSTRAINT unique_match_per_matchday UNIQUE (home_team_id, away_team_id, matchday);
    END IF;
END $$;

-- 4. UNIQUE CONSTRAINT REINFORCEMENT
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'world_matches_unique_fixture') THEN
        ALTER TABLE public.world_matches ADD CONSTRAINT world_matches_unique_fixture UNIQUE (league_id, matchday, home_team_id, away_team_id);
    END IF;
END $$;

CREATE TABLE public.world_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    division_id UUID REFERENCES public.world_divisions(id) ON DELETE CASCADE,
    home_team_id UUID REFERENCES public.world_teams(id) ON DELETE CASCADE,
    away_team_id UUID REFERENCES public.world_teams(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_sim_at TIMESTAMP WITH TIME ZONE NOT NULL, -- scheduled_at + 5 minutes
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'live', 'finished'
    home_goals INTEGER DEFAULT 0,
    away_goals INTEGER DEFAULT 0,
    match_data JSONB DEFAULT '{}'::jsonb,
    played_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT unique_match_teams UNIQUE (division_id, round, home_team_id, away_team_id)
);

ALTER TABLE public.world_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Matches" ON public.world_matches FOR SELECT USING (true);

CREATE TABLE public.world_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID REFERENCES public.world_leagues(id),
    home_team_id UUID REFERENCES public.world_teams(id),
    away_team_id UUID REFERENCES public.world_teams(id),
    round INTEGER NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished')),
    home_goals INTEGER DEFAULT 0,
    away_goals INTEGER DEFAULT 0,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    played_at TIMESTAMP WITH TIME ZONE,
    match_data JSONB,
    season_month INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.world_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read" ON public.world_matches FOR SELECT USING (true);

CREATE TABLE public.world_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID REFERENCES public.world_leagues(id),
    home_team_id UUID REFERENCES public.world_teams(id),
    away_team_id UUID REFERENCES public.world_teams(id),
    round INTEGER NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished')),
    home_goals INTEGER DEFAULT 0,
    away_goals INTEGER DEFAULT 0,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    played_at TIMESTAMP WITH TIME ZONE,
    match_data JSONB,
    season_month INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.world_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read" ON public.world_matches FOR SELECT USING (true);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.world_matches;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'world_matches' AND column_name = 'game_state') THEN
        ALTER TABLE public.world_matches ADD COLUMN game_state JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

ALTER TABLE public.world_matches ADD COLUMN IF NOT EXISTS stadium TEXT;

ALTER TABLE public.world_matches REPLICA IDENTITY FULL;

ALTER TABLE public.world_matches 
ADD COLUMN IF NOT EXISTS season_month INTEGER,
ADD COLUMN IF NOT EXISTS season_year INTEGER;

-- Add synced column to match tables
ALTER TABLE public.world_matches ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT false;

-- Add flags to world_matches if not present
ALTER TABLE public.world_matches ADD COLUMN IF NOT EXISTS simulated BOOLEAN DEFAULT false;

-- 3. Adicionar colunas de controle em world_matches
ALTER TABLE public.world_matches 
ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS match_data JSONB DEFAULT '{}'::jsonb;

-- Add control column for auto-simulation timeout in world_matches
ALTER TABLE public.world_matches ADD COLUMN IF NOT EXISTS auto_sim_at TIMESTAMP WITH TIME ZONE;



-- ==================== TABLE: public.world_players ====================
-- Create world_players table
CREATE TABLE IF NOT EXISTS public.world_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.world_teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position TEXT NOT NULL, -- GK, DF, MF, FW
    overall INTEGER DEFAULT 60,
    age INTEGER DEFAULT 25,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.world_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read world players" ON public.world_players FOR SELECT USING (true);

-- Update live_matches to ensure we can store the new fields in the events JSONB array if needed,
-- but since events is already JSONB, we just need to ensure the simulation and persistence logic handles them.

-- Add persistent injury columns to world_players (if not already present via previous features)
-- These allow injuries to persist across sessions and influence simulation.
ALTER TABLE public.world_players 
ADD COLUMN IF NOT EXISTS injury_type TEXT,
ADD COLUMN IF NOT EXISTS injury_severity TEXT,
ADD COLUMN IF NOT EXISTS injury_weeks_remaining INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS injury_body_part TEXT,
ADD COLUMN IF NOT EXISTS injury_is_relapse BOOLEAN DEFAULT false;

-- Add squad_status column to world_players
ALTER TABLE public.world_players 
ADD COLUMN IF NOT EXISTS squad_status squad_status_type DEFAULT 'reserve';

-- 2. Update world_players to ensure squad_status is consistent
ALTER TABLE public.world_players 
ADD COLUMN IF NOT EXISTS squad_status squad_status_type DEFAULT 'reserve';

-- Adicionar colunas necessárias para o sistema de valor de mercado na tabela world_players
ALTER TABLE public.world_players 
ADD COLUMN IF NOT EXISTS market_value BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS potential INTEGER DEFAULT 70,
ADD COLUMN IF NOT EXISTS market_value_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS evolution_trend TEXT DEFAULT 'stable', -- 'up', 'stable', 'down'
ADD COLUMN IF NOT EXISTS reputation INTEGER DEFAULT 50, -- 0-100
ADD COLUMN IF NOT EXISTS salary BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;

-- Adicionar stamina e morale como colunas reais para performance e precisão
ALTER TABLE public.world_players 
ADD COLUMN IF NOT EXISTS stamina INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS morale INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS last_stamina_recovery TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Garantir que stamina não saia do range 0-100
ALTER TABLE public.world_players 
ADD CONSTRAINT world_players_stamina_check CHECK (stamina >= 0 AND stamina <= 100);

ALTER TABLE public.world_players ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Brasil';

ALTER TABLE public.world_players ADD COLUMN IF NOT EXISTS stamina_max INTEGER DEFAULT 100;

ALTER TABLE public.world_players ADD COLUMN IF NOT EXISTS resistance INTEGER DEFAULT 50;

-- Ajusta políticas da tabela world_players para permitir gestão do elenco pelo dono do clube
CREATE POLICY "Owners can manage their players" ON public.world_players
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.world_teams
    WHERE world_teams.id = world_players.team_id
    AND world_teams.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.world_teams
    WHERE world_teams.id = world_players.team_id
    AND world_teams.user_id = auth.uid()
  )
);

GRANT ALL ON public.world_players TO authenticated;



-- ==================== TABLE: public.world_teams ====================
CREATE TABLE public.world_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    division_id UUID REFERENCES public.world_divisions(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    logo TEXT,
    is_bot BOOLEAN DEFAULT true,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    strength INTEGER DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.world_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Teams" ON public.world_teams FOR SELECT USING (true);

CREATE TABLE public.world_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    league_id UUID REFERENCES public.world_leagues(id),
    name TEXT NOT NULL,
    logo TEXT,
    is_bot BOOLEAN DEFAULT false,
    strength INTEGER DEFAULT 70,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

ALTER TABLE public.world_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read" ON public.world_teams FOR SELECT USING (true);

CREATE TABLE public.world_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    league_id UUID REFERENCES public.world_leagues(id),
    name TEXT NOT NULL,
    logo TEXT,
    is_bot BOOLEAN DEFAULT false,
    strength INTEGER DEFAULT 70,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

ALTER TABLE public.world_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read" ON public.world_teams FOR SELECT USING (true);

-- Add country column to world_teams if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'world_teams' AND column_name = 'country') THEN
        ALTER TABLE public.world_teams ADD COLUMN country TEXT DEFAULT 'Brasil';
    END IF;
END $$;

-- Ajusta políticas da tabela world_teams para permitir takeover de bots
CREATE POLICY "Users can takeover bots" ON public.world_teams
FOR UPDATE
TO authenticated
USING (is_bot = true OR auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own world team" ON public.world_teams
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Garantir GRANTs necessários
GRANT ALL ON public.world_teams TO authenticated;



