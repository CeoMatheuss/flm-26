-- Gatilho: ao mudar status para 'accepted', garante auto_sim_at preenchido
CREATE OR REPLACE FUNCTION public.set_friendly_auto_sim_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND NEW.auto_sim_at IS NULL THEN
    -- usa match_date como fonte da verdade; fallback now()+5min
    NEW.auto_sim_at := COALESCE(NEW.match_date, now() + interval '5 minutes');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_friendly_auto_sim_at ON public.friendly_invites;
CREATE TRIGGER trg_friendly_auto_sim_at
BEFORE INSERT OR UPDATE OF status ON public.friendly_invites
FOR EACH ROW
EXECUTE FUNCTION public.set_friendly_auto_sim_at();

-- Backfill: amistosos já aceitos sem auto_sim_at
UPDATE public.friendly_invites
SET auto_sim_at = COALESCE(match_date, now())
WHERE status = 'accepted' AND auto_sim_at IS NULL AND match_result IS NULL;