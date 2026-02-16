
-- Create reactions table for global chat
CREATE TABLE public.global_chat_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.global_chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.global_chat_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view reactions"
ON public.global_chat_reactions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can add reactions"
ON public.global_chat_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their reactions"
ON public.global_chat_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete their own messages
CREATE POLICY "Users can delete their own global messages"
ON public.global_chat_messages FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_chat_reactions;
