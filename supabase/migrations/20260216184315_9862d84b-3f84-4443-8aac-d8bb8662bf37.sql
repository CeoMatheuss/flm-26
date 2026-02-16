
-- Table for online friendly match invites between players
CREATE TABLE public.friendly_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  sender_club_name text NOT NULL DEFAULT '',
  receiver_club_name text NOT NULL DEFAULT '',
  sender_stadium text NOT NULL DEFAULT 'Arena',
  receiver_stadium text NOT NULL DEFAULT 'Arena',
  sender_stadium_capacity integer NOT NULL DEFAULT 5000,
  receiver_stadium_capacity integer NOT NULL DEFAULT 5000,
  home_team_id uuid NOT NULL, -- who is mandante
  match_date timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, played, expired
  match_result jsonb NULL, -- { home_goals, away_goals }
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.friendly_invites ENABLE ROW LEVEL SECURITY;

-- Both sender and receiver can view their invites
CREATE POLICY "Users can view own invites" ON public.friendly_invites
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can create invites as sender
CREATE POLICY "Users can send invites" ON public.friendly_invites
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND sender_id != receiver_id);

-- Receiver can update (accept/reject), both can update when played
CREATE POLICY "Receiver can respond to invites" ON public.friendly_invites
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- Sender can delete pending invites
CREATE POLICY "Sender can cancel pending invites" ON public.friendly_invites
  FOR DELETE TO authenticated
  USING (auth.uid() = sender_id AND status = 'pending');

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_friendly_invite()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(NEW.sender_club_name) > 50 THEN
    RAISE EXCEPTION 'Club name exceeds maximum length';
  END IF;
  IF length(NEW.receiver_club_name) > 50 THEN
    RAISE EXCEPTION 'Club name exceeds maximum length';
  END IF;
  IF NEW.sender_id = NEW.receiver_id THEN
    RAISE EXCEPTION 'Cannot invite yourself';
  END IF;
  IF NEW.home_team_id != NEW.sender_id AND NEW.home_team_id != NEW.receiver_id THEN
    RAISE EXCEPTION 'Home team must be sender or receiver';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_friendly_invite_trigger
  BEFORE INSERT OR UPDATE ON public.friendly_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_friendly_invite();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendly_invites;

-- Add admin SELECT policy for profiles so admins can look up users
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
