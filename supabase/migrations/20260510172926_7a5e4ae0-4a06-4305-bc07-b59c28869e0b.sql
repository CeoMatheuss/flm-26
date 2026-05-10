-- Update auto_assign_league to include country in league_members
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

  -- Insere o jogador como membro (AGORA COM COUNTRY)
  INSERT INTO league_members (
    league_id, user_id, club_name, club_logo, country,
    points, wins, draws, losses, goals_for, goals_against, played,
    reputation, budget
  ) VALUES (
    _league_id, _user_id, _club_name, '⚽', _country,
    0, 0, 0, 0, 0, 0, 0,
    65, 1000000
  );

  RETURN _league_id;
END;
$$;
