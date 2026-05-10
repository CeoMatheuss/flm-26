-- Consolidate replace_bot_with_player into a single version
DROP FUNCTION IF EXISTS public.replace_bot_with_player(uuid, text, text);
DROP FUNCTION IF EXISTS public.replace_bot_with_player(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.replace_bot_with_player(
    _user_id UUID, 
    _team_name TEXT, 
    _logo TEXT, 
    _country_code TEXT DEFAULT 'BR'
)
RETURNS UUID AS $$
DECLARE
    target_team_id UUID;
    v_country_name TEXT;
    curr_month INTEGER := EXTRACT(MONTH FROM now())::INTEGER;
    curr_year INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
    curr_day INTEGER := EXTRACT(DAY FROM now())::INTEGER;
    cup_id UUID;
BEGIN
    -- Get full country name from code
    SELECT name INTO v_country_name FROM public.world_countries WHERE iso_code = _country_code LIMIT 1;
    IF v_country_name IS NULL THEN v_country_name := 'Brasil'; END IF;

    -- Already has a team?
    SELECT id INTO target_team_id FROM public.world_teams WHERE user_id = _user_id;
    IF target_team_id IS NOT NULL THEN RETURN target_team_id; END IF;

    -- Try to replace a bot in the league in the same country
    SELECT id INTO target_team_id 
    FROM public.world_teams 
    WHERE is_bot = true AND country = v_country_name 
    LIMIT 1;
    
    IF target_team_id IS NOT NULL THEN
        UPDATE public.world_teams 
        SET user_id = _user_id, 
            name = _team_name, 
            logo = _logo, 
            is_bot = false, 
            country = v_country_name, 
            updated_at = now() 
        WHERE id = target_team_id;
        RETURN target_team_id;
    ELSE
        -- No bot in same country? Try any bot in the whole system
        SELECT id INTO target_team_id FROM public.world_teams WHERE is_bot = true LIMIT 1;
        
        IF target_team_id IS NOT NULL THEN
            UPDATE public.world_teams 
            SET user_id = _user_id, 
                name = _team_name, 
                logo = _logo, 
                is_bot = false, 
                country = v_country_name, 
                updated_at = now() 
            WHERE id = target_team_id;
            RETURN target_team_id;
        ELSE
            -- System is full or past Day 1, create a new entry and send to Beginner Cup
            INSERT INTO public.world_teams (user_id, name, logo, is_bot, country) 
            VALUES (_user_id, _team_name, _logo, false, v_country_name) 
            RETURNING id INTO target_team_id;
            
            -- Ensure Cup exists for current season
            INSERT INTO public.beginner_cup (season_month, season_year, status) 
            VALUES (curr_month, curr_year, 'active') 
            ON CONFLICT (season_month, season_year) DO UPDATE SET status = 'active'
            RETURNING id INTO cup_id;
            
            -- Add as participant
            INSERT INTO public.beginner_cup_participants (cup_id, team_id, status) 
            VALUES (cup_id, target_team_id, 'playing') 
            ON CONFLICT DO NOTHING;
            
            RETURN target_team_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
