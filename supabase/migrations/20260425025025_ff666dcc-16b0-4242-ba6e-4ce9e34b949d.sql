-- 1. New column
ALTER TABLE public.live_matches
  ADD COLUMN IF NOT EXISTS shared_match_id text;

-- 2. Backfill: each row's shared_match_id mirrors its logical match_id
UPDATE public.live_matches
SET shared_match_id = match_id
WHERE shared_match_id IS NULL;

-- 3. Sanitize duplicates: keep the oldest row per shared_match_id active,
--    mark the rest as 'superseded' so the unique index can be applied.
WITH ranked AS (
  SELECT id,
         shared_match_id,
         ROW_NUMBER() OVER (
           PARTITION BY shared_match_id
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.live_matches
  WHERE shared_match_id IS NOT NULL
)
UPDATE public.live_matches lm
SET status = 'superseded',
    shared_match_id = NULL
FROM ranked
WHERE lm.id = ranked.id
  AND ranked.rn > 1;

-- 4. Partial unique index — at most one ACTIVE row per shared_match_id.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_live_matches_shared_match_id
  ON public.live_matches (shared_match_id)
  WHERE shared_match_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_live_matches_shared_match_id
  ON public.live_matches (shared_match_id);

-- 5. Helper SECURITY DEFINER function: is the user a participant of this shared match?
CREATE OR REPLACE FUNCTION public.is_match_participant(_user_id uuid, _shared_match_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- owner of the live match
    EXISTS (
      SELECT 1 FROM public.live_matches lm
      WHERE lm.shared_match_id = _shared_match_id
        AND lm.user_id = _user_id
    )
    OR
    -- friendly invite participant: matchId = 'friendly-<inviteId>'
    EXISTS (
      SELECT 1 FROM public.friendly_invites fi
      WHERE _shared_match_id = 'friendly-' || fi.id::text
        AND (fi.sender_id = _user_id OR fi.receiver_id = _user_id)
    )
    OR
    -- league match participant: matchId IS the league_matches.id
    EXISTS (
      SELECT 1 FROM public.league_matches lm2
      WHERE _shared_match_id = lm2.id::text
        AND (lm2.home_user_id = _user_id OR lm2.away_user_id = _user_id)
    )
    OR
    -- custom tournament match participant: matchId IS the custom_tournament_matches.id
    EXISTS (
      SELECT 1
      FROM public.custom_tournament_matches ctm
      JOIN public.custom_tournament_teams ctt
        ON ctt.id IN (ctm.home_team_id, ctm.away_team_id)
      WHERE _shared_match_id = ctm.id::text
        AND ctt.user_id = _user_id
    )
    OR
    -- cup match participant: matchId IS the cup_matches.id
    EXISTS (
      SELECT 1
      FROM public.cup_matches cm
      JOIN public.cup_teams ct
        ON ct.id IN (cm.home_team_id, cm.away_team_id)
      WHERE _shared_match_id = cm.id::text
        AND ct.user_id = _user_id
    )
$$;

-- 6. New SELECT policy: opponents can read the same row.
--    Existing "Users can view their own live matches" remains for owner.
DROP POLICY IF EXISTS "Participants can view shared live match" ON public.live_matches;
CREATE POLICY "Participants can view shared live match"
ON public.live_matches
FOR SELECT
TO authenticated
USING (
  shared_match_id IS NOT NULL
  AND public.is_match_participant(auth.uid(), shared_match_id)
);