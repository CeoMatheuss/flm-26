UPDATE public.multiplayer_leagues
SET max_members = 16,
    total_rounds = 30;

DO $$
DECLARE
    lg RECORD;
    excess INT;
BEGIN
    FOR lg IN SELECT id FROM public.multiplayer_leagues LOOP
        SELECT count(*) - 16 INTO excess FROM public.league_members WHERE league_id = lg.id;
        IF excess > 0 THEN
            DELETE FROM public.league_members
            WHERE id IN (
                SELECT id FROM public.league_members
                WHERE league_id = lg.id AND user_id IS NULL
                ORDER BY reputation ASC NULLS FIRST, id DESC
                LIMIT excess
            );
        END IF;
    END LOOP;
END;
$$;

DELETE FROM public.league_matches WHERE status IN ('scheduled', 'pending');

UPDATE public.league_members
SET points = 0, wins = 0, draws = 0, losses = 0,
    goals_for = 0, goals_against = 0, played = 0;
