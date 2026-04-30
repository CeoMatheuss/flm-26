-- Propagate finished live_matches to source table (friendly_invites, league_matches, custom_tournament_matches).
-- Source of truth = live_matches with shared_match_id. After it finishes, copy authoritative result back
-- so useAutoSimulator skips it and players see consistent score everywhere.

CREATE OR REPLACE FUNCTION public.propagate_live_match_result()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_id text;
  v_invite_id uuid;
  v_events jsonb;
BEGIN
  -- only run when transitioning to finished
  IF NEW.status <> 'finished' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'finished' THEN RETURN NEW; END IF;

  v_match_id := COALESCE(NEW.shared_match_id, NEW.match_id);
  IF v_match_id IS NULL THEN RETURN NEW; END IF;

  v_events := COALESCE(NEW.events, '[]'::jsonb);

  -- friendly: match_id like 'friendly-<uuid>'
  IF v_match_id LIKE 'friendly-%' THEN
    BEGIN
      v_invite_id := substring(v_match_id from 10)::uuid;
      UPDATE friendly_invites
      SET status = 'finished',
          match_result = jsonb_build_object(
            'home_goals', NEW.home_goals,
            'away_goals', NEW.away_goals,
            'events', v_events,
            'home_name', NEW.home_team,
            'away_name', NEW.away_team,
            'simulated', true,
            'auto_simulated', false,
            'live_match_id', NEW.id
          )
      WHERE id = v_invite_id
        AND (status = 'accepted' OR match_result IS NULL);
    EXCEPTION WHEN OTHERS THEN
      -- bad uuid, ignore
      NULL;
    END;
    RETURN NEW;
  END IF;

  -- try as uuid for league_matches / custom_tournament_matches
  BEGIN
    UPDATE league_matches
    SET home_goals = NEW.home_goals,
        away_goals = NEW.away_goals,
        status = 'finished',
        played_at = COALESCE(played_at, now()),
        match_data = COALESCE(match_data, '{}'::jsonb) || jsonb_build_object(
          'events', v_events,
          'simulated', true,
          'auto_simulated', false,
          'live_match_id', NEW.id,
          'home_name', NEW.home_team,
          'away_name', NEW.away_team
        )
    WHERE id::text = v_match_id
      AND status = 'scheduled';

    UPDATE custom_tournament_matches
    SET home_goals = NEW.home_goals,
        away_goals = NEW.away_goals,
        status = 'finished',
        played_at = COALESCE(played_at, now()),
        match_data = COALESCE(match_data, '{}'::jsonb) || jsonb_build_object(
          'events', v_events,
          'simulated', true,
          'auto_simulated', false,
          'live_match_id', NEW.id,
          'home_name', NEW.home_team,
          'away_name', NEW.away_team
        )
    WHERE id::text = v_match_id
      AND status = 'scheduled';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_live_match_result ON public.live_matches;
CREATE TRIGGER trg_propagate_live_match_result
AFTER INSERT OR UPDATE OF status ON public.live_matches
FOR EACH ROW
EXECUTE FUNCTION public.propagate_live_match_result();