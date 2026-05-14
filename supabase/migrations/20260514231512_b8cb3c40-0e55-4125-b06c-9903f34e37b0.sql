-- Delete the empty duplicate leagues (the "[Country] Série A" ones with 0 teams)
DELETE FROM public.world_leagues 
WHERE division = 1 
  AND name IN ('Alemanha Série A', 'Argentina Série A', 'Espanha Série A', 'França Série A', 'Inglaterra Série A', 'Portugal Série A');

-- For Italy, merge "Serie A" (16 teams) into "Itália Série A" (64 teams) then delete
UPDATE public.world_teams SET league_id = '80a3131f-a6b1-4937-94eb-2d3581d8bc4b' WHERE league_id = 'cb44ddb9-272c-4e2e-a0b9-104d4308b1be';
UPDATE public.world_matches SET league_id = '80a3131f-a6b1-4937-94eb-2d3581d8bc4b' WHERE league_id = 'cb44ddb9-272c-4e2e-a0b9-104d4308b1be';
UPDATE public.world_league_table SET league_id = '80a3131f-a6b1-4937-94eb-2d3581d8bc4b' WHERE league_id = 'cb44ddb9-272c-4e2e-a0b9-104d4308b1be';
DELETE FROM public.world_leagues WHERE id = 'cb44ddb9-272c-4e2e-a0b9-104d4308b1be';