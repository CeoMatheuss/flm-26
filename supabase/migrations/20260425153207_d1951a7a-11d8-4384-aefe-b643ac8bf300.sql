-- ============================================================
-- ETAPA 1: SCHEMA BASE DO SISTEMA GLOBAL DE FUTEBOL
-- ============================================================

-- ───────────── ENUMS ─────────────
DO $$ BEGIN
  CREATE TYPE public.world_league_status AS ENUM ('pending', 'in_progress', 'finished');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.world_match_status AS ENUM ('scheduled', 'live', 'finished', 'postponed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.world_competition_status AS ENUM ('locked', 'pending', 'in_progress', 'finished');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ───────────── world_leagues ─────────────
CREATE TABLE IF NOT EXISTS public.world_leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  flag_emoji text NOT NULL DEFAULT '🏳️',
  division int NOT NULL CHECK (division BETWEEN 1 AND 4),
  league_name text NOT NULL,
  kickoff_hour int NOT NULL CHECK (kickoff_hour BETWEEN 12 AND 22),
  season int NOT NULL DEFAULT 1,
  current_matchday int NOT NULL DEFAULT 0,
  total_matchdays int NOT NULL DEFAULT 30,
  total_slots int NOT NULL DEFAULT 20,
  status public.world_league_status NOT NULL DEFAULT 'pending',
  season_started_at timestamptz,
  season_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country, division, season)
);
CREATE INDEX IF NOT EXISTS idx_world_leagues_country ON public.world_leagues(country);
CREATE INDEX IF NOT EXISTS idx_world_leagues_status ON public.world_leagues(status);

-- ───────────── world_league_teams ─────────────
CREATE TABLE IF NOT EXISTS public.world_league_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.world_leagues(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_bot boolean NOT NULL DEFAULT true,
  bot_strength int CHECK (bot_strength BETWEEN 30 AND 95),
  club_name text NOT NULL,
  club_logo text DEFAULT '⚽',
  shield jsonb,
  points int NOT NULL DEFAULT 0,
  wins int NOT NULL DEFAULT 0,
  draws int NOT NULL DEFAULT 0,
  losses int NOT NULL DEFAULT 0,
  goals_for int NOT NULL DEFAULT 0,
  goals_against int NOT NULL DEFAULT 0,
  played int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (league_id, club_name)
);
CREATE INDEX IF NOT EXISTS idx_wlt_league ON public.world_league_teams(league_id);
CREATE INDEX IF NOT EXISTS idx_wlt_user ON public.world_league_teams(user_id) WHERE user_id IS NOT NULL;

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
CREATE INDEX IF NOT EXISTS idx_wm_league_season ON public.world_matches(league_id, season);
CREATE INDEX IF NOT EXISTS idx_wm_kickoff ON public.world_matches(kickoff_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_wm_status ON public.world_matches(status);

-- ───────────── world_cups (copas nacionais) ─────────────
CREATE TABLE IF NOT EXISTS public.world_cups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  flag_emoji text DEFAULT '🏳️',
  cup_name text NOT NULL,
  season int NOT NULL DEFAULT 1,
  status public.world_competition_status NOT NULL DEFAULT 'pending',
  starts_on_matchday int NOT NULL DEFAULT 10,
  current_round int NOT NULL DEFAULT 0,
  champion_team_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country, season)
);

CREATE TABLE IF NOT EXISTS public.world_cup_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cup_id uuid NOT NULL REFERENCES public.world_cups(id) ON DELETE CASCADE,
  round int NOT NULL,
  stage text,
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
CREATE INDEX IF NOT EXISTS idx_wcm_cup ON public.world_cup_matches(cup_id);
CREATE INDEX IF NOT EXISTS idx_wcm_kickoff ON public.world_cup_matches(kickoff_at) WHERE status = 'scheduled';

-- ───────────── international_competitions ─────────────
CREATE TABLE IF NOT EXISTS public.international_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  continent text NOT NULL,
  competition_name text NOT NULL,
  emoji text DEFAULT '🌍',
  season int NOT NULL DEFAULT 1,
  status public.world_competition_status NOT NULL DEFAULT 'locked',
  unlocks_in_season int NOT NULL DEFAULT 2,
  current_round int NOT NULL DEFAULT 0,
  champion_team_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (continent, season)
);

CREATE TABLE IF NOT EXISTS public.international_competition_clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.international_competitions(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.world_league_teams(id) ON DELETE CASCADE,
  group_label text,
  group_position int,
  eliminated boolean NOT NULL DEFAULT false,
  UNIQUE (competition_id, team_id)
);

CREATE TABLE IF NOT EXISTS public.international_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.international_competitions(id) ON DELETE CASCADE,
  round int NOT NULL,
  stage text,
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
CREATE INDEX IF NOT EXISTS idx_im_kickoff ON public.international_matches(kickoff_at) WHERE status = 'scheduled';

-- ───────────── world_cup_tournament (Mundial de Clubes) ─────────────
CREATE TABLE IF NOT EXISTS public.world_cup_tournament (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition int NOT NULL,
  season int NOT NULL DEFAULT 1,
  status public.world_competition_status NOT NULL DEFAULT 'locked',
  unlocks_in_season int NOT NULL DEFAULT 3,
  current_round int NOT NULL DEFAULT 0,
  champion_team_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (edition)
);

CREATE TABLE IF NOT EXISTS public.world_cup_tournament_clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.world_cup_tournament(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.world_league_teams(id) ON DELETE CASCADE,
  qualification_source text,
  group_label text,
  eliminated boolean NOT NULL DEFAULT false,
  UNIQUE (tournament_id, team_id)
);

CREATE TABLE IF NOT EXISTS public.world_cup_tournament_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.world_cup_tournament(id) ON DELETE CASCADE,
  round int NOT NULL,
  stage text,
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
CREATE INDEX IF NOT EXISTS idx_wctm_kickoff ON public.world_cup_tournament_matches(kickoff_at) WHERE status = 'scheduled';

-- ───────────── TRIGGERS updated_at ─────────────
CREATE TRIGGER trg_world_leagues_updated BEFORE UPDATE ON public.world_leagues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_world_league_teams_updated BEFORE UPDATE ON public.world_league_teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_world_cups_updated BEFORE UPDATE ON public.world_cups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_intl_comp_updated BEFORE UPDATE ON public.international_competitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_world_cup_tour_updated BEFORE UPDATE ON public.world_cup_tournament
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ───────────── RLS ─────────────
ALTER TABLE public.world_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_league_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_cups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_cup_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.international_competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.international_competition_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.international_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_cup_tournament ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_cup_tournament_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_cup_tournament_matches ENABLE ROW LEVEL SECURITY;

-- Public read for all
CREATE POLICY "world_leagues_select_all" ON public.world_leagues FOR SELECT USING (true);
CREATE POLICY "world_league_teams_select_all" ON public.world_league_teams FOR SELECT USING (true);
CREATE POLICY "world_matches_select_all" ON public.world_matches FOR SELECT USING (true);
CREATE POLICY "world_cups_select_all" ON public.world_cups FOR SELECT USING (true);
CREATE POLICY "world_cup_matches_select_all" ON public.world_cup_matches FOR SELECT USING (true);
CREATE POLICY "intl_comp_select_all" ON public.international_competitions FOR SELECT USING (true);
CREATE POLICY "intl_clubs_select_all" ON public.international_competition_clubs FOR SELECT USING (true);
CREATE POLICY "intl_matches_select_all" ON public.international_matches FOR SELECT USING (true);
CREATE POLICY "wct_select_all" ON public.world_cup_tournament FOR SELECT USING (true);
CREATE POLICY "wct_clubs_select_all" ON public.world_cup_tournament_clubs FOR SELECT USING (true);
CREATE POLICY "wct_matches_select_all" ON public.world_cup_tournament_matches FOR SELECT USING (true);

-- Admin can do everything (writes go through edge functions with service role; admin pode para debug)
CREATE POLICY "world_leagues_admin_all" ON public.world_leagues FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "world_league_teams_admin_all" ON public.world_league_teams FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "world_matches_admin_all" ON public.world_matches FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "world_cups_admin_all" ON public.world_cups FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "world_cup_matches_admin_all" ON public.world_cup_matches FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "intl_comp_admin_all" ON public.international_competitions FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "intl_clubs_admin_all" ON public.international_competition_clubs FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "intl_matches_admin_all" ON public.international_matches FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "wct_admin_all" ON public.world_cup_tournament FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "wct_clubs_admin_all" ON public.world_cup_tournament_clubs FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "wct_matches_admin_all" ON public.world_cup_tournament_matches FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- SEED: 30 países × 4 divisões = 120 ligas oficiais
-- ============================================================
-- Estrutura: (country, flag, division, league_name, kickoff_hour BRT)
-- Países com menos de 4 divisões usam apenas as divisões definidas.

WITH league_specs(country, flag, division, league_name, kickoff_hour) AS (VALUES
  -- 🇧🇷 Brasil
  ('Brasil','🇧🇷',4,'Série D',16),('Brasil','🇧🇷',3,'Série C',17),('Brasil','🇧🇷',2,'Série B',18),('Brasil','🇧🇷',1,'Série A',19),
  -- 🇪🇸 Espanha
  ('Espanha','🇪🇸',4,'Segunda Federación',16),('Espanha','🇪🇸',3,'Primera Federación',17),('Espanha','🇪🇸',2,'Segunda División',18),('Espanha','🇪🇸',1,'La Liga',19),
  -- 🇬🇧 Inglaterra
  ('Inglaterra','🇬🇧',4,'League Two',16),('Inglaterra','🇬🇧',3,'League One',17),('Inglaterra','🇬🇧',2,'Championship',18),('Inglaterra','🇬🇧',1,'Premier League',19),
  -- 🇮🇹 Itália
  ('Itália','🇮🇹',4,'Serie D',16),('Itália','🇮🇹',3,'Serie C',17),('Itália','🇮🇹',2,'Serie B',18),('Itália','🇮🇹',1,'Serie A',19),
  -- 🇩🇪 Alemanha (3 divisões)
  ('Alemanha','🇩🇪',3,'3. Liga',16),('Alemanha','🇩🇪',2,'2. Bundesliga',17),('Alemanha','🇩🇪',1,'Bundesliga',19),
  -- 🇫🇷 França
  ('França','🇫🇷',4,'National 2',16),('França','🇫🇷',3,'National',17),('França','🇫🇷',2,'Ligue 2',18),('França','🇫🇷',1,'Ligue 1',19),
  -- 🇵🇹 Portugal
  ('Portugal','🇵🇹',4,'Campeonato de Portugal',16),('Portugal','🇵🇹',3,'Liga 3',17),('Portugal','🇵🇹',2,'Liga 2',18),('Portugal','🇵🇹',1,'Liga Portugal',19),
  -- 🇳🇱 Holanda (3 divisões)
  ('Holanda','🇳🇱',3,'Tweede Divisie',16),('Holanda','🇳🇱',2,'Eerste Divisie',17),('Holanda','🇳🇱',1,'Eredivisie',19),
  -- 🇧🇪 Bélgica (3 divisões)
  ('Bélgica','🇧🇪',3,'National Division 1',16),('Bélgica','🇧🇪',2,'Challenger Pro League',17),('Bélgica','🇧🇪',1,'Pro League',19),
  -- 🇹🇷 Turquia (3 divisões)
  ('Turquia','🇹🇷',3,'TFF 2. Lig',16),('Turquia','🇹🇷',2,'TFF 1. Lig',17),('Turquia','🇹🇷',1,'Süper Lig',19),
  -- 🇷🇺 Rússia (3 divisões)
  ('Rússia','🇷🇺',3,'Second League',16),('Rússia','🇷🇺',2,'First League',17),('Rússia','🇷🇺',1,'Premier League',19),
  -- 🇺🇸 EUA (3 divisões)
  ('Estados Unidos','🇺🇸',3,'USL League One',16),('Estados Unidos','🇺🇸',2,'USL Championship',17),('Estados Unidos','🇺🇸',1,'MLS',19),
  -- 🇲🇽 México (3 divisões)
  ('México','🇲🇽',3,'Liga Premier',16),('México','🇲🇽',2,'Expansión MX',17),('México','🇲🇽',1,'Liga MX',19),
  -- 🇦🇷 Argentina (3 divisões)
  ('Argentina','🇦🇷',3,'Primera B',16),('Argentina','🇦🇷',2,'Primera Nacional',17),('Argentina','🇦🇷',1,'Liga Profesional',19),
  -- 🇯🇵 Japão (3 divisões)
  ('Japão','🇯🇵',3,'J3 League',16),('Japão','🇯🇵',2,'J2 League',17),('Japão','🇯🇵',1,'J1 League',19),
  -- 🇰🇷 Coreia do Sul (2 divisões)
  ('Coreia do Sul','🇰🇷',2,'K League 2',17),('Coreia do Sul','🇰🇷',1,'K League 1',19),
  -- 🇸🇦 Arábia Saudita (2 divisões)
  ('Arábia Saudita','🇸🇦',2,'First Division League',17),('Arábia Saudita','🇸🇦',1,'Saudi Pro League',19),
  -- 🇨🇳 China (3 divisões, sem copa nacional)
  ('China','🇨🇳',3,'League Two',16),('China','🇨🇳',2,'League One',17),('China','🇨🇳',1,'Super League',19),
  -- 🇮🇳 Índia (3 divisões)
  ('Índia','🇮🇳',3,'I-League 2',16),('Índia','🇮🇳',2,'I-League',17),('Índia','🇮🇳',1,'Indian Super League',19),
  -- 🇦🇺 Austrália (2 divisões)
  ('Austrália','🇦🇺',2,'A-League 2',17),('Austrália','🇦🇺',1,'A-League',19),
  -- 🇿🇦 África do Sul (2 divisões)
  ('África do Sul','🇿🇦',2,'First Division',17),('África do Sul','🇿🇦',1,'Premier Division',19),
  -- 🇳🇬 Nigéria (2 divisões)
  ('Nigéria','🇳🇬',2,'NNL',17),('Nigéria','🇳🇬',1,'NPFL',19),
  -- 🇪🇬 Egito (2 divisões)
  ('Egito','🇪🇬',2,'Second Division',17),('Egito','🇪🇬',1,'Egyptian Premier League',19),
  -- 🇸🇪 Suécia (2 divisões)
  ('Suécia','🇸🇪',2,'Superettan',17),('Suécia','🇸🇪',1,'Allsvenskan',19),
  -- 🇳🇴 Noruega (2 divisões)
  ('Noruega','🇳🇴',2,'OBOS-ligaen',17),('Noruega','🇳🇴',1,'Eliteserien',19),
  -- 🇩🇰 Dinamarca (2 divisões)
  ('Dinamarca','🇩🇰',2,'1st Division',17),('Dinamarca','🇩🇰',1,'Superliga',19),
  -- 🇨🇭 Suíça (2 divisões)
  ('Suíça','🇨🇭',2,'Challenge League',17),('Suíça','🇨🇭',1,'Super League',19),
  -- 🇦🇹 Áustria (2 divisões)
  ('Áustria','🇦🇹',2,'2. Liga',17),('Áustria','🇦🇹',1,'Bundesliga',19),
  -- 🇨🇱 Chile (2 divisões)
  ('Chile','🇨🇱',2,'Primera B',17),('Chile','🇨🇱',1,'Primera División',19),
  -- 🇨🇴 Colômbia (2 divisões)
  ('Colômbia','🇨🇴',2,'Torneo BetPlay',17),('Colômbia','🇨🇴',1,'Liga BetPlay',19)
)
INSERT INTO public.world_leagues (country, flag_emoji, division, league_name, kickoff_hour, season, current_matchday, status, total_slots)
SELECT country, flag, division, league_name, kickoff_hour, 1, 0, 'pending', 20
FROM league_specs
ON CONFLICT (country, division, season) DO NOTHING;

-- ============================================================
-- SEED: Copas nacionais (uma por país que tem copa)
-- ============================================================
WITH cup_specs(country, flag, cup_name) AS (VALUES
  ('Brasil','🇧🇷','Copa do Brasil'),
  ('Espanha','🇪🇸','Copa del Rey'),
  ('Inglaterra','🇬🇧','FA Cup'),
  ('Itália','🇮🇹','Coppa Italia'),
  ('Alemanha','🇩🇪','DFB-Pokal'),
  ('França','🇫🇷','Coupe de France'),
  ('Portugal','🇵🇹','Taça de Portugal'),
  ('Holanda','🇳🇱','KNVB Beker'),
  ('Bélgica','🇧🇪','Croky Cup'),
  ('Turquia','🇹🇷','Türkiye Kupası'),
  ('Rússia','🇷🇺','Russian Cup'),
  ('Estados Unidos','🇺🇸','U.S. Open Cup'),
  ('México','🇲🇽','Copa MX'),
  ('Argentina','🇦🇷','Copa Argentina'),
  ('Japão','🇯🇵','Emperor''s Cup'),
  ('Coreia do Sul','🇰🇷','Korean FA Cup'),
  ('Arábia Saudita','🇸🇦','King''s Cup'),
  ('Egito','🇪🇬','Egypt Cup'),
  ('Chile','🇨🇱','Copa Chile'),
  ('Colômbia','🇨🇴','Copa Colombia')
)
INSERT INTO public.world_cups (country, flag_emoji, cup_name, season, status, starts_on_matchday)
SELECT country, flag, cup_name, 1, 'pending', 10
FROM cup_specs
ON CONFLICT (country, season) DO NOTHING;

-- ============================================================
-- SEED: Competições internacionais (6 continentes), trancadas
-- ============================================================
INSERT INTO public.international_competitions (continent, competition_name, emoji, season, status, unlocks_in_season)
VALUES
  ('Europa','UEFA Champions League','🇪🇺',1,'locked',2),
  ('América do Sul','Copa Libertadores da América','🌎',1,'locked',2),
  ('América do Norte','CONCACAF Champions Cup','🌎',1,'locked',2),
  ('África','CAF Champions League','🌍',1,'locked',2),
  ('Ásia','AFC Champions League','🌏',1,'locked',2),
  ('Oceania','OFC Champions League','🌏',1,'locked',2)
ON CONFLICT (continent, season) DO NOTHING;

-- ============================================================
-- SEED: Mundial de Clubes, trancado
-- ============================================================
INSERT INTO public.world_cup_tournament (edition, season, status, unlocks_in_season)
VALUES (1, 1, 'locked', 3)
ON CONFLICT (edition) DO NOTHING;