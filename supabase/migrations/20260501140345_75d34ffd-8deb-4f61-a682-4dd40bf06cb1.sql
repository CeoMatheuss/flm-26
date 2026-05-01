-- Função: redistribui kickoff_hour entre 16..22 e reagenda jogos futuros
CREATE OR REPLACE FUNCTION public.world_leagues_redistribute_kickoff()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_league record;
  v_idx int := 0;
  v_new_hour int;
  v_updated_leagues int := 0;
  v_updated_matches int := 0;
  v_match_count int;
BEGIN
  -- D1 entre 16..22 (rotaciona); divisões 2..4 mantêm seus horários
  FOR v_league IN
    SELECT id, division, kickoff_hour
    FROM world_leagues
    WHERE division = 1
    ORDER BY country
  LOOP
    v_new_hour := 16 + (v_idx % 7); -- 16,17,18,19,20,21,22
    v_idx := v_idx + 1;

    IF v_new_hour <> v_league.kickoff_hour THEN
      UPDATE world_leagues
        SET kickoff_hour = v_new_hour, updated_at = now()
        WHERE id = v_league.id;
      v_updated_leagues := v_updated_leagues + 1;
    END IF;

    -- Reagenda partidas futuras (status='scheduled') para o novo horário
    UPDATE world_matches
      SET kickoff_at = date_trunc('day', kickoff_at AT TIME ZONE 'America/Sao_Paulo')
                       AT TIME ZONE 'America/Sao_Paulo'
                       + make_interval(hours => v_new_hour)
      WHERE league_id = v_league.id
        AND status = 'scheduled';
    GET DIAGNOSTICS v_match_count = ROW_COUNT;
    v_updated_matches := v_updated_matches + v_match_count;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'updated_leagues', v_updated_leagues,
    'updated_matches', v_updated_matches
  );
END;
$$;

REVOKE ALL ON FUNCTION public.world_leagues_redistribute_kickoff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.world_leagues_redistribute_kickoff() TO authenticated, service_role;