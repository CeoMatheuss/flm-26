-- Create world_players table
CREATE TABLE IF NOT EXISTS public.world_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.world_teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position TEXT NOT NULL, -- GK, DF, MF, FW
    overall INTEGER DEFAULT 60,
    age INTEGER DEFAULT 25,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.world_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read world players" ON public.world_players FOR SELECT USING (true);

-- Populate players for each team if they don't have any
DO $$
DECLARE
    team_rec RECORD;
    i INTEGER;
    first_names TEXT[] := ARRAY['Gabriel', 'Lucas', 'Matheus', 'Pedro', 'Joao', 'Marcos', 'Vinicius', 'Felipe', 'Bruno', 'Thiago', 'Diego', 'Rodrigo', 'Sandro', 'Ricardo', 'Paulo', 'Andre', 'Fabio', 'Luiz'];
    last_names TEXT[] := ARRAY['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes'];
    pos TEXT;
    ovr INTEGER;
BEGIN
    FOR team_rec IN SELECT id, strength FROM public.world_teams LOOP
        -- Check if team already has players
        IF NOT EXISTS (SELECT 1 FROM public.world_players WHERE team_id = team_rec.id) THEN
            FOR i IN 1..18 LOOP
                IF i = 1 THEN pos := 'GK';
                ELSIF i <= 7 THEN pos := 'DF';
                ELSIF i <= 13 THEN pos := 'MF';
                ELSE pos := 'FW';
                END IF;
                
                ovr := COALESCE(team_rec.strength, 65) + floor(random() * 11) - 5;
                IF ovr < 40 THEN ovr := 40; END IF;
                IF ovr > 99 THEN ovr := 99; END IF;

                INSERT INTO public.world_players (team_id, name, position, overall, age)
                VALUES (
                    team_rec.id, 
                    first_names[1 + floor(random() * array_length(first_names, 1))] || ' ' || last_names[1 + floor(random() * array_length(last_names, 1))],
                    pos,
                    ovr,
                    18 + floor(random() * 20)
                );
            END LOOP;
        END IF;
    END LOOP;
END $$;
