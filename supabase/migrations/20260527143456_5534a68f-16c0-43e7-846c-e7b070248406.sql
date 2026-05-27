CREATE OR REPLACE FUNCTION public.auto_assign_league(_user_id uuid, _club_name text, _country text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _league_id uuid;
  _bot_user_id uuid;
  _log_id uuid;
BEGIN
  -- 1. Check if user is already in any league of this country
  SELECT lm.league_id INTO _league_id
  FROM league_members lm
  JOIN multiplayer_leagues ml ON ml.id = lm.league_id
  WHERE lm.user_id = _user_id AND ml.country = _country
  LIMIT 1;

  IF _league_id IS NOT NULL THEN
    -- If already in league, ensure waiting list is cleaned up
    UPDATE public.league_waiting_list 
    SET status = 'processed' 
    WHERE user_id = _user_id AND country = _country AND status = 'waiting';
    
    RETURN _league_id;
  END IF;

  -- 2. Try to find a league with empty space (count < max_members)
  SELECT ml.id INTO _league_id
  FROM multiplayer_leagues ml
  WHERE ml.country = _country
    AND ml.auto_created = true
    AND ml.season_status IN ('registration', 'waiting', 'in_progress')
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
    
    UPDATE public.league_waiting_list 
    SET status = 'processed' 
    WHERE user_id = _user_id AND country = _country AND status = 'waiting';

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
      
      UPDATE league_squads SET user_id = _user_id WHERE league_id = _league_id AND user_id = _bot_user_id;

      UPDATE public.league_waiting_list 
      SET status = 'processed' 
      WHERE user_id = _user_id AND country = _country AND status = 'waiting';

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

  RETURN NULL;
END;
$function$;
