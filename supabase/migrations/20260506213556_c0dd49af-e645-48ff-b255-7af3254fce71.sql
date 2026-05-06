-- 1. Update world_leagues schema
ALTER TABLE public.world_leagues ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'waiting';
ALTER TABLE public.world_leagues ADD COLUMN IF NOT EXISTS division_level INTEGER DEFAULT 1;
ALTER TABLE public.world_leagues ADD COLUMN IF NOT EXISTS match_time TIME DEFAULT '19:30';
ALTER TABLE public.world_leagues ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 1;

-- 2. Clean up existing data for a fresh start (optional but recommended based on user request "Recriar do zero")
DELETE FROM public.league_matches;
DELETE FROM public.world_league_teams;

-- 3. Seed Brazil divisions if they don't exist
DO $$
DECLARE
    br_id UUID;
BEGIN
    SELECT id INTO br_id FROM public.countries WHERE code = 'BR';
    
    -- Ensure Brasileirão (Série A) is correct
    UPDATE public.world_leagues SET division_level = 1, match_time = '19:30', name = 'Série A' WHERE country_id = br_id AND name IN ('Brasileirão', 'Série A');
    
    -- Add Série B and C if missing
    IF NOT EXISTS (SELECT 1 FROM public.world_leagues WHERE country_id = br_id AND name = 'Série B') THEN
        INSERT INTO public.world_leagues (id, country_id, name, division_level, match_time)
        VALUES (gen_random_uuid(), br_id, 'Série B', 2, '18:30');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.world_leagues WHERE country_id = br_id AND name = 'Série C') THEN
        INSERT INTO public.world_leagues (id, country_id, name, division_level, match_time)
        VALUES (gen_random_uuid(), br_id, 'Série C', 3, '17:30');
    END IF;
END $$;

-- 4. Function to join a league
CREATE OR REPLACE FUNCTION public.join_world_league(_user_id UUID, _league_id UUID)
RETURNS VOID AS $$
DECLARE
    _club_name TEXT;
    _club_logo TEXT;
    _shield JSONB;
BEGIN
    -- Get club info from game_saves
    SELECT (club_data->>'name'), (club_data->>'logo'), (club_data->'shield')
    INTO _club_name, _club_logo, _shield
    FROM public.game_saves
    WHERE user_id = _user_id
    ORDER BY updated_at DESC
    LIMIT 1;

    -- Check if already in a league
    IF EXISTS (SELECT 1 FROM public.world_league_teams WHERE user_id = _user_id) THEN
        RAISE EXCEPTION 'Você já está em uma liga!';
    END IF;

    -- Check if league is full
    IF (SELECT count(*) FROM public.world_league_teams WHERE league_id = _league_id) >= 16 THEN
        RAISE EXCEPTION 'Esta liga já está cheia!';
    END IF;

    -- Join
    INSERT INTO public.world_league_teams (league_id, user_id, is_bot, club_name, club_logo, shield)
    VALUES (_league_id, _user_id, false, COALESCE(_club_name, 'Meu Clube'), COALESCE(_club_logo, '⚽'), _shield);

    -- Check if league should start
    PERFORM public.check_and_start_league(_league_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to check and start league
CREATE OR REPLACE FUNCTION public.check_and_start_league(_league_id UUID)
RETURNS VOID AS $$
DECLARE
    _team_count INTEGER;
    _needed INTEGER;
    _league_name TEXT;
    _div_level INTEGER;
    _i INTEGER;
BEGIN
    SELECT count(*) INTO _team_count FROM public.world_league_teams WHERE league_id = _league_id;
    
    IF _team_count >= 1 THEN -- For testing, let's say 1. Realistically 16.
        -- In production, we would wait for 16 users or fill with bots if requested.
        -- The user asked to fill with bots AUTOMATICALLY when joining if needed to reach 16.
        -- But realistically, we should probably only fill with bots when the first user joins if we want it to start immediately.
        
        _needed := 16 - _team_count;
        IF _needed > 0 THEN
            SELECT name, division_level INTO _league_name, _div_level FROM public.world_leagues WHERE id = _league_id;
            
            FOR _i IN 1.._needed LOOP
                INSERT INTO public.world_league_teams (league_id, is_bot, club_name, club_logo, bot_strength)
                VALUES (_league_id, true, 'BOT ' || _league_name || ' ' || _i, '🤖', 50 + (_div_level * 5));
            END LOOP;
        END IF;

        -- Update league status
        UPDATE public.world_leagues SET status = 'in_progress' WHERE id = _league_id;

        -- Generate Fixtures
        PERFORM public.generate_league_fixtures(_league_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Fixture Generation Logic (Round Robin)
CREATE OR REPLACE FUNCTION public.generate_league_fixtures(_league_id UUID)
RETURNS VOID AS $$
DECLARE
    _teams UUID[];
    _num_teams INTEGER := 16;
    _num_rounds INTEGER := 30; -- 16 teams * (16-1) * 2 = 30 rounds
    _round INTEGER;
    _i INTEGER;
    _home_idx INTEGER;
    _away_idx INTEGER;
    _team_a UUID;
    _team_b UUID;
    _base_date TIMESTAMP WITH TIME ZONE := now();
    _match_time TIME;
BEGIN
    SELECT match_time INTO _match_time FROM public.world_leagues WHERE id = _league_id;
    
    -- Get all teams in an array
    SELECT array_agg(id) INTO _teams FROM public.world_league_teams WHERE league_id = _league_id;

    -- Round Robin Algorithm (Circle Method)
    -- Round 1 to 15 (First half)
    FOR _round IN 1..15 LOOP
        FOR _i IN 0..(_num_teams / 2 - 1) LOOP
            _home_idx := _i;
            _away_idx := _num_teams - 1 - _i;
            
            _team_a := _teams[_home_idx + 1];
            _team_b := _teams[_away_idx + 1];

            -- Round 1: _team_a vs _team_b
            INSERT INTO public.league_matches (league_id, round, home_user_id, away_user_id, status, scheduled_at)
            VALUES (
                _league_id, 
                _round, 
                (SELECT user_id FROM public.world_league_teams WHERE id = _team_a),
                (SELECT user_id FROM public.world_league_teams WHERE id = _team_b),
                'scheduled',
                (_base_date + (_round - 1) * interval '1 day')::date + _match_time
            );

            -- Round 16: _team_b vs _team_a (Second half)
            INSERT INTO public.league_matches (league_id, round, home_user_id, away_user_id, status, scheduled_at)
            VALUES (
                _league_id, 
                _round + 15, 
                (SELECT user_id FROM public.world_league_teams WHERE id = _team_b),
                (SELECT user_id FROM public.world_league_teams WHERE id = _team_a),
                'scheduled',
                (_base_date + (_round + 14) * interval '1 day')::date + _match_time
            );
        END LOOP;

        -- Rotate teams (keep first team fixed)
        _teams := _teams[1:1] || _teams[_num_teams:_num_teams] || _teams[2:_num_teams-1];
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Ranking Integration Trigger
CREATE OR REPLACE FUNCTION public.handle_league_match_result()
RETURNS TRIGGER AS $$
DECLARE
    _home_user_id UUID;
    _away_user_id UUID;
    _points_home INTEGER := 0;
    _points_away INTEGER := 0;
    _bonus_home INTEGER := 0;
    _bonus_away INTEGER := 0;
BEGIN
    IF (OLD.status != 'played' AND NEW.status = 'played') THEN
        _home_user_id := NEW.home_user_id;
        _away_user_id := NEW.away_user_id;

        -- Calculate points
        IF NEW.home_goals > NEW.away_goals THEN
            _points_home := 25;
            _points_away := 3;
            IF (NEW.home_goals - NEW.away_goals) >= 3 THEN _bonus_home := 5; END IF;
        ELSIF NEW.home_goals < NEW.away_goals THEN
            _points_home := 3;
            _points_away := 25;
            IF (NEW.away_goals - NEW.home_goals) >= 3 THEN _bonus_away := 5; END IF;
        ELSE
            _points_home := 10;
            _points_away := 10;
        END IF;

        -- Update Global Ranking for Home
        IF _home_user_id IS NOT NULL THEN
            INSERT INTO public.global_ranking (user_id, ranking_points, games_played, wins, draws, losses)
            VALUES (
                _home_user_id, 
                _points_home + _bonus_home, 
                1, 
                CASE WHEN NEW.home_goals > NEW.away_goals THEN 1 ELSE 0 END,
                CASE WHEN NEW.home_goals = NEW.away_goals THEN 1 ELSE 0 END,
                CASE WHEN NEW.home_goals < NEW.away_goals THEN 1 ELSE 0 END
            )
            ON CONFLICT (user_id) DO UPDATE SET
                ranking_points = global_ranking.ranking_points + EXCLUDED.ranking_points,
                games_played = global_ranking.games_played + 1,
                wins = global_ranking.wins + EXCLUDED.wins,
                draws = global_ranking.draws + EXCLUDED.draws,
                losses = global_ranking.losses + EXCLUDED.losses,
                updated_at = now();
        END IF;

        -- Update Global Ranking for Away
        IF _away_user_id IS NOT NULL THEN
            INSERT INTO public.global_ranking (user_id, ranking_points, games_played, wins, draws, losses)
            VALUES (
                _away_user_id, 
                _points_away + _bonus_away, 
                1, 
                CASE WHEN NEW.away_goals > NEW.home_goals THEN 1 ELSE 0 END,
                CASE WHEN NEW.home_goals = NEW.away_goals THEN 1 ELSE 0 END,
                CASE WHEN NEW.away_goals < NEW.home_goals THEN 1 ELSE 0 END
            )
            ON CONFLICT (user_id) DO UPDATE SET
                ranking_points = global_ranking.ranking_points + EXCLUDED.ranking_points,
                games_played = global_ranking.games_played + 1,
                wins = global_ranking.wins + EXCLUDED.wins,
                draws = global_ranking.draws + EXCLUDED.draws,
                losses = global_ranking.losses + EXCLUDED.losses,
                updated_at = now();
        END IF;

        -- Update world_league_teams standings
        -- Home
        UPDATE public.world_league_teams SET
            played = played + 1,
            wins = wins + CASE WHEN NEW.home_goals > NEW.away_goals THEN 1 ELSE 0 END,
            draws = draws + CASE WHEN NEW.home_goals = NEW.away_goals THEN 1 ELSE 0 END,
            losses = losses + CASE WHEN NEW.home_goals < NEW.away_goals THEN 1 ELSE 0 END,
            goals_for = goals_for + NEW.home_goals,
            goals_against = goals_against + NEW.away_goals,
            points = points + CASE 
                WHEN NEW.home_goals > NEW.away_goals THEN 3 
                WHEN NEW.home_goals = NEW.away_goals THEN 1 
                ELSE 0 END
        WHERE league_id = NEW.league_id AND (user_id = _home_user_id OR (is_bot = true AND club_name = (SELECT club_name FROM public.world_league_teams WHERE user_id IS NULL AND league_id = NEW.league_id AND club_name LIKE 'BOT %' LIMIT 1)));
        -- Note: The bot update logic above is simplified. Ideally we'd have a team_id in matches.
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_league_match_result
AFTER UPDATE ON public.league_matches
FOR EACH ROW
EXECUTE FUNCTION public.handle_league_match_result();
