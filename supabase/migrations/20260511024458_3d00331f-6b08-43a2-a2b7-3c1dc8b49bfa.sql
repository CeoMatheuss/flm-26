-- Trigger para atualizar a tabela da liga sempre que um jogo terminar
CREATE OR REPLACE FUNCTION public.after_match_finished_sync_table()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status != 'finished')) THEN
        -- Chama o recalculo para a liga deste jogo
        PERFORM public.recalculate_league_table_from_matches(NEW.league_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_after_match_finished_sync ON public.world_matches;
CREATE TRIGGER tr_after_match_finished_sync
AFTER UPDATE ON public.world_matches
FOR EACH ROW
EXECUTE FUNCTION public.after_match_finished_sync_table();
