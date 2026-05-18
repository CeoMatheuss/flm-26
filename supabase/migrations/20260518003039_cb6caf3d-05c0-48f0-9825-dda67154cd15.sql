-- Create enum for card types
DO $$ BEGIN
    CREATE TYPE public.card_type AS ENUM ('yellow', 'red');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table to track every card issued
CREATE TABLE IF NOT EXISTS public.disciplinary_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.world_players(id) ON DELETE CASCADE NOT NULL,
    match_id UUID NOT NULL, 
    competition_type TEXT NOT NULL, -- 'Liga', 'Copa', 'Amistoso'
    card_type card_type NOT NULL,
    round INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table to track active suspensions
CREATE TABLE IF NOT EXISTS public.suspensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.world_players(id) ON DELETE CASCADE NOT NULL,
    competition_type TEXT NOT NULL,
    remaining_games INTEGER DEFAULT 1,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(player_id, competition_type)
);

-- Enable RLS
ALTER TABLE public.disciplinary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspensions ENABLE ROW LEVEL SECURITY;

-- Simple public policies
CREATE POLICY "Public disciplinary records read" ON public.disciplinary_records FOR SELECT USING (true);
CREATE POLICY "Public suspensions read" ON public.suspensions FOR SELECT USING (true);

-- Function to handle disciplinary logic after a card is inserted
CREATE OR REPLACE FUNCTION public.handle_card_discipline()
RETURNS TRIGGER AS $$
DECLARE
    yellow_count INTEGER;
BEGIN
    IF NEW.card_type = 'yellow' THEN
        -- Count yellows in this competition for this player
        SELECT count(*) INTO yellow_count
        FROM public.disciplinary_records
        WHERE player_id = NEW.player_id
          AND competition_type = NEW.competition_type
          AND card_type = 'yellow';

        -- Every 2 yellows = 1 match suspension
        IF yellow_count % 2 = 0 THEN
            INSERT INTO public.suspensions (player_id, competition_type, remaining_games, reason)
            VALUES (NEW.player_id, NEW.competition_type, 1, 'Acúmulo de Amarelos')
            ON CONFLICT (player_id, competition_type)
            DO UPDATE SET remaining_games = public.suspensions.remaining_games + 1;
        END IF;
    ELSIF NEW.card_type = 'red' THEN
        -- Red card = 1 match suspension
        INSERT INTO public.suspensions (player_id, competition_type, remaining_games, reason)
        VALUES (NEW.player_id, NEW.competition_type, 1, 'Cartão Vermelho')
        ON CONFLICT (player_id, competition_type)
        DO UPDATE SET remaining_games = public.suspensions.remaining_games + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_card_issued
AFTER INSERT ON public.disciplinary_records
FOR EACH ROW EXECUTE FUNCTION public.handle_card_discipline();

-- Function to decrement suspensions after a match
CREATE OR REPLACE FUNCTION public.process_match_suspensions(_player_ids UUID[], _competition_type TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.suspensions
    SET remaining_games = remaining_games - 1
    WHERE player_id = ANY(_player_ids)
      AND competition_type = _competition_type;

    DELETE FROM public.suspensions WHERE remaining_games <= 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
