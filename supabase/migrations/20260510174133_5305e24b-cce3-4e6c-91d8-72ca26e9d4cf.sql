-- 1. Ensure columns exist in relevant tables
ALTER TABLE public.world_leagues ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Brasil';
ALTER TABLE public.world_league_table ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Brasil';

-- 2. Drop problematic legacy triggers and functions
DROP TRIGGER IF EXISTS trg_assign_user_to_d1 ON public.game_saves;
DROP TRIGGER IF EXISTS trg_auto_enroll_world_league ON public.game_saves;
DROP TRIGGER IF EXISTS trg_auto_enroll_save ON public.game_saves;

DROP FUNCTION IF EXISTS public.assign_user_to_d1_on_save();
DROP FUNCTION IF EXISTS public.auto_enroll_player_in_world_league();
DROP FUNCTION IF EXISTS public.trg_auto_enroll_new_save();

-- 3. Create a clean registration function
CREATE OR REPLACE FUNCTION public.handle_user_registration()
RETURNS TRIGGER AS $$
DECLARE
    v_club_name TEXT;
    v_country_code TEXT;
    v_logo TEXT;
BEGIN
    -- Only proceed if we have club_data
    IF NEW.club_data IS NULL THEN
        RETURN NEW;
    END IF;

    -- Extract metadata with fallbacks
    v_club_name := COALESCE(NEW.club_data->'club'->>'name', NEW.club_data->>'name', 'Manager FC');
    v_country_code := COALESCE(NEW.club_data->'club'->>'country', NEW.club_data->>'country', 'BR');
    v_logo := COALESCE(NEW.club_data->'club'->>'logoUrl', NEW.club_data->>'logoUrl', '⚽');

    -- Enroll in world system
    PERFORM public.replace_bot_with_player(
        NEW.user_id, 
        v_club_name, 
        v_logo, 
        v_country_code
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Prevent blocking the save if registration fails
    RAISE WARNING 'handle_user_registration failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-attach unified trigger
CREATE TRIGGER trg_user_club_registration
AFTER INSERT OR UPDATE OF club_data ON public.game_saves
FOR EACH ROW EXECUTE FUNCTION public.handle_user_registration();

-- 5. Correct seed function to populate country text
CREATE OR REPLACE FUNCTION public.seed_initial_world_leagues()
RETURNS void AS $$
DECLARE
    v_country RECORD;
BEGIN
    FOR v_country IN SELECT * FROM public.world_countries LOOP
        -- Série A
        IF NOT EXISTS (SELECT 1 FROM public.world_leagues WHERE country_id = v_country.id AND division_level = 1) THEN
            INSERT INTO public.world_leagues (name, country_id, division, division_level, active, max_teams, country)
            VALUES (v_country.name || ' Série A', v_country.id, 1, 1, true, 16, v_country.name);
        END IF;
        -- Série B
        IF NOT EXISTS (SELECT 1 FROM public.world_leagues WHERE country_id = v_country.id AND division_level = 2) THEN
            INSERT INTO public.world_leagues (name, country_id, division, division_level, active, max_teams, country)
            VALUES (v_country.name || ' Série B', v_country.id, 2, 2, true, 16, v_country.name);
        END IF;
        -- Série C
        IF NOT EXISTS (SELECT 1 FROM public.world_leagues WHERE country_id = v_country.id AND division_level = 3) THEN
            INSERT INTO public.world_leagues (name, country_id, division, division_level, active, max_teams, country)
            VALUES (v_country.name || ' Série C', v_country.id, 3, 3, true, 16, v_country.name);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute seed to ensure all current leagues have country name
UPDATE public.world_leagues wl
SET country = wc.name
FROM public.world_countries wc
WHERE wl.country_id = wc.id AND wl.country IS NULL;
