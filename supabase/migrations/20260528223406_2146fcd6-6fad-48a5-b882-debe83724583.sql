-- Adiciona um valor padrão para approved_by usando um admin existente se necessário, 
-- ou simplesmente removemos a dependência desse campo se ele for usado em alguma lógica de UI.
-- Mas a solução mais robusta é garantir que todos na whitelist sejam considerados "aprovados"
-- se houver algum filtro oculto por esse campo.

-- Vamos atualizar todos os existentes que estão nulos para o ID do admin principal
UPDATE public.beta_whitelist 
SET approved_by = '1c4c75aa-2561-441e-9c0e-9655aa005e34' 
WHERE approved_by IS NULL;

-- Criar um trigger para aprovar automaticamente novas inserções na whitelist
CREATE OR REPLACE FUNCTION public.auto_approve_beta_whitelist()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approved_by IS NULL THEN
    NEW.approved_by := '1c4c75aa-2561-441e-9c0e-9655aa005e34';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_auto_approve_beta_whitelist ON public.beta_whitelist;
CREATE TRIGGER tr_auto_approve_beta_whitelist
BEFORE INSERT ON public.beta_whitelist
FOR EACH ROW
EXECUTE FUNCTION public.auto_approve_beta_whitelist();
