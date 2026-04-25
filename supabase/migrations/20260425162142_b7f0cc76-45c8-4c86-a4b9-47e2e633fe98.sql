
-- Remove helpers antigos do sistema "inteligente" anterior
DROP FUNCTION IF EXISTS public.calc_club_strength_from_save(jsonb);
DROP FUNCTION IF EXISTS public.target_division_for_strength(int);

-- Nova lógica: alocação simples na MELHOR DIVISÃO DISPONÍVEL
CREATE OR REPLACE FUNCTION public.assign_user_to_d1_on_save()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _country text;
  _club_name text;
  _logo text;
  _shield jsonb;
  _existing uuid;
  _try_div int;
  _league_id uuid;
  _team_count int;
  _victim_bot_id uuid;
BEGIN
  -- Já tem time no mundial? não realocar
  SELECT id INTO _existing
  FROM public.world_league_teams
  WHERE user_id = NEW.user_id
  LIMIT 1;
  IF _existing IS NOT NULL THEN RETURN NEW; END IF;

  _country := public.normalize_country(
    COALESCE(NEW.club_data->'club'->>'country', NEW.club_data->>'country', 'Brasil')
  );
  IF _country IS NULL THEN _country := 'Brasil'; END IF;

  _club_name := COALESCE(NEW.club_data->'club'->>'name', NEW.club_data->>'name', 'Manager FC');
  _logo := COALESCE(NEW.club_data->'club'->>'logo', NEW.club_data->>'logo', '⚽');
  _shield := COALESCE(NEW.club_data->'club'->'shield', NEW.club_data->'shield');

  -- Percorre da divisão mais alta para a mais baixa
  FOR _try_div IN 1..4 LOOP
    SELECT id INTO _league_id
    FROM public.world_leagues
    WHERE country = _country AND division = _try_div AND season = 1
    LIMIT 1;

    -- Fallback Brasil se país não tem essa divisão
    IF _league_id IS NULL THEN
      SELECT id INTO _league_id
      FROM public.world_leagues
      WHERE country = 'Brasil' AND division = _try_div AND season = 1
      LIMIT 1;
    END IF;

    IF _league_id IS NULL THEN CONTINUE; END IF;

    SELECT count(*) INTO _team_count
    FROM public.world_league_teams
    WHERE league_id = _league_id;

    -- Caso 1: liga tem espaço livre (< 20) → INSERT direto
    IF _team_count < 20 THEN
      IF EXISTS (
        SELECT 1 FROM public.world_league_teams
        WHERE league_id = _league_id AND club_name = _club_name
      ) THEN
        _club_name := _club_name || ' (' || substring(NEW.user_id::text, 1, 4) || ')';
      END IF;

      INSERT INTO public.world_league_teams (league_id, user_id, is_bot, club_name, club_logo, shield)
      VALUES (_league_id, NEW.user_id, false, _club_name, _logo, _shield)
      ON CONFLICT (league_id, club_name) DO NOTHING;
      RETURN NEW;
    END IF;

    -- Caso 2: liga cheia (20) → tenta substituir um bot
    SELECT id INTO _victim_bot_id
    FROM public.world_league_teams
    WHERE league_id = _league_id AND is_bot = true
    ORDER BY COALESCE(bot_strength, 60) ASC, created_at DESC
    LIMIT 1;

    IF _victim_bot_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.world_league_teams
        WHERE league_id = _league_id AND club_name = _club_name AND id <> _victim_bot_id
      ) THEN
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
      RETURN NEW;
    END IF;

    -- Liga cheia sem bots → desce para próxima divisão
  END LOOP;

  RETURN NEW;
END $$;
