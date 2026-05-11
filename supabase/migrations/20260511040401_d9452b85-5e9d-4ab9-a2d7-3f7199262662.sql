-- 1. Renomeação Cirúrgica (Brasil)
UPDATE public.world_teams SET name = 'Santos' WHERE id = 'e1fc94b5-ade4-4e17-81e2-49026b5a2a38';
UPDATE public.world_teams SET name = 'Cruzeiro' WHERE id = 'e0e4ca78-504f-497c-8096-ff4d4e9ee041';
UPDATE public.world_teams SET name = 'Bahia' WHERE id = '5e6795fa-b8fb-45ea-a395-cb5b37d41b63';
UPDATE public.world_teams SET name = 'Corinthians' WHERE id = 'fae5418f-5618-4583-a774-fe4643550fd2';
UPDATE public.world_teams SET name = 'Fluminense' WHERE id = 'c76f139d-344d-4254-9516-933e540cbb2c';
UPDATE public.world_teams SET name = 'Grêmio' WHERE id = 'b0eab5aa-8bf0-4787-abdf-5175f5efc4a6';
UPDATE public.world_teams SET name = 'Internacional' WHERE id = '12186b51-785f-48e2-bf98-5297049f5151';

-- 2. Corrigir os remanescentes de 'BOT Liga Profesional' que entraram no Brasil
UPDATE public.world_teams SET name = 'Cuiabá' WHERE country = 'Brasil' AND name = 'BOT Liga Profesional 1';
UPDATE public.world_teams SET name = 'Fortaleza' WHERE country = 'Brasil' AND name = 'BOT Liga Profesional 2';
UPDATE public.world_teams SET name = 'Athletico Paranaense' WHERE country = 'Brasil' AND name = 'BOT Liga Profesional 3';
UPDATE public.world_teams SET name = 'Red Bull Bragantino' WHERE country = 'Brasil' AND name = 'BOT Liga Profesional 4';
UPDATE public.world_teams SET name = 'Vitória' WHERE country = 'Brasil' AND name = 'BOT Liga Profesional 5';
UPDATE public.world_teams SET name = 'Juventude' WHERE country = 'Brasil' AND name = 'BOT Liga Profesional 6';
UPDATE public.world_teams SET name = 'Criciúma' WHERE country = 'Brasil' AND name = 'BOT Liga Profesional 7';
UPDATE public.world_teams SET name = 'Atlético-GO' WHERE country = 'Brasil' AND name = 'BOT Liga Profesional 8';

-- 3. Limpar sistema de Copas
DELETE FROM national_cup_matches;
DELETE FROM national_cup_teams;
DELETE FROM national_cups;