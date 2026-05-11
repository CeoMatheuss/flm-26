-- 1. Mover times para seus países corretos (não deletar para evitar quebra de FK)
UPDATE public.world_teams SET country = 'Espanha' WHERE name LIKE '%LaLiga%' OR name IN ('Real Madrid', 'Barcelona', 'Atlético de Madrid');
UPDATE public.world_teams SET country = 'Inglaterra' WHERE name LIKE '%Premier League%' OR name IN ('Manchester City', 'Arsenal', 'Liverpool', 'Manchester United');
UPDATE public.world_teams SET country = 'Itália' WHERE name LIKE '%Serie A%' OR name IN ('Inter de Milão', 'Juventus', 'Milan');
UPDATE public.world_teams SET country = 'Alemanha' WHERE name LIKE '%Bundesliga%' OR name IN ('Bayern de Munique', 'Bayer Leverkusen', 'Borussia Dortmund');
UPDATE public.world_teams SET country = 'França' WHERE name LIKE '%Ligue 1%';
UPDATE public.world_teams SET country = 'Portugal' WHERE name LIKE '%Liga Portugal%' OR name IN ('Benfica', 'Porto', 'Sporting CP');

-- 2. Limpar sistema de Copas para regenerar com as origens corrigidas
DELETE FROM national_cup_matches;
DELETE FROM national_cup_teams;
DELETE FROM national_cups;