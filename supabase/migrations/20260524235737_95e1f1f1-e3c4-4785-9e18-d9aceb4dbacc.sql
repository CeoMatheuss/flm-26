-- Central Sync State Table
CREATE TABLE IF NOT EXISTS public.world_sync_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_round INTEGER DEFAULT 1,
    squad_checksum TEXT,
    standings_checksum TEXT,
    sync_version INTEGER DEFAULT 1,
    is_locked BOOLEAN DEFAULT false,
    locked_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

-- Trigger to update rankings and global stats after match history insertion
CREATE OR REPLACE FUNCTION public.sync_post_match_data()
RETURNS TRIGGER AS $$
DECLARE
    v_home_club_id UUID;
    v_away_club_id UUID;
BEGIN
    -- Update global ranking points based on result
    IF NEW.home_goals > NEW.away_goals THEN
        UPDATE public.global_ranking SET points = points + 10 WHERE club_id = NEW.home_team_id;
    ELSIF NEW.away_goals > NEW.home_goals THEN
        UPDATE public.global_ranking SET points = points + 10 WHERE club_id = NEW.away_team_id;
    ELSE
        UPDATE public.global_ranking SET points = points + 4 WHERE club_id IN (NEW.home_team_id, NEW.away_team_id);
    END IF;

    -- Update player stats (goals, cards, fatigue) from match_history metadata
    -- This assumes match_history metadata contains details about scorers/cards
    
    -- Increment sync version to force frontend refresh via useWorldSync
    UPDATE public.world_sync_state 
    SET sync_version = sync_version + 1, updated_at = now() 
    WHERE user_id = (SELECT user_id FROM public.clubs WHERE id = NEW.home_team_id OR id = NEW.away_team_id LIMIT 1);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_post_match ON public.match_history;
CREATE TRIGGER tr_sync_post_match
AFTER INSERT ON public.match_history
FOR EACH ROW EXECUTE FUNCTION public.sync_post_match_data();

-- Automatic Financial Real-time Sync
CREATE OR REPLACE FUNCTION public.sync_club_budget()
RETURNS TRIGGER AS $$
BEGIN
    -- Keep global_ranking financial health in sync
    UPDATE public.global_ranking 
    SET total_value = (SELECT budget FROM public.clubs WHERE id = NEW.id) 
    WHERE club_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_budget ON public.clubs;
CREATE TRIGGER tr_sync_budget
AFTER UPDATE OF budget ON public.clubs
FOR EACH ROW EXECUTE FUNCTION public.sync_club_budget();

-- Automatic Notification Generator for Global Events
CREATE OR REPLACE FUNCTION public.notify_global_sync_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_notifications (user_id, title, message, type)
    VALUES (NEW.user_id, 'Sincronização Global', 'Seu universo foi atualizado com novos dados de rodada.', 'info');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_sync ON public.world_sync_state;
CREATE TRIGGER tr_notify_sync
AFTER UPDATE OF sync_version ON public.world_sync_state
FOR EACH ROW WHEN (OLD.sync_version < NEW.sync_version)
EXECUTE FUNCTION public.notify_global_sync_event();
