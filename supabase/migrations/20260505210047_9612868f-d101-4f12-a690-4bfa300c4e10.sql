-- 1. Fix Division 1 match times to 19:30 for all scheduled matches
UPDATE public.world_matches
SET kickoff_at = (kickoff_at::date + time '19:30:00')::timestamp with time zone
WHERE status = 'scheduled';

-- 2. Deduplicate matches (keep only the first one created for each round/team combination)
DELETE FROM public.world_matches
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY league_id, matchday, home_team_id, away_team_id ORDER BY created_at ASC) as row_num
        FROM public.world_matches
    ) t
    WHERE t.row_num > 1
);

-- 3. Ensure 16 teams per league (add bots if needed)
CREATE OR REPLACE FUNCTION public.sync_league_team_count()
RETURNS void AS $$
DECLARE
    l_id UUID;
    t_count INT;
    needed INT;
    bot_names TEXT[] := ARRAY['Real Madrid', 'Manchester City', 'Bayern Munich', 'Liverpool', 'PSG', 'Barcelona', 'Arsenal', 'Inter Milan', 'Borussia Dortmund', 'Atletico Madrid', 'Napoli', 'Juventus', 'Chelsea', 'Tottenham', 'Bayer Leverkusen', 'Benfica'];
    b_name TEXT;
BEGIN
    FOR l_id IN SELECT id FROM public.world_leagues LOOP
        SELECT count(*) INTO t_count FROM public.world_league_teams WHERE league_id = l_id;
        IF t_count < 16 THEN
            needed := 16 - t_count;
            FOR i IN 1..needed LOOP
                SELECT name INTO b_name 
                FROM unnest(bot_names) AS name 
                WHERE name NOT IN (SELECT club_name FROM public.world_league_teams WHERE league_id = l_id)
                LIMIT 1;
                
                IF b_name IS NULL THEN b_name := 'Bot Team ' || (t_count + i); END IF;

                INSERT INTO public.world_league_teams (league_id, club_name, club_logo, reputation)
                VALUES (l_id, b_name, '🤖', 60);
            END LOOP;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT public.sync_league_team_count();
