
-- Add country column to multiplayer_leagues
ALTER TABLE public.multiplayer_leagues ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'Brasil';

-- Add region column for auto-created leagues naming
ALTER TABLE public.multiplayer_leagues ADD COLUMN IF NOT EXISTS auto_created boolean NOT NULL DEFAULT false;

-- Create function to auto-assign a player to a league based on country
CREATE OR REPLACE FUNCTION public.auto_assign_league(_user_id uuid, _club_name text, _country text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _league_id uuid;
  _member_count int;
  _league_number int;
  _code text;
BEGIN
  -- Check if user is already in a league for this country
  SELECT lm.league_id INTO _league_id
  FROM league_members lm
  JOIN multiplayer_leagues ml ON ml.id = lm.league_id
  WHERE lm.user_id = _user_id AND ml.country = _country
  LIMIT 1;

  IF _league_id IS NOT NULL THEN
    RETURN _league_id;
  END IF;

  -- Find an open league for this country (not full, auto_created)
  SELECT ml.id INTO _league_id
  FROM multiplayer_leagues ml
  WHERE ml.country = _country
    AND ml.auto_created = true
    AND ml.status = 'waiting'
    AND (SELECT count(*) FROM league_members lm2 WHERE lm2.league_id = ml.id) < ml.max_members
  ORDER BY ml.created_at ASC
  LIMIT 1;

  -- If no open league, create one
  IF _league_id IS NULL THEN
    -- Count existing auto leagues for naming
    SELECT count(*) INTO _league_number
    FROM multiplayer_leagues
    WHERE country = _country AND auto_created = true;

    _code := upper(substr(md5(random()::text), 1, 6));

    INSERT INTO multiplayer_leagues (name, code, owner_id, country, auto_created, max_members, status)
    VALUES (
      _country || ' Liga ' || (_league_number + 1),
      _code,
      _user_id,
      _country,
      true,
      20,
      'waiting'
    )
    RETURNING id INTO _league_id;
  END IF;

  -- Add user as member
  INSERT INTO league_members (league_id, user_id, club_name, club_logo)
  VALUES (_league_id, _user_id, _club_name, '⚽')
  ON CONFLICT DO NOTHING;

  RETURN _league_id;
END;
$$;

-- Allow the league SELECT policy to work for auto-assigned leagues (already has "Anyone authenticated can view leagues" for SELECT)
-- Update the league_members INSERT to also allow via the auto_assign function (SECURITY DEFINER handles this)

-- Allow league_members to be viewed by all members of the same league (already exists)
-- Allow league owner update to also work for auto-created leagues managed by the system
-- Add policy for system-managed league updates
CREATE POLICY "System can update auto leagues"
ON public.multiplayer_leagues
FOR UPDATE
USING (auto_created = true AND is_league_member(auth.uid(), id))
WITH CHECK (auto_created = true AND is_league_member(auth.uid(), id));
