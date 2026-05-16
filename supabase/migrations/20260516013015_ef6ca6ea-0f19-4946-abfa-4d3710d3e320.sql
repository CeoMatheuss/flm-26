-- Atualizar todas as ligas mundiais para a rodada 16
UPDATE public.world_leagues 
SET current_round = 16;

-- Marcar todos os jogos das ligas mundiais até a rodada 16 como concluídos (evitando duplicar os que já foram)
UPDATE public.world_matches
SET status = 'played',
    played_at = now(),
    home_goals = (random() * 4)::int,
    away_goals = (random() * 3)::int
WHERE round <= 16 AND status = 'scheduled';

-- Atualizar multiplayer_leagues para a rodada 16
UPDATE public.multiplayer_leagues
SET current_round = 16
WHERE season_status = 'in_progress';

-- Marcar jogos das multiplayer_leagues até a rodada 16 como concluídos
UPDATE public.league_matches
SET status = 'played',
    played_at = now(),
    home_goals = (random() * 4)::int,
    away_goals = (random() * 3)::int
WHERE round <= 16 AND status = 'scheduled';