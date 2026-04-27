-- ============================================================
-- 1. Função para atualizar global_ranking a partir de match_history
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_global_ranking_from_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_goals  INTEGER;
  v_opp_goals   INTEGER;
  v_outcome     TEXT;
  v_weight      NUMERIC;
  v_base        INTEGER;
  v_delta       INTEGER;
  v_club_name   TEXT;
  v_existing    RECORD;
  v_comp_lower  TEXT;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determina gols do usuário
  IF NEW.is_home THEN
    v_user_goals := NEW.home_goals;
    v_opp_goals  := NEW.away_goals;
    v_club_name  := NEW.home_team;
  ELSE
    v_user_goals := NEW.away_goals;
    v_opp_goals  := NEW.home_goals;
    v_club_name  := NEW.away_team;
  END IF;

  -- Resultado
  IF v_user_goals > v_opp_goals THEN
    v_outcome := 'win';  v_base := 12;
  ELSIF v_user_goals < v_opp_goals THEN
    v_outcome := 'loss'; v_base := -6;
  ELSE
    v_outcome := 'draw'; v_base := 4;
  END IF;

  -- Peso por tipo de competição
  v_comp_lower := lower(coalesce(NEW.competition, '') || ' ' || coalesce(NEW.match_type, ''));
  v_weight := CASE
    WHEN v_comp_lower LIKE '%mundial%' OR v_comp_lower LIKE '%world%' THEN 2.0
    WHEN v_comp_lower LIKE '%continental%' OR v_comp_lower LIKE '%libertador%' OR v_comp_lower LIKE '%champions%' OR v_comp_lower LIKE '%europa%' THEN 1.6
    WHEN v_comp_lower LIKE '%copa%' OR v_comp_lower LIKE '%cup%' THEN 1.2
    WHEN v_comp_lower LIKE '%amist%' OR v_comp_lower LIKE '%friendly%' THEN 0.5
    ELSE 1.0  -- liga padrão
  END;

  v_delta := round(v_base * v_weight);

  SELECT id, ranking_points, games_played, wins, draws, losses
    INTO v_existing
    FROM public.global_ranking
    WHERE user_id = NEW.user_id
    LIMIT 1;

  IF v_existing.id IS NULL THEN
    INSERT INTO public.global_ranking (
      user_id, club_name, ranking_points, games_played,
      wins, draws, losses, last_change, current_competition
    ) VALUES (
      NEW.user_id, v_club_name, GREATEST(0, v_delta), 1,
      CASE WHEN v_outcome = 'win'  THEN 1 ELSE 0 END,
      CASE WHEN v_outcome = 'draw' THEN 1 ELSE 0 END,
      CASE WHEN v_outcome = 'loss' THEN 1 ELSE 0 END,
      v_delta, coalesce(NEW.competition, 'Amistoso')
    );
  ELSE
    UPDATE public.global_ranking SET
      club_name           = v_club_name,
      ranking_points      = GREATEST(0, coalesce(ranking_points, 0) + v_delta),
      games_played        = coalesce(games_played, 0) + 1,
      wins                = coalesce(wins,   0) + CASE WHEN v_outcome = 'win'  THEN 1 ELSE 0 END,
      draws               = coalesce(draws,  0) + CASE WHEN v_outcome = 'draw' THEN 1 ELSE 0 END,
      losses              = coalesce(losses, 0) + CASE WHEN v_outcome = 'loss' THEN 1 ELSE 0 END,
      last_change         = v_delta,
      current_competition = coalesce(NEW.competition, 'Amistoso'),
      updated_at          = now()
      WHERE id = v_existing.id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca derrubar o INSERT da partida por causa do ranking
  RAISE WARNING 'sync_global_ranking_from_match falhou: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_global_ranking ON public.match_history;
CREATE TRIGGER trg_sync_global_ranking
  AFTER INSERT ON public.match_history
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_global_ranking_from_match();

-- ============================================================
-- 2. Função para inscrever novos clubes no ranking ao criar save
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_ranking_for_save()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_name TEXT;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Extrai o nome do clube do JSON club_data
  v_club_name := coalesce(NEW.club_data->>'name', NEW.save_name, 'Clube');

  INSERT INTO public.global_ranking (
    user_id, club_name, ranking_points, games_played,
    wins, draws, losses, last_change, current_competition
  ) VALUES (
    NEW.user_id, v_club_name, 0, 0, 0, 0, 0, 0, 'Nenhuma'
  )
  ON CONFLICT (user_id) DO UPDATE
    SET club_name = EXCLUDED.club_name,
        updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'ensure_ranking_for_save falhou: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Garante que existe um índice único em user_id (necessário para ON CONFLICT)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'global_ranking'
      AND indexdef LIKE '%UNIQUE%user_id%'
  ) THEN
    -- Limpa duplicatas mantendo a mais recente
    DELETE FROM public.global_ranking a
      USING public.global_ranking b
      WHERE a.user_id = b.user_id
        AND a.created_at < b.created_at;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_global_ranking_user
      ON public.global_ranking(user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_ensure_ranking_for_save ON public.game_saves;
CREATE TRIGGER trg_ensure_ranking_for_save
  AFTER INSERT ON public.game_saves
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_ranking_for_save();

-- ============================================================
-- 3. Backfill: criar entradas de ranking para saves existentes sem ranking
-- ============================================================
INSERT INTO public.global_ranking (
  user_id, club_name, ranking_points, games_played,
  wins, draws, losses, last_change, current_competition
)
SELECT DISTINCT ON (gs.user_id)
  gs.user_id,
  coalesce(gs.club_data->>'name', gs.save_name, 'Clube'),
  0, 0, 0, 0, 0, 0, 'Nenhuma'
FROM public.game_saves gs
LEFT JOIN public.global_ranking gr ON gr.user_id = gs.user_id
WHERE gr.id IS NULL
ORDER BY gs.user_id, gs.updated_at DESC
ON CONFLICT (user_id) DO NOTHING;