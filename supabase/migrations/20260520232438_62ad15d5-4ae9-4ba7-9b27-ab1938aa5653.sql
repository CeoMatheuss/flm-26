-- Add prizes_paid column to multiplayer_leagues if it doesn't exist
ALTER TABLE public.multiplayer_leagues ADD COLUMN IF NOT EXISTS prizes_paid BOOLEAN DEFAULT FALSE;

-- Update or insert prize configurations for leagues (positions 1-20)
-- Clear existing to ensure clean setup for 1-20
DELETE FROM public.prize_configurations WHERE competition_type = 'league';

INSERT INTO public.prize_configurations (competition_type, rank_or_phase, amount)
VALUES 
  ('league', '1', 50000000),
  ('league', '2', 40000000),
  ('league', '3', 35000000),
  ('league', '4', 30000000),
  ('league', '5', 25000000),
  ('league', '6', 20000000),
  ('league', '7', 18000000),
  ('league', '8', 16000000),
  ('league', '9', 14000000),
  ('league', '10', 12000000),
  ('league', '11', 10000000),
  ('league', '12', 9000000),
  ('league', '13', 8000000),
  ('league', '14', 7000000),
  ('league', '15', 6000000),
  ('league', '16', 5000000),
  ('league', '17', 4000000),
  ('league', '18', 3000000),
  ('league', '19', 2000000),
  ('league', '20', 1000000),
  ('league', 'participation', 500000);

-- Update grant_tournament_prize function for better notifications
CREATE OR REPLACE FUNCTION public.grant_tournament_prize(
  p_club_id UUID,
  p_competition_id UUID,
  p_competition_type TEXT,
  p_competition_name TEXT,
  p_phase_or_rank TEXT,
  p_amount BIGINT,
  p_season_year INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_formatted_amount TEXT;
BEGIN
  -- Check if already paid (idempotency)
  IF EXISTS (
    SELECT 1 FROM public.tournament_prizes_history 
    WHERE club_id = p_club_id 
      AND competition_id = p_competition_id 
      AND competition_type = p_competition_type 
      AND phase_or_rank = p_phase_or_rank 
      AND season_year = p_season_year
  ) THEN
    RETURN FALSE;
  END IF;

  -- Get user_id for the club
  SELECT user_id INTO v_user_id FROM public.clubs WHERE id = p_club_id;

  -- Update club budget/cash
  UPDATE public.clubs 
  SET budget = budget + p_amount,
      cash = cash + p_amount 
  WHERE id = p_club_id;

  -- Log in history
  INSERT INTO public.tournament_prizes_history (
    club_id, competition_type, competition_name, competition_id, 
    phase_or_rank, amount, season_year
  ) VALUES (
    p_club_id, p_competition_type, p_competition_name, p_competition_id, 
    p_phase_or_rank, p_amount, p_season_year
  );

  -- Format amount for notification (e.g., R$ 50.000.000)
  v_formatted_amount := 'R$ ' || to_char(p_amount, 'FM999G999G999G999');

  -- Create notification if user exists
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_notifications (
      user_id, title, message, type, category, priority
    ) VALUES (
      v_user_id, 
      'Premiação da temporada recebida.', 
      'Seu clube recebeu ' || v_formatted_amount || ' pela posição final em ' || p_competition_name || '.',
      'finance',
      'tournament',
      'high'
    );
  END IF;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
