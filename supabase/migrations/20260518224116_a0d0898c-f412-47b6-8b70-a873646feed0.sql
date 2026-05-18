CREATE TABLE IF NOT EXISTS public.match_worker_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID,
    match_type TEXT,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    result_text TEXT,
    status TEXT,
    error_message TEXT,
    details JSONB
);

-- Enable RLS
ALTER TABLE public.match_worker_logs ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated users (admins)
CREATE POLICY "Admins can view match worker logs" ON public.match_worker_logs
    FOR SELECT USING (auth.role() = 'authenticated');
