CREATE TABLE IF NOT EXISTS public.match_simulation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL,
    match_type TEXT NOT NULL, -- 'world', 'league', 'friendly', 'tournament'
    step TEXT NOT NULL, -- 'start', 'simulating', 'finalizing', 'error'
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS but allow insert for monitoring
ALTER TABLE public.match_simulation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view logs" ON public.match_simulation_logs FOR SELECT USING (true);
CREATE POLICY "System can insert logs" ON public.match_simulation_logs FOR INSERT WITH CHECK (true);
