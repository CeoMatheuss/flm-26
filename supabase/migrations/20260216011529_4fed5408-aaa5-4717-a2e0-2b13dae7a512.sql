
-- Create chat bans table
CREATE TABLE public.chat_bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  banned_by UUID NOT NULL,
  reason TEXT DEFAULT '',
  banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id)
);

ALTER TABLE public.chat_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view bans"
ON public.chat_bans FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert bans"
ON public.chat_bans FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bans"
ON public.chat_bans FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins/moderators to delete any global chat message
CREATE POLICY "Admins can delete any global message"
ON public.global_chat_messages FOR DELETE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
