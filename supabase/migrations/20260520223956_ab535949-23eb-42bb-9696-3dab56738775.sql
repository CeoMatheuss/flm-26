-- Add bankruptcy tracking columns to clubs
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS bankrupt_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS consecutive_negative_days INTEGER DEFAULT 0;

-- Function to handle the actual bankruptcy (wiping data)
CREATE OR REPLACE FUNCTION public.handle_club_bankruptcy(p_club_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Update club status
    UPDATE public.clubs 
    SET bankrupt_at = NOW() 
    WHERE id = p_club_id;

    -- Remove players
    DELETE FROM public.world_players WHERE team_id = p_club_id;
    
    -- Remove game save (to force recreation/reactivation)
    -- Instead of deleting, we might want to flag it, but the user asked to "Remove completely"
    DELETE FROM public.game_saves WHERE user_id = (SELECT user_id FROM public.clubs WHERE id = p_club_id);

    -- Remove finances (if there's a table for it)
    -- DELETE FROM public.finances WHERE club_id = p_club_id;

    -- Reset basic club stats
    UPDATE public.clubs 
    SET 
        budget = 0,
        cash = 0,
        fans = 0,
        reputation = 0,
        consecutive_negative_days = 0
    WHERE id = p_club_id;

    -- You can add more deletions here for evolution, lineups, etc if they are in separate tables
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check all clubs for bankruptcy
CREATE OR REPLACE FUNCTION public.check_all_clubs_bankruptcy()
RETURNS VOID AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id, budget FROM public.clubs WHERE bankrupt_at IS NULL LOOP
        IF r.budget < 0 THEN
            -- Increment negative days
            UPDATE public.clubs 
            SET consecutive_negative_days = consecutive_negative_days + 1
            WHERE id = r.id
            RETURNING consecutive_negative_days INTO r.consecutive_negative_days;

            -- Check if reached 30 days
            IF r.consecutive_negative_days >= 30 THEN
                PERFORM public.handle_club_bankruptcy(r.id);
            END IF;
        ELSE
            -- Reset negative days if budget is positive
            UPDATE public.clubs 
            SET consecutive_negative_days = 0 
            WHERE id = r.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: In a real Supabase environment, you would schedule this via pg_cron.
-- Since I cannot set up pg_cron directly here, I'll rely on the app triggering it or manual runs.
-- For the sake of the exercise, I'll assume it's part of the daily maintenance.
