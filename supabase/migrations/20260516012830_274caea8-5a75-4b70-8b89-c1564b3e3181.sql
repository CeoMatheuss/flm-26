-- Atualizar todas as ligas mundiais para a rodada 10
UPDATE public.world_leagues 
SET current_round = 10;

-- Marcar todos os jogos das ligas mundiais até a rodada 10 como concluídos
UPDATE public.world_matches
SET status = 'played',
    played_at = now(),
    home_goals = (random() * 4)::int,
    away_goals = (random() * 3)::int
WHERE round <= 10 AND status = 'scheduled';

-- Se houver multiplayer_leagues, atualizar também
UPDATE public.multiplayer_leagues
SET current_round = 10
WHERE season_status = 'in_progress';

UPDATE public.league_matches
SET status = 'played',
    played_at = now(),
    home_goals = (random() * 4)::int,
    away_goals = (random() * 3)::int
WHERE round <= 10 AND status = 'scheduled';