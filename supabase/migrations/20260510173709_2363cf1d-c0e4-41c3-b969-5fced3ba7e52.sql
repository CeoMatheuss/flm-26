-- 1. Correct the seed function to use world_countries
CREATE OR REPLACE FUNCTION public.seed_initial_world_leagues()
RETURNS void AS $$
DECLARE
    v_country RECORD;
BEGIN
    FOR v_country IN SELECT * FROM public.world_countries LOOP
        -- Série A
        IF NOT EXISTS (SELECT 1 FROM public.world_leagues WHERE country_id = v_country.id AND name ILIKE '%Série A%') THEN
            INSERT INTO public.world_leagues (name, country_id, division, division_level, active, max_teams)
            VALUES (v_country.name || ' Série A', v_country.id, 1, 1, true, 16);
        END IF;
        -- Série B
        IF NOT EXISTS (SELECT 1 FROM public.world_leagues WHERE country_id = v_country.id AND name ILIKE '%Série B%') THEN
            INSERT INTO public.world_leagues (name, country_id, division, division_level, active, max_teams)
            VALUES (v_country.name || ' Série B', v_country.id, 2, 2, true, 16);
        END IF;
        -- Série C
        IF NOT EXISTS (SELECT 1 FROM public.world_leagues WHERE country_id = v_country.id AND name ILIKE '%Série C%') THEN
            INSERT INTO public.world_leagues (name, country_id, division, division_level, active, max_teams)
            VALUES (v_country.name || ' Série C', v_country.id, 3, 3, true, 16);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update enroll functions to use iso_code correctly
CREATE OR REPLACE FUNCTION public.sync_all_saves_to_world_system()
RETURNS void AS $$
DECLARE
    save_record RECORD;
    v_team_id UUID;
    v_club_name TEXT;
    v_country_code TEXT;
    v_country_id UUID;
BEGIN
    FOR save_record IN SELECT user_id, club_data FROM public.game_saves LOOP
        v_club_name := save_record.club_data->'club'->>'name';
        v_country_code := COALESCE(save_record.club_data->'club'->>'country', 'BR');
        
        -- Get country id from world_countries
        SELECT id INTO v_country_id FROM public.world_countries WHERE iso_code = v_country_code LIMIT 1;
        IF v_country_id IS NULL THEN
            SELECT id INTO v_country_id FROM public.world_countries WHERE iso_code = 'BR' LIMIT 1;
        END IF;

        -- Check if team already exists in world_teams
        SELECT id INTO v_team_id FROM public.world_teams WHERE user_id = save_record.user_id;
        
        IF v_team_id IS NULL THEN
            -- Create team and enroll
            v_team_id := public.replace_bot_with_player(
                save_record.user_id, 
                v_club_name, 
                '⚽', 
                COALESCE(v_country_code, 'BR')
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
