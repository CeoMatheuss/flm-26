-- Auto-inscrição de novos jogadores na liga D1 oficial do país
-- + notificação no sino. Sem duplicar (checa user_id pré-existente).

CREATE OR REPLACE FUNCTION public.auto_enroll_player_in_world_league()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_country text;
  v_club_name text;
  v_logo text;
  v_league_id uuid;
  v_league_name text;
  v_kickoff_h int;
  v_kickoff_m int;
  v_horario text;
  v_team_id uuid;
BEGIN
  -- já inscrito? sai
  IF EXISTS (SELECT 1 FROM world_league_teams WHERE user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  v_country   := COALESCE(NEW.club_data->'club'->>'country', 'BR');
  v_club_name := COALESCE(NEW.club_data->'club'->>'name', 'Meu Clube');
  v_logo      := COALESCE(NEW.club_data->'club'->>'logo', '🛡️');

  -- precisa de clube criado para inscrever
  IF NEW.club_data->'club'->>'name' IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, league_name, kickoff_hour, COALESCE(kickoff_minute,0)
    INTO v_league_id, v_league_name, v_kickoff_h, v_kickoff_m
  FROM world_leagues
  WHERE country = v_country AND division = 1 AND status = 'in_progress'
  ORDER BY season DESC
  LIMIT 1;

  IF v_league_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_team_id
  FROM world_league_teams
  WHERE league_id = v_league_id AND is_bot = true
  ORDER BY COALESCE(bot_strength, 50) ASC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_team_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE world_league_teams
     SET user_id = NEW.user_id,
         is_bot = false,
         bot_strength = NULL,
         club_name = v_club_name,
         club_logo = v_logo,
         updated_at = now()
   WHERE id = v_team_id;

  v_horario := lpad(v_kickoff_h::text,2,'0') || ':' || lpad(v_kickoff_m::text,2,'0');

  INSERT INTO user_notifications (user_id, type, title, message, icon, data)
  SELECT NEW.user_id, 'league_enrolled',
         'Inscrição confirmada na liga',
         'Você foi inscrito na liga ' || v_league_name || '. Horário dos jogos: ' || v_horario || ' (BRT). Boa sorte na competição!',
         '🏆',
         jsonb_build_object('league_id', v_league_id, 'league_name', v_league_name, 'kickoff', v_horario)
  WHERE NOT EXISTS (
    SELECT 1 FROM user_notifications
    WHERE user_id = NEW.user_id
      AND type = 'league_enrolled'
      AND data->>'league_id' = v_league_id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_enroll_world_league ON public.game_saves;
CREATE TRIGGER trg_auto_enroll_world_league
AFTER INSERT OR UPDATE OF club_data ON public.game_saves
FOR EACH ROW
EXECUTE FUNCTION public.auto_enroll_player_in_world_league();