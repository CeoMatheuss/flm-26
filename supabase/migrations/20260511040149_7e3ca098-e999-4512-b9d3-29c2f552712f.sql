-- 1. Renomear bots para nomes reais na base de dados (Brasil)
UPDATE public.world_teams 
SET name = CASE 
    WHEN name LIKE '%Bot 1%' THEN 'Flamengo'
    WHEN name LIKE '%Bot 2%' THEN 'Palmeiras'
    WHEN name LIKE '%Bot 3%' THEN 'São Paulo'
    WHEN name LIKE '%Bot 4%' THEN 'Corinthians'
    WHEN name LIKE '%Bot 5%' THEN 'Fluminense'
    WHEN name LIKE '%Bot 6%' THEN 'Grêmio'
    WHEN name LIKE '%Bot 7%' THEN 'Internacional'
    WHEN name LIKE '%Bot 8%' THEN 'Atlético Mineiro'
    WHEN name LIKE '%Bot 9%' THEN 'Botafogo'
    WHEN name LIKE '%Bot 10%' THEN 'Vasco da Gama'
    WHEN name LIKE '%Bot 11%' THEN 'Cruzeiro'
    WHEN name LIKE '%Bot 12%' THEN 'Santos'
    WHEN name LIKE '%Bot 13%' THEN 'Bahia'
    WHEN name LIKE '%Bot 14%' THEN 'Athletico Paranaense'
    WHEN name LIKE '%Bot 15%' THEN 'Fortaleza'
    WHEN name LIKE '%Bot 16%' THEN 'Cuiabá'
    WHEN name LIKE '%Bot 17%' THEN 'Red Bull Bragantino'
    WHEN name LIKE '%Bot 18%' THEN 'Vitória'
    WHEN name LIKE '%Bot 19%' THEN 'Juventude'
    WHEN name LIKE '%Bot 20%' THEN 'Criciúma'
    ELSE name
END
WHERE country = 'Brasil' AND user_id IS NULL;