-- 1. Remover linhas duplicadas mantendo a mais antiga (menor created_at)
DELETE FROM public.national_cup_teams a
USING public.national_cup_teams b
WHERE a.cup_id = b.cup_id
  AND a.club_id = b.club_id
  AND a.created_at > b.created_at;

-- 2. Constraint para impedir duplicação futura
ALTER TABLE public.national_cup_teams 
  ADD CONSTRAINT national_cup_teams_unique_club UNIQUE (cup_id, club_id);

-- 3. Apagar jogos para regenerar o sorteio limpo
DELETE FROM public.national_cup_matches;
UPDATE public.national_cups SET current_round = 1, status = 'scheduled';