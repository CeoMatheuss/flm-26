
-- Fix league_members SELECT policy: restrict to members of the same league only
DROP POLICY IF EXISTS "Members can view league members" ON public.league_members;

CREATE POLICY "Members can view league members"
ON public.league_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.league_members lm
    WHERE lm.league_id = league_members.league_id
    AND lm.user_id = auth.uid()
  )
);

-- Add content length constraints via validation trigger for chat_messages
CREATE OR REPLACE FUNCTION public.validate_chat_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
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
$$;

CREATE TRIGGER validate_chat_content_trigger
BEFORE INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.validate_chat_content();

-- Add content length constraints for private_messages
CREATE TRIGGER validate_private_message_content_trigger
BEFORE INSERT ON public.private_messages
FOR EACH ROW
EXECUTE FUNCTION public.validate_chat_content();

-- Add validation for trade_proposals
CREATE OR REPLACE FUNCTION public.validate_trade_proposal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF length(NEW.player_name) > 100 THEN
    RAISE EXCEPTION 'Player name exceeds maximum length';
  END IF;
  IF NEW.price < 0 THEN
    RAISE EXCEPTION 'Price cannot be negative';
  END IF;
  IF NEW.message IS NOT NULL AND length(NEW.message) > 500 THEN
    RAISE EXCEPTION 'Message exceeds maximum length';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_trade_proposal_trigger
BEFORE INSERT ON public.trade_proposals
FOR EACH ROW
EXECUTE FUNCTION public.validate_trade_proposal();

-- Add validation for league name and club name
CREATE OR REPLACE FUNCTION public.validate_league_input()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF length(NEW.name) > 50 THEN
    RAISE EXCEPTION 'League name exceeds maximum length';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_league_input_trigger
BEFORE INSERT ON public.multiplayer_leagues
FOR EACH ROW
EXECUTE FUNCTION public.validate_league_input();

CREATE OR REPLACE FUNCTION public.validate_member_input()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF length(NEW.club_name) > 50 THEN
    RAISE EXCEPTION 'Club name exceeds maximum length';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_member_input_trigger
BEFORE INSERT ON public.league_members
FOR EACH ROW
EXECUTE FUNCTION public.validate_member_input();
