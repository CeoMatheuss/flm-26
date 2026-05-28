-- Remove o trigger de aprovação automática
DROP TRIGGER IF EXISTS tr_auto_approve_beta_whitelist ON public.beta_whitelist;

-- Remove a função associada
DROP FUNCTION IF EXISTS public.auto_approve_beta_whitelist();
