-- Função para atualizar estatísticas do jogador na Copa
CREATE OR REPLACE FUNCTION public.update_cup_player_stats(
    p_cup_id uuid,
    p_player_id uuid,
    p_team_id uuid,
    p_goals integer DEFAULT 0,
    p_assists integer DEFAULT 0,
    p_rating numeric DEFAULT 6.0
) RETURNS void AS $$
BEGIN
    INSERT INTO public.cup_player_stats (cup_id, player_id, team_id, goals, assists, avg_rating, matches_played)
    VALUES (p_cup_id, p_player_id, p_team_id, p_goals, p_assists, p_rating, 1)
    ON CONFLICT (cup_id, player_id)
    DO UPDATE SET 
        goals = cup_player_stats.goals + EXCLUDED.goals,
        assists = cup_player_stats.assists + EXCLUDED.assists,
        avg_rating = (cup_player_stats.avg_rating * cup_player_stats.matches_played + EXCLUDED.avg_rating) / (cup_player_stats.matches_played + 1),
        matches_played = cup_player_stats.matches_played + 1;
END;
$$ LANGUAGE plpgsql;

-- Atualizando propagate_live_match_result para incluir national_cup_matches
CREATE OR REPLACE FUNCTION public.propagate_live_match_result()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_match_id text;
  v_invite_id uuid;
  v_events jsonb;
  v_home_goals integer;
  v_away_goals integer;
  v_winner_id uuid;
  v_cup_id uuid;
BEGIN
  -- only run when transitioning to finished
  IF NEW.status <> 'finished' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'finished' THEN RETURN NEW; END IF;

  v_match_id := COALESCE(NEW.shared_match_id, NEW.match_id);
  IF v_match_id IS NULL THEN RETURN NEW; END IF;

  v_events := COALESCE(NEW.events, '[]'::jsonb);
  v_home_goals := NEW.home_goals;
  v_away_goals := NEW.away_goals;

  -- friendly: match_id like 'friendly-<uuid>'
  IF v_match_id LIKE 'friendly-%' THEN
    BEGIN
      v_invite_id := substring(v_match_id from 10)::uuid;
      UPDATE friendly_invites
      SET status = 'finished',
          match_result = jsonb_build_object(
            'home_goals', v_home_goals,
            'away_goals', v_away_goals,
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
      NULL;
    END;
    RETURN NEW;
  END IF;

  -- try as uuid for league_matches, custom_tournament_matches AND national_cup_matches
  BEGIN
    -- 1. League matches
    UPDATE league_matches
    SET home_goals = v_home_goals,
        away_goals = v_away_goals,
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

    -- 2. Custom tournament matches
    UPDATE custom_tournament_matches
    SET home_goals = v_home_goals,
        away_goals = v_away_goals,
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

    -- 3. National Cup matches (Added as requested)
    -- We need to determine the winner for knockout
    v_winner_id := NULL;
    IF v_home_goals > v_away_goals THEN
      SELECT home_team_id INTO v_winner_id FROM national_cup_matches WHERE id::text = v_match_id;
    ELSIF v_away_goals > v_home_goals THEN
      SELECT away_team_id INTO v_winner_id FROM national_cup_matches WHERE id::text = v_match_id;
    ELSE
      -- Draw: check penalties in events
      DECLARE
        v_h_pen integer := 0;
        v_a_pen integer := 0;
      BEGIN
        SELECT 
          COALESCE((SELECT (e->>'isGoal')::boolean::int FROM jsonb_array_elements(v_events) e WHERE e->>'type' = 'penalty_shootout' AND e->>'team' = 'home' ORDER BY (e->>'minute')::int DESC LIMIT 1), 0),
          COALESCE((SELECT (e->>'isGoal')::boolean::int FROM jsonb_array_elements(v_events) e WHERE e->>'type' = 'penalty_shootout' AND e->>'team' = 'away' ORDER BY (e->>'minute')::int DESC LIMIT 1), 0)
        INTO v_h_pen, v_a_pen;
        
        IF v_h_pen > v_a_pen THEN
          SELECT home_team_id INTO v_winner_id FROM national_cup_matches WHERE id::text = v_match_id;
        ELSE
          SELECT away_team_id INTO v_winner_id FROM national_cup_matches WHERE id::text = v_match_id;
        END IF;
      END;
    END IF;

    UPDATE national_cup_matches
    SET home_score = v_home_goals,
        away_score = v_away_goals,
        status = 'finished',
        winner_team_id = v_winner_id
    WHERE id::text = v_match_id
      AND status <> 'finished';
      
    -- Eliminar o perdedor
    UPDATE national_cup_teams
    SET eliminated = true
    WHERE id = (SELECT CASE WHEN winner_team_id = home_team_id THEN away_team_id ELSE home_team_id END 
                FROM national_cup_matches WHERE id::text = v_match_id);

  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$function$;