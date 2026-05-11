-- 1. Normalizar códigos de país para nomes completos (padrão do sistema de ligas/copas)
UPDATE public.world_teams SET country = 'Brasil' WHERE country = 'BR';
UPDATE public.world_teams SET country = 'Espanha' WHERE country = 'ES';
UPDATE public.world_teams SET country = 'Argentina' WHERE country = 'AR';
UPDATE public.world_teams SET country = 'Inglaterra' WHERE country = 'EN';
UPDATE public.world_teams SET country = 'Portugal' WHERE country = 'PT';
UPDATE public.world_teams SET country = 'França' WHERE country = 'FR';
UPDATE public.world_teams SET country = 'Alemanha' WHERE country = 'DE';
UPDATE public.world_teams SET country = 'Itália' WHERE country = 'IT';

-- 2. Limpar para regeneração definitiva com a nova prioridade de humanos
DELETE FROM national_cup_matches;
DELETE FROM national_cup_teams;
DELETE FROM national_cups;