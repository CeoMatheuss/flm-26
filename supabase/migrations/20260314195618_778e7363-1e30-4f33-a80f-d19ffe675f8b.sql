
-- Add oitiatudobempedropassos@gmail.com (user_id: c9544dd0-3729-480b-bd00-315d75a45711) as admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('c9544dd0-3729-480b-bd00-315d75a45711', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Update auto_assign_admin trigger to also auto-assign this email
CREATE OR REPLACE FUNCTION public.auto_assign_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email IN ('fcmsistemas7@gmail.com', 'oitiatudobempedropassos@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
