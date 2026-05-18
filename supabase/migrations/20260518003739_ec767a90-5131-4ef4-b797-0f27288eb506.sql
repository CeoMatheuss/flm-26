-- Add synced column to match tables
ALTER TABLE public.world_matches ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT false;
ALTER TABLE public.league_matches ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT false;
ALTER TABLE public.national_cup_matches ADD COLUMN IF NOT EXISTS synced BOOLEAN DEFAULT false;

-- Add total_rating to world_player_stats if missing
ALTER TABLE public.world_player_stats ADD COLUMN IF NOT EXISTS total_rating NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.world_player_stats ADD COLUMN IF NOT EXISTS matches_played INTEGER DEFAULT 0;

-- Add total_rating to cup_player_stats if missing
ALTER TABLE public.cup_player_stats ADD COLUMN IF NOT EXISTS total_rating NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.cup_player_stats ADD COLUMN IF NOT EXISTS matches_played INTEGER DEFAULT 0;

-- Function to handle statistics synchronization for any competition type
CREATE OR REPLACE FUNCTION public.sync_match_stats(
    p_match_id UUID,
    p_competition_type TEXT -- 'world', 'league', 'cup'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_match_record RECORD;
    v_match_data JSONB;
    v_player_ratings JSONB;
    v_goal_scorers JSONB;
    v_player_id UUID;
    v_player_name TEXT;
    v_team_id UUID;
    v_team_name TEXT;
    v_goals INTEGER;
    v_assists INTEGER;
    v_rating NUMERIC;
    v_player_record RECORD;
    v_results JSONB := '{"success": true, "synced_players": 0}';
    v_comp_id UUID;
BEGIN
    -- 1. Get match record and check if already synced
    IF p_competition_type = 'world' THEN
        SELECT * INTO v_match_record FROM public.world_matches WHERE id = p_match_id;
        IF v_match_record.synced THEN RETURN '{"success": false, "error": "Already synced"}'::JSONB; END IF;
        v_comp_id := v_match_record.league_id;
    ELSIF p_competition_type = 'league' THEN
        SELECT * INTO v_match_record FROM public.league_matches WHERE id = p_match_id;
        IF v_match_record.synced THEN RETURN '{"success": false, "error": "Already synced"}'::JSONB; END IF;
        v_comp_id := v_match_record.league_id;
    ELSIF p_competition_type = 'cup' THEN
        SELECT * INTO v_match_record FROM public.national_cup_matches WHERE id = p_match_id;
        IF v_match_record.synced THEN RETURN '{"success": false, "error": "Already synced"}'::JSONB; END IF;
        v_comp_id := v_match_record.cup_id;
    ELSE
        RETURN '{"success": false, "error": "Invalid competition type"}'::JSONB;
    END IF;

    IF v_match_record IS NULL THEN
        RETURN '{"success": false, "error": "Match not found"}'::JSONB;
    END IF;

    v_match_data := v_match_record.match_data;
    IF v_match_data IS NULL THEN
        RETURN '{"success": false, "error": "No match data found"}'::JSONB;
    END IF;

    v_player_ratings := v_match_data->'playerRatings';
    v_goal_scorers := v_match_data->'goalScorers';

    -- 2. Process all players from match_data
    -- Note: match_data.playerRatings is Record<string_id, number>
    FOR v_player_id, v_rating IN SELECT * FROM jsonb_each_text(v_player_ratings) LOOP
        -- Initialize player stats for this match
        v_goals := 0;
        v_assists := 0;

        -- Count goals and assists from goalScorers array
        -- goalScorers: { name: string, team: 'home'|'away', assist: string }[]
        -- We need to find the player by ID to get their name for matching in goalScorers
        SELECT name, (CASE WHEN v_player_id::TEXT = ANY(ARRAY[v_match_record.home_team_id::TEXT]) THEN v_match_record.home_team_id ELSE v_match_record.away_team_id END) as team_id 
        INTO v_player_record 
        FROM public.world_players 
        WHERE id = v_player_id::UUID;

        IF v_player_record IS NULL THEN CONTINUE; END IF;

        -- Count goals
        SELECT count(*) INTO v_goals 
        FROM jsonb_array_elements(v_goal_scorers) AS gs 
        WHERE gs->>'name' = v_player_record.name;

        -- Count assists
        SELECT count(*) INTO v_assists 
        FROM jsonb_array_elements(v_goal_scorers) AS gs 
        WHERE gs->>'assist' = v_player_record.name;

        -- 3. Update the specific table
        IF p_competition_type = 'world' THEN
            INSERT INTO public.world_player_stats (
                player_id, team_id, league_id, season_month, season_year, 
                matches_played, goals, assists, total_rating, avg_rating
            ) VALUES (
                v_player_id::UUID, v_player_record.team_id, v_comp_id, v_match_record.season_month, v_match_record.season_year,
                1, v_goals, v_assists, v_rating::NUMERIC, v_rating::NUMERIC
            )
            ON CONFLICT (player_id, league_id, season_month, season_year) DO UPDATE SET
                matches_played = world_player_stats.matches_played + 1,
                goals = world_player_stats.goals + EXCLUDED.goals,
                assists = world_player_stats.assists + EXCLUDED.assists,
                total_rating = world_player_stats.total_rating + EXCLUDED.total_rating,
                avg_rating = (world_player_stats.total_rating + EXCLUDED.total_rating) / (world_player_stats.matches_played + 1),
                updated_at = NOW();

        ELSIF p_competition_type = 'league' THEN
            -- In league_player_stats, team_id is member_id
            -- We already have home_team_id/away_team_id which are member IDs in league_matches
            INSERT INTO public.league_player_stats (
                league_id, member_id, player_name, team_name,
                matches_played, goals, assists, total_rating
            ) VALUES (
                v_comp_id, v_player_record.team_id, v_player_record.name, 'Club',
                1, v_goals, v_assists, v_rating::NUMERIC
            )
            ON CONFLICT (league_id, member_id, player_name) DO UPDATE SET
                matches_played = league_player_stats.matches_played + 1,
                goals = league_player_stats.goals + EXCLUDED.goals,
                assists = league_player_stats.assists + EXCLUDED.assists,
                total_rating = league_player_stats.total_rating + EXCLUDED.total_rating,
                updated_at = NOW();

        ELSIF p_competition_type = 'cup' THEN
            INSERT INTO public.cup_player_stats (
                cup_id, player_id, team_id, player_name,
                matches_played, goals, assists, total_rating, avg_rating
            ) VALUES (
                v_comp_id, v_player_id::UUID, v_player_record.team_id, v_player_record.name,
                1, v_goals, v_assists, v_rating::NUMERIC, v_rating::NUMERIC
            )
            ON CONFLICT (cup_id, player_id) DO UPDATE SET
                matches_played = cup_player_stats.matches_played + 1,
                goals = cup_player_stats.goals + EXCLUDED.goals,
                assists = cup_player_stats.assists + EXCLUDED.assists,
                total_rating = cup_player_stats.total_rating + EXCLUDED.total_rating,
                avg_rating = (cup_player_stats.total_rating + EXCLUDED.total_rating) / (cup_player_stats.matches_played + 1);
        END IF;

        v_results := jsonb_set(v_results, '{synced_players}', ((v_results->>'synced_players')::INT + 1)::TEXT::JSONB);
    END LOOP;

    -- 4. Mark as synced
    IF p_competition_type = 'world' THEN
        UPDATE public.world_matches SET synced = true WHERE id = p_match_id;
    ELSIF p_competition_type = 'league' THEN
        UPDATE public.league_matches SET synced = true WHERE id = p_match_id;
    ELSIF p_competition_type = 'cup' THEN
        UPDATE public.national_cup_matches SET synced = true WHERE id = p_match_id;
    END IF;

    RETURN v_results;
END;
$$;
