
ALTER TABLE public.world_leagues
  ADD COLUMN IF NOT EXISTS kickoff_minute INTEGER NOT NULL DEFAULT 0;

-- Função determinística que retorna (hora, minuto) BRT para (país, divisão)
CREATE OR REPLACE FUNCTION public.world_leagues_kickoff_for(
  _country TEXT,
  _division INTEGER
) RETURNS TABLE(h INTEGER, m INTEGER)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  base_hour INTEGER;
  hash_val INTEGER;
BEGIN
  -- Hash estável do país → janela 16..22 (7 slots)
  hash_val := abs(hashtext(_country));
  base_hour := 16 + (hash_val % 7);

  IF _division = 1 THEN
    h := base_hour; m := 0;
  ELSIF _division = 2 THEN
    h := base_hour; m := 30;
  ELSIF _division = 3 THEN
    h := GREATEST(12, base_hour - 1); m := 0;
  ELSIF _division = 4 THEN
    h := LEAST(22, base_hour + 1); m := 0;
  ELSE
    -- Várzea / outros
    h := GREATEST(12, base_hour - 2); m := 0;
  END IF;
  RETURN NEXT;
END;
$$;

-- Aplica horários fixos a todas as ligas in_progress + reagenda matches
CREATE OR REPLACE FUNCTION public.world_leagues_apply_fixed_kickoff()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lg RECORD;
  k RECORD;
  leagues_updated INTEGER := 0;
  matches_updated INTEGER := 0;
  m_count INTEGER;
BEGIN
  FOR lg IN
    SELECT id, country, division, season
    FROM public.world_leagues
    WHERE status IN ('pending', 'in_progress')
  LOOP
    SELECT * INTO k FROM public.world_leagues_kickoff_for(lg.country, lg.division);

    UPDATE public.world_leagues
      SET kickoff_hour = k.h, kickoff_minute = k.m
      WHERE id = lg.id;
    leagues_updated := leagues_updated + 1;

    -- Recalcula kickoff_at de world_matches mantendo a data BRT
    -- BRT = UTC-3 → UTC = BRT + 3h
    WITH upd AS (
      UPDATE public.world_matches wm
      SET kickoff_at = (
        date_trunc('day', wm.kickoff_at AT TIME ZONE 'America/Sao_Paulo')
          + make_interval(hours => k.h, mins => k.m)
      ) AT TIME ZONE 'America/Sao_Paulo'
      WHERE wm.league_id = lg.id
        AND wm.season = lg.season
        AND wm.status = 'scheduled'
      RETURNING 1
    )
    SELECT COUNT(*) INTO m_count FROM upd;
    matches_updated := matches_updated + COALESCE(m_count, 0);
  END LOOP;

  RETURN jsonb_build_object(
    'leagues_updated', leagues_updated,
    'matches_updated', matches_updated,
    'applied_at', now()
  );
END;
$$;

-- Aplica imediatamente nas ligas atuais
SELECT public.world_leagues_apply_fixed_kickoff();
