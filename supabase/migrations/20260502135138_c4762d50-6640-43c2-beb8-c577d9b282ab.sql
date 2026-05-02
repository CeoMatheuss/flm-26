-- 1. Remover ligas duplicadas (manter apenas uma por país/divisão)
DELETE FROM world_leagues 
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER(PARTITION BY country, division ORDER BY created_at ASC) as rn
        FROM world_leagues
    ) t WHERE rn > 1
);

-- 2. Garantir horários fixos REAIS por divisão (Ignorando hashes anteriores para simplificar e garantir o pedido)
CREATE OR REPLACE FUNCTION public.fix_world_leagues_kickoffs()
RETURNS void AS $$
BEGIN
    -- Série A (D1) -> 19:00
    UPDATE world_leagues SET kickoff_hour = 19, kickoff_minute = 0 WHERE division = 1;
    -- Série B (D2) -> 19:30
    UPDATE world_leagues SET kickoff_hour = 19, kickoff_minute = 30 WHERE division = 2;
    -- Série C (D3) -> 18:00
    UPDATE world_leagues SET kickoff_hour = 18, kickoff_minute = 0 WHERE division = 3;
    -- Série D (D4) -> 20:00
    UPDATE world_leagues SET kickoff_hour = 20, kickoff_minute = 0 WHERE division = 4;
    -- Várzea (D5+) -> 17:00
    UPDATE world_leagues SET kickoff_hour = 17, kickoff_minute = 0 WHERE division >= 5;

    -- Sincronizar kickoff_at em world_matches baseado nos novos horários das ligas
    UPDATE world_matches m
    SET kickoff_at = (m.kickoff_at::date + (l.kickoff_hour || ' hours')::interval + (l.kickoff_minute || ' minutes')::interval)
    FROM world_leagues l
    WHERE m.league_id = l.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT fix_world_leagues_kickoffs();

-- 3. View de Tabela Autorizativa (Garante que a tabela é 100% baseada nos jogos)
CREATE OR REPLACE VIEW public.world_league_standings AS
WITH team_stats AS (
    -- Ganhos como Mandante
    SELECT 
        home_team_id as team_id,
        league_id,
        COUNT(*) as played,
        SUM(CASE WHEN home_goals > away_goals THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN home_goals = away_goals THEN 1 ELSE 0 END) as draws,
        SUM(CASE WHEN home_goals < away_goals THEN 1 ELSE 0 END) as losses,
        SUM(home_goals) as goals_for,
        SUM(away_goals) as goals_against
    FROM world_matches
    WHERE status = 'finished'
    GROUP BY home_team_id, league_id
    
    UNION ALL
    
    -- Ganhos como Visitante
    SELECT 
        away_team_id as team_id,
        league_id,
        COUNT(*) as played,
        SUM(CASE WHEN away_goals > home_goals THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN away_goals = home_goals THEN 1 ELSE 0 END) as draws,
        SUM(CASE WHEN away_goals < home_goals THEN 1 ELSE 0 END) as losses,
        SUM(away_goals) as goals_for,
        SUM(home_goals) as goals_against
    FROM world_matches
    WHERE status = 'finished'
    GROUP BY away_team_id, league_id
)
SELECT 
    team_id,
    league_id,
    SUM(played) as mp,
    SUM(wins) as w,
    SUM(draws) as d,
    SUM(losses) as l,
    SUM(goals_for) as gf,
    SUM(goals_against) as ga,
    SUM(goals_for - goals_against) as gd,
    SUM(wins * 3 + draws) as pts
FROM team_stats
GROUP BY team_id, league_id;

-- 4. RPC para Sincronização de Estado (Resolve Rodada 1 pendente e atualiza current_matchday)
CREATE OR REPLACE FUNCTION public.sync_league_state(_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_league_id uuid;
    v_current_day int;
    v_new_matchday int;
BEGIN
    -- Pegar a liga do usuário
    SELECT league_id INTO v_league_id FROM world_league_teams WHERE user_id = _user_id LIMIT 1;
    
    IF v_league_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not in a league');
    END IF;

    -- Dia atual do mês (assumindo que dia 1 = rodada 1)
    v_current_day := EXTRACT(DAY FROM now());
    
    -- Simular jogos atrasados (se houver algum status NULL da rodada 1 ou anterior ao dia atual)
    UPDATE world_matches 
    SET status = 'finished',
        home_goals = floor(random() * 4),
        away_goals = floor(random() * 3),
        match_data = jsonb_set(COALESCE(match_data, '{}'::jsonb), '{auto_simulated}', 'true')
    WHERE league_id = v_league_id 
      AND kickoff_at < now() - interval '1 hour'
      AND (status IS NULL OR status != 'finished');

    -- Atualizar a rodada da liga baseada no dia atual (se já passou do horário do jogo de hoje)
    -- Se hoje for dia 2, e o jogo de hoje (19h) ainda não aconteceu, a current_matchday deve ser 2.
    -- O sistema de simulação cuidará de rodar o jogo no horário.
    UPDATE world_leagues 
    SET current_matchday = v_current_day
    WHERE id = v_league_id;

    RETURN jsonb_build_object('success', true, 'matchday', v_current_day);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Simulação Global Imediata para Rodada 1 (Retroativo para todas as ligas)
UPDATE world_matches 
SET status = 'finished',
    home_goals = floor(random() * 4),
    away_goals = floor(random() * 3),
    match_data = jsonb_set(COALESCE(match_data, '{}'::jsonb), '{auto_simulated}', 'true')
WHERE kickoff_at < now() - interval '2 hours' -- Jogos de ontem/hoje cedo
  AND (status IS NULL OR status != 'finished');

-- Avançar todas as ligas para o dia atual do calendário
UPDATE world_leagues 
SET current_matchday = EXTRACT(DAY FROM now());