-- Função para incrementar torcida do clube
CREATE OR REPLACE FUNCTION public.increment_club_fans(_user_id UUID, _delta INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.clubs
  SET fans = GREATEST(0, fans + _delta),
      updated_at = NOW()
  WHERE user_id = _user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário para expor no PostgREST
COMMENT ON FUNCTION public.increment_club_fans IS 'Incrementa ou decrementa a torcida de um clube de forma segura.';
