
-- Tabela compartilhada de substituições da partida ao vivo
CREATE TABLE IF NOT EXISTS public.live_match_substitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_match_id uuid NOT NULL REFERENCES public.live_matches(id) ON DELETE CASCADE,
  team_side text NOT NULL CHECK (team_side IN ('home','away')),
  minute integer NOT NULL DEFAULT 0,
  is_halftime boolean NOT NULL DEFAULT false,
  player_out_id text NOT NULL,
  player_in_id text NOT NULL,
  player_out_name text NOT NULL,
  player_in_name text NOT NULL,
  team_name text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (live_match_id, team_side, player_out_id),
  UNIQUE (live_match_id, team_side, player_in_id)
);

CREATE INDEX IF NOT EXISTS idx_live_match_subs_match
  ON public.live_match_substitutions(live_match_id, created_at);

ALTER TABLE public.live_match_substitutions ENABLE ROW LEVEL SECURITY;

-- Helper: usuário é participante de uma live_match (via shared_match_id)
CREATE OR REPLACE FUNCTION public.is_live_match_participant(_user_id uuid, _live_match_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.live_matches lm
    WHERE lm.id = _live_match_id
      AND (
        lm.user_id = _user_id
        OR (lm.shared_match_id IS NOT NULL
            AND public.is_match_participant(_user_id, lm.shared_match_id))
      )
  )
$$;

-- SELECT: qualquer participante pode ver
CREATE POLICY "Participants can view live match subs"
  ON public.live_match_substitutions
  FOR SELECT
  TO authenticated
  USING (public.is_live_match_participant(auth.uid(), live_match_id));

-- INSERT: somente o próprio usuário, e só para uma partida em que participa
CREATE POLICY "Participants can insert their own subs"
  ON public.live_match_substitutions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND public.is_live_match_participant(auth.uid(), live_match_id)
  );

-- Realtime
ALTER TABLE public.live_match_substitutions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_match_substitutions;
