-- Update generate_league_fixtures to handle cup winners
CREATE OR REPLACE FUNCTION public.generate_league_fixtures(_league_id UUID, _month INTEGER, _year INTEGER)
RETURNS void AS $$
DECLARE
    team_ids UUID[];
    num_teams INTEGER := 16;
    num_rounds INTEGER := 30;
    r INTEGER;
    i INTEGER;
    home_idx INTEGER;
    away_idx INTEGER;
    match_date TIMESTAMP WITH TIME ZONE;
    league_name_val TEXT;
    new_team_id UUID;
    curr_day INTEGER := EXTRACT(DAY FROM now())::INTEGER;
    h_goals INTEGER;
    a_goals INTEGER;
    m_status TEXT;
    cup_winners UUID[];
    t_id UUID;
BEGIN
    SELECT name INTO league_name_val FROM public.world_leagues WHERE id = _league_id;

    -- 1. Identify Cup Winners that should be promoted this month
    -- (Those who were in last month's cup and reached the top 8)
    SELECT array_agg(team_id) INTO cup_winners
    FROM (
        SELECT team_id FROM public.beginner_cup_participants p
        JOIN public.beginner_cup c ON p.cup_id = c.id
        WHERE (c.season_month = _month - 1 OR (c.season_month = 12 AND _month = 1))
        AND c.season_year = CASE WHEN _month = 1 THEN _year - 1 ELSE _year END
        -- Simple logic: top 8 based on progress (could be refined)
        LIMIT 8
    ) s;

    -- 2. Fill with Promoted Teams first
    IF cup_winners IS NOT NULL THEN
        -- Only take enough to fill the league (unlikely to exceed 16, but good to check)
        FOR i IN 1..LEAST(num_teams, array_length(cup_winners, 1)) LOOP
            t_id := cup_winners[i];
            UPDATE public.world_teams SET league_id = _league_id, is_bot = false WHERE id = t_id;
            team_ids := array_append(team_ids, t_id);
        END LOOP;
    END IF;

    -- 3. Fill remaining slots with BOTS
    FOR i IN (COALESCE(array_length(team_ids, 1), 0) + 1)..num_teams LOOP
        INSERT INTO public.world_teams (league_id, name, is_bot, strength)
        VALUES (_league_id, 'BOT ' || league_name_val || ' ' || i, true, 65 + (random() * 15)::int)
        RETURNING id INTO new_team_id;
        team_ids := array_append(team_ids, new_team_id);
    END LOOP;

    -- 4. Generate Fixtures (Robin Circle)
    FOR r IN 1..num_rounds LOOP
        match_date := make_timestamptz(_year, _month, LEAST(r, 28), 19, 30, 0);
        
        IF r < curr_day THEN
            m_status := 'finished';
        ELSE
            m_status := 'scheduled';
        END IF;

        FOR i IN 0..(num_teams / 2 - 1) LOOP
            home_idx := i + 1;
            away_idx := num_teams - i;
            
            IF r % 2 = 0 THEN
                h_goals := CASE WHEN m_status = 'finished' THEN (floor(random() * 4))::int ELSE 0 END;
                a_goals := CASE WHEN m_status = 'finished' THEN (floor(random() * 3))::int ELSE 0 END;
                
                INSERT INTO public.world_matches (league_id, home_team_id, away_team_id, round, scheduled_at, season_month, season_year, status, home_goals, away_goals, played_at)
                VALUES (_league_id, team_ids[away_idx], team_ids[home_idx], r, match_date, _month, _year, m_status, h_goals, a_goals, CASE WHEN m_status = 'finished' THEN match_date ELSE NULL END);
            ELSE
                h_goals := CASE WHEN m_status = 'finished' THEN (floor(random() * 4))::int ELSE 0 END;
                a_goals := CASE WHEN m_status = 'finished' THEN (floor(random() * 3))::int ELSE 0 END;

                INSERT INTO public.world_matches (league_id, home_team_id, away_team_id, round, scheduled_at, season_month, season_year, status, home_goals, away_goals, played_at)
                VALUES (_league_id, team_ids[home_idx], team_ids[away_idx], r, match_date, _month, _year, m_status, h_goals, a_goals, CASE WHEN m_status = 'finished' THEN match_date ELSE NULL END);
            END IF;
        END LOOP;
        
        team_ids := team_ids[1:1] || team_ids[num_teams:num_teams] || team_ids[2:num_teams-1];
    END LOOP;

    -- 5. Create Standings
    FOR i IN 1..num_teams LOOP
        INSERT INTO public.world_league_table (league_id, team_id, season_month, season_year)
        VALUES (_league_id, team_ids[i], _month, _year)
        ON CONFLICT (team_id, season_month, season_year) DO NOTHING;
    END LOOP;

    -- Update table stats
    UPDATE public.world_league_table t
    SET 
        played = (SELECT count(*) FROM public.world_matches m WHERE (m.home_team_id = t.team_id OR m.away_team_id = t.team_id) AND m.status = 'finished' AND m.season_month = _month AND m.season_year = _year),
        wins = (SELECT count(*) FROM public.world_matches m WHERE ((m.home_team_id = t.team_id AND m.home_goals > m.away_goals) OR (m.away_team_id = t.team_id AND m.away_goals > m.home_goals)) AND m.status = 'finished' AND m.season_month = _month AND m.season_year = _year),
        draws = (SELECT count(*) FROM public.world_matches m WHERE (m.home_team_id = t.team_id OR m.away_team_id = t.team_id) AND m.home_goals = m.away_goals AND m.status = 'finished' AND m.season_month = _month AND m.season_year = _year),
        losses = (SELECT count(*) FROM public.world_matches m WHERE ((m.home_team_id = t.team_id AND m.home_goals < m.away_goals) OR (m.away_team_id = t.team_id AND m.away_goals < m.home_goals)) AND m.status = 'finished' AND m.season_month = _month AND m.season_year = _year),
        goals_for = (SELECT coalesce(sum(CASE WHEN m.home_team_id = t.team_id THEN m.home_goals ELSE m.away_goals END), 0) FROM public.world_matches m WHERE (m.home_team_id = t.team_id OR m.away_team_id = t.team_id) AND m.status = 'finished' AND m.season_month = _month AND m.season_year = _year),
        goals_against = (SELECT coalesce(sum(CASE WHEN m.home_team_id = t.team_id THEN m.away_goals ELSE m.home_goals END), 0) FROM public.world_matches m WHERE (m.home_team_id = t.team_id OR m.away_team_id = t.team_id) AND m.status = 'finished' AND m.season_month = _month AND m.season_year = _year),
        points = (SELECT 
            (count(*) FILTER (WHERE (m.home_team_id = t.team_id AND m.home_goals > m.away_goals) OR (m.away_team_id = t.team_id AND m.away_goals > m.home_goals)) * 25) +
            (count(*) FILTER (WHERE m.home_goals = m.away_goals) * 10) +
            (count(*) FILTER (WHERE (m.home_team_id = t.team_id AND m.home_goals < m.away_goals) OR (m.away_team_id = t.team_id AND m.away_goals < m.home_goals)) * 3)
            FROM public.world_matches m WHERE (m.home_team_id = t.team_id OR m.away_team_id = t.team_id) AND m.status = 'finished' AND m.season_month = _month AND m.season_year = _year
        )
    WHERE t.league_id = _league_id AND t.season_month = _month AND t.season_year = _year;
END;
$$ LANGUAGE plpgsql;
