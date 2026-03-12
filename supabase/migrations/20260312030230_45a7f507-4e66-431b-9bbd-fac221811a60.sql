
-- Add approval system to journal_updates
ALTER TABLE public.journal_updates 
  ADD COLUMN approved boolean NOT NULL DEFAULT false,
  ADD COLUMN approved_at timestamp with time zone,
  ADD COLUMN update_type text NOT NULL DEFAULT 'info',
  ADD COLUMN benefits text[] DEFAULT '{}';
