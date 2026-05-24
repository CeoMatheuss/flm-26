-- Create calendar_schedule table for centralized season planning
CREATE TABLE IF NOT EXISTS public.calendar_schedule (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    day_of_month INTEGER NOT NULL, -- 1 to 30
    competition_type TEXT NOT NULL, -- 'league', 'continental', 'cup', 'world_cup'
    phase_name TEXT, -- 'Group', '16th', '8th', 'Quarter', 'Semi', 'Final'
    match_time TIME NOT NULL, -- 09:00, 16:00, 21:00 etc
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast lookup by day
CREATE INDEX idx_calendar_day ON public.calendar_schedule(day_of_month);

-- Enable RLS
ALTER TABLE public.calendar_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schedule is viewable by all" ON public.calendar_schedule FOR SELECT USING (true);

-- Function to seed the schedule based on the requested rules
CREATE OR REPLACE FUNCTION public.seed_extreme_calendar()
RETURNS void AS $$
BEGIN
    DELETE FROM public.calendar_schedule;

    -- LIGA NACIONAL: DIA 1 até DIA 30 (constant)
    FOR i IN 1..30 LOOP
        INSERT INTO public.calendar_schedule (day_of_month, competition_type, match_time)
        VALUES (i, 'league', '16:00:00');
    END LOOP;

    -- CONTINENTAIS: DIA 5 até DIA 14
    -- Format: 16th, 8th, Quarter, Semi, Final (All double legs except final)
    INSERT INTO public.calendar_schedule (day_of_month, competition_type, phase_name, match_time) VALUES
    (5, 'continental', '16th_leg1', '21:00:00'),
    (6, 'continental', '16th_leg2', '21:00:00'),
    (7, 'continental', '8th_leg1', '21:00:00'),
    (8, 'continental', '8th_leg2', '21:00:00'),
    (9, 'continental', 'quarter_leg1', '21:00:00'),
    (10, 'continental', 'quarter_leg2', '21:00:00'),
    (11, 'continental', 'semi_leg1', '21:00:00'),
    (12, 'continental', 'semi_leg2', '21:00:00'),
    (14, 'continental', 'final', '21:00:00');

    -- COPAS NACIONAIS: DIA 10 até DIA 20
    INSERT INTO public.calendar_schedule (day_of_month, competition_type, phase_name, match_time) VALUES
    (10, 'cup', '1st_phase_leg1', '09:00:00'),
    (11, 'cup', '1st_phase_leg2', '09:00:00'),
    (12, 'cup', '16th_leg1', '09:00:00'),
    (13, 'cup', '16th_leg2', '09:00:00'),
    (14, 'cup', '8th_leg1', '09:00:00'),
    (15, 'cup', '8th_leg2', '09:00:00'),
    (16, 'cup', 'quarter_leg1', '09:00:00'),
    (17, 'cup', 'quarter_leg2', '09:00:00'),
    (18, 'cup', 'semi_leg1', '09:00:00'),
    (19, 'cup', 'semi_leg2', '09:00:00'),
    (20, 'cup', 'final', '09:00:00');

    -- MUNDIAL DE CLUBES: DIA 16 até DIA 28
    FOR i IN 16..22 LOOP
        INSERT INTO public.calendar_schedule (day_of_month, competition_type, phase_name, match_time)
        VALUES (i, 'world_cup', 'groups', '12:00:00'); -- Added a midday slot for world cup
    END LOOP;
    
    INSERT INTO public.calendar_schedule (day_of_month, competition_type, phase_name, match_time) VALUES
    (24, 'world_cup', '8th', '12:00:00'),
    (25, 'world_cup', 'quarter', '12:00:00'),
    (26, 'world_cup', 'semi', '12:00:00'),
    (28, 'world_cup', 'final', '12:00:00');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initial seeding
SELECT public.seed_extreme_calendar();

-- Add fatigue log table
CREATE TABLE IF NOT EXISTS public.player_fatigue_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL,
    match_id UUID,
    competition_type TEXT,
    stamina_before NUMERIC,
    stamina_after NUMERIC,
    injury_risk BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_fatigue_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own fatigue logs" ON public.player_fatigue_logs FOR SELECT USING (true);
