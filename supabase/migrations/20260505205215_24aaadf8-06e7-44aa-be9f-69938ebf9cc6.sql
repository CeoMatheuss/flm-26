-- 1. Fix Division 1 match times to 19:30
UPDATE public.league_matches lm
SET scheduled_at = (scheduled_at::date + time '19:30:00')::timestamp with time zone
FROM public.multiplayer_leagues ml
WHERE lm.league_id = ml.id
  AND ml.division = 1
  AND lm.status = 'scheduled';

-- 2. Deduplicate matches (keep only the first created one for each combination)
DELETE FROM public.league_matches
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY league_id, round, home_user_id, away_user_id ORDER BY created_at ASC) as row_num
        FROM public.league_matches
    ) t
    WHERE t.row_num > 1
);

-- 3. Function to ensure exactly 16 teams
CREATE OR REPLACE FUNCTION public.ensure_16_teams(_league_id UUID)
RETURNS VOID AS $$
DECLARE
    current_count INT;
    needed INT;
    bot_names TEXT[] := ARRAY['Real Madrid', 'Manchester City', 'Bayern Munich', 'Liverpool', 'PSG', 'Barcelona', 'Arsenal', 'Inter Milan', 'Borussia Dortmund', 'Atletico Madrid', 'Napoli', 'Juventus', 'Chelsea', 'Tottenham', 'Bayer Leverkusen', 'Benfica'];
    b_name TEXT;
BEGIN
    SELECT count(*) INTO current_count FROM public.league_members WHERE league_id = _league_id;
    
    IF current_count < 16 THEN
        needed := 16 - current_count;
        FOR i IN 1..needed LOOP
            -- Try to pick a name that isn't in the league yet
            SELECT name INTO b_name 
            FROM (SELECT unnest(bot_names) as name) n 
            WHERE name NOT IN (SELECT club_name FROM public.league_members WHERE league_id = _league_id)
            LIMIT 1;
            
            IF b_name IS NULL THEN
                b_name := 'Bot Team ' || (current_count + i);
            END IF;

            INSERT INTO public.league_members (league_id, club_name, club_logo, reputation, budget)
            VALUES (_league_id, b_name, '🤖', 60, 10000000);
        END LOOP;
    ELSIF current_count > 16 THEN
        -- Remove extra bots first
        DELETE FROM public.league_members
        WHERE id IN (
            SELECT id FROM public.league_members
            WHERE league_id = _league_id AND user_id IS NULL
            ORDER BY reputation ASC
            LIMIT (current_count - 16)
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply to all leagues
DO $$
DECLARE
    lg RECORD;
BEGIN
    FOR lg IN SELECT id FROM public.multiplayer_leagues LOOP
        PERFORM public.ensure_16_teams(lg.id);
    END LOOP;
END;
$$;
