-- 1. Renomeação Massiva para nomes reais
UPDATE public.world_teams 
SET name = CASE 
    WHEN name LIKE '%BOT Brasileirão Série A 1%' OR name LIKE '%Bot 1%' THEN 'Flamengo'
    WHEN name LIKE '%BOT Brasileirão Série A 2%' OR name LIKE '%Bot 2%' THEN 'Palmeiras'
    WHEN name LIKE '%BOT Brasileirão Série A 3%' OR name LIKE '%Bot 3%' THEN 'São Paulo'
    WHEN name LIKE '%BOT Brasileirão Série A 4%' OR name LIKE '%Bot 4%' THEN 'Corinthians'
    WHEN name LIKE '%BOT Brasileirão Série A 5%' OR name LIKE '%Bot 5%' THEN 'Fluminense'
    WHEN name LIKE '%BOT Brasileirão Série A 6%' OR name LIKE '%Bot 6%' THEN 'Grêmio'
    WHEN name LIKE '%BOT Brasileirão Série A 7%' OR name LIKE '%Bot 7%' THEN 'Internacional'
    WHEN name LIKE '%BOT Brasileirão Série A 8%' OR name LIKE '%Bot 8%' THEN 'Atlético Mineiro'
    WHEN name LIKE '%BOT Brasileirão Série A 9%' OR name LIKE '%Bot 9%' THEN 'Botafogo'
    WHEN name LIKE '%BOT Brasileirão Série A 10%' OR name LIKE '%Bot 10%' THEN 'Vasco da Gama'
    WHEN name LIKE '%BOT Brasileirão Série A 11%' OR name LIKE '%Bot 11%' THEN 'Cruzeiro'
    WHEN name LIKE '%BOT Brasileirão Série A 12%' OR name LIKE '%Bot 12%' THEN 'Santos'
    WHEN name LIKE '%BOT Brasileirão Série A 13%' OR name LIKE '%Bot 13%' THEN 'Bahia'
    WHEN name LIKE '%BOT Brasileirão Série A 14%' OR name LIKE '%Bot 14%' THEN 'Athletico Paranaense'
    WHEN name LIKE '%BOT Brasileirão Série A 15%' OR name LIKE '%Bot 15%' THEN 'Fortaleza'
    WHEN name LIKE '%BOT Brasileirão Série A 16%' OR name LIKE '%Bot 16%' THEN 'Cuiabá'
    ELSE name
END
WHERE country = 'Brasil' AND user_id IS NULL;

-- 2. Limpar para regenerar com nomes novos
DELETE FROM national_cup_matches;
DELETE FROM national_cup_teams;
DELETE FROM national_cups;