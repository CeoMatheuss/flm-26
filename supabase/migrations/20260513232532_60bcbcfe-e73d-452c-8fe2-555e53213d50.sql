-- Function to process waiting list for a specific league
CREATE OR REPLACE FUNCTION public.process_league_waiting_list(_league_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_country TEXT;
  v_league_type TEXT;
  v_max_members INT;
  v_current_members INT;
  v_vagas INT;
  v_next_user RECORD;
BEGIN
  -- Get league details
  SELECT country, league_type, max_members INTO v_country, v_league_type, v_max_members
  FROM multiplayer_leagues
  WHERE id = _league_id;

  -- Count current members
  SELECT count(*) INTO v_current_members
  FROM league_members
  WHERE league_id = _league_id;

  v_vagas := v_max_members - v_current_members;

  WHILE v_vagas > 0 LOOP
    -- Get next user in line for this country and type
    SELECT * INTO v_next_user
    FROM league_waiting_list
    WHERE country = v_country 
      AND league_type = v_league_type 
      AND status = 'waiting'
    ORDER BY enrolled_at ASC
    LIMIT 1;

    EXIT WHEN v_next_user IS NULL;

    -- Get club name (from profile or clubs table)
    -- We'll assume the client passes it or we find it. For now, try to find it in clubs.
    DECLARE
      v_club_name TEXT;
    BEGIN
      SELECT name INTO v_club_name FROM clubs WHERE user_id = v_next_user.user_id LIMIT 1;
      IF v_club_name IS NULL THEN v_club_name := 'Novo Clube'; END IF;

      -- Add to league
      INSERT INTO league_members (league_id, user_id, club_name, club_logo)
      VALUES (_league_id, v_next_user.user_id, v_club_name, '⚽')
      ON CONFLICT DO NOTHING;

      -- Mark as processed
      UPDATE league_waiting_list SET status = 'processed' WHERE id = v_next_user.id;
      
      -- Send notification
      INSERT INTO user_notifications (user_id, title, message, type)
      VALUES (v_next_user.user_id, '⚽ Bem-vindo à Liga!', 'Sua vaga na liga ' || v_country || ' foi liberada. A temporada começou!', 'league_entry');
    END;

    v_vagas := v_vagas - 1;
  END LOOP;
END;
$$;

-- Trigger to process waiting list when a member leaves
CREATE OR REPLACE FUNCTION public.trigger_on_member_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Small delay or background task would be ideal, but for now we run it inline
  -- Or just check if the league is in registration/waiting
  PERFORM public.process_league_waiting_list(OLD.league_id);
  RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER trg_on_member_leave
AFTER DELETE ON public.league_members
FOR EACH ROW EXECUTE FUNCTION public.trigger_on_member_leave();

-- Update process_season_transition to fill new leagues from waiting list
-- (Logic would be added here to iterate over all leagues in registration)
