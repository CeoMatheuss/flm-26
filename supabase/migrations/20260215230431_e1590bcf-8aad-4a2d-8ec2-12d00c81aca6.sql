
-- Global chat messages table (not league-specific)
CREATE TABLE public.global_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  club_name TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.global_chat_messages ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Authenticated users can read global chat" ON public.global_chat_messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can insert their own messages
CREATE POLICY "Users can send global chat messages" ON public.global_chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own global messages" ON public.global_chat_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Validation trigger for global chat
CREATE OR REPLACE FUNCTION public.validate_global_chat()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF length(NEW.content) > 500 THEN
    RAISE EXCEPTION 'Message content exceeds maximum length of 500 characters';
  END IF;
  IF length(NEW.content) < 1 THEN
    RAISE EXCEPTION 'Message content cannot be empty';
  END IF;
  IF length(NEW.sender_name) > 100 THEN
    RAISE EXCEPTION 'Sender name exceeds maximum length';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_global_chat_trigger
  BEFORE INSERT ON public.global_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_global_chat();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_chat_messages;
