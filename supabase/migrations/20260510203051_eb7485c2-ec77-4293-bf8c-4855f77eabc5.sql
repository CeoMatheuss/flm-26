-- Atualizar estádio nos convites quando o nome mudar
CREATE OR REPLACE FUNCTION public.sync_stadium_name_on_invites()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.club_data->>'stadiumName' IS DISTINCT FROM NEW.club_data->>'stadiumName' THEN
    UPDATE public.friendly_invites
    SET stadium = NEW.club_data->>'stadiumName'
    WHERE sender_id = NEW.user_id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_sync_stadium_name ON public.game_saves;
CREATE TRIGGER tr_sync_stadium_name
AFTER UPDATE ON public.game_saves
FOR EACH ROW
EXECUTE FUNCTION public.sync_stadium_name_on_invites();
