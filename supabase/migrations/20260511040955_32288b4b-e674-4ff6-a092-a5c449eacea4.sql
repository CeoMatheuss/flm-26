-- 1. Normalizar qualquer remanescente de código de país
UPDATE public.world_teams SET country = 'Brasil' WHERE country IN ('BR', 'Brazil');
UPDATE public.world_teams SET country = 'Espanha' WHERE country IN ('ES', 'Spain');
UPDATE public.world_teams SET country = 'Argentina' WHERE country IN ('AR');
UPDATE public.world_teams SET country = 'Inglaterra' WHERE country IN ('EN', 'England');
UPDATE public.world_teams SET country = 'Portugal' WHERE country IN ('PT');
UPDATE public.world_teams SET country = 'França' WHERE country IN ('FR', 'France');
UPDATE public.world_teams SET country = 'Alemanha' WHERE country IN ('DE', 'Germany');
UPDATE public.world_teams SET country = 'Itália' WHERE country IN ('IT', 'Italy');

-- 2. Limpar para regeneração com a lógica de prioridade humana (NULLS LAST no edge)
DELETE FROM national_cup_matches;
DELETE FROM national_cup_teams;
DELETE FROM national_cups;