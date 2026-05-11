-- 1. Última Rodada de Renomeação (Brasil)
UPDATE public.world_teams SET name = 'Sport Recife' WHERE country = 'Brasil' AND name = 'BOT Liga Profesional 9';
UPDATE public.world_teams SET name = 'Ceará' WHERE country = 'Brasil' AND name = 'BOT Liga Profesional 10';
UPDATE public.world_teams SET name = 'Goiás' WHERE country = 'Brasil' AND name = 'BOT Liga Profesional 11';
UPDATE public.world_teams SET name = 'Coritiba' WHERE country = 'Brasil' AND name = 'BOT Liga Profesional 12';
UPDATE public.world_teams SET name = 'Novorizontino' WHERE country = 'Brasil' AND name = 'BOT Liga Profesional 13';
UPDATE public.world_teams SET name = 'Mirassol' WHERE country = 'Brasil' AND name = 'BOT Liga Profesional 14';
UPDATE public.world_teams SET name = 'América Mineiro' WHERE country = 'Brasil' AND name = 'BOT Liga Profesional 15';
UPDATE public.world_teams SET name = 'Avaí' WHERE country = 'Brasil' AND name = 'BOT Liga Profesional 16';

-- 2. Limpar sistema de Copas para regeneração definitiva
DELETE FROM national_cup_matches;
DELETE FROM national_cup_teams;
DELETE FROM national_cups;