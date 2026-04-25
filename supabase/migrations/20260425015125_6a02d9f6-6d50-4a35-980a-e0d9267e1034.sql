-- 1. Add leg + two_legs columns
ALTER TABLE public.custom_tournament_matches
  ADD COLUMN IF NOT EXISTS leg integer NOT NULL DEFAULT 1;

ALTER TABLE public.custom_tournaments
  ADD COLUMN IF NOT EXISTS two_legs boolean NOT NULL DEFAULT false;

-- 2. Validation trigger for pure knockout team count vs starting stage
CREATE OR REPLACE FUNCTION public.validate_knockout_tournament_teams()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  team_count integer;
  expected_count integer;
  stage_label text;
BEGIN
  -- Only validate pure knockout tournaments that are starting / in progress
  IF NEW.format <> 'knockout' THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('in_progress','active','running') THEN
    RETURN NEW;
  END IF;

  -- Count enrolled teams
  SELECT count(*) INTO team_count
  FROM public.custom_tournament_teams
  WHERE tournament_id = NEW.id;

  -- Need power of 2 between 2 and 64
  IF team_count < 2 THEN
    RAISE EXCEPTION 'Mata-mata exige pelo menos 2 times. Times atuais: %.', team_count
      USING ERRCODE = 'check_violation';
  END IF;

  IF (team_count & (team_count - 1)) <> 0 THEN
    RAISE EXCEPTION 'Mata-mata exige potência de 2 (2, 4, 8, 16, 32, 64). Times atuais: %.', team_count
      USING ERRCODE = 'check_violation';
  END IF;

  -- If max_teams was set, derive the starting stage from it and require an exact match
  IF NEW.max_teams IS NOT NULL AND NEW.max_teams IN (2, 4, 8, 16, 32, 64) THEN
    expected_count := NEW.max_teams;
    stage_label := CASE expected_count
      WHEN 2  THEN 'Final'
      WHEN 4  THEN 'Semi'
      WHEN 8  THEN 'Quartas'
      WHEN 16 THEN 'Oitavas'
      ELSE 'R' || expected_count
    END;

    IF team_count <> expected_count THEN
      RAISE EXCEPTION
        'Mata-mata da fase % exige exatamente % times. Inscritos: %.',
        stage_label, expected_count, team_count
        USING ERRCODE = 'check_violation',
              HINT = 'Adicione ou remova times até bater o número correto antes de iniciar o torneio.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_knockout_tournament_teams ON public.custom_tournaments;
CREATE TRIGGER trg_validate_knockout_tournament_teams
  BEFORE INSERT OR UPDATE OF status, format, max_teams ON public.custom_tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_knockout_tournament_teams();
