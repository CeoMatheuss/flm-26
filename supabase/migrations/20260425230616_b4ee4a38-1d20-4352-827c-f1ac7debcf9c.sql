
-- ============================================================================
-- FASE 1: Sistema de Ligas D1-D4 (30 países × 4 divisões × 20 clubes)
-- ============================================================================

-- 1) Migrar a liga "Várzea" existente (BR Várzea) para D1 do BR, mantendo membros
UPDATE public.multiplayer_leagues
SET 
  tier = 'nacional',
  division = 1,
  league_type = 'main',
  total_rounds = 30,
  max_members = 20,
  match_time = '19:00',
  name = country || ' Série A',
  round_interval_hours = 24
WHERE tier = 'varzea' OR league_type = 'beginner';

-- 2) Padroniza horário por divisão para todas as ligas existentes auto-criadas
UPDATE public.multiplayer_leagues
SET match_time = CASE division
  WHEN 1 THEN '19:00'
  WHEN 2 THEN '18:00'
  WHEN 3 THEN '17:00'
  WHEN 4 THEN '16:00'
  ELSE match_time
END,
total_rounds = 30,
max_members = 20,
round_interval_hours = 24
WHERE auto_created = true AND division BETWEEN 1 AND 4;

-- 3) Função utilitária: preenche uma liga com bots até max_members
CREATE OR REPLACE FUNCTION public.fill_league_with_bots(_league_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _league RECORD;
  _current_count int;
  _needed int;
  _bot_name text;
  _bot_logo text;
  _bot_strength int;
  _i int;
  _bot_idx int;
  _added int := 0;
BEGIN
  SELECT * INTO _league FROM public.multiplayer_leagues WHERE id = _league_id;
  IF _league IS NULL THEN RETURN 0; END IF;

  SELECT count(*) INTO _current_count FROM public.league_members WHERE league_id = _league_id;
  _needed := COALESCE(_league.max_members, 20) - _current_count;
  IF _needed <= 0 THEN RETURN 0; END IF;

  SELECT count(*) INTO _bot_idx FROM public.league_members WHERE league_id = _league_id;

  FOR _i IN 1.._needed LOOP
    _bot_idx := _bot_idx + 1;
    _bot_name := public.generate_bot_club_name(COALESCE(_league.country, 'Brasil'), _bot_idx);
    _bot_logo := public.random_bot_logo();
    _bot_strength := public.bot_strength_for_division(COALESCE(_league.division, 1));

    INSERT INTO public.league_members (
      league_id, user_id, club_name, club_logo,
      points, wins, draws, losses, goals_for, goals_against, played,
      reputation, budget
    ) VALUES (
      _league_id, NULL,
      _bot_name || ' BOT', _bot_logo,
      0, 0, 0, 0, 0, 0, 0,
      _bot_strength, 1000000
    );
    _added := _added + 1;
  END LOOP;

  RETURN _added;
END;
$$;

-- 4) Atualiza auto_assign_league: D1 padrão; cria D2-D4 sob demanda
CREATE OR REPLACE FUNCTION public.auto_assign_league(_user_id uuid, _club_name text, _country text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _league_id uuid;
  _code text;
  _country_status record;
  _div int;
  _division_names text[] := ARRAY['Série A', 'Série B', 'Série C', 'Série D'];
  _match_times text[] := ARRAY['19:00', '18:00', '17:00', '16:00'];
BEGIN
  -- Já está em alguma liga deste país?
  SELECT lm.league_id INTO _league_id
  FROM league_members lm
  JOIN multiplayer_leagues ml ON ml.id = lm.league_id
  WHERE lm.user_id = _user_id AND ml.country = _country
  LIMIT 1;

  IF _league_id IS NOT NULL THEN
    RETURN _league_id;
  END IF;

  -- País bloqueado?
  SELECT * INTO _country_status FROM country_status WHERE country = _country;
  IF _country_status IS NOT NULL AND _country_status.is_locked THEN
    RAISE EXCEPTION 'Este país está lotado. Escolha outro ou aguarde o próximo mês.';
  END IF;

  -- Procura D1 com vaga (primeiro), depois D2, D3, D4
  FOR _div IN 1..4 LOOP
    SELECT ml.id INTO _league_id
    FROM multiplayer_leagues ml
    WHERE ml.country = _country
      AND ml.tier = 'nacional'
      AND ml.division = _div
      AND ml.auto_created = true
      AND ml.season_status IN ('registration', 'waiting')
      AND (SELECT count(*) FROM league_members lm2 WHERE lm2.league_id = ml.id AND lm2.user_id IS NOT NULL) < ml.max_members
    ORDER BY ml.created_at ASC
    LIMIT 1;

    IF _league_id IS NOT NULL THEN
      EXIT;
    END IF;
  END LOOP;

  -- Não achou? Cria a próxima divisão necessária (começa pela D1)
  IF _league_id IS NULL THEN
    SELECT COALESCE(max(division), 0) + 1 INTO _div
    FROM multiplayer_leagues
    WHERE country = _country AND tier = 'nacional' AND auto_created = true;
    _div := LEAST(GREATEST(_div, 1), 4);

    _code := upper(substr(md5(random()::text), 1, 6));

    INSERT INTO multiplayer_leagues (
      name, code, owner_id, country, auto_created, max_members, status,
      league_type, total_rounds, season_status, division, tier, tier_level,
      match_time, round_interval_hours
    ) VALUES (
      _country || ' ' || _division_names[_div],
      _code, _user_id, _country, true, 20, 'waiting',
      'main', 30, 'registration', _div, 'nacional', _div,
      _match_times[_div], 24
    )
    RETURNING id INTO _league_id;
  END IF;

  -- Insere o jogador como membro
  INSERT INTO league_members (
    league_id, user_id, club_name, club_logo,
    points, wins, draws, losses, goals_for, goals_against, played,
    reputation, budget
  ) VALUES (
    _league_id, _user_id, _club_name, '⚽',
    0, 0, 0, 0, 0, 0, 0,
    65, 1000000
  );

  RETURN _league_id;
END;
$$;

-- 5) process_season_transition: promove top 4 / rebaixa últimos 4 entre divisões
CREATE OR REPLACE FUNCTION public.process_season_transition(_country text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _league RECORD;
  _player RECORD;
  _position integer;
  _reward bigint;
  _base_rewards bigint[] := ARRAY[
    20000000, 17000000, 14500000, 12500000, 11000000,
    10000000,  9200000,  8400000,  7800000,  7200000,
     6600000,  6000000,  5400000,  4800000,  4200000,
     3600000,  3000000,  2400000,  1800000,  1200000
  ];
  _divisor numeric;
  _pos_index integer;
  _target_league_id uuid;
  _next_division int;
  _prev_division int;
BEGIN
  -- Distribui prêmios em todas as ligas finalizadas
  FOR _league IN
    SELECT id, division, season, league_type, country
    FROM multiplayer_leagues
    WHERE country = _country
      AND season_status = 'finished'
      AND league_type = 'main'
      AND tier = 'nacional'
    ORDER BY division ASC
  LOOP
    _position := 0;
    FOR _player IN
      SELECT lm.id as member_db_id, lm.user_id, lm.points, lm.goals_for, lm.goals_against
      FROM league_members lm
      WHERE lm.league_id = _league.id
      ORDER BY lm.points DESC, (lm.goals_for - lm.goals_against) DESC, lm.goals_for DESC
    LOOP
      _position := _position + 1;
      _divisor := CASE COALESCE(_league.division, 1)
        WHEN 1 THEN 1.0
        WHEN 2 THEN 2.0
        WHEN 3 THEN 4.0
        ELSE 10.0
      END;
      _pos_index := LEAST(_position, 20);
      _reward := (_base_rewards[_pos_index] / _divisor)::bigint;
      UPDATE league_members SET budget = budget + _reward WHERE id = _player.member_db_id;
    END LOOP;
  END LOOP;

  -- Promoção (top 4) para divisão anterior (div-1) e Rebaixamento (bottom 4) para div+1
  FOR _league IN
    SELECT id, division, country
    FROM multiplayer_leagues
    WHERE country = _country
      AND season_status = 'finished'
      AND league_type = 'main'
      AND tier = 'nacional'
      AND division BETWEEN 1 AND 4
    ORDER BY division ASC
  LOOP
    _next_division := _league.division + 1;
    _prev_division := _league.division - 1;

    -- Promoção: top 4 → div-1 (se existir)
    IF _prev_division >= 1 THEN
      SELECT id INTO _target_league_id
      FROM multiplayer_leagues
      WHERE country = _country AND tier = 'nacional' AND division = _prev_division AND auto_created = true
      LIMIT 1;

      IF _target_league_id IS NOT NULL THEN
        UPDATE league_members
        SET league_id = _target_league_id
        WHERE id IN (
          SELECT lm.id FROM league_members lm
          WHERE lm.league_id = _league.id AND lm.user_id IS NOT NULL
          ORDER BY lm.points DESC, (lm.goals_for - lm.goals_against) DESC, lm.goals_for DESC
          LIMIT 4
        );
      END IF;
    END IF;

    -- Rebaixamento: bottom 4 → div+1 (se existir)
    IF _next_division <= 4 THEN
      SELECT id INTO _target_league_id
      FROM multiplayer_leagues
      WHERE country = _country AND tier = 'nacional' AND division = _next_division AND auto_created = true
      LIMIT 1;

      IF _target_league_id IS NOT NULL THEN
        UPDATE league_members
        SET league_id = _target_league_id
        WHERE id IN (
          SELECT lm.id FROM league_members lm
          WHERE lm.league_id = _league.id AND lm.user_id IS NOT NULL
          ORDER BY lm.points ASC, (lm.goals_for - lm.goals_against) ASC, lm.goals_for ASC
          LIMIT 4
        );
      END IF;
    END IF;
  END LOOP;

  -- Reset stats e avança temporada
  UPDATE league_members lm
  SET points = 0, wins = 0, draws = 0, losses = 0, goals_for = 0, goals_against = 0, played = 0
  FROM multiplayer_leagues ml
  WHERE lm.league_id = ml.id
    AND ml.country = _country
    AND ml.season_status = 'finished'
    AND ml.league_type = 'main'
    AND ml.tier = 'nacional';

  DELETE FROM league_matches lm
  USING multiplayer_leagues ml
  WHERE lm.league_id = ml.id
    AND ml.country = _country
    AND ml.season_status = 'finished'
    AND ml.league_type = 'main'
    AND ml.tier = 'nacional';

  UPDATE multiplayer_leagues
  SET season = season + 1,
      season_status = 'registration',
      current_round = 0,
      season_start = NULL,
      season_end = NULL
  WHERE country = _country
    AND season_status = 'finished'
    AND league_type = 'main'
    AND tier = 'nacional';
END;
$$;

-- 6) redistribute_beginners: envia para divisão mais baixa com vaga
CREATE OR REPLACE FUNCTION public.redistribute_beginners(_country text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _beginner_member RECORD;
  _target_league_id uuid;
  _div int;
BEGIN
  FOR _beginner_member IN
    SELECT lm.id as member_id, lm.user_id, lm.club_name, lm.club_logo, lm.reputation
    FROM league_members lm
    JOIN multiplayer_leagues ml ON ml.id = lm.league_id
    WHERE ml.country = _country
      AND ml.league_type = 'beginner'
      AND ml.season_status = 'finished'
    ORDER BY lm.reputation DESC
  LOOP
    -- Procura D4 → D3 → D2 → D1 com vaga
    FOR _div IN REVERSE 4..1 LOOP
      SELECT ml.id INTO _target_league_id
      FROM multiplayer_leagues ml
      WHERE ml.country = _country
        AND ml.tier = 'nacional'
        AND ml.division = _div
        AND ml.auto_created = true
        AND ml.season_status IN ('registration', 'waiting')
        AND (SELECT count(*) FROM league_members lm2 WHERE lm2.league_id = ml.id AND lm2.user_id IS NOT NULL) < ml.max_members
      LIMIT 1;
      IF _target_league_id IS NOT NULL THEN EXIT; END IF;
    END LOOP;

    IF _target_league_id IS NOT NULL THEN
      UPDATE league_members
      SET league_id = _target_league_id, points = 0, wins = 0, draws = 0,
          losses = 0, goals_for = 0, goals_against = 0, played = 0
      WHERE id = _beginner_member.member_id;
    END IF;
  END LOOP;
END;
$$;
