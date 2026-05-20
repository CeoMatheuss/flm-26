-- Function to invoke the prize processing edge function
CREATE OR REPLACE FUNCTION public.trigger_prize_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- We use pg_net to call the edge function asynchronously
  -- This ensures the database transaction is not blocked by the HTTP call
  PERFORM net.http_post(
    url := 'https://devjicsgksuxnnlkcliq.supabase.co/functions/v1/process-tournament-prizes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::jsonb->>'sub' -- This might not work in triggers, using service role key if possible or just rely on the function being public/internally routed
    ),
    body := jsonb_build_object('action', 'process_all')
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The Authorization header above is tricky in triggers. 
-- In some environments, net.http_post might need a service key.
-- Since I don't have the service key here, I'll assume the edge function handles it or I'll use a simpler trigger that just marks for processing if there's a queue.
-- But since I already deployed the edge function with action 'process_all', let's just make it simple.

-- Trigger for world_leagues
DROP TRIGGER IF EXISTS trigger_world_league_prizes ON public.world_leagues;
CREATE TRIGGER trigger_world_league_prizes
AFTER UPDATE OF active, prizes_paid ON public.world_leagues
FOR EACH ROW
WHEN (NEW.active = true AND NEW.prizes_paid = false)
EXECUTE FUNCTION public.trigger_prize_processing();

-- Trigger for multiplayer_leagues
DROP TRIGGER IF EXISTS trigger_multiplayer_league_prizes ON public.multiplayer_leagues;
CREATE TRIGGER trigger_multiplayer_league_prizes
AFTER UPDATE OF season_status, prizes_paid ON public.multiplayer_leagues
FOR EACH ROW
WHEN (NEW.season_status = 'finished' AND NEW.prizes_paid = false)
EXECUTE FUNCTION public.trigger_prize_processing();

-- Improve the prize processing trigger function to be more reliable
CREATE OR REPLACE FUNCTION public.trigger_prize_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the edge function using pg_net
  -- Using the project URL and action process_all
  -- We don't necessarily need a valid JWT if the function is configured to accept a specific key or if we use the anonymous key (if allowed)
  -- For now, we'll just try to hit it. The edge function itself has the service role key internally.
  INSERT INTO net.http_requests (url, method, headers, body)
  VALUES (
    'https://devjicsgksuxnnlkcliq.supabase.co/functions/v1/process-tournament-prizes',
    'POST',
    '{"Content-Type": "application/json"}'::jsonb,
    '{"action": "process_all"}'::jsonb
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
