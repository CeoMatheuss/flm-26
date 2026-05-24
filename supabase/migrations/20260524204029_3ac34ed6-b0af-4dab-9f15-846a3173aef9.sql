-- Create world_cup_competitions table
CREATE TABLE IF NOT EXISTS public.world_cup_competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    season_year INTEGER NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'finished')),
    winner_id UUID REFERENCES public.clubs(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create world_cup_teams table
CREATE TABLE IF NOT EXISTS public.world_cup_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cup_id UUID REFERENCES public.world_cup_competitions(id) ON DELETE CASCADE,
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    user_id UUID,
    is_bot BOOLEAN DEFAULT false,
    entry_round TEXT DEFAULT 'quarter-finals', -- Começa direto nas quartas ou semis conforme pedido
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'winner')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create world_cup_matches table
CREATE TABLE IF NOT EXISTS public.world_cup_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cup_id UUID REFERENCES public.world_cup_competitions(id) ON DELETE CASCADE,
    home_team_id UUID REFERENCES public.world_cup_teams(id) ON DELETE CASCADE,
    away_team_id UUID REFERENCES public.world_cup_teams(id) ON DELETE CASCADE,
    stage TEXT NOT NULL, -- 'quarter-finals', 'semi-finals', 'final'
    home_goals INTEGER DEFAULT 0,
    away_goals INTEGER DEFAULT 0,
    home_penalty_goals INTEGER DEFAULT 0,
    away_penalty_goals INTEGER DEFAULT 0,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished')),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    winner_team_id UUID REFERENCES public.world_cup_teams(id),
    match_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.world_cup_competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_cup_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_cup_matches ENABLE ROW LEVEL SECURITY;

-- Public Policies
CREATE POLICY "Public world cup view" ON public.world_cup_competitions FOR SELECT USING (true);
CREATE POLICY "Public world cup teams view" ON public.world_cup_teams FOR SELECT USING (true);
CREATE POLICY "Public world cup matches view" ON public.world_cup_matches FOR SELECT USING (true);

-- Function to start World Cup with online players
CREATE OR REPLACE FUNCTION public.start_world_cup(_season INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cup_id UUID;
    v_team_count INTEGER;
    v_online_teams RECORD;
    v_new_cup_name TEXT;
    v_team_ids UUID[];
    v_match_id UUID;
BEGIN
    v_new_cup_name := 'Mundial de Clubes ' || _season::text;
    
    -- Create the competition
    INSERT INTO public.world_cup_competitions (name, season_year, status)
    VALUES (v_new_cup_name, _season, 'active')
    RETURNING id INTO v_cup_id;

    -- Select up to 8 real teams (online players)
    -- We'll use clubs that have been updated recently or just all non-bot clubs available
    WITH participants AS (
        SELECT id, user_id FROM public.clubs 
        WHERE user_id IS NOT NULL 
        ORDER BY reputation DESC 
        LIMIT 8
    )
    INSERT INTO public.world_cup_teams (cup_id, club_id, user_id, is_bot, entry_round)
    SELECT v_cup_id, id, user_id, false, 'quarter-finals'
    FROM participants;

    GET DIAGNOSTICS v_team_count = ROW_COUNT;

    -- If less than 8, fill with elite bots if necessary (or just run with fewer)
    -- But request said "start with online teams", so we'll focus on them.
    -- If we have 4 or 8, we can build the bracket.
    
    IF v_team_count >= 2 THEN
        -- Basic bracket generation for Quarter Finals or Semi Finals
        -- For simplicity, let's pair them up.
        DECLARE
            v_t1 UUID;
            v_t2 UUID;
            v_teams_list UUID[];
            v_i INTEGER;
            v_stage TEXT;
        BEGIN
            SELECT ARRAY_AGG(id) INTO v_teams_list FROM public.world_cup_teams WHERE cup_id = v_cup_id;
            v_stage := CASE WHEN v_team_count > 4 THEN 'quarter-finals' ELSE 'semi-finals' END;
            
            FOR v_i IN 1..(v_team_count/2) LOOP
                v_t1 := v_teams_list[(v_i-1)*2 + 1];
                v_t2 := v_teams_list[(v_i-1)*2 + 2];
                
                IF v_t1 IS NOT NULL AND v_t2 IS NOT NULL THEN
                    INSERT INTO public.world_cup_matches (cup_id, home_team_id, away_team_id, stage, scheduled_at)
                    VALUES (v_cup_id, v_t1, v_t2, v_stage, NOW() + (v_i * interval '1 day'));
                END IF;
            END LOOP;
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'cup_id', v_cup_id,
        'team_count', v_team_count,
        'message', 'Mundial iniciado com ' || v_team_count::text || ' times online.'
    );
END;
$$;
