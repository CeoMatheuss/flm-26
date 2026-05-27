-- Função para regenerar calendários de ligas oficiais que estão travadas ou vazias
CREATE OR REPLACE FUNCTION public.regenerate_missing_league_calendars()
RETURNS INT AS $$
DECLARE
    v_league_record RECORD;
    v_team_ids UUID[];
    v_round_robin_rounds INT;
    v_num_teams INT;
    v_matches_created INT := 0;
    v_current_round_start TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    FOR v_league_record IN 
        SELECT id, name, season_month, season_year 
        FROM world_leagues 
        WHERE id NOT IN (SELECT DISTINCT league_id FROM world_matches)
          AND id IN (SELECT DISTINCT league_id FROM world_teams)
    LOOP
        -- Buscar IDs dos times da liga
        SELECT array_agg(id) INTO v_team_ids FROM world_teams WHERE league_id = v_league_record.id;
        v_num_teams := array_length(v_team_ids, 1);
        
        -- Apenas ligas com pelo menos 2 times
        IF v_num_teams >= 2 THEN
            -- Simples geração de partidas (todos contra todos ida e volta)
            -- Para resolver o travamento imediato, geramos as rodadas faltantes
            -- Rodada 1 a 30
            FOR r IN 1..30 LOOP
                -- Gerar pares de partidas simples (fallback rápido)
                FOR i IN 1..(v_num_teams/2) LOOP
                    INSERT INTO world_matches (
                        league_id, home_team_id, away_team_id, round, 
                        status, scheduled_at, season_month, season_year
                    ) VALUES (
                        v_league_record.id, 
                        v_team_ids[((i + r) % v_num_teams) + 1], 
                        v_team_ids[((v_num_teams - i + r) % v_num_teams) + 1], 
                        r, 
                        'scheduled', 
                        v_current_round_start + (r || ' days')::interval + (i || ' hours')::interval,
                        v_league_record.season_month,
                        v_league_record.season_year
                    );
                    v_matches_created := v_matches_created + 1;
                END LOOP;
            END LOOP;
            
            -- Resetar a rodada para 1 para começar a simular
            UPDATE world_leagues SET current_round = 1 WHERE id = v_league_record.id;
        END IF;
    END LOOP;
    
    RETURN v_matches_created;
END;
$$ LANGUAGE plpgsql;

-- Executar a regeneração
SELECT public.regenerate_missing_league_calendars();
