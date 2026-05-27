
-- 1) Função por jogador (rápida, usada pelo trigger)
CREATE OR REPLACE FUNCTION public.recalc_player_ranking(p_player_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_position text;
  v_goals int;
  v_assists int;
  v_clean int;
  v_pen int;
  v_avg numeric;
  v_matches int;
  v_score numeric;
  v_reputation int;
  v_level text;
BEGIN
  SELECT position INTO v_position FROM public.world_players WHERE id = p_player_id;
  IF v_position IS NULL THEN
    RETURN;
  END IF;

  SELECT
    COALESCE(SUM(goals),0),
    COALESCE(SUM(assists),0),
    COALESCE(SUM(clean_sheets),0),
    COALESCE(SUM(penalties_saved),0),
    COALESCE(AVG(NULLIF(avg_rating,0)),0),
    COALESCE(SUM(matches_played),0)
  INTO v_goals, v_assists, v_clean, v_pen, v_avg, v_matches
  FROM public.world_player_stats
  WHERE player_id = p_player_id;

  IF v_position = 'Goleiro' THEN
    -- Goleiro: pênalti defendido +6, clean sheet +2, nota média influencia
    v_score := (v_pen * 6) + (v_clean * 2) + (GREATEST(v_avg - 5, 0) * 10);
  ELSE
    -- Linha: gol +5, assistência +3, nota média influencia
    v_score := (v_goals * 5) + (v_assists * 3) + (GREATEST(v_avg - 5, 0) * 10);
  END IF;

  v_score := GREATEST(v_score, 0);
  v_reputation := LEAST(GREATEST(ROUND(v_score / 10), 0), 100);
  IF v_reputation >= 90 THEN v_level := 'Mundial';
  ELSIF v_reputation >= 70 THEN v_level := 'Continental';
  ELSIF v_reputation >= 40 THEN v_level := 'Nacional';
  ELSE v_level := 'Local';
  END IF;

  INSERT INTO public.global_player_ranking AS gpr (
    player_id, ranking_points, total_goals, total_assists,
    total_clean_sheets, penalties_saved, avg_rating,
    reputation_score, reputation_level, last_update
  ) VALUES (
    p_player_id, v_score, v_goals, v_assists,
    v_clean, v_pen, v_avg,
    v_reputation, v_level, now()
  )
  ON CONFLICT (player_id) DO UPDATE SET
    ranking_points     = EXCLUDED.ranking_points,
    total_goals        = EXCLUDED.total_goals,
    total_assists      = EXCLUDED.total_assists,
    total_clean_sheets = EXCLUDED.total_clean_sheets,
    penalties_saved    = EXCLUDED.penalties_saved,
    avg_rating         = EXCLUDED.avg_rating,
    reputation_score   = EXCLUDED.reputation_score,
    reputation_level   = EXCLUDED.reputation_level,
    last_update        = now();
END;
$$;

-- 2) Função global (recalcula todos) — substitui a antiga com a nova fórmula
CREATE OR REPLACE FUNCTION public.calculate_player_ranking_points()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM public.world_players LOOP
    PERFORM public.recalc_player_ranking(rec.id);
  END LOOP;
END;
$$;

-- 3) Trigger em world_player_stats: recalcula automaticamente após qualquer mudança
CREATE OR REPLACE FUNCTION public.trg_recalc_player_ranking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_player_ranking(OLD.player_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_player_ranking(NEW.player_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS world_player_stats_recalc_ranking ON public.world_player_stats;
CREATE TRIGGER world_player_stats_recalc_ranking
AFTER INSERT OR UPDATE OR DELETE ON public.world_player_stats
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_player_ranking();

-- 4) Garante linha em global_player_ranking para todo jogador cadastrado
INSERT INTO public.global_player_ranking (player_id, ranking_points, reputation_score, reputation_level, last_update)
SELECT wp.id, 0, 0, 'Local', now()
FROM public.world_players wp
WHERE NOT EXISTS (
  SELECT 1 FROM public.global_player_ranking gpr WHERE gpr.player_id = wp.id
);

-- 5) Recalcula tudo uma vez
SELECT public.calculate_player_ranking_points();
