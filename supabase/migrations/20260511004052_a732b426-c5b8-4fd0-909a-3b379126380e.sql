-- 1. Drop Tables
DROP TABLE IF EXISTS public.national_cup_prizes CASCADE;
DROP TABLE IF EXISTS public.national_cup_matches CASCADE;
DROP TABLE IF EXISTS public.national_cup_teams CASCADE;
DROP TABLE IF EXISTS public.national_cups CASCADE;

-- 2. Drop Functions
DROP FUNCTION IF EXISTS public.update_national_cups_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.get_national_cup_name(p_country text) CASCADE;
DROP FUNCTION IF EXISTS public.qualify_national_cup_teams(_country text) CASCADE;
DROP FUNCTION IF EXISTS public.start_national_cup() CASCADE;
DROP FUNCTION IF EXISTS public.finish_national_cup_award_continental() CASCADE;

-- 3. Cleanup existing foreign keys or orphaned data that might refer to these tables (if any)
-- This is handled by CASCADE above, but good to be explicit for common relations.
