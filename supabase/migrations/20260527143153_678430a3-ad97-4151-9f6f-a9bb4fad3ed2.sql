-- Create a table for registration logs
CREATE TABLE IF NOT EXISTS public.league_registration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    league_id UUID,
    country TEXT,
    club_name TEXT,
    action TEXT NOT NULL, -- 'joined', 'replaced_bot', 'queued', 'error'
    bot_replaced_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant access
GRANT SELECT, INSERT ON public.league_registration_logs TO authenticated;
GRANT ALL ON public.league_registration_logs TO service_role;

-- Enable RLS
ALTER TABLE public.league_registration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own logs" ON public.league_registration_logs
FOR SELECT USING (auth.uid() = user_id);

-- Update auto_assign_league to replace bots
CREATE OR REPLACE FUNCTION public.auto_assign_league(_user_id uuid, _club_name text, _country text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _league_id uuid;
  _bot_user_id uuid;
  _has_active_main boolean;
  _log_id uuid;
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

  -- 2. Try to find a league with empty space (count < max_members)
  -- Priority to 'main' league first, then 'beginner'
  SELECT ml.id INTO _league_id
  FROM multiplayer_leagues ml
  WHERE ml.country = _country
    AND ml.auto_created = true
    AND ml.season_status IN ('registration', 'waiting', 'in_progress') -- Allow joining in progress too
    AND (SELECT count(*) FROM league_members lm2 WHERE lm2.league_id = ml.id) < ml.max_members
  ORDER BY 
    CASE WHEN ml.league_type = 'main' THEN 1 ELSE 2 END ASC,
    ml.division ASC, 
    ml.created_at ASC
  LIMIT 1;

  IF _league_id IS NOT NULL THEN
    INSERT INTO league_members (league_id, user_id, club_name, club_logo, is_bot)
    VALUES (_league_id, _user_id, _club_name, '⚽', false)
    ON CONFLICT (league_id, user_id) DO NOTHING;
    
    INSERT INTO league_registration_logs (user_id, league_id, country, club_name, action)
    VALUES (_user_id, _league_id, _country, _club_name, 'joined');
    
    RETURN _league_id;
  END IF;

  -- 3. No empty space? Try to replace a BOT in an existing league
  SELECT ml.id INTO _league_id
  FROM multiplayer_leagues ml
  WHERE ml.country = _country
    AND ml.auto_created = true
    AND EXISTS (SELECT 1 FROM league_members lm3 WHERE lm3.league_id = ml.id AND lm3.is_bot = true)
  ORDER BY 
    CASE WHEN ml.league_type = 'main' THEN 1 ELSE 2 END ASC,
    ml.division ASC, 
    ml.created_at ASC
  LIMIT 1;

  IF _league_id IS NOT NULL THEN
    -- Find the BOT to replace
    SELECT user_id INTO _bot_user_id
    FROM league_members
    WHERE league_id = _league_id AND is_bot = true
    LIMIT 1;

    IF _bot_user_id IS NOT NULL THEN
      -- Replace BOT in league_members
      UPDATE league_members 
      SET user_id = _user_id, 
          club_name = _club_name, 
          is_bot = false, 
          bot_strength = NULL,
          joined_at = NOW()
      WHERE league_id = _league_id AND user_id = _bot_user_id;

      -- Update match fixtures
      UPDATE league_matches SET home_user_id = _user_id WHERE league_id = _league_id AND home_user_id = _bot_user_id;
      UPDATE league_matches SET away_user_id = _user_id WHERE league_id = _league_id AND away_user_id = _bot_user_id;
      
      -- Update squads if any (usually bots don't have league_squads entries, but for safety)
      UPDATE league_squads SET user_id = _user_id WHERE league_id = _league_id AND user_id = _bot_user_id;

      INSERT INTO league_registration_logs (user_id, league_id, country, club_name, action, bot_replaced_id)
      VALUES (_user_id, _league_id, _country, _club_name, 'replaced_bot', _bot_user_id);
      
      RETURN _league_id;
    END IF;
  END IF;

  -- 4. Still no space and no bots? Add to waiting list
  INSERT INTO public.league_waiting_list (user_id, country, league_type, status)
  VALUES (_user_id, _country, 'main', 'waiting')
  ON CONFLICT (user_id, country, league_type) DO UPDATE SET status = 'waiting', enrolled_at = NOW();

  INSERT INTO league_registration_logs (user_id, country, club_name, action)
  VALUES (_user_id, _country, _club_name, 'queued');

  RETURN NULL; -- Return NULL to indicate queued
END;
$function$;

-- Update process_league_waiting_list to also prioritize replacing bots
CREATE OR REPLACE FUNCTION public.process_league_waiting_list(_league_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_country TEXT;
  v_league_type TEXT;
  v_max_members INT;
  v_current_members INT;
  v_bot_user_id UUID;
  v_next_user RECORD;
BEGIN
  -- Get league details
  SELECT country, league_type, max_members INTO v_country, v_league_type, v_max_members
  FROM multiplayer_leagues
  WHERE id = _league_id;

  LOOP
    -- 1. Try to find space or a bot
    SELECT count(*) INTO v_current_members FROM league_members WHERE league_id = _league_id;
    
    -- Check if we have a bot to replace if full
    IF v_current_members >= v_max_members THEN
      SELECT user_id INTO v_bot_user_id FROM league_members WHERE league_id = _league_id AND is_bot = true LIMIT 1;
      EXIT WHEN v_bot_user_id IS NULL; -- Truly full with humans
    ELSE
      v_bot_user_id := NULL;
    END IF;

    -- Get next user in line for this country and type
    SELECT * INTO v_next_user
    FROM league_waiting_list
    WHERE country = v_country 
      AND league_type = v_league_type 
      AND status = 'waiting'
    ORDER BY enrolled_at ASC
    LIMIT 1;

    EXIT WHEN v_next_user IS NULL;

    DECLARE
      v_club_name TEXT;
    BEGIN
      SELECT name INTO v_club_name FROM clubs WHERE user_id = v_next_user.user_id LIMIT 1;
      IF v_club_name IS NULL THEN v_club_name := 'Novo Clube'; END IF;

      IF v_bot_user_id IS NOT NULL THEN
        -- Replace BOT
        UPDATE league_members 
        SET user_id = v_next_user.user_id, club_name = v_club_name, is_bot = false, bot_strength = NULL, joined_at = NOW()
        WHERE league_id = _league_id AND user_id = v_bot_user_id;
        
        UPDATE league_matches SET home_user_id = v_next_user.user_id WHERE league_id = _league_id AND home_user_id = v_bot_user_id;
        UPDATE league_matches SET away_user_id = v_next_user.user_id WHERE league_id = _league_id AND away_user_id = v_bot_user_id;
        
        INSERT INTO league_registration_logs (user_id, league_id, country, club_name, action, bot_replaced_id)
        VALUES (v_next_user.user_id, _league_id, v_country, v_club_name, 'replaced_bot', v_bot_user_id);
      ELSE
        -- Add to league directly
        INSERT INTO league_members (league_id, user_id, club_name, club_logo, is_bot)
        VALUES (_league_id, v_next_user.user_id, v_club_name, '⚽', false)
        ON CONFLICT (league_id, user_id) DO NOTHING;
        
        INSERT INTO league_registration_logs (user_id, league_id, country, club_name, action)
        VALUES (v_next_user.user_id, _league_id, v_country, v_club_name, 'joined');
      END IF;

      -- Mark as processed
      UPDATE league_waiting_list SET status = 'processed' WHERE id = v_next_user.id;
      
      -- Send notification
      INSERT INTO user_notifications (user_id, title, message, type)
      VALUES (v_next_user.user_id, '⚽ Bem-vindo à Liga!', 'Sua vaga na liga ' || v_country || ' foi liberada. A temporada começou!', 'league_entry');
    END;
  END LOOP;
END;
$function$;
