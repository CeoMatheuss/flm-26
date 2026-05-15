-- Corrigir a função com search_path por segurança
CREATE OR REPLACE FUNCTION public.process_tournament_prize(
    p_club_id UUID,
    p_comp_type TEXT,
    p_comp_name TEXT,
    p_comp_id UUID,
    p_phase_rank TEXT,
    p_amount BIGINT,
    p_year INTEGER,
    p_month INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_already_paid BOOLEAN;
BEGIN
    -- Verificar se já foi pago (Anti-duplicação)
    SELECT EXISTS (
        SELECT 1 FROM public.tournament_prizes_history 
        WHERE club_id = p_club_id 
        AND competition_id = p_comp_id 
        AND phase_or_rank = p_phase_rank
        AND season_year = p_year
        AND season_month = p_month
    ) INTO v_already_paid;

    IF v_already_paid THEN
        RETURN FALSE;
    END IF;

    -- Registrar histórico
    INSERT INTO public.tournament_prizes_history (
        club_id, competition_type, competition_name, competition_id, phase_or_rank, amount, season_year, season_month
    ) VALUES (
        p_club_id, p_comp_type, p_comp_name, p_comp_id, p_phase_rank, p_amount, p_year, p_month
    );

    -- Atualizar saldo do clube
    UPDATE public.clubs 
    SET budget = budget + p_amount,
        cash = cash + p_amount
    WHERE id = p_club_id;

    -- Gerar notificação
    INSERT INTO public.user_notifications (
        user_id, title, message, type
    ) 
    SELECT user_id, 'Premiação Recebida', 
           'Seu clube recebeu ' || (p_amount / 1000)::text || 'K como premiação de ' || p_comp_name || ' (' || p_phase_rank || ').',
           'finance'
    FROM public.clubs WHERE id = p_club_id;

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para automatizar premiações de liga ao fim de todos os jogos
CREATE OR REPLACE FUNCTION public.check_and_pay_league_prizes()
RETURNS TRIGGER AS $$
DECLARE
    v_league_id UUID;
    v_total_games INT;
    v_played_games INT;
    v_team_record RECORD;
    v_rank INT := 1;
    v_prize_amount BIGINT;
    v_league_name TEXT;
    v_month INT;
    v_year INT;
BEGIN
    -- Só age se o jogo foi finalizado
    IF NEW.status = 'finished' AND OLD.status != 'finished' THEN
        v_league_id := NEW.league_id;
        
        -- Verificar se todos os jogos da liga para este mês/ano acabaram
        SELECT count(*) INTO v_total_games FROM public.world_matches 
        WHERE league_id = v_league_id AND season_month = NEW.season_month AND season_year = NEW.season_year;
        
        SELECT count(*) INTO v_played_games FROM public.world_matches 
        WHERE league_id = v_league_id AND status = 'finished' AND season_month = NEW.season_month AND season_year = NEW.season_year;
        
        IF v_total_games > 0 AND v_total_games = v_played_games THEN
            -- Todos os jogos acabaram!
            SELECT name INTO v_league_name FROM public.world_leagues WHERE id = v_league_id;
            v_month := NEW.season_month;
            v_year := NEW.season_year;
            
            -- Iterar sobre a tabela da liga ordenada por pontos, vitórias, saldo
            FOR v_team_record IN (
                SELECT team_id FROM public.world_league_table 
                WHERE league_id = v_league_id AND season_month = v_month AND season_year = v_year
                ORDER BY points DESC, wins DESC, (goals_for - goals_against) DESC, goals_for DESC
            ) LOOP
                -- Buscar premiação para esta posição
                SELECT amount INTO v_prize_amount FROM public.prize_configurations 
                WHERE competition_type = 'league' AND rank_or_phase = v_rank::text;
                
                -- Se não tiver premiação específica, paga o mínimo de participação
                IF v_prize_amount IS NULL THEN
                    SELECT amount INTO v_prize_amount FROM public.prize_configurations 
                    WHERE competition_type = 'league' AND rank_or_phase = 'min_participation';
                END IF;
                
                IF v_prize_amount > 0 THEN
                    PERFORM public.process_tournament_prize(
                        v_team_record.team_id, 'league', v_league_name, v_league_id, v_rank::text, v_prize_amount, v_year, v_month
                    );
                END IF;
                
                v_rank := v_rank + 1;
            END LOOP;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para ligas
DROP TRIGGER IF EXISTS trigger_pay_league_prizes ON public.world_matches;
CREATE TRIGGER trigger_pay_league_prizes
AFTER UPDATE ON public.world_matches
FOR EACH ROW
EXECUTE FUNCTION public.check_and_pay_league_prizes();
