-- Ensure cup_competitions has necessary columns
ALTER TABLE public.cup_competitions ADD COLUMN IF NOT EXISTS is_national_cup BOOLEAN DEFAULT FALSE;
ALTER TABLE public.cup_competitions ADD COLUMN IF NOT EXISTS last_season_processed INTEGER;

-- Ensure cup_matches has necessary columns
ALTER TABLE public.cup_matches ADD COLUMN IF NOT EXISTS round_name TEXT;
ALTER TABLE public.cup_matches ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_cup_matches_scheduled_at ON public.cup_matches (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_cup_matches_status ON public.cup_matches (status);

-- Create a helper function to get cup name by country
CREATE OR REPLACE FUNCTION get_cup_name_by_country(country_code TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE country_code
    WHEN 'BR' THEN 'Copa do Brasil'
    WHEN 'EN' THEN 'FA Cup'
    WHEN 'ES' THEN 'Copa del Rey'
    WHEN 'IT' THEN 'Coppa Italia'
    WHEN 'DE' THEN 'DFB Pokal'
    WHEN 'FR' THEN 'Coupe de France'
    WHEN 'PT' THEN 'Taça de Portugal'
    WHEN 'AR' THEN 'Copa Argentina'
    WHEN 'UY' THEN 'Copa Uruguay'
    WHEN 'MX' THEN 'Copa MX'
    ELSE 'Copa Nacional (' || country_code || ')'
  END;
END;
$$ LANGUAGE plpgsql;
