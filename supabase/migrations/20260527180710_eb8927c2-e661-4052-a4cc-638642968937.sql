CREATE OR REPLACE FUNCTION public.init_world_sync_state()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.user_id IS NOT NULL THEN
        INSERT INTO public.world_sync_state (user_id) VALUES (NEW.user_id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$function$;
