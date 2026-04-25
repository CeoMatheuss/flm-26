-- 1) Limpeza imediata de live_matches travadas (>30 min)
UPDATE public.live_matches
SET status = 'abandoned', finished_at = now()
WHERE status = 'live' AND started_at < now() - interval '30 minutes';

-- 2) Habilita realtime para torneios customizados (idempotente)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_tournament_matches;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_tournament_teams;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 3) Proteção do game_saves: restringe SELECT amplo, cria visão pública mínima
DROP POLICY IF EXISTS "Anyone authenticated can view saves for profiles" ON public.game_saves;

CREATE POLICY "Owners can view own saves"
ON public.game_saves
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all saves"
ON public.game_saves
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- View pública somente com dados de perfil de clube (sem finanças/táticas)
CREATE OR REPLACE VIEW public.public_club_profiles
WITH (security_invoker = false)
AS
SELECT
  gs.user_id,
  gs.updated_at,
  gs.club_data->>'name'            AS club_name,
  gs.club_data->>'logo'            AS club_logo,
  gs.club_data->>'country'         AS country,
  gs.club_data->>'stadium'         AS stadium,
  (gs.club_data->>'reputation')::int AS reputation,
  (gs.club_data->>'fans')::int     AS fans,
  (gs.club_data->>'members')::int  AS members
FROM public.game_saves gs;

GRANT SELECT ON public.public_club_profiles TO authenticated, anon;

-- 4) Cooldown de 30s entre ofertas do mesmo comprador para jogadores livres
CREATE OR REPLACE FUNCTION public.enforce_free_agent_offer_cooldown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_offer_at timestamptz;
BEGIN
  SELECT max(created_at) INTO last_offer_at
  FROM public.free_agent_offers
  WHERE buyer_id = NEW.buyer_id
    AND created_at > now() - interval '30 seconds';

  IF last_offer_at IS NOT NULL THEN
    RAISE EXCEPTION 'Aguarde alguns segundos antes de enviar outra proposta para um jogador livre.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_free_agent_offer_cooldown ON public.free_agent_offers;
CREATE TRIGGER trg_enforce_free_agent_offer_cooldown
BEFORE INSERT ON public.free_agent_offers
FOR EACH ROW
EXECUTE FUNCTION public.enforce_free_agent_offer_cooldown();

CREATE INDEX IF NOT EXISTS idx_free_agent_offers_buyer_created
ON public.free_agent_offers (buyer_id, created_at DESC);

-- Limpeza periódica via pg_cron (opcional, ignora se extensão indisponível)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('flm26-cleanup-live-matches')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'flm26-cleanup-live-matches');

    PERFORM cron.schedule(
      'flm26-cleanup-live-matches',
      '*/5 * * * *',
      $cron$
        UPDATE public.live_matches
        SET status='abandoned', finished_at=now()
        WHERE status='live' AND started_at < now() - interval '30 minutes';
      $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron pode não estar habilitado; ignora silenciosamente
  NULL;
END $$;