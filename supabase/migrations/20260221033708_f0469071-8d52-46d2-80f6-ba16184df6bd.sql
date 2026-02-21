
CREATE TABLE public.journal_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Atualização',
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.journal_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view updates"
ON public.journal_updates FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert updates"
ON public.journal_updates FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete updates"
ON public.journal_updates FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
