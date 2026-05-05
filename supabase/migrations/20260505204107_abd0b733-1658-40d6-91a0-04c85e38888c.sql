-- Drop existing conflicting functions
DROP FUNCTION IF EXISTS public.sync_league_integrity(UUID);
DROP FUNCTION IF EXISTS public.reset_league_structure(UUID);

-- 1. Ensure league structure is set to 16 teams and 30 rounds
UPDATE public.multiplayer_leagues
SET max_members = 16,
    total_rounds = 30;

-- 2. Cleanup function to reset a specific league
CREATE OR REPLACE FUNCTION public.reset_league_structure(_league_id UUID)
RETURNS VOID AS $$
DECLARE
    _member_count INT;
    _division INT;
    _match_time TIME;
    _start_date TIMESTAMP WITH TIME ZONE;
    _member_ids UUID[];
    _num_teams INT := 16;
    _num_rounds INT := 30;
    _round INT;
BEGIN
    -- 1. Reset all matches
    DELETE FROM public.league_matches WHERE league_id = _league_id;

    -- 2. Ensure we have exactly 16 members (fill with bots if needed)
    SELECT count(*) INTO _member_count FROM public.league_members WHERE league_id = _league_id;
    
    -- Remove excess members
    IF _member_count > _num_teams THEN
        DELETE FROM public.league_members
        WHERE id IN (
            SELECT id FROM public.league_members
            WHERE league_id = _league_id AND user_id IS NULL
            ORDER BY reputation ASC, id DESC
            LIMIT (_member_count - _num_teams)
        );
    END IF;

    -- Fill with bots
    SELECT count(*) INTO _member_count FROM public.league_members WHERE league_id = _league_id;
    WHILE _member_count < _num_teams LOOP
        INSERT INTO public.league_members (league_id, club_name, club_logo, reputation, budget)
        VALUES (_league_id, 'BOT ' || substr(gen_random_uuid()::text, 1, 4), '🤖', 50, 1000000);
        _member_count := _member_count + 1;
    END LOOP;

    -- Reset member stats
    UPDATE public.league_members 
    SET points = 0, wins = 0, draws = 0, losses = 0, goals_for = 0, goals_against = 0, played = 0
    WHERE league_id = _league_id;

    -- 3. Get division for match times
    SELECT COALESCE(division, 1) INTO _division FROM public.multiplayer_leagues WHERE id = _league_id;
    _match_time := CASE 
        WHEN _division = 1 THEN '19:00:00'::TIME
        WHEN _division = 2 THEN '20:00:00'::TIME
        ELSE '21:00:00'::TIME
    END;

    -- 4. Rebuild the schedule
    _start_date := COALESCE((SELECT season_start FROM public.multiplayer_leagues WHERE id = _league_id), CURRENT_TIMESTAMP);
    
    SELECT array_agg(id) INTO _member_ids FROM (
        SELECT id FROM public.league_members WHERE league_id = _league_id ORDER BY id
    ) AS m;

    FOR _round IN 1.._num_rounds LOOP
        DECLARE
            _scheduled_at TIMESTAMP WITH TIME ZONE;
        BEGIN
            _scheduled_at := (_start_date::DATE + (_round - 1))::TIMESTAMP + _match_time;
            
            FOR i IN 1..(_num_teams / 2) LOOP
                DECLARE
                    _idx_home INT;
                    _idx_away INT;
                    _home_id UUID;
                    _away_id UUID;
                    _is_return BOOLEAN := _round > 15;
                    _base_round INT := CASE WHEN _is_return THEN _round - 15 ELSE _round END;
                BEGIN
                    _idx_home := (i + _base_round - 2) % (_num_teams - 1) + 1;
                    _idx_away := (_num_teams - 1 - i + _base_round - 1) % (_num_teams - 1) + 1;
                    IF i = 1 THEN _idx_home := 0; END IF;
                    
                    _home_id := _member_ids[_idx_home + 1];
                    _away_id := _member_ids[_idx_away + 1];

                    IF _is_return THEN
                        DECLARE _tmp UUID := _home_id; BEGIN _home_id := _away_id; _away_id := _tmp; END;
                    END IF;

                    INSERT INTO public.league_matches (league_id, round, home_user_id, away_user_id, status, scheduled_at, auto_sim_at)
                    VALUES (_league_id, _round, 
                        (SELECT user_id FROM public.league_members WHERE id = _home_id), 
                        (SELECT user_id FROM public.league_members WHERE id = _away_id), 
                        'scheduled', _scheduled_at, _scheduled_at + INTERVAL '5 minutes');
                END;
            END LOOP;
        END;
    END LOOP;

    -- 5. Auto-update current round
    UPDATE public.multiplayer_leagues
    SET current_round = GREATEST(1, LEAST(30, (CURRENT_DATE - season_start::DATE) + 1))
    WHERE id = _league_id AND season_status = 'in_progress';
END;
$$ LANGUAGE plpgsql;

-- 3. Central RPC to sync integrity
CREATE OR REPLACE FUNCTION public.sync_league_integrity(_user_id UUID)
RETURNS VOID AS $$
DECLARE
    _lg_id UUID;
BEGIN
    FOR _lg_id IN 
        SELECT DISTINCT league_id FROM public.league_members WHERE user_id = _user_id
    LOOP
        PERFORM public.reset_league_structure(_lg_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;
