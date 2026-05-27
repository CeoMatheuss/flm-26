-- Função para simular partidas de bots em massa (Watchdog)
CREATE OR REPLACE FUNCTION public.watchdog_simulate_world_matches(p_batch_size INT DEFAULT 50)
RETURNS TABLE (
    matches_simulated INT,
    leagues_advanced INT
) AS $$
DECLARE
    v_match_record RECORD;
    v_simulated_count INT := 0;
    v_leagues_advanced INT := 0;
    v_h_strength INT;
    v_a_strength INT;
    v_hg INT;
    v_ag INT;
    v_league_id UUID;
    v_round INT;
BEGIN
    -- 1. Identificar partidas pendentes de ligas de bots que já deveriam ter ocorrido
    -- (scheduled_at <= now())
    FOR v_match_record IN 
        SELECT m.id, m.league_id, m.round, m.home_team_id, m.away_team_id,
               th.strength as h_strength, ta.strength as a_strength
        FROM world_matches m
        JOIN world_teams th ON m.home_team_id = th.id
        JOIN world_teams ta ON m.away_team_id = ta.id
        WHERE m.status = 'scheduled' 
          AND m.scheduled_at <= (NOW() + INTERVAL '5 minutes') -- Margem de segurança
        LIMIT p_batch_size
    LOOP
        -- Cálculo rápido de resultado (Poison distribuition simplificado em SQL)
        -- Usando força base 50
        v_h_strength := COALESCE(v_match_record.h_strength, 60);
        v_a_strength := COALESCE(v_match_record.a_strength, 60);
        
        -- Gols Casa: floor(random() * (força/20 + 2))
        v_hg := FLOOR(RANDOM() * (v_h_strength / 25.0 + 2.5));
        -- Gols Fora: floor(random() * (força/25 + 1.8))
        v_ag := FLOOR(RANDOM() * (v_a_strength / 30.0 + 2.0));

        -- Atualizar a partida
        UPDATE world_matches 
        SET home_goals = v_hg,
            away_goals = v_ag,
            status = 'finished',
            played_at = NOW(),
            simulated = true,
            match_data = jsonb_build_object(
                'auto_simulated', true,
                'watchdog', true,
                'stats', jsonb_build_object(
                    'possession', ARRAY[50, 50],
                    'shots', ARRAY[v_hg + 5, v_ag + 4]
                )
            )
        WHERE id = v_match_record.id;

        v_simulated_count := v_simulated_count + 1;
    END LOOP;

    -- 2. Identificar ligas onde a rodada atual não tem mais jogos pendentes e avançar
    FOR v_league_id, v_round IN
        SELECT wl.id, wl.current_round
        FROM world_leagues wl
        WHERE wl.active = true
          AND NOT EXISTS (
              SELECT 1 FROM world_matches m 
              WHERE m.league_id = wl.id 
                AND m.round <= wl.current_round 
                AND m.status = 'scheduled'
          )
          -- Apenas se houver partidas da próxima rodada já agendadas ou se for o fim
          AND EXISTS (
              SELECT 1 FROM world_matches m 
              WHERE m.league_id = wl.id 
                AND m.round = wl.current_round + 1
          )
    LOOP
        UPDATE world_leagues 
        SET current_round = current_round + 1 
        WHERE id = v_league_id;
        
        v_leagues_advanced := v_leagues_advanced + 1;
        
        -- Log de avanço
        INSERT INTO match_worker_logs (match_type, result_text, status, details)
        VALUES ('watchdog', 'League advanced: ' || v_league_id, 'finished', jsonb_build_object('league_id', v_league_id, 'new_round', v_round + 1));
    END LOOP;

    RETURN QUERY SELECT v_simulated_count, v_leagues_advanced;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.watchdog_simulate_world_matches(INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.watchdog_simulate_world_matches(INT) TO authenticated;
