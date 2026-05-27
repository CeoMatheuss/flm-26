
-- 1) Nova fórmula simples de pontuação por partida
CREATE OR REPLACE FUNCTION public.sync_global_ranking_from_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_goals INTEGER;
  v_opp_goals  INTEGER;
  v_outcome    TEXT;
  v_club_name  TEXT;
  v_comp_lower TEXT;
  v_comp_kind  TEXT;
  v_delta      INTEGER := 0;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.is_home THEN
    v_user_goals := NEW.home_goals;
    v_opp_goals  := NEW.away_goals;
    v_club_name  := NEW.home_team;
  ELSE
    v_user_goals := NEW.away_goals;
    v_opp_goals  := NEW.home_goals;
    v_club_name  := NEW.away_team;
  END IF;

  IF v_user_goals > v_opp_goals THEN v_outcome := 'win';
  ELSIF v_user_goals < v_opp_goals THEN v_outcome := 'loss';
  ELSE v_outcome := 'draw';
  END IF;

  v_comp_lower := lower(coalesce(NEW.competition, '') || ' ' || coalesce(NEW.match_type, ''));

  v_comp_kind := CASE
    WHEN v_comp_lower LIKE '%mundial%' OR v_comp_lower LIKE '%world%' THEN 'world'
    WHEN v_comp_lower LIKE '%continental%' OR v_comp_lower LIKE '%libertador%' OR v_comp_lower LIKE '%champions%' OR v_comp_lower LIKE '%europa%' OR v_comp_lower LIKE '%afc%' OR v_comp_lower LIKE '%caf%' OR v_comp_lower LIKE '%concacaf%' OR v_comp_lower LIKE '%ofc%' THEN 'continental'
    WHEN v_comp_lower LIKE '%copa%' OR v_comp_lower LIKE '%cup%' THEN 'cup'
    WHEN v_comp_lower LIKE '%amist%' OR v_comp_lower LIKE '%friendly%' THEN 'friendly'
    ELSE 'league'
  END;

  v_delta := CASE v_comp_kind
    WHEN 'world'       THEN CASE v_outcome WHEN 'win' THEN 10 WHEN 'draw' THEN 5 ELSE 0 END
    WHEN 'continental' THEN CASE v_outcome WHEN 'win' THEN  6 WHEN 'draw' THEN 3 ELSE 0 END
    WHEN 'cup'         THEN CASE v_outcome WHEN 'win' THEN  4 WHEN 'draw' THEN 2 ELSE 0 END
    WHEN 'league'      THEN CASE v_outcome WHEN 'win' THEN  3 WHEN 'draw' THEN 1 ELSE 0 END
    ELSE 0
  END;

  INSERT INTO public.global_ranking (
    user_id, club_name, ranking_points, games_played,
    wins, draws, losses, last_change, current_competition
  ) VALUES (
    NEW.user_id, v_club_name, GREATEST(0, v_delta), 1,
    CASE WHEN v_outcome = 'win'  THEN 1 ELSE 0 END,
    CASE WHEN v_outcome = 'draw' THEN 1 ELSE 0 END,
    CASE WHEN v_outcome = 'loss' THEN 1 ELSE 0 END,
    v_delta, coalesce(NEW.competition, 'Amistoso')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    club_name           = EXCLUDED.club_name,
    ranking_points      = GREATEST(0, coalesce(public.global_ranking.ranking_points, 0) + v_delta),
    games_played        = coalesce(public.global_ranking.games_played, 0) + 1,
    wins                = coalesce(public.global_ranking.wins,   0) + CASE WHEN v_outcome = 'win'  THEN 1 ELSE 0 END,
    draws               = coalesce(public.global_ranking.draws,  0) + CASE WHEN v_outcome = 'draw' THEN 1 ELSE 0 END,
    losses              = coalesce(public.global_ranking.losses, 0) + CASE WHEN v_outcome = 'loss' THEN 1 ELSE 0 END,
    last_change         = v_delta,
    current_competition = EXCLUDED.current_competition,
    updated_at          = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'sync_global_ranking_from_match falhou: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 2) Helper de bônus por título
CREATE OR REPLACE FUNCTION public.apply_title_bonus(_user_id uuid, _kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bonus integer;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;

  v_bonus := CASE lower(_kind)
    WHEN 'league'      THEN 30
    WHEN 'cup'         THEN 40
    WHEN 'continental' THEN 80
    WHEN 'world'       THEN 150
    ELSE 0
  END;

  IF v_bonus = 0 THEN RETURN; END IF;

  INSERT INTO public.global_ranking (user_id, ranking_points, last_change, current_competition)
  VALUES (_user_id, v_bonus, v_bonus, 'Título ' || _kind)
  ON CONFLICT (user_id) DO UPDATE SET
    ranking_points = coalesce(public.global_ranking.ranking_points, 0) + v_bonus,
    last_change    = v_bonus,
    titles_count   = coalesce(public.global_ranking.titles_count, 0) + 1,
    updated_at     = now();
END;
$$;

-- 3) Bônus automático: Campeão da Copa Nacional
CREATE OR REPLACE FUNCTION public.trg_cup_champion_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
BEGIN
  IF NEW.status = 'finished'
     AND (OLD.status IS DISTINCT FROM 'finished')
     AND NEW.winner_team_id IS NOT NULL THEN
    SELECT user_id INTO v_user FROM public.national_cup_teams WHERE id = NEW.winner_team_id;
    PERFORM public.apply_title_bonus(v_user, 'cup');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_cup_champion_bonus falhou: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cup_champion_bonus ON public.national_cups;
CREATE TRIGGER trg_cup_champion_bonus
  AFTER UPDATE ON public.national_cups
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_cup_champion_bonus();

-- 4) Bônus automático: Campeão da Liga via season_awards (award_type='best_team', scope='league')
CREATE OR REPLACE FUNCTION public.trg_league_champion_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text;
BEGIN
  IF NEW.award_type = 'best_team' AND NEW.user_id IS NOT NULL THEN
    v_kind := CASE lower(coalesce(NEW.scope, ''))
      WHEN 'league'      THEN 'league'
      WHEN 'cup'         THEN 'cup'
      WHEN 'continental' THEN 'continental'
      WHEN 'world'       THEN 'world'
      WHEN 'global'      THEN 'world'
      ELSE NULL
    END;
    IF v_kind IS NOT NULL THEN
      PERFORM public.apply_title_bonus(NEW.user_id, v_kind);
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_league_champion_bonus falhou: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_league_champion_bonus ON public.season_awards;
CREATE TRIGGER trg_league_champion_bonus
  AFTER INSERT ON public.season_awards
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_league_champion_bonus();
