-- 1. Enable RLS on missing tables
ALTER TABLE public.cup_season_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_player_stats ENABLE ROW LEVEL SECURITY;

-- 2. Add restrictive policies
-- History is public for viewing by any authenticated user
DROP POLICY IF EXISTS "Public view cup history" ON public.cup_season_history;
CREATE POLICY "Public view cup history" ON public.cup_season_history
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Public view player stats" ON public.league_player_stats;
CREATE POLICY "Public view player stats" ON public.league_player_stats
FOR SELECT TO authenticated USING (true);

-- 3. Secure update_club_budget RPC
CREATE OR REPLACE FUNCTION public.update_club_budget(p_user_id uuid, p_amount bigint, p_description text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Authorization check: ensure user is only updating their own budget
  -- Note: auth.uid() returns the user making the request
  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only update your own club budget.';
  END IF;

  UPDATE public.game_saves
  SET club_data = jsonb_set(club_data, '{budget}', (COALESCE((club_data->>'budget')::BIGINT, 0) + p_amount)::TEXT::jsonb)
  WHERE user_id = p_user_id;
END;
$function$;

-- 4. Fix search_path for SECURITY DEFINER functions
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 5. Add rate limiting table
CREATE TABLE IF NOT EXISTS public.security_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action_type TEXT NOT NULL,
    last_attempt TIMESTAMP WITH TIME ZONE DEFAULT now(),
    attempt_count INT DEFAULT 1,
    UNIQUE(user_id, action_type)
);

ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own rate limits" ON public.security_rate_limits;
CREATE POLICY "Users can view own rate limits" ON public.security_rate_limits
FOR SELECT USING (auth.uid() = user_id);
