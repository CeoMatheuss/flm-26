-- 1) Adicionar colunas de stadium snapshot em live_matches
ALTER TABLE public.live_matches
  ADD COLUMN IF NOT EXISTS attendance integer,
  ADD COLUMN IF NOT EXISTS ticket_revenue bigint;

-- 2) Função para resolver o mandante a partir do matchId
CREATE OR REPLACE FUNCTION public.resolve_home_user_for_match(_match_id text)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uuid uuid;
  _home uuid;
BEGIN
  -- Friendly: matchId = 'friendly-<inviteId>'
  IF _match_id LIKE 'friendly-%' THEN
    BEGIN
      _uuid := substring(_match_id from 10)::uuid;
    EXCEPTION WHEN others THEN RETURN NULL;
    END;
    SELECT home_team_id INTO _home FROM public.friendly_invites WHERE id = _uuid;
    RETURN _home;
  END IF;

  -- Tentar como UUID puro
  BEGIN
    _uuid := _match_id::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  -- League match
  SELECT home_user_id INTO _home FROM public.league_matches WHERE id = _uuid;
  IF _home IS NOT NULL THEN RETURN _home; END IF;

  -- Cup match → home_team_id → cup_teams.user_id
  SELECT ct.user_id INTO _home
  FROM public.cup_matches cm
  JOIN public.cup_teams ct ON ct.id = cm.home_team_id
  WHERE cm.id = _uuid;
  IF _home IS NOT NULL THEN RETURN _home; END IF;

  -- Custom tournament match
  SELECT ctt.user_id INTO _home
  FROM public.custom_tournament_matches ctm
  JOIN public.custom_tournament_teams ctt ON ctt.id = ctm.home_team_id
  WHERE ctm.id = _uuid;
  IF _home IS NOT NULL THEN RETURN _home; END IF;

  RETURN NULL;
END;
$$;

-- 3) RESET TOTAL
TRUNCATE TABLE
  public.live_matches,
  public.match_history,
  public.match_reports,
  public.league_matches,
  public.league_members,
  public.multiplayer_leagues,
  public.cup_matches,
  public.cup_teams,
  public.cup_competitions,
  public.custom_tournament_matches,
  public.custom_tournament_teams,
  public.custom_tournaments,
  public.player_auctions,
  public.auction_bids,
  public.transfer_listings,
  public.transfer_offers,
  public.free_agent_offers,
  public.friendly_invites,
  public.user_notifications,
  public.suspicious_activity,
  public.game_saves,
  public.country_status,
  public.user_versions
RESTART IDENTITY CASCADE;