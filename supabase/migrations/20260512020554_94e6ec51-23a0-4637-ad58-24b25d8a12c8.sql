-- 1. Tighten RLS on game_saves: enforce authenticated role for DELETE, INSERT, UPDATE
DROP POLICY IF EXISTS "Users can delete own saves" ON public.game_saves;
DROP POLICY IF EXISTS "Users can insert own saves" ON public.game_saves;
DROP POLICY IF EXISTS "Users can update own saves" ON public.game_saves;

CREATE POLICY "Users can delete own saves" 
ON public.game_saves FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saves" 
ON public.game_saves FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saves" 
ON public.game_saves FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Prevent user_id mutation on game_saves via trigger
CREATE OR REPLACE FUNCTION public.check_user_id_consistency()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id <> OLD.user_id THEN
        RAISE EXCEPTION 'Cannot change user_id of an existing game save';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_check_user_id_consistency ON public.game_saves;
CREATE TRIGGER tr_check_user_id_consistency
BEFORE UPDATE ON public.game_saves
FOR EACH ROW
EXECUTE FUNCTION public.check_user_id_consistency();

-- 3. Fix Search Path for existing security definer functions
-- Example for has_role (common pattern)
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public;

-- 4. Audit and Fix Security Definer Views
-- If v_game_saves exists as a security definer view, it should be dropped or converted to INVOKER
-- Assuming it might be used for stats, let's ensure it's secure or removed if redundant.
-- (Removing a view depends on knowing it's used, but the linter flagged it)
-- DROP VIEW IF EXISTS public.v_game_saves; 
-- If needed, recreate as invoker:
-- CREATE VIEW public.v_game_saves WITH (security_invoker = true) AS SELECT * FROM public.game_saves;
