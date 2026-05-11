-- Atualiza a tabela de olheiros com campos de contrato e mercado
ALTER TABLE public.scouts 
ADD COLUMN IF NOT EXISTS seasons_remaining INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS is_free_agent BOOLEAN DEFAULT false;

-- Adiciona coluna de status no player_data se necessário (será gerenciado no JSONB)
-- Mas podemos adicionar uma coluna de referência se o jogador for real no sistema
-- Por enquanto manteremos no player_data JSONB conforme a estrutura atual.

-- Modifica as políticas de RLS para permitir ver olheiros livres no mercado
CREATE POLICY "Scouts livres são visíveis por todos" 
ON public.scouts 
FOR SELECT 
USING (is_free_agent = true OR auth.uid() = user_id);

-- Função para decrementar temporadas (pode ser chamada via RPC ao fim de cada temporada)
CREATE OR REPLACE FUNCTION public.advance_scout_seasons()
RETURNS void AS $$
BEGIN
    UPDATE public.scouts
    SET seasons_remaining = seasons_remaining - 1
    WHERE user_id IS NOT NULL;
    
    -- Olheiros que expiraram o contrato tornam-se livres e perdem o vínculo com o usuário
    UPDATE public.scouts
    SET is_free_agent = true, user_id = NULL, seasons_remaining = 0
    WHERE seasons_remaining <= 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
