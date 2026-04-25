-- 1) MIGRAR humanos para D1
DO $$
DECLARE
  _team RECORD;
  _d1_id uuid;
  _victim_bot_id uuid;
  _old_league_id uuid;
  _old_division int;
  _new_bot_name text;
  _attempt int;
BEGIN
  FOR _team IN
    SELECT wlt.id, wlt.user_id, wl.country, wl.division, wlt.league_id
    FROM public.world_league_teams wlt
    JOIN public.world_leagues wl ON wl.id = wlt.league_id
    WHERE wlt.user_id IS NOT NULL
      AND wl.season = 1
      AND wl.division <> 1
  LOOP
    SELECT id INTO _d1_id
    FROM public.world_leagues
    WHERE country = _team.country AND division = 1 AND season = 1
    LIMIT 1;
    IF _d1_id IS NULL THEN CONTINUE; END IF;

    _old_league_id := _team.league_id;
    _old_division := _team.division;

    SELECT id INTO _victim_bot_id
    FROM public.world_league_teams
    WHERE league_id = _d1_id AND is_bot = true
    ORDER BY bot_strength ASC, created_at DESC
    LIMIT 1;

    IF _victim_bot_id IS NOT NULL THEN
      -- Gera nome único para o bot na liga antiga
      _attempt := 1;
      LOOP
        _new_bot_name := public.generate_bot_club_name(_team.country, 9000 + _attempt);
        EXIT WHEN NOT EXISTS (
          SELECT 1 FROM public.world_league_teams
          WHERE league_id = _old_league_id AND club_name = _new_bot_name
        );
        _attempt := _attempt + 1;
        EXIT WHEN _attempt > 500;
      END LOOP;

      UPDATE public.world_league_teams
      SET league_id = _old_league_id,
          club_name = _new_bot_name,
          bot_strength = public.bot_strength_for_division(_old_division),
          points = 0, wins = 0, draws = 0, losses = 0,
          goals_for = 0, goals_against = 0, played = 0
      WHERE id = _victim_bot_id;
    END IF;

    UPDATE public.world_league_teams
    SET league_id = _d1_id,
        points = 0, wins = 0, draws = 0, losses = 0,
        goals_for = 0, goals_against = 0, played = 0
    WHERE id = _team.id;
  END LOOP;
END $$;

-- 2) Trigger para novos saves
CREATE OR REPLACE FUNCTION public.assign_user_to_d1_on_save()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _country text;
  _club_name text;
  _logo text;
  _shield jsonb;
  _d1_id uuid;
  _existing uuid;
  _victim_bot_id uuid;
BEGIN
  SELECT id INTO _existing
  FROM public.world_league_teams
  WHERE user_id = NEW.user_id
  LIMIT 1;
  IF _existing IS NOT NULL THEN RETURN NEW; END IF;

  _country := public.normalize_country(
    coalesce(NEW.club_data->'club'->>'country', NEW.club_data->>'country', 'Brasil')
  );
  _club_name := coalesce(NEW.club_data->'club'->>'name', NEW.club_data->>'name', 'Manager FC');
  _logo := coalesce(NEW.club_data->'club'->>'logo', NEW.club_data->>'logo', '⚽');
  _shield := coalesce(NEW.club_data->'club'->'shield', NEW.club_data->'shield');

  SELECT id INTO _d1_id
  FROM public.world_leagues
  WHERE country = _country AND division = 1 AND season = 1
  LIMIT 1;
  IF _d1_id IS NULL THEN
    SELECT id INTO _d1_id FROM public.world_leagues
    WHERE country = 'Brasil' AND division = 1 AND season = 1 LIMIT 1;
  END IF;
  IF _d1_id IS NULL THEN RETURN NEW; END IF;

  SELECT id INTO _victim_bot_id
  FROM public.world_league_teams
  WHERE league_id = _d1_id AND is_bot = true
  ORDER BY bot_strength ASC, created_at DESC
  LIMIT 1;

  IF _victim_bot_id IS NOT NULL THEN
    -- Evita colisão de nome: se já existir o nome, dá um sufixo único
    IF EXISTS (SELECT 1 FROM public.world_league_teams
               WHERE league_id = _d1_id AND club_name = _club_name AND id <> _victim_bot_id) THEN
      _club_name := _club_name || ' (' || substring(NEW.user_id::text, 1, 4) || ')';
    END IF;

    UPDATE public.world_league_teams
    SET user_id = NEW.user_id,
        is_bot = false,
        bot_strength = NULL,
        club_name = _club_name,
        club_logo = _logo,
        shield = _shield,
        points = 0, wins = 0, draws = 0, losses = 0,
        goals_for = 0, goals_against = 0, played = 0
    WHERE id = _victim_bot_id;
  ELSE
    INSERT INTO public.world_league_teams (league_id, user_id, is_bot, club_name, club_logo, shield)
    VALUES (_d1_id, NEW.user_id, false, _club_name, _logo, _shield)
    ON CONFLICT (league_id, club_name) DO NOTHING;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_assign_user_to_d1 ON public.game_saves;
CREATE TRIGGER trg_assign_user_to_d1
AFTER INSERT ON public.game_saves
FOR EACH ROW
EXECUTE FUNCTION public.assign_user_to_d1_on_save();