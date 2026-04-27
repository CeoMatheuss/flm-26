-- Helper: publica uma notícia para um clube (humano ou bot) sem quebrar RLS
CREATE OR REPLACE FUNCTION public.publish_newspaper_event(
  _user_id uuid,
  _category text,
  _text text,
  _image_key text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bots não têm user_id, então pulamos para não violar NOT NULL.
  IF _user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.newspaper_entries (user_id, category, text, is_event, image_key)
  VALUES (_user_id, _category, _text, true, _image_key);
END;
$$;

-- ───────────── LIGA: campeão quando temporada termina ─────────────
CREATE OR REPLACE FUNCTION public.broadcast_league_champion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _champ RECORD;
  _is_early boolean;
  _played_total int;
  _expected_total int;
  _img_key text;
  _headline text;
  _body text;
BEGIN
  IF NEW.season_status = 'finished' AND COALESCE(OLD.season_status, '') <> 'finished' THEN
    -- Pega líder da liga (campeão)
    SELECT user_id, club_name, points, played
      INTO _champ
    FROM public.league_members
    WHERE league_id = NEW.id
    ORDER BY points DESC NULLS LAST, (goals_for - goals_against) DESC NULLS LAST
    LIMIT 1;

    IF _champ.club_name IS NULL THEN
      RETURN NEW;
    END IF;

    -- Detecta título antecipado: somatório de jogos disputados < total esperado
    SELECT COALESCE(sum(played), 0) INTO _played_total
      FROM public.league_members WHERE league_id = NEW.id;
    _expected_total := COALESCE(NEW.total_rounds, 0) * COALESCE(NEW.max_members, 20);
    _is_early := _expected_total > 0 AND _played_total < _expected_total - COALESCE(NEW.max_members, 20);

    IF _is_early THEN
      _img_key := 'league_champion_early';
      _headline := '🏆 CAMPEÃO ANTECIPADO!';
      _body := _champ.club_name || ' conquista o título de ' || NEW.name || ' com rodadas de antecedência!';
    ELSE
      _img_key := 'league_champion';
      _headline := '🏆 CAMPEÃO!';
      _body := _champ.club_name || ' é o campeão de ' || NEW.name || ' na temporada ' || COALESCE(NEW.season, 1) || '!';
    END IF;

    -- Publica para o campeão (se humano)
    PERFORM public.publish_newspaper_event(_champ.user_id, 'CAMPEÃO', _headline || E'\n\n' || _body, _img_key);

    -- Publica também para todos os outros humanos da mesma liga (para feed global ficar visível)
    INSERT INTO public.newspaper_entries (user_id, category, text, is_event, image_key)
    SELECT lm.user_id, 'CAMPEÃO', _headline || E'\n\n' || _body, true, _img_key
    FROM public.league_members lm
    WHERE lm.league_id = NEW.id
      AND lm.user_id IS NOT NULL
      AND lm.user_id <> COALESCE(_champ.user_id, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_league_champion ON public.multiplayer_leagues;
CREATE TRIGGER trg_broadcast_league_champion
  AFTER UPDATE OF season_status ON public.multiplayer_leagues
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_league_champion();

-- ───────────── COPAS: campeão quando copa termina ─────────────
CREATE OR REPLACE FUNCTION public.broadcast_cup_champion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _winner_team RECORD;
  _img_key text;
  _category text;
  _headline text;
  _body text;
  _final_match RECORD;
  _winner_team_id uuid;
BEGIN
  IF NEW.status = 'finished' AND COALESCE(OLD.status, '') <> 'finished' THEN
    -- Tenta achar o campeão pela final (último round)
    SELECT * INTO _final_match
    FROM public.cup_matches
    WHERE cup_id = NEW.id AND status = 'finished'
    ORDER BY round DESC, played_at DESC NULLS LAST
    LIMIT 1;

    IF _final_match.id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Decide vencedor
    IF (_final_match.match_data->>'winner_team_id') IS NOT NULL THEN
      _winner_team_id := (_final_match.match_data->>'winner_team_id')::uuid;
    ELSIF COALESCE(_final_match.home_goals, 0) >= COALESCE(_final_match.away_goals, 0) THEN
      _winner_team_id := _final_match.home_team_id;
    ELSE
      _winner_team_id := _final_match.away_team_id;
    END IF;

    SELECT user_id, club_name INTO _winner_team
    FROM public.cup_teams
    WHERE id = _winner_team_id;

    IF _winner_team.club_name IS NULL THEN
      RETURN NEW;
    END IF;

    -- Tipo de copa define visual e categoria
    IF NEW.cup_type IN ('continental', 'world', 'club_world_cup', 'international') THEN
      _img_key := 'international_champion';
      _category := 'COPA';
      _headline := '🌍 CAMPEÃO INTERNACIONAL!';
    ELSE
      _img_key := 'cup_champion';
      _category := 'COPA';
      _headline := '🏆 CAMPEÃO DE COPA!';
    END IF;
    _body := _winner_team.club_name || ' vence a final e levanta o troféu de ' || COALESCE(NEW.name, 'Copa') || '!';

    PERFORM public.publish_newspaper_event(_winner_team.user_id, _category, _headline || E'\n\n' || _body, _img_key);

    -- Publica também para todos os outros humanos que participaram dessa copa
    INSERT INTO public.newspaper_entries (user_id, category, text, is_event, image_key)
    SELECT DISTINCT ct.user_id, _category, _headline || E'\n\n' || _body, true, _img_key
    FROM public.cup_teams ct
    WHERE ct.cup_id = NEW.id
      AND ct.user_id IS NOT NULL
      AND ct.user_id <> COALESCE(_winner_team.user_id, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_cup_champion ON public.cup_competitions;
CREATE TRIGGER trg_broadcast_cup_champion
  AFTER UPDATE OF status ON public.cup_competitions
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_cup_champion();