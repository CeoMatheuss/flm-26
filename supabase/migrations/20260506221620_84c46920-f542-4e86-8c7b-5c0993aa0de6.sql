-- Create table for Beginner Cup matches
CREATE TABLE IF NOT EXISTS public.beginner_cup_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cup_id UUID REFERENCES public.beginner_cup(id) ON DELETE CASCADE,
    home_team_id UUID REFERENCES public.world_teams(id),
    away_team_id UUID REFERENCES public.world_teams(id),
    phase TEXT NOT NULL CHECK (phase IN ('Fase 1', 'Quartas de Final', 'Semifinal', 'Final')),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished')),
    home_goals INTEGER DEFAULT 0,
    away_goals INTEGER DEFAULT 0,
    home_penalties INTEGER DEFAULT 0,
    away_penalties INTEGER DEFAULT 0,
    winner_id UUID REFERENCES public.world_teams(id),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    played_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.beginner_cup_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Matches" ON public.beginner_cup_matches FOR SELECT USING (true);

-- Function to generate the tournament bracket
CREATE OR REPLACE FUNCTION public.generate_beginner_cup_fixtures(_cup_id UUID)
RETURNS void AS $$
DECLARE
    team_ids UUID[];
    num_teams INTEGER;
    i INTEGER;
    j INTEGER;
    match_date TIMESTAMP WITH TIME ZONE;
    curr_month INTEGER;
    curr_year INTEGER;
    p_name TEXT;
    num_matches INTEGER;
    next_pow2 INTEGER := 1;
BEGIN
    -- Get current season info from cup
    SELECT season_month, season_year INTO curr_month, curr_year FROM public.beginner_cup WHERE id = _cup_id;

    -- Get all active participants
    SELECT array_agg(team_id) INTO team_ids 
    FROM public.beginner_cup_participants 
    WHERE cup_id = _cup_id AND status = 'playing';

    num_teams := array_length(team_ids, 1);
    IF num_teams IS NULL OR num_teams < 2 THEN RETURN; END IF;

    -- Scheduling: Day 10, 11, 12, 13
    -- Fase 1: Day 10
    -- Quartas: Day 11
    -- Semis: Day 12
    -- Final: Day 13
    
    -- Shuffle teams
    SELECT array_agg(id ORDER BY random()) INTO team_ids FROM (SELECT unnest(team_ids) as id) s;

    -- Determine how many matches for Round 1 to reach a power of 2
    WHILE next_pow2 < num_teams LOOP
        next_pow2 := next_pow2 * 2;
    END LOOP;
    
    -- If num_teams is not power of 2, we need BYEs.
    -- The number of teams playing in Round 1 = (num_teams - (next_pow2 / 2)) * 2
    -- The rest get a BYE.
    
    num_matches := num_teams - (next_pow2 / 2);
    
    IF num_matches = 0 THEN
        -- Perfect power of 2, start with the appropriate phase
        p_name := CASE 
            WHEN next_pow2 = 16 THEN 'Fase 1'
            WHEN next_pow2 = 8 THEN 'Quartas de Final'
            WHEN next_pow2 = 4 THEN 'Semifinal'
            WHEN next_pow2 = 2 THEN 'Final'
            ELSE 'Fase 1'
        END;
        
        match_date := make_timestamptz(curr_year, curr_month, 10, 20, 0, 0);
        
        FOR i IN 1..(num_teams / 2) LOOP
            INSERT INTO public.beginner_cup_matches (cup_id, home_team_id, away_team_id, phase, scheduled_at)
            VALUES (_cup_id, team_ids[i*2-1], team_ids[i*2], p_name, match_date);
        END LOOP;
    ELSE
        -- Needs BYEs
        match_date := make_timestamptz(curr_year, curr_month, 10, 20, 0, 0);
        
        -- First (num_matches * 2) teams play, rest get BYE
        FOR i IN 1..num_matches LOOP
            INSERT INTO public.beginner_cup_matches (cup_id, home_team_id, away_team_id, phase, scheduled_at)
            VALUES (_cup_id, team_ids[i*2-1], team_ids[i*2], 'Fase 1', match_date);
        END LOOP;
        
        -- Update status for BYE teams (they advance automatically)
        -- We'll handle advancing logic in a separate simulation function
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to advance winners to next phase
CREATE OR REPLACE FUNCTION public.advance_cup_winners(_cup_id UUID, _current_phase TEXT)
RETURNS void AS $$
DECLARE
    winners UUID[];
    next_phase TEXT;
    match_date TIMESTAMP WITH TIME ZONE;
    curr_month INTEGER;
    curr_year INTEGER;
    i INTEGER;
BEGIN
    SELECT season_month, season_year INTO curr_month, curr_year FROM public.beginner_cup WHERE id = _cup_id;

    -- Get winners of current phase
    SELECT array_agg(winner_id) INTO winners 
    FROM public.beginner_cup_matches 
    WHERE cup_id = _cup_id AND phase = _current_phase AND status = 'finished';

    -- Add BYE teams if it was Fase 1
    IF _current_phase = 'Fase 1' THEN
        -- Add teams that didn't play in Fase 1 but are participants
        SELECT array_agg(team_id) INTO winners
        FROM (
            SELECT winner_id FROM public.beginner_cup_matches WHERE cup_id = _cup_id AND phase = 'Fase 1'
            UNION
            SELECT team_id FROM public.beginner_cup_participants 
            WHERE cup_id = _cup_id AND team_id NOT IN (
                SELECT home_team_id FROM public.beginner_cup_matches WHERE cup_id = _cup_id AND phase = 'Fase 1'
                UNION
                SELECT away_team_id FROM public.beginner_cup_matches WHERE cup_id = _cup_id AND phase = 'Fase 1'
            )
        ) s;
    END IF;

    IF array_length(winners, 1) < 2 THEN RETURN; END IF;

    next_phase := CASE 
        WHEN _current_phase = 'Fase 1' THEN 'Quartas de Final'
        WHEN _current_phase = 'Quartas de Final' THEN 'Semifinal'
        WHEN _current_phase = 'Semifinal' THEN 'Final'
        ELSE NULL
    END;

    IF next_phase IS NULL THEN RETURN; END IF;

    match_date := CASE 
        WHEN next_phase = 'Quartas de Final' THEN make_timestamptz(curr_year, curr_month, 11, 20, 0, 0)
        WHEN next_phase = 'Semifinal' THEN make_timestamptz(curr_year, curr_month, 12, 20, 0, 0)
        WHEN next_phase = 'Final' THEN make_timestamptz(curr_year, curr_month, 13, 20, 0, 0)
    END;

    FOR i IN 1..(array_length(winners, 1) / 2) LOOP
        INSERT INTO public.beginner_cup_matches (cup_id, home_team_id, away_team_id, phase, scheduled_at)
        VALUES (_cup_id, winners[i*2-1], winners[i*2], next_phase, match_date);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Refined replace_bot_with_player to handle Cup entry properly
CREATE OR REPLACE FUNCTION public.replace_bot_with_player(_user_id UUID, _team_name TEXT, _logo TEXT)
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

    -- Season already started (Day 1+) or no bots left?
    -- Actually, if it's Day 1, we might still allow entry if there are bots.
    -- But if games have already been played (e.g., after 19:30 on Day 1), better go to Cup.
    
    IF curr_day > 1 THEN
        -- Go to Cup
        INSERT INTO public.world_teams (user_id, name, logo, is_bot) VALUES (_user_id, _team_name, _logo, false) RETURNING id INTO target_team_id;
        
        INSERT INTO public.beginner_cup (season_month, season_year) 
        VALUES (curr_month, curr_year) 
        ON CONFLICT (season_month, season_year) DO UPDATE SET status = 'active'
        RETURNING id INTO cup_id;
        
        INSERT INTO public.beginner_cup_participants (cup_id, team_id) 
        VALUES (cup_id, target_team_id) ON CONFLICT DO NOTHING;
        
        RETURN target_team_id;
    ELSE
        -- Try to replace a bot in the league
        SELECT id INTO target_team_id FROM public.world_teams WHERE is_bot = true LIMIT 1;
        
        IF target_team_id IS NOT NULL THEN
            UPDATE public.world_teams SET user_id = _user_id, name = _team_name, logo = _logo, is_bot = false, updated_at = now() WHERE id = target_team_id;
            RETURN target_team_id;
        ELSE
            -- League full
            INSERT INTO public.world_teams (user_id, name, logo, is_bot) VALUES (_user_id, _team_name, _logo, false) RETURNING id INTO target_team_id;
            
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

-- Transition function for Next Month
CREATE OR REPLACE FUNCTION public.process_season_transition()
RETURNS void AS $$
DECLARE
    next_month INTEGER;
    next_year INTEGER;
    cup_winners UUID[];
    i INTEGER;
    league_rec RECORD;
    new_league_id UUID;
    t_id UUID;
BEGIN
    next_month := EXTRACT(MONTH FROM (now() + interval '1 month'))::INTEGER;
    next_year := EXTRACT(YEAR FROM (now() + interval '1 month'))::INTEGER;

    -- 1. Identify Top 8 from Cup (finalists, semifinalists, etc.)
    -- For now, let's just take participants who were active
    SELECT array_agg(team_id) INTO cup_winners
    FROM (
        -- Winners of Final
        SELECT winner_id FROM public.beginner_cup_matches WHERE phase = 'Final' AND status = 'finished'
        UNION
        -- Finalists
        SELECT home_team_id FROM public.beginner_cup_matches WHERE phase = 'Final'
        UNION
        SELECT away_team_id FROM public.beginner_cup_matches WHERE phase = 'Final'
        UNION
        -- Semifinalists
        SELECT home_team_id FROM public.beginner_cup_matches WHERE phase = 'Semifinal'
        UNION
        SELECT away_team_id FROM public.beginner_cup_matches WHERE phase = 'Semifinal'
        LIMIT 16 -- Max 16 to be safe
    ) s;

    -- 2. Clear all League data for new month (as per user's "Reset every Day 1" philosophy from previous prompt)
    -- Actually, we should just generate NEW fixtures.
    
    FOR league_rec IN SELECT id FROM public.world_leagues LOOP
        -- Remove old bots, keep humans but unassign from old leagues if needed? 
        -- No, let's just re-generate.
        PERFORM public.generate_league_fixtures(league_rec.id, next_month, next_year);
    END LOOP;

    -- 3. Insert Cup Winners into a league by replacing bots
    IF cup_winners IS NOT NULL THEN
        FOREACH t_id IN ARRAY cup_winners LOOP
            -- Find a bot in a random league to replace
            UPDATE public.world_teams 
            SET league_id = (SELECT id FROM public.world_leagues ORDER BY random() LIMIT 1)
            WHERE id = t_id;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql;
