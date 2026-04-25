-- Adicionar coluna shared_match_id em live_match_substitutions
-- Permite sincronizar substituições entre jogadores que têm live_matches.id diferentes
-- mas compartilham o mesmo shared_match_id (multiplayer matches).

ALTER TABLE public.live_match_substitutions
  ADD COLUMN IF NOT EXISTS shared_match_id text;

CREATE INDEX IF NOT EXISTS idx_live_match_substitutions_shared
  ON public.live_match_substitutions(shared_match_id);

-- Trigger para preencher automaticamente shared_match_id a partir do live_matches
CREATE OR REPLACE FUNCTION public.fill_sub_shared_match_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.shared_match_id IS NULL AND NEW.live_match_id IS NOT NULL THEN
    SELECT COALESCE(shared_match_id, match_id)
      INTO NEW.shared_match_id
    FROM public.live_matches
    WHERE id = NEW.live_match_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_sub_shared_match_id ON public.live_match_substitutions;
CREATE TRIGGER trg_fill_sub_shared_match_id
  BEFORE INSERT ON public.live_match_substitutions
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_sub_shared_match_id();

-- Backfill existing rows
UPDATE public.live_match_substitutions s
SET shared_match_id = COALESCE(lm.shared_match_id, lm.match_id)
FROM public.live_matches lm
WHERE s.live_match_id = lm.id
  AND s.shared_match_id IS NULL;

-- Atualizar RLS para permitir SELECT por shared_match_id também
-- (usuário pode ver subs de qualquer live_match com o mesmo shared_match_id em que ele participa)
DROP POLICY IF EXISTS "Match participants can view substitutions" ON public.live_match_substitutions;
CREATE POLICY "Match participants can view substitutions"
  ON public.live_match_substitutions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_matches lm
      WHERE lm.id = live_match_substitutions.live_match_id
        AND (
          lm.user_id = auth.uid()
          OR (lm.shared_match_id IS NOT NULL
              AND public.is_match_participant(auth.uid(), lm.shared_match_id))
        )
    )
    OR (
      shared_match_id IS NOT NULL
      AND public.is_match_participant(auth.uid(), shared_match_id)
    )
  );