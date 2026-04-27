-- Padroniza status 'finished' → 'played' para alinhar com filtros da UI
UPDATE public.cup_matches SET status = 'played' WHERE status = 'finished';
UPDATE public.club_world_cup_matches SET status = 'played' WHERE status = 'finished';
UPDATE public.continental_matches SET status = 'played' WHERE status = 'finished';