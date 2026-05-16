-- Atualizar estatísticas existentes com valores aleatórios
UPDATE public.world_player_stats s
SET 
    matches_played = (random() * 16)::int,
    goals = CASE 
        WHEN p.position = 'ATA' THEN (random() * 12)::int
        WHEN p.position = 'MEI' THEN (random() * 6)::int
        WHEN p.position = 'ZAG' OR p.position = 'LAT' THEN (random() * 2)::int
        ELSE 0
    END,
    assists = CASE 
        WHEN p.position = 'MEI' THEN (random() * 10)::int
        WHEN p.position = 'ATA' THEN (random() * 5)::int
        WHEN p.position = 'LAT' THEN (random() * 4)::int
        ELSE (random() * 1)::int
    END,
    avg_rating = (6.0 + random() * 3.0)::numeric(3,2),
    best_rating = (7.5 + random() * 2.5)::numeric(3,2),
    mvp_count = CASE WHEN (random() > 0.8) THEN (random() * 3)::int ELSE 0 END,
    yellow_cards = (random() * 5)::int,
    red_cards = CASE WHEN (random() > 0.9) THEN 1 ELSE 0 END,
    clean_sheets = CASE WHEN p.position IN ('GOL', 'ZAG') THEN (random() * 8)::int ELSE 0 END,
    goals_conceded = CASE WHEN p.position = 'GOL' THEN (random() * 20)::int ELSE 0 END,
    decisive_passes = (random() * 15)::int,
    minutes_played = (random() * 1440)::int,
    updated_at = now()
FROM 
    public.world_players p
WHERE 
    s.player_id = p.id
    AND s.league_id = 'edb83ebc-95c3-4f26-99b3-0b758a5d08c6'
    AND s.season_month = 5 
    AND s.season_year = 2026;

-- Inserir estatísticas para jogadores que ainda não possuem registro nesta liga/temporada
INSERT INTO public.world_player_stats (
    player_id, 
    team_id, 
    league_id, 
    season_month, 
    season_year, 
    matches_played, 
    goals, 
    assists, 
    avg_rating, 
    best_rating, 
    mvp_count,
    yellow_cards,
    red_cards,
    clean_sheets,
    goals_conceded,
    decisive_passes,
    minutes_played
)
SELECT 
    p.id,
    p.team_id,
    'edb83ebc-95c3-4f26-99b3-0b758a5d08c6',
    5,
    2026,
    (random() * 16)::int,
    CASE 
        WHEN p.position = 'ATA' THEN (random() * 12)::int
        WHEN p.position = 'MEI' THEN (random() * 6)::int
        WHEN p.position = 'ZAG' OR p.position = 'LAT' THEN (random() * 2)::int
        ELSE 0
    END,
    CASE 
        WHEN p.position = 'MEI' THEN (random() * 10)::int
        WHEN p.position = 'ATA' THEN (random() * 5)::int
        WHEN p.position = 'LAT' THEN (random() * 4)::int
        ELSE (random() * 1)::int
    END,
    (6.0 + random() * 3.0)::numeric(3,2),
    (7.5 + random() * 2.5)::numeric(3,2),
    CASE WHEN (random() > 0.8) THEN (random() * 3)::int ELSE 0 END,
    (random() * 5)::int,
    CASE WHEN (random() > 0.9) THEN 1 ELSE 0 END,
    CASE WHEN p.position IN ('GOL', 'ZAG') THEN (random() * 8)::int ELSE 0 END,
    CASE WHEN p.position = 'GOL' THEN (random() * 20)::int ELSE 0 END,
    (random() * 15)::int,
    (random() * 1440)::int
FROM 
    public.world_players p
WHERE 
    p.team_id IN (SELECT team_id FROM public.world_league_table WHERE league_id = 'edb83ebc-95c3-4f26-99b3-0b758a5d08c6')
    AND NOT EXISTS (
        SELECT 1 FROM public.world_player_stats s 
        WHERE s.player_id = p.id 
        AND s.league_id = 'edb83ebc-95c3-4f26-99b3-0b758a5d08c6'
        AND s.season_month = 5 
        AND s.season_year = 2026
    );
