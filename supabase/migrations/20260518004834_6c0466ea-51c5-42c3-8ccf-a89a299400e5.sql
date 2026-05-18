-- Fix the broken notify function first
CREATE OR REPLACE FUNCTION public.notify_player_status_change()
RETURNS TRIGGER AS $$
DECLARE
    owner_id UUID;
BEGIN
    -- Correctly link to user via world_teams
    SELECT user_id INTO owner_id FROM public.world_teams WHERE id = NEW.team_id;

    IF owner_id IS NOT NULL THEN
        -- Injury
        IF NEW.injury_weeks_remaining > 0 AND (OLD.injury_weeks_remaining IS NULL OR NEW.injury_weeks_remaining != OLD.injury_weeks_remaining) THEN
            INSERT INTO public.user_notifications (user_id, title, message, type, category, priority, icon)
            VALUES (
                owner_id,
                'Departamento Médico 🏥',
                NEW.name || ' sofreu uma lesão e ficará fora por ' || NEW.injury_weeks_remaining || ' rodadas.',
                'danger',
                'Clube',
                'high',
                '🏥'
            );
        END IF;

        -- Suspension (Check via suspensions table if possible, or we'll handle it in the next step)
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the enum for squad status if it doesn't exist
DO $$ BEGIN
    CREATE TYPE squad_status_type AS ENUM ('starter', 'bench', 'reserve', 'injured', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add squad_status column to world_players
ALTER TABLE public.world_players 
ADD COLUMN IF NOT EXISTS squad_status squad_status_type DEFAULT 'reserve';

-- Update existing players to have a default status
WITH team_rosters AS (
  SELECT 
    id, 
    team_id,
    row_number() OVER (PARTITION BY team_id ORDER BY overall DESC) as roster_rank
  FROM public.world_players
)
UPDATE public.world_players wp
SET squad_status = 
  CASE 
    WHEN tr.roster_rank <= 11 THEN 'starter'::squad_status_type
    WHEN tr.roster_rank <= 18 THEN 'bench'::squad_status_type
    ELSE 'reserve'::squad_status_type
  END
FROM team_rosters tr
WHERE wp.id = tr.id;

-- Function to handle auto-status based on injuries/suspensions
CREATE OR REPLACE FUNCTION public.sync_player_squad_status()
RETURNS TRIGGER AS $$
DECLARE
    is_suspended BOOLEAN;
BEGIN
    -- Check if suspended
    SELECT EXISTS (
        SELECT 1 FROM public.suspensions s 
        WHERE s.player_id = NEW.id AND s.remaining_games > 0
    ) INTO is_suspended;

    IF NEW.injury_weeks_remaining > 0 THEN
        NEW.squad_status := 'injured'::squad_status_type;
    ELSIF is_suspended THEN
        NEW.squad_status := 'suspended'::squad_status_type;
    ELSE
        -- If returning from injury/suspension, default to reserve if it was one of those
        IF OLD.squad_status IN ('injured', 'suspended') THEN
            NEW.squad_status := 'reserve'::squad_status_type;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for status sync
DROP TRIGGER IF EXISTS tr_sync_player_squad_status ON public.world_players;
CREATE TRIGGER tr_sync_player_squad_status
BEFORE UPDATE OF injury_weeks_remaining, squad_status ON public.world_players
FOR EACH ROW
EXECUTE FUNCTION public.sync_player_squad_status();

-- Function to ensure all teams have minimum 20 players
CREATE OR REPLACE FUNCTION public.ensure_full_rosters()
RETURNS void AS $$
DECLARE
    t RECORD;
    p_count INTEGER;
    players_to_add INTEGER;
    first_names TEXT[] := ARRAY['Carlos', 'Henrique', 'Vinícius', 'Jonathan', 'Renan', 'Caio', 'Yuri', 'Danilo', 'Leandro', 'Igor', 'Gustavo', 'Eduardo', 'Ricardo', 'Fabrício', 'Willian', 'Jean', 'Samuel', 'Otávio', 'Rogério', 'Adriano'];
    last_names TEXT[] := ARRAY['Pereira', 'Araújo', 'Barbosa', 'Ribeiro', 'Martins', 'Cardoso', 'Pinto', 'Nascimento', 'Moreira', 'Teixeira', 'Santos', 'Silva', 'Oliveira', 'Souza', 'Lima'];
    positions TEXT[] := ARRAY['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
BEGIN
    FOR t IN SELECT id, name FROM public.world_teams LOOP
        SELECT count(*) INTO p_count FROM public.world_players WHERE team_id = t.id;
        
        IF p_count < 20 THEN
            players_to_add := 20 - p_count;
            FOR i IN 1..players_to_add LOOP
                INSERT INTO public.world_players (
                    team_id,
                    name,
                    position,
                    overall,
                    age,
                    squad_status
                ) VALUES (
                    t.id,
                    first_names[floor(random() * array_length(first_names, 1) + 1)] || ' ' || last_names[floor(random() * array_length(last_names, 1) + 1)],
                    positions[floor(random() * array_length(positions, 1) + 1)],
                    floor(random() * 20 + 50)::int,
                    floor(random() * 15 + 18)::int,
                    'reserve'
                );
            END LOOP;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute ensure_full_rosters once
SELECT public.ensure_full_rosters();
