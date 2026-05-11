-- 1. Limpeza Radical do Brasil (Remover intrusos de outros países)
DELETE FROM public.world_teams 
WHERE country = 'Brasil' 
  AND user_id IS NULL 
  AND (
    name LIKE '%LaLiga%' OR 
    name LIKE '%Premier League%' OR 
    name LIKE '%Serie A%' OR 
    name LIKE '%Bundesliga%' OR 
    name LIKE '%Ligue 1%' OR
    name LIKE '%Argentina%' OR
    name LIKE '%Portugal%' OR
    name IN ('Real Madrid', 'Barcelona', 'Manchester City', 'Arsenal', 'Liverpool', 'Bayern de Munique', 'Inter de Milão', 'Juventus', 'Milan')
  );

-- 2. Corrigir nomes de times por país (Base Global)
-- Brasil
UPDATE public.world_teams SET name = 'Flamengo' WHERE country = 'Brasil' AND name LIKE '%Bot 1%';
UPDATE public.world_teams SET name = 'Palmeiras' WHERE country = 'Brasil' AND name LIKE '%Bot 2%';
UPDATE public.world_teams SET name = 'São Paulo' WHERE country = 'Brasil' AND name LIKE '%Bot 3%';
UPDATE public.world_teams SET name = 'Corinthians' WHERE country = 'Brasil' AND name LIKE '%Bot 4%';
UPDATE public.world_teams SET name = 'Fluminense' WHERE country = 'Brasil' AND name LIKE '%Bot 5%';
UPDATE public.world_teams SET name = 'Grêmio' WHERE country = 'Brasil' AND name LIKE '%Bot 6%';
UPDATE public.world_teams SET name = 'Internacional' WHERE country = 'Brasil' AND name LIKE '%Bot 7%';
UPDATE public.world_teams SET name = 'Atlético Mineiro' WHERE country = 'Brasil' AND name LIKE '%Bot 8%';
UPDATE public.world_teams SET name = 'Botafogo' WHERE country = 'Brasil' AND name LIKE '%Bot 9%';
UPDATE public.world_teams SET name = 'Vasco da Gama' WHERE country = 'Brasil' AND name LIKE '%Bot 10%';

-- Espanha
UPDATE public.world_teams SET name = 'Real Madrid' WHERE country = 'Espanha' AND name LIKE '%Bot 1%';
UPDATE public.world_teams SET name = 'Barcelona' WHERE country = 'Espanha' AND name LIKE '%Bot 2%';

-- Inglaterra
UPDATE public.world_teams SET name = 'Manchester City' WHERE country = 'Inglaterra' AND name LIKE '%Bot 1%';
UPDATE public.world_teams SET name = 'Arsenal' WHERE country = 'Inglaterra' AND name LIKE '%Bot 2%';

-- 3. Limpar Copas para regenerar
DELETE FROM national_cup_matches;
DELETE FROM national_cup_teams;
DELETE FROM national_cups;