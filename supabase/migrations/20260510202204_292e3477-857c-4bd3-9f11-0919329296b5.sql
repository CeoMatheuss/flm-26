-- Adicionar coluna para controle de tempo da base
ALTER TABLE public.game_saves 
ADD COLUMN IF NOT EXISTS last_youth_gen_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Função para garantir integridade do orçamento (evitar duplicidade)
CREATE OR REPLACE FUNCTION public.update_club_budget(p_user_id UUID, p_amount BIGINT, p_description TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.game_saves
  SET club_data = jsonb_set(club_data, '{budget}', (COALESCE((club_data->>'budget')::BIGINT, 0) + p_amount)::TEXT::jsonb)
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
