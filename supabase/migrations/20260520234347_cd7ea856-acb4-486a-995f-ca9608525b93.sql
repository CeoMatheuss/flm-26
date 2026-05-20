-- Atualizar premiações da liga
DELETE FROM public.prize_configurations WHERE competition_type = 'league';

INSERT INTO public.prize_configurations (competition_type, rank_or_phase, amount) VALUES
('league', '1', 18000000),  -- Campeão
('league', '2', 15000000),  -- Vice
('league', '3', 13000000),
('league', '4', 11000000),
('league', '5', 9000000),
('league', '6', 8000000),
('league', '7', 7000000),
('league', '8', 6000000),
('league', '9', 5000000),
('league', '10', 4500000),
('league', '11', 4000000),
('league', '12', 3500000),
('league', '13', 3000000),
('league', '14', 2500000),
('league', '15', 2000000),
('league', '16', 1500000),  -- Último colocado
('league', 'participation', 500000);

-- Garantir que as ligas existentes tenham max_teams = 16 (caso alguma ainda não tenha)
UPDATE public.world_leagues SET max_teams = 16 WHERE max_teams > 16;