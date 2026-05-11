-- 1. Remover Tabelas
DROP TABLE IF EXISTS public.beginner_cup_matches CASCADE;
DROP TABLE IF EXISTS public.beginner_cup_participants CASCADE;
DROP TABLE IF EXISTS public.beginner_cup CASCADE;
DROP TABLE IF EXISTS public.club_world_cup_matches CASCADE;
DROP TABLE IF EXISTS public.club_world_cup_teams CASCADE;
DROP TABLE IF EXISTS public.club_world_cups CASCADE;
DROP TABLE IF EXISTS public.cup_matches CASCADE;
DROP TABLE IF EXISTS public.cup_teams CASCADE;
DROP TABLE IF EXISTS public.cup_season_history CASCADE;
DROP TABLE IF EXISTS public.cup_competitions CASCADE;
DROP TABLE IF EXISTS public.world_cup_matches CASCADE;
DROP TABLE IF EXISTS public.world_cups CASCADE;
DROP TABLE IF EXISTS public.world_cup_tournament_matches CASCADE;
DROP TABLE IF EXISTS public.world_cup_tournament_clubs CASCADE;
DROP TABLE IF EXISTS public.world_cup_tournament CASCADE;
DROP TABLE IF EXISTS public.continental_matches CASCADE;
DROP TABLE IF EXISTS public.continental_teams CASCADE;
DROP TABLE IF EXISTS public.continental_competitions CASCADE;

-- 2. Remover Funções Ambíguas
DROP FUNCTION IF EXISTS public.process_cup_match_results(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.process_cup_match_results(uuid, integer, integer, boolean);
DROP FUNCTION IF EXISTS public.advance_cup_stage CASCADE;
DROP FUNCTION IF EXISTS public.generate_national_cups CASCADE;
DROP FUNCTION IF EXISTS public.get_user_cup_match CASCADE;
DROP FUNCTION IF EXISTS public.get_national_cup_standings CASCADE;

-- 3. Limpeza de Notificações e Notícias
DELETE FROM public.world_league_news WHERE title ILIKE '%Copa%' OR title ILIKE '%Libertadores%' OR title ILIKE '%Champions%' OR title ILIKE '%Mundial%';
DELETE FROM public.user_notifications WHERE title ILIKE '%Copa%' OR message ILIKE '%Copa%';
