
-- =============================================
-- 1. Adicionar colunas em multiplayer_leagues
-- =============================================
ALTER TABLE public.multiplayer_leagues
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'nacional',
  ADD COLUMN IF NOT EXISTS tier_level INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS season_month INT,
  ADD COLUMN IF NOT EXISTS season_year INT,
  ADD COLUMN IF NOT EXISTS match_time TEXT DEFAULT '20:00';

-- Atualizar ligas existentes com tier baseado em division
UPDATE public.multiplayer_leagues
SET tier = CASE
  WHEN league_type = 'beginner' THEN 'varzea'
  WHEN division <= 4 THEN 'nacional'
  ELSE 'nacional'
END,
tier_level = COALESCE(division, 1)
WHERE tier = 'nacional' OR tier IS NULL;

-- =============================================
-- 2. Tabela cup_competitions
-- =============================================
CREATE TABLE public.cup_competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cup_type TEXT NOT NULL DEFAULT 'national',
  country TEXT,
  continent TEXT,
  season_month INT,
  season_year INT,
  format TEXT DEFAULT 'knockout',
  status TEXT DEFAULT 'pending',
  current_round INT DEFAULT 0,
  total_rounds INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cup_competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view cups"
  ON public.cup_competitions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage cups"
  ON public.cup_competitions FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update cups"
  ON public.cup_competitions FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete cups"
  ON public.cup_competitions FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 3. Tabela cup_teams
-- =============================================
CREATE TABLE public.cup_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cup_id UUID NOT NULL REFERENCES public.cup_competitions(id) ON DELETE CASCADE,
  user_id UUID,
  is_bot BOOLEAN DEFAULT false,
  bot_name TEXT,
  bot_strength INT DEFAULT 60,
  club_name TEXT NOT NULL,
  club_logo TEXT DEFAULT '⚽',
  seed INT DEFAULT 0,
  eliminated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cup_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view cup teams"
  ON public.cup_teams FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage cup teams"
  ON public.cup_teams FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update cup teams"
  ON public.cup_teams FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete cup teams"
  ON public.cup_teams FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 4. Tabela cup_matches
-- =============================================
CREATE TABLE public.cup_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cup_id UUID NOT NULL REFERENCES public.cup_competitions(id) ON DELETE CASCADE,
  round INT NOT NULL DEFAULT 1,
  leg INT DEFAULT 1,
  home_team_id UUID REFERENCES public.cup_teams(id) ON DELETE SET NULL,
  away_team_id UUID REFERENCES public.cup_teams(id) ON DELETE SET NULL,
  home_goals INT,
  away_goals INT,
  scheduled_at TIMESTAMPTZ,
  played_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled',
  match_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cup_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view cup matches"
  ON public.cup_matches FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage cup matches"
  ON public.cup_matches FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update cup matches"
  ON public.cup_matches FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete cup matches"
  ON public.cup_matches FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 5. Tabela country_status
-- =============================================
CREATE TABLE public.country_status (
  country TEXT PRIMARY KEY,
  total_players INT DEFAULT 0,
  is_locked BOOLEAN DEFAULT false,
  max_capacity INT DEFAULT 400,
  bonus_budget BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.country_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view country status"
  ON public.country_status FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage country status"
  ON public.country_status FOR ALL
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 6. Tabela season_calendar
-- =============================================
CREATE TABLE public.season_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  season_month INT NOT NULL,
  season_year INT NOT NULL,
  day INT NOT NULL,
  league_id UUID REFERENCES public.multiplayer_leagues(id) ON DELETE SET NULL,
  cup_id UUID REFERENCES public.cup_competitions(id) ON DELETE SET NULL,
  round INT DEFAULT 1,
  match_time TEXT DEFAULT '20:00',
  match_type TEXT DEFAULT 'league',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.season_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view calendar"
  ON public.season_calendar FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage calendar"
  ON public.season_calendar FOR ALL
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast calendar lookups
CREATE INDEX idx_season_calendar_country_date ON public.season_calendar(country, season_year, season_month, day);
CREATE INDEX idx_cup_matches_cup_round ON public.cup_matches(cup_id, round);
CREATE INDEX idx_cup_teams_cup ON public.cup_teams(cup_id);

-- =============================================
-- 7. Reescrever auto_assign_league para pirâmide
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_assign_league(_user_id uuid, _club_name text, _country text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _league_id uuid;
  _code text;
  _member_count int;
  _country_status record;
BEGIN
  -- Check if user is already in any league of this country
  SELECT lm.league_id INTO _league_id
  FROM league_members lm
  JOIN multiplayer_leagues ml ON ml.id = lm.league_id
  WHERE lm.user_id = _user_id AND ml.country = _country
  LIMIT 1;

  IF _league_id IS NOT NULL THEN
    RETURN _league_id;
  END IF;

  -- Check if country is locked
  SELECT * INTO _country_status FROM country_status WHERE country = _country;
  IF _country_status IS NOT NULL AND _country_status.is_locked THEN
    RAISE EXCEPTION 'Este país está lotado. Escolha outro ou aguarde o próximo mês.';
  END IF;

  -- Find a Várzea league with space (< 20 real players)
  SELECT ml.id INTO _league_id
  FROM multiplayer_leagues ml
  WHERE ml.country = _country
    AND ml.tier = 'varzea'
    AND ml.auto_created = true
    AND (SELECT count(*) FROM league_members lm2 WHERE lm2.league_id = ml.id) < 20
  ORDER BY ml.created_at ASC
  LIMIT 1;

  -- If no Várzea with space, create one
  IF _league_id IS NULL THEN
    _code := upper(substr(md5(random()::text), 1, 6));

    INSERT INTO multiplayer_leagues (
      name, code, owner_id, country, auto_created, max_members,
      status, league_type, total_rounds, season_status,
      tier, tier_level, division
    ) VALUES (
      _country || ' Várzea',
      _code, _user_id, _country, true, 20,
      'waiting', 'main', 19, 'registration',
      'varzea', 1, NULL
    )
    RETURNING id INTO _league_id;
  END IF;

  -- Determine bonus budget
  DECLARE
    _bonus bigint := 0;
  BEGIN
    IF _country_status IS NOT NULL AND _country_status.bonus_budget > 0 THEN
      _bonus := _country_status.bonus_budget;
    END IF;

    INSERT INTO league_members (league_id, user_id, club_name, club_logo, budget)
    VALUES (_league_id, _user_id, _club_name, '⚽', 5000000 + _bonus)
    ON CONFLICT DO NOTHING;
  END;

  -- Update country player count
  INSERT INTO country_status (country, total_players)
  VALUES (_country, 1)
  ON CONFLICT (country) DO UPDATE
  SET total_players = country_status.total_players + 1,
      updated_at = now();

  RETURN _league_id;
END;
$$;
