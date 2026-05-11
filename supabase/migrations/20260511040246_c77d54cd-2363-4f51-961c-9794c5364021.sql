-- 1. Renomeação Massiva Global e Brasil
UPDATE public.world_teams 
SET name = CASE 
    -- Brasil
    WHEN name LIKE '%BOT Brasileirão Série A 1%' THEN 'Flamengo'
    WHEN name LIKE '%BOT Brasileirão Série A 2%' THEN 'Palmeiras'
    WHEN name LIKE '%BOT Brasileirão Série A 3%' THEN 'São Paulo'
    WHEN name LIKE '%BOT Brasileirão Série A 4%' THEN 'Corinthians'
    WHEN name LIKE '%BOT Brasileirão Série A 5%' THEN 'Fluminense'
    WHEN name LIKE '%BOT Brasileirão Série A 6%' THEN 'Grêmio'
    WHEN name LIKE '%BOT Brasileirão Série A 7%' THEN 'Internacional'
    WHEN name LIKE '%BOT Brasileirão Série A 8%' THEN 'Atlético Mineiro'
    WHEN name LIKE '%BOT Brasileirão Série A 9%' THEN 'Botafogo'
    WHEN name LIKE '%BOT Brasileirão Série A 10%' THEN 'Vasco da Gama'
    WHEN name LIKE '%BOT Brasileirão Série A 11%' THEN 'Cruzeiro'
    WHEN name LIKE '%BOT Brasileirão Série A 12%' THEN 'Santos'
    WHEN name LIKE '%BOT Brasileirão Série A 13%' THEN 'Bahia'
    WHEN name LIKE '%BOT Brasileirão Série A 14%' THEN 'Athletico Paranaense'
    WHEN name LIKE '%BOT Brasileirão Série A 15%' THEN 'Fortaleza'
    WHEN name LIKE '%BOT Brasileirão Série A 16%' THEN 'Cuiabá'
    WHEN name LIKE '%Bot 1%' THEN 'Flamengo'
    WHEN name LIKE '%Bot 2%' THEN 'Palmeiras'
    WHEN name LIKE '%Bot 3%' THEN 'São Paulo'
    -- Espanha
    WHEN name LIKE '%BOT LaLiga 1%' THEN 'Real Madrid'
    WHEN name LIKE '%BOT LaLiga 2%' THEN 'Barcelona'
    WHEN name LIKE '%BOT LaLiga 3%' THEN 'Atlético de Madrid'
    -- Inglaterra
    WHEN name LIKE '%BOT Premier League 1%' THEN 'Manchester City'
    WHEN name LIKE '%BOT Premier League 2%' THEN 'Arsenal'
    WHEN name LIKE '%BOT Premier League 3%' THEN 'Liverpool'
    WHEN name LIKE '%BOT Premier League 4%' THEN 'Manchester United'
    -- Itália
    WHEN name LIKE '%BOT Serie A 1%' THEN 'Inter de Milão'
    WHEN name LIKE '%BOT Serie A 2%' THEN 'Juventus'
    WHEN name LIKE '%BOT Serie A 3%' THEN 'Milan'
    -- Alemanha
    WHEN name LIKE '%BOT Bundesliga 1%' THEN 'Bayern de Munique'
    WHEN name LIKE '%BOT Bundesliga 2%' THEN 'Bayer Leverkusen'
    WHEN name LIKE '%BOT Bundesliga 3%' THEN 'Borussia Dortmund'
    -- Portugal
    WHEN name LIKE '%BOT Liga Portugal 1%' THEN 'Benfica'
    WHEN name LIKE '%BOT Liga Portugal 2%' THEN 'Porto'
    WHEN name LIKE '%BOT Liga Portugal 3%' THEN 'Sporting CP'
    ELSE name
END
WHERE user_id IS NULL;

-- 2. Limpar para regenerar
DELETE FROM national_cup_matches;
DELETE FROM national_cup_teams;
DELETE FROM national_cups;