CREATE OR REPLACE FUNCTION public.validate_auction()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.player_overall < 60 THEN
    RAISE EXCEPTION 'Player must be 60+ overall for auction';
  END IF;
  IF NEW.player_age > 35 THEN
    RAISE EXCEPTION 'Player must be 35 years old or younger';
  END IF;
  IF NEW.min_price < 0 THEN
    RAISE EXCEPTION 'Minimum price cannot be negative';
  END IF;
  RETURN NEW;
END;
$function$;