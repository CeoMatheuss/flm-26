
CREATE OR REPLACE FUNCTION public.validate_auction()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  required_min bigint;
BEGIN
  IF NEW.player_overall < 60 THEN
    RAISE EXCEPTION 'Player must be 60+ overall for auction';
  END IF;
  IF NEW.player_age > 35 THEN
    RAISE EXCEPTION 'Player must be 35 years old or younger';
  END IF;

  -- Lance mínimo padronizado por faixa de OVR
  required_min := CASE
    WHEN NEW.player_overall >= 80 THEN 500000
    WHEN NEW.player_overall >= 70 THEN 300000
    WHEN NEW.player_overall >= 60 THEN 200000
    ELSE 100000
  END;

  IF NEW.min_price < required_min THEN
    NEW.min_price := required_min;
  END IF;
  IF NEW.current_bid < NEW.min_price THEN
    NEW.current_bid := NEW.min_price;
  END IF;

  RETURN NEW;
END;
$function$;
