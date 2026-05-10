-- Update replace_bot_with_player to include country
CREATE OR REPLACE FUNCTION public.replace_bot_with_player(_user_id UUID, _team_name TEXT, _logo TEXT, _country TEXT DEFAULT 'Brasil')
RETURNS UUID AS $$
DECLARE
    target_team_id UUID;
    curr_month INTEGER := EXTRACT(MONTH FROM now())::INTEGER;
    curr_year INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
    curr_day INTEGER := EXTRACT(DAY FROM now())::INTEGER;
    cup_id UUID;
BEGIN
    -- Already has a team?
    SELECT id INTO target_team_id FROM public.world_teams WHERE user_id = _user_id;
    IF target_team_id IS NOT NULL THEN RETURN target_team_id; END IF;

    -- Try to replace a bot in the league
    -- (We prioritize replacing a bot in the SAME country if possible)
    SELECT id INTO target_team_id 
    FROM public.world_teams 
    WHERE is_bot = true AND country = _country 
    LIMIT 1;
    
    IF target_team_id IS NOT NULL THEN
        UPDATE public.world_teams SET user_id = _user_id, name = _team_name, logo = _logo, is_bot = false, country = _country, updated_at = now() WHERE id = target_team_id;
        RETURN target_team_id;
    ELSE
        -- No bot in same country? Try any bot.
        SELECT id INTO target_team_id FROM public.world_teams WHERE is_bot = true LIMIT 1;
        
        IF target_team_id IS NOT NULL THEN
            UPDATE public.world_teams SET user_id = _user_id, name = _team_name, logo = _logo, is_bot = false, country = _country, updated_at = now() WHERE id = target_team_id;
            RETURN target_team_id;
        ELSE
            -- League full, create new team and send to Cup
            INSERT INTO public.world_teams (user_id, name, logo, is_bot, country) 
            VALUES (_user_id, _team_name, _logo, false, _country) 
            RETURNING id INTO target_team_id;
            
            INSERT INTO public.beginner_cup (season_month, season_year) 
            VALUES (curr_month, curr_year) 
            ON CONFLICT (season_month, season_year) DO UPDATE SET status = 'active'
            RETURNING id INTO cup_id;
            
            INSERT INTO public.beginner_cup_participants (cup_id, team_id) 
            VALUES (cup_id, target_team_id) ON CONFLICT DO NOTHING;
            
            RETURN target_team_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;
