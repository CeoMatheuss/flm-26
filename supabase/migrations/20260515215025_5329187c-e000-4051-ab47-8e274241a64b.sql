-- Add column to track youth generation cycle
ALTER TABLE public.clubs 
ADD COLUMN last_youth_generation_at TIMESTAMP WITH TIME ZONE;

-- Create table for youth prospects (players in the academy)
CREATE TABLE public.youth_prospects (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 15 AND age <= 17),
    position TEXT NOT NULL,
    overall INTEGER NOT NULL,
    potential INTEGER NOT NULL,
    attributes JSONB NOT NULL,
    market_value BIGINT NOT NULL,
    personality TEXT NOT NULL,
    dominant_foot TEXT NOT NULL CHECK (dominant_foot IN ('Destro', 'Canhoto', 'Ambidestro')),
    rarity TEXT NOT NULL CHECK (rarity IN ('Comum', 'Bom talento', 'Promessa', 'Craque geracional')),
    nationality TEXT NOT NULL,
    morale INTEGER DEFAULT 100,
    months_in_academy INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.youth_prospects ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Youth prospects are viewable by club owners" 
ON public.youth_prospects 
FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM public.clubs WHERE id = club_id));

-- Trigger for updated_at
CREATE TRIGGER update_youth_prospects_updated_at
BEFORE UPDATE ON public.youth_prospects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
