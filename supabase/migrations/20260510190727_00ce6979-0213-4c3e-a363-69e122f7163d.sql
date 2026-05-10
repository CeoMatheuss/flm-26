-- Reset Copas data for a fresh start
DELETE FROM public.cup_matches;
DELETE FROM public.cup_teams;
DELETE FROM public.cup_competitions;

-- Update system settings to allow re-initialization
DELETE FROM public.system_settings WHERE key = 'copa_brasil_init';

-- Ensure all existing/future world matches are at 12:00
-- This affects world_matches which is the engine for the league/cup simulation
UPDATE public.world_matches 
SET scheduled_at = (date_trunc('day', scheduled_at) + interval '12 hours')
WHERE status = 'scheduled';
