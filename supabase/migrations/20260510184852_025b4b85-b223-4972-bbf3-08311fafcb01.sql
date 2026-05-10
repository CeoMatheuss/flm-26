-- Ensure cup_competitions has necessary columns for modern tracking
ALTER TABLE public.cup_competitions 
  ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'R32',
  ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES public.cup_teams(id),
  ADD COLUMN IF NOT EXISTS prize_pool BIGINT DEFAULT 0;

-- Table for champions history
CREATE TABLE IF NOT EXISTS public.cup_season_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cup_name TEXT NOT NULL,
  cup_type TEXT NOT NULL,
  country TEXT,
  season_year INT NOT NULL,
  winner_club_name TEXT NOT NULL,
  winner_club_logo TEXT,
  winner_user_id UUID,
  runner_up_club_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Improved qualify function to handle BOT generation better
CREATE OR REPLACE FUNCTION public.qualify_national_cup_teams(_country text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _teams jsonb := '[]'::jsonb;
  _league_id uuid;
  _member RECORD;
  _count int := 0;
  _seen_clubs text[] := ARRAY[]::text[];
BEGIN
  -- Top 20 from Division 1
  SELECT id INTO _league_id
  FROM multiplayer_leagues
  WHERE country = _country AND tier = 'nacional' AND division = 1 AND auto_created = true
  LIMIT 1;

  IF _league_id IS NOT NULL THEN
    FOR _member IN
      SELECT user_id, club_name, club_logo
      FROM league_members
      WHERE league_id = _league_id
      ORDER BY points DESC NULLS LAST, (goals_for - goals_against) DESC NULLS LAST
      LIMIT 20
    LOOP
      _teams := _teams || jsonb_build_object(
        'user_id', _member.user_id,
        'club_name', _member.club_name,
        'club_logo', COALESCE(_member.club_logo, '⚽'),
        'is_bot', _member.user_id IS NULL
      );
      _seen_clubs := _seen_clubs || _member.club_name;
      _count := _count + 1;
    END LOOP;
  END IF;

  -- Top 12 from Division 2
  SELECT id INTO _league_id
  FROM multiplayer_leagues
  WHERE country = _country AND tier = 'nacional' AND division = 2 AND auto_created = true
  LIMIT 1;

  IF _league_id IS NOT NULL THEN
    FOR _member IN
      SELECT user_id, club_name, club_logo
      FROM league_members
      WHERE league_id = _league_id
        AND NOT (club_name = ANY(_seen_clubs))
      ORDER BY points DESC NULLS LAST, (goals_for - goals_against) DESC NULLS LAST
      LIMIT 12
    LOOP
      _teams := _teams || jsonb_build_object(
        'user_id', _member.user_id,
        'club_name', _member.club_name,
        'club_logo', COALESCE(_member.club_logo, '⚽'),
        'is_bot', _member.user_id IS NULL
      );
      _seen_clubs := _seen_clubs || _member.club_name;
      _count := _count + 1;
    END LOOP;
  END IF;

  -- Complete with BOTS if needed to reach 32
  WHILE _count < 32 LOOP
    DECLARE
      _bot_name text := generate_bot_club_name(_country, _count + 500);
    BEGIN
      IF NOT (_bot_name = ANY(_seen_clubs)) THEN
        _teams := _teams || jsonb_build_object(
          'user_id', NULL,
          'club_name', _bot_name,
          'club_logo', random_bot_logo(),
          'is_bot', true
        );
        _seen_clubs := _seen_clubs || _bot_name;
        _count := _count + 1;
      END IF;
    END;
  END LOOP;

  RETURN _teams;
END;
$$;

-- Function to advance cup rounds automatically
CREATE OR REPLACE FUNCTION public.process_cup_tick(_cup_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cup RECORD;
  _current_round_matches_pending INT;
  _winners UUID[];
  _i INT;
  _next_round_date TIMESTAMPTZ;
  _phase_names jsonb := '{"1": "R32", "2": "R16", "3": "QF", "4": "SF", "5": "Final"}'::jsonb;
BEGIN
  SELECT * INTO _cup FROM cup_competitions WHERE id = _cup_id;
  IF _cup IS NULL OR _cup.status <> 'in_progress' THEN RETURN; END IF;

  -- Check if all matches in current round are finished
  SELECT COUNT(*) INTO _current_round_matches_pending
  FROM cup_matches
  WHERE cup_id = _cup_id AND round = _cup.current_round AND status <> 'finished';

  IF _current_round_matches_pending > 0 THEN RETURN; END IF;

  -- Get winners of current round
  SELECT array_agg(winner_id) INTO _winners
  FROM (
    SELECT 
      CASE 
        WHEN home_goals > away_goals THEN home_team_id 
        ELSE away_team_id 
      END as winner_id
    FROM cup_matches
    WHERE cup_id = _cup_id AND round = _cup.current_round
    ORDER BY id
  ) as winners;

  -- If it was the final, finish cup
  IF _cup.current_round >= _cup.total_rounds THEN
    UPDATE cup_competitions 
    SET status = 'finished', 
        winner_id = _winners[1]
    WHERE id = _cup_id;

    -- Award continental spot and prizes
    PERFORM finish_national_cup_award_continental(_cup_id);
    
    -- Save to history
    INSERT INTO cup_season_history (
      cup_name, cup_type, country, season_year, 
      winner_club_name, winner_club_logo, winner_user_id
    )
    SELECT 
      _cup.name, _cup.cup_type, _cup.country, _cup.season_year,
      ct.club_name, ct.club_logo, ct.user_id
    FROM cup_teams ct WHERE ct.id = _winners[1];
    
    RETURN;
  END IF;

  -- Schedule next round
  _next_round_date := now() + interval '2 days'; -- Base advance
  
  -- Create next round matchups
  FOR _i IN 1..(array_length(_winners, 1) / 2) LOOP
    INSERT INTO cup_matches (
      cup_id, round, leg, home_team_id, away_team_id, scheduled_at, status
    ) VALUES (
      _cup_id, _cup.current_round + 1, 1, _winners[_i*2-1], _winners[_i*2], _next_round_date, 'scheduled'
    );
  END LOOP;

  -- Update cup status
  UPDATE cup_competitions 
  SET current_round = current_round + 1,
      current_phase = _phase_names->>( (current_round + 1)::text )
  WHERE id = _cup_id;

  -- News entry
  INSERT INTO newspaper_entries (text, category, is_event)
  VALUES (
    '🏆 ' || _cup.name || ': Definidos os confrontos da ' || (_phase_names->>(_cup.current_round + 1)::text) || '!',
    'COPA', true
  );
END;
$$;
