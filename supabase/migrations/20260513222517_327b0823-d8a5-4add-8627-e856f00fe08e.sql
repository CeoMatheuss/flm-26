-- Function to atomically upsert player statistics
CREATE OR REPLACE FUNCTION public.upsert_player_stats(
    _table_name TEXT,
    _comp_id_field TEXT,
    _comp_id UUID,
    _team_id_field TEXT,
    _team_id UUID,
    _player_name TEXT,
    _stats JSONB
) RETURNS VOID AS $$
DECLARE
    _sql TEXT;
BEGIN
    -- We use an UPSERT (INSERT ... ON CONFLICT)
    -- First, we need to know the unique constraint. Assuming (comp_id, team_id, player_name) is unique.
    -- Since we might not have a formal unique constraint yet, we'll try to update first, then insert.
    
    _sql := format('
        INSERT INTO public.%I (
            %I, %I, player_name, team_name, goals, assists, total_rating, avg_rating, matches_played,
            yellow_cards, red_cards, clean_sheets, goals_conceded, motm_count, minutes_played, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()
        )
        ON CONFLICT (%I, %I, player_name) DO UPDATE SET
            goals = public.%I.goals + EXCLUDED.goals,
            assists = public.%I.assists + EXCLUDED.assists,
            total_rating = CASE WHEN %L = ''league_player_stats'' THEN public.%I.total_rating + EXCLUDED.total_rating ELSE public.%I.total_rating END,
            avg_rating = CASE WHEN %L = ''cup_player_stats'' THEN (public.%I.avg_rating * public.%I.matches_played + EXCLUDED.avg_rating) / (public.%I.matches_played + 1) ELSE public.%I.avg_rating END,
            matches_played = public.%I.matches_played + EXCLUDED.matches_played,
            yellow_cards = public.%I.yellow_cards + EXCLUDED.yellow_cards,
            red_cards = public.%I.red_cards + EXCLUDED.red_cards,
            clean_sheets = public.%I.clean_sheets + EXCLUDED.clean_sheets,
            goals_conceded = public.%I.goals_conceded + EXCLUDED.goals_conceded,
            motm_count = public.%I.motm_count + EXCLUDED.motm_count,
            minutes_played = public.%I.minutes_played + EXCLUDED.minutes_played,
            updated_at = NOW()
    ', 
    _table_name, _comp_id_field, _team_id_field, 
    _comp_id_field, _team_id_field, 
    _table_name, _table_name, _table_name, _table_name, _table_name, _table_name, _table_name, _table_name, _table_name, _table_name, _table_name, _table_name, _table_name, _table_name, _table_name, _table_name, _table_name);

    EXECUTE _sql USING 
        _comp_id, _team_id, _player_name, (_stats->>'team_name'), 
        (_stats->>'goals')::INT, (_stats->>'assists')::INT, 
        (_stats->>'total_rating')::NUMERIC, (_stats->>'avg_rating')::NUMERIC, 
        (_stats->>'matches_played')::INT, (_stats->>'yellow_cards')::INT, 
        (_stats->>'red_cards')::INT, (_stats->>'clean_sheets')::INT, 
        (_stats->>'goals_conceded')::INT, (_stats->>'motm_count')::INT, 
        (_stats->>'minutes_played')::INT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure unique constraints exist for the upsert to work
ALTER TABLE public.league_player_stats DROP CONSTRAINT IF EXISTS league_player_stats_unique;
ALTER TABLE public.league_player_stats ADD CONSTRAINT league_player_stats_unique UNIQUE (league_id, member_id, player_name);

ALTER TABLE public.cup_player_stats DROP CONSTRAINT IF EXISTS cup_player_stats_unique;
ALTER TABLE public.cup_player_stats ADD CONSTRAINT cup_player_stats_unique UNIQUE (cup_id, team_id, player_name);

-- Function to update league standings
CREATE OR REPLACE FUNCTION public.update_league_standings(_league_id UUID) 
RETURNS VOID AS $$
BEGIN
    -- Reset current standings
    UPDATE public.league_members
    SET points = 0, wins = 0, draws = 0, losses = 0, goals_for = 0, goals_against = 0, played = 0
    WHERE league_id = _league_id;

    -- Update based on all 'played' matches
    WITH match_results AS (
        SELECT 
            home_team_id as team_id,
            home_goals as gf,
            away_goals as ga,
            CASE WHEN home_goals > away_goals THEN 3 WHEN home_goals = away_goals THEN 1 ELSE 0 END as pts,
            CASE WHEN home_goals > away_goals THEN 1 ELSE 0 END as w,
            CASE WHEN home_goals = away_goals THEN 1 ELSE 0 END as d,
            CASE WHEN home_goals < away_goals THEN 1 ELSE 0 END as l
        FROM public.league_matches
        WHERE league_id = _league_id AND status = 'played'
        
        UNION ALL
        
        SELECT 
            away_team_id as team_id,
            away_goals as gf,
            home_goals as ga,
            CASE WHEN away_goals > home_goals THEN 3 WHEN away_goals = home_goals THEN 1 ELSE 0 END as pts,
            CASE WHEN away_goals = home_goals THEN 1 ELSE 0 END as w,
            CASE WHEN away_goals = home_goals THEN 1 ELSE 0 END as d,
            CASE WHEN away_goals < home_goals THEN 1 ELSE 0 END as l
        FROM public.league_matches
        WHERE league_id = _league_id AND status = 'played'
    ),
    aggregated AS (
        SELECT 
            team_id,
            SUM(pts) as total_pts,
            SUM(w) as total_w,
            SUM(d) as total_d,
            SUM(l) as total_l,
            SUM(gf) as total_gf,
            SUM(ga) as total_ga,
            COUNT(*) as total_played
        FROM match_results
        GROUP BY team_id
    )
    UPDATE public.league_members lm
    SET 
        points = agg.total_pts,
        wins = agg.total_w,
        draws = agg.total_d,
        losses = agg.total_l,
        goals_for = agg.total_gf,
        goals_against = agg.total_ga,
        played = agg.total_played
    FROM aggregated agg
    WHERE lm.id = agg.team_id AND lm.league_id = _league_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to upsert world player stats
CREATE OR REPLACE FUNCTION public.upsert_world_player_stats(
    _player_id TEXT,
    _team_name TEXT,
    _league_id UUID,
    _goals INT,
    _assists INT,
    _rating NUMERIC,
    _is_mvp BOOLEAN
) RETURNS VOID AS $$
DECLARE
    _year INT := EXTRACT(YEAR FROM NOW());
    _month INT := EXTRACT(MONTH FROM NOW());
BEGIN
    INSERT INTO public.world_player_stats (
        player_id, team_id, league_id, season_month, season_year, 
        matches_played, goals, assists, avg_rating, best_rating, mvp_count, updated_at
    ) VALUES (
        _player_id, NULL, _league_id, _month, _year,
        1, _goals, _assists, _rating, _rating, CASE WHEN _is_mvp THEN 1 ELSE 0 END, NOW()
    )
    ON CONFLICT (player_id, league_id, season_month, season_year) DO UPDATE SET
        goals = public.world_player_stats.goals + EXCLUDED.goals,
        assists = public.world_player_stats.assists + EXCLUDED.assists,
        avg_rating = (public.world_player_stats.avg_rating * public.world_player_stats.matches_played + EXCLUDED.avg_rating) / (public.world_player_stats.matches_played + 1),
        best_rating = GREATEST(public.world_player_stats.best_rating, EXCLUDED.best_rating),
        mvp_count = public.world_player_stats.mvp_count + EXCLUDED.mvp_count,
        matches_played = public.world_player_stats.matches_played + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add missing unique constraint for world_player_stats
ALTER TABLE public.world_player_stats DROP CONSTRAINT IF EXISTS world_player_stats_unique;
ALTER TABLE public.world_player_stats ADD CONSTRAINT world_player_stats_unique UNIQUE (player_id, league_id, season_month, season_year);
