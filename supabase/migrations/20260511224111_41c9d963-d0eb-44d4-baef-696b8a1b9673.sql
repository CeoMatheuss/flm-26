CREATE OR REPLACE FUNCTION public.is_match_participant(_user_id uuid, _shared_match_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ok boolean := false;
BEGIN
  IF _user_id IS NULL OR _shared_match_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.live_matches lm
    WHERE lm.shared_match_id = _shared_match_id
      AND lm.user_id = _user_id
  ) INTO _ok;
  IF _ok THEN RETURN true; END IF;

  IF to_regclass('public.friendly_invites') IS NOT NULL THEN
    EXECUTE '
      SELECT EXISTS (
        SELECT 1 FROM public.friendly_invites fi
        WHERE $1 = ''friendly-'' || fi.id::text
          AND (fi.sender_id = $2 OR fi.receiver_id = $2)
      )'
    INTO _ok USING _shared_match_id, _user_id;
    IF _ok THEN RETURN true; END IF;
  END IF;

  IF to_regclass('public.league_matches') IS NOT NULL THEN
    EXECUTE '
      SELECT EXISTS (
        SELECT 1 FROM public.league_matches lm2
        WHERE $1 = lm2.id::text
          AND (lm2.home_user_id = $2 OR lm2.away_user_id = $2)
      )'
    INTO _ok USING _shared_match_id, _user_id;
    IF _ok THEN RETURN true; END IF;
  END IF;

  IF to_regclass('public.world_matches') IS NOT NULL AND to_regclass('public.world_teams') IS NOT NULL THEN
    EXECUTE '
      SELECT EXISTS (
        SELECT 1
        FROM public.world_matches wm
        JOIN public.world_teams home_wt ON home_wt.id = wm.home_team_id
        JOIN public.world_teams away_wt ON away_wt.id = wm.away_team_id
        WHERE $1 = wm.id::text
          AND (home_wt.user_id = $2 OR away_wt.user_id = $2)
      )'
    INTO _ok USING _shared_match_id, _user_id;
    IF _ok THEN RETURN true; END IF;
  END IF;

  IF to_regclass('public.national_cup_matches') IS NOT NULL AND to_regclass('public.national_cup_teams') IS NOT NULL THEN
    EXECUTE '
      SELECT EXISTS (
        SELECT 1
        FROM public.national_cup_matches ncm
        JOIN public.national_cup_teams home_nct ON home_nct.id = ncm.home_team_id
        JOIN public.national_cup_teams away_nct ON away_nct.id = ncm.away_team_id
        WHERE $1 = ncm.id::text
          AND (home_nct.user_id = $2 OR away_nct.user_id = $2)
      )'
    INTO _ok USING _shared_match_id, _user_id;
    IF _ok THEN RETURN true; END IF;
  END IF;

  IF to_regclass('public.custom_tournament_matches') IS NOT NULL AND to_regclass('public.custom_tournament_teams') IS NOT NULL THEN
    EXECUTE '
      SELECT EXISTS (
        SELECT 1
        FROM public.custom_tournament_matches ctm
        JOIN public.custom_tournament_teams ctt ON ctt.id IN (ctm.home_team_id, ctm.away_team_id)
        WHERE $1 = ctm.id::text
          AND ctt.user_id = $2
      )'
    INTO _ok USING _shared_match_id, _user_id;
    IF _ok THEN RETURN true; END IF;
  END IF;

  IF to_regclass('public.cup_matches') IS NOT NULL AND to_regclass('public.cup_teams') IS NOT NULL THEN
    EXECUTE '
      SELECT EXISTS (
        SELECT 1
        FROM public.cup_matches cm
        JOIN public.cup_teams ct ON ct.id IN (cm.home_team_id, cm.away_team_id)
        WHERE $1 = cm.id::text
          AND ct.user_id = $2
      )'
    INTO _ok USING _shared_match_id, _user_id;
    IF _ok THEN RETURN true; END IF;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_home_user_for_match(_match_id text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uuid uuid;
  _home uuid;
BEGIN
  IF _match_id IS NULL THEN RETURN NULL; END IF;

  IF _match_id LIKE 'friendly-%' AND to_regclass('public.friendly_invites') IS NOT NULL THEN
    BEGIN
      _uuid := substring(_match_id from 10)::uuid;
    EXCEPTION WHEN others THEN
      RETURN NULL;
    END;
    EXECUTE 'SELECT home_team_id FROM public.friendly_invites WHERE id = $1'
      INTO _home USING _uuid;
    RETURN _home;
  END IF;

  BEGIN
    _uuid := _match_id::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  IF to_regclass('public.league_matches') IS NOT NULL THEN
    EXECUTE 'SELECT home_user_id FROM public.league_matches WHERE id = $1'
      INTO _home USING _uuid;
    IF _home IS NOT NULL THEN RETURN _home; END IF;
  END IF;

  IF to_regclass('public.world_matches') IS NOT NULL AND to_regclass('public.world_teams') IS NOT NULL THEN
    EXECUTE '
      SELECT home_wt.user_id
      FROM public.world_matches wm
      JOIN public.world_teams home_wt ON home_wt.id = wm.home_team_id
      WHERE wm.id = $1'
      INTO _home USING _uuid;
    IF _home IS NOT NULL THEN RETURN _home; END IF;
  END IF;

  IF to_regclass('public.national_cup_matches') IS NOT NULL AND to_regclass('public.national_cup_teams') IS NOT NULL THEN
    EXECUTE '
      SELECT home_nct.user_id
      FROM public.national_cup_matches ncm
      JOIN public.national_cup_teams home_nct ON home_nct.id = ncm.home_team_id
      WHERE ncm.id = $1'
      INTO _home USING _uuid;
    IF _home IS NOT NULL THEN RETURN _home; END IF;
  END IF;

  IF to_regclass('public.cup_matches') IS NOT NULL AND to_regclass('public.cup_teams') IS NOT NULL THEN
    EXECUTE '
      SELECT ct.user_id
      FROM public.cup_matches cm
      JOIN public.cup_teams ct ON ct.id = cm.home_team_id
      WHERE cm.id = $1'
      INTO _home USING _uuid;
    IF _home IS NOT NULL THEN RETURN _home; END IF;
  END IF;

  IF to_regclass('public.custom_tournament_matches') IS NOT NULL AND to_regclass('public.custom_tournament_teams') IS NOT NULL THEN
    EXECUTE '
      SELECT ctt.user_id
      FROM public.custom_tournament_matches ctm
      JOIN public.custom_tournament_teams ctt ON ctt.id = ctm.home_team_id
      WHERE ctm.id = $1'
      INTO _home USING _uuid;
    IF _home IS NOT NULL THEN RETURN _home; END IF;
  END IF;

  RETURN NULL;
END;
$$;