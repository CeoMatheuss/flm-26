-- Ensure prize_configurations has necessary structure
-- (Already checked columns, they are: id, competition_type, competition_id, rank_or_phase, amount)

-- Insert default configurations for Cups if not present
INSERT INTO public.prize_configurations (competition_type, rank_or_phase, amount)
VALUES 
  ('cup', 'participation', 100000),
  ('cup', 'Fase 1', 250000),
  ('cup', 'Fase 2', 500000),
  ('cup', 'Oitavas de Final', 1000000),
  ('cup', 'Quartas de Final', 2000000),
  ('cup', 'Semifinal', 5000000),
  ('cup', 'Final_Winner', 10000000),
  ('cup', 'Final_RunnerUp', 5000000)
ON CONFLICT DO NOTHING;

-- Insert default configurations for Leagues if not present
INSERT INTO public.prize_configurations (competition_type, rank_or_phase, amount)
VALUES 
  ('league', '1', 10000000),
  ('league', '2', 7000000),
  ('league', '3', 5000000),
  ('league', '4', 3000000),
  ('league', '5', 2000000),
  ('league', '6', 1500000),
  ('league', '7', 1200000),
  ('league', '8', 1000000),
  ('league', '9', 900000),
  ('league', '10', 800000),
  ('league', 'participation', 500000)
ON CONFLICT DO NOTHING;

-- Prevent duplicate payments using a unique index
-- This is critical for the "Secure" part of the requirement.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_prize_payment 
ON public.tournament_prizes_history (club_id, competition_id, competition_type, phase_or_rank, season_year);

-- Add a column to track payment status in world_leagues
ALTER TABLE public.world_leagues ADD COLUMN IF NOT EXISTS prizes_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE public.national_cups ADD COLUMN IF NOT EXISTS prizes_paid_current_round INTEGER DEFAULT 0;

-- Function to safely grant prize and log it
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
  -- Depending on how it's used, but budget seems to be the primary one.
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

  -- Create notification if user exists
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_notifications (
      user_id, title, message, type, category, priority
    ) VALUES (
      v_user_id, 
      'Premiação Recebida', 
      'Seu clube recebeu R$ ' || (p_amount / 1000.0)::TEXT || 'K referente a ' || p_competition_name || ' (' || p_phase_or_rank || ').',
      'finance',
      'tournament',
      'high'
    );
  END IF;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- In case of any error (like unique constraint violation), return false
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
