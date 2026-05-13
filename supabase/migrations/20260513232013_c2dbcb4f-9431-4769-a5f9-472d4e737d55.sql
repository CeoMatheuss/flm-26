-- Create league waiting list table
CREATE TABLE IF NOT EXISTS public.league_waiting_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    country TEXT NOT NULL,
    league_type TEXT NOT NULL DEFAULT 'main',
    division INT,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'waiting', -- waiting, processed, cancelled
    UNIQUE(user_id, country, league_type)
);

-- Enable RLS
ALTER TABLE public.league_waiting_list ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own waiting list entries"
    ON public.league_waiting_list FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own waiting list entries"
    ON public.league_waiting_list FOR DELETE
    USING (auth.uid() = user_id);

-- Update auto_assign_league to handle waiting list
CREATE OR REPLACE FUNCTION public.auto_assign_league(_user_id uuid, _club_name text, _country text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _league_id uuid;
  _member_count int;
  _has_active_main boolean;
BEGIN
  -- 1. Check if user is already in any league of this country
  SELECT lm.league_id INTO _league_id
  FROM league_members lm
  JOIN multiplayer_leagues ml ON ml.id = lm.league_id
  WHERE lm.user_id = _user_id AND ml.country = _country
  LIMIT 1;

  IF _league_id IS NOT NULL THEN
    RETURN _league_id;
  END IF;

  -- 2. Check if there are active main leagues in progress for this country
  SELECT EXISTS (
    SELECT 1 FROM multiplayer_leagues
    WHERE country = _country AND league_type = 'main' AND season_status = 'in_progress'
  ) INTO _has_active_main;

  IF _has_active_main THEN
    -- Season is running: Try to find an open beginner league
    SELECT ml.id INTO _league_id
    FROM multiplayer_leagues ml
    WHERE ml.country = _country
      AND ml.league_type = 'beginner'
      AND ml.auto_created = true
      AND ml.season_status IN ('registration', 'waiting')
      AND (SELECT count(*) FROM league_members lm2 WHERE lm2.league_id = ml.id) < ml.max_members
    ORDER BY ml.created_at ASC
    LIMIT 1;

    -- If no beginner league with space, user must wait or we can let them join a beginner league if we want to keep it "infinite"
    -- But the instruction says "Nunca criar ligas infinitas automaticamente"
    -- For beginner leagues, we might allow creation or also put in queue. 
    -- The user specifically asked for "Inscrito para próxima temporada" which implies the MAIN league.
    
    IF _league_id IS NOT NULL THEN
       INSERT INTO league_members (league_id, user_id, club_name, club_logo)
       VALUES (_league_id, _user_id, _club_name, '⚽')
       ON CONFLICT DO NOTHING;
       RETURN _league_id;
    END IF;
  END IF;

  -- 3. Try to join main league in registration/waiting
  SELECT ml.id INTO _league_id
  FROM multiplayer_leagues ml
  WHERE ml.country = _country
    AND ml.league_type = 'main'
    AND ml.auto_created = true
    AND ml.season_status IN ('registration', 'waiting')
    AND (SELECT count(*) FROM league_members lm2 WHERE lm2.league_id = ml.id) < ml.max_members
  ORDER BY ml.division ASC, ml.created_at ASC
  LIMIT 1;

  IF _league_id IS NOT NULL THEN
    INSERT INTO league_members (league_id, user_id, club_name, club_logo)
    VALUES (_league_id, _user_id, _club_name, '⚽')
    ON CONFLICT DO NOTHING;
    RETURN _league_id;
  END IF;

  -- 4. If no space and no league in registration, add to waiting list
  -- We DON'T create a new league here anymore as per "O jogo NÃO deve criar automaticamente uma nova liga"
  INSERT INTO public.league_waiting_list (user_id, country, league_type, status)
  VALUES (_user_id, _country, 'main', 'waiting')
  ON CONFLICT (user_id, country, league_type) DO UPDATE SET status = 'waiting', enrolled_at = NOW();

  RETURN NULL; -- Return NULL to indicate queued
END;
$function$;
