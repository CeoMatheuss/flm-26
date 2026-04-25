
-- Helper: força inicial do clube a partir do club_data salvo (top 11 não lesionados)
CREATE OR REPLACE FUNCTION public.calc_club_strength_from_save(_club_data jsonb)
RETURNS int
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  _players jsonb;
  _strength int;
BEGIN
  _players := COALESCE(_club_data->'players', _club_data->'club'->'players');
  IF _players IS NULL OR jsonb_typeof(_players) <> 'array' OR jsonb_array_length(_players) = 0 THEN
    RETURN 65; -- default neutro
  END IF;

  SELECT COALESCE(round(avg(ovr))::int, 65)
  INTO _strength
  FROM (
    SELECT COALESCE(
      NULLIF((p->>'overall'),'')::int,
      NULLIF((p->>'ovr'),'')::int,
      65
    ) AS ovr
    FROM jsonb_array_elements(_players) p
    WHERE COALESCE((p->>'injured')::boolean, false) = false
    ORDER BY ovr DESC
    LIMIT 11
  ) t;

  RETURN COALESCE(_strength, 65);
END $$;

-- Mapeia força -> divisão alvo
CREATE OR REPLACE FUNCTION public.target_division_for_strength(_strength int)
RETURNS int
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _strength >= 78 THEN 1
    WHEN _strength >= 70 THEN 2
    WHEN _strength >= 62 THEN 3
    ELSE 4
  END;
$$;

-- Substitui o trigger de alocação por versão inteligente
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
  _strength int;
  _target_div int;
  _try_div int;
  _league_id uuid;
  _existing uuid;
  _victim_bot_id uuid;
  _victim_strength int;
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

  _strength := public.calc_club_strength_from_save(NEW.club_data);
  _target_div := public.target_division_for_strength(_strength);

  -- Tenta alocar começando pela divisão alvo, descendo se não houver bot mais fraco
  -- (preferência por colocar humano em divisão compatível com sua força)
  FOR _try_div IN _target_div..4 LOOP
    SELECT id INTO _league_id
    FROM public.world_leagues
    WHERE country = _country AND division = _try_div AND season = 1
    LIMIT 1;

    IF _league_id IS NULL THEN
      -- Fallback Brasil
      SELECT id INTO _league_id
      FROM public.world_leagues
      WHERE country = 'Brasil' AND division = _try_div AND season = 1
      LIMIT 1;
    END IF;

    IF _league_id IS NULL THEN CONTINUE; END IF;

    -- Procura bot mais fraco que o humano (balanceamento)
    SELECT id, COALESCE(bot_strength, 60)
    INTO _victim_bot_id, _victim_strength
    FROM public.world_league_teams
    WHERE league_id = _league_id
      AND is_bot = true
      AND COALESCE(bot_strength, 60) <= _strength
    ORDER BY COALESCE(bot_strength, 60) ASC, created_at DESC
    LIMIT 1;

    -- Se não há bot fraco aqui mas é a última divisão (4), pega o mais fraco mesmo assim
    IF _victim_bot_id IS NULL AND _try_div = 4 THEN
      SELECT id, COALESCE(bot_strength, 60)
      INTO _victim_bot_id, _victim_strength
      FROM public.world_league_teams
      WHERE league_id = _league_id AND is_bot = true
      ORDER BY COALESCE(bot_strength, 60) ASC, created_at DESC
      LIMIT 1;
    END IF;

    IF _victim_bot_id IS NOT NULL THEN
      -- Evita colisão de nome
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
    -- Sem bot adequado, tenta próxima divisão (mais baixa)
  END LOOP;

  -- Último fallback: insere direto (caso algo dê errado)
  SELECT id INTO _league_id
  FROM public.world_leagues
  WHERE country = _country AND division = 4 AND season = 1
  LIMIT 1;
  IF _league_id IS NOT NULL THEN
    INSERT INTO public.world_league_teams (league_id, user_id, is_bot, club_name, club_logo, shield)
    VALUES (_league_id, NEW.user_id, false, _club_name, _logo, _shield)
    ON CONFLICT (league_id, club_name) DO NOTHING;
  END IF;

  RETURN NEW;
END $$;
