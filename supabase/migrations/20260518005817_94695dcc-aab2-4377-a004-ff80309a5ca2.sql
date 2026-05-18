-- 1. Ensure the enum exists
DO $$ BEGIN
    CREATE TYPE squad_status_type AS ENUM ('starter', 'bench', 'reserve', 'injured', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Update world_players to ensure squad_status is consistent
ALTER TABLE public.world_players 
ADD COLUMN IF NOT EXISTS squad_status squad_status_type DEFAULT 'reserve';

-- 3. Create or replace the function to handle status priority (Suspended > Injured > Starter/Bench/Reserve)
CREATE OR REPLACE FUNCTION public.sync_player_squad_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If player is suspended, they MUST be 'suspended'
    IF EXISTS (SELECT 1 FROM public.suspensions WHERE player_id = NEW.id) THEN
        NEW.squad_status = 'suspended';
    -- Else if player is injured, they MUST be 'injured'
    ELSIF NEW.injury_weeks_remaining > 0 THEN
        NEW.squad_status = 'injured';
    -- If it was suspended or injured but is no longer, move back to reserve if it was one of those
    ELSIF OLD.squad_status IN ('injured', 'suspended') THEN
        NEW.squad_status = 'reserve';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger for automatic status sync
DROP TRIGGER IF EXISTS tr_sync_player_squad_status ON public.world_players;
CREATE TRIGGER tr_sync_player_squad_status
BEFORE UPDATE ON public.world_players
FOR EACH ROW
EXECUTE FUNCTION public.sync_player_squad_status();

-- 5. Create a function to auto-populate rosters for all teams (Global Correction)
CREATE OR REPLACE FUNCTION public.auto_fill_team_rosters()
RETURNS void AS $$
DECLARE
    team_record RECORD;
    player_count INTEGER;
    needed INTEGER;
    i INTEGER;
    new_ovr INTEGER;
    new_age INTEGER;
    new_pos TEXT;
    positions TEXT[] := ARRAY['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
BEGIN
    FOR team_record IN SELECT id, name FROM public.world_teams LOOP
        SELECT count(*) INTO player_count FROM public.world_players WHERE team_id = team_record.id;
        
        IF player_count < 20 THEN
            needed := 20 - player_count;
            FOR i IN 1..needed LOOP
                new_ovr := floor(random() * (75 - 55 + 1) + 55);
                new_age := floor(random() * (35 - 18 + 1) + 18);
                new_pos := positions[floor(random() * array_length(positions, 1)) + 1];
                
                INSERT INTO public.world_players (team_id, name, position, overall, age, squad_status)
                VALUES (team_record.id, 'Jogador Base ' || team_record.name || ' ' || i, new_pos, new_ovr, new_age, 'reserve');
            END LOOP;
        END IF;

        -- Ensure they have 11 starters if not already set
        IF NOT EXISTS (SELECT 1 FROM public.world_players WHERE team_id = team_record.id AND squad_status = 'starter') THEN
            UPDATE public.world_players 
            SET squad_status = 'starter'
            WHERE id IN (
                SELECT id FROM public.world_players 
                WHERE team_id = team_record.id 
                ORDER BY overall DESC 
                LIMIT 11
            );
        END IF;

        -- Ensure they have bench players
        IF NOT EXISTS (SELECT 1 FROM public.world_players WHERE team_id = team_record.id AND squad_status = 'bench') THEN
            UPDATE public.world_players 
            SET squad_status = 'bench'
            WHERE id IN (
                SELECT id FROM public.world_players 
                WHERE team_id = team_record.id 
                AND squad_status != 'starter'
                ORDER BY overall DESC 
                LIMIT 7
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger auto-fill immediately
SELECT public.auto_fill_team_rosters();
