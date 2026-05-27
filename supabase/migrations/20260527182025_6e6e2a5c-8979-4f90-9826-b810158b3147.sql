
DO $$
DECLARE
  lg RECORD;
  team_ids UUID[];
  pos UUID[];
  fixed_team UUID;
  r INT;
  i INT;
  k INT;
  home_t UUID;
  away_t UUID;
  tmp UUID;
  hg INT;
  ag INT;
  match_round INT;
  base_date TIMESTAMPTZ;
  match_date TIMESTAMPTZ;
  match_status TEXT;
  team_count INT;
BEGIN
  FOR lg IN SELECT id, season_year FROM public.world_leagues WHERE active = true LOOP

    -- 1) Trim to 16 teams (prefer humans, fill remaining bots randomly)
    DELETE FROM public.world_matches WHERE league_id = lg.id;
    DELETE FROM public.world_league_standings WHERE league_id = lg.id;
    DELETE FROM public.world_league_table WHERE league_id = lg.id;
    DELETE FROM public.world_player_stats WHERE league_id = lg.id;

    DELETE FROM public.world_teams
     WHERE id IN (
       SELECT id FROM (
         SELECT id, row_number() OVER (ORDER BY (user_id IS NOT NULL) DESC, random()) AS rn
           FROM public.world_teams WHERE league_id = lg.id
       ) x WHERE rn > 16
     );

    SELECT COUNT(*) INTO team_count FROM public.world_teams WHERE league_id = lg.id;
    IF team_count <> 16 THEN
      RAISE NOTICE 'Liga % tem % times (esperado 16), pulando', lg.id, team_count;
      CONTINUE;
    END IF;

    SELECT array_agg(id ORDER BY random()) INTO team_ids
      FROM public.world_teams WHERE league_id = lg.id;

    fixed_team := team_ids[1];
    base_date := now() - interval '30 days';

    -- 2) Generate first leg (rounds 1..15) using circle method
    FOR r IN 0..14 LOOP
      -- Build positions array: fixed at slot 1, others rotated by r
      pos := ARRAY[fixed_team];
      FOR k IN 1..15 LOOP
        pos := array_append(pos, team_ids[((k - 1 + r) % 15) + 2]);
      END LOOP;

      match_round := r + 1;
      match_status := CASE WHEN match_round <= 26 THEN 'finished' ELSE 'scheduled' END;
      match_date := base_date + ((r) * interval '1 day');

      FOR i IN 1..8 LOOP
        home_t := pos[i];
        away_t := pos[17 - i];
        IF r % 2 = 1 THEN
          tmp := home_t; home_t := away_t; away_t := tmp;
        END IF;

        IF match_status = 'finished' THEN
          hg := floor(random() * 4)::int;
          ag := floor(random() * 4)::int;
        ELSE
          hg := 0; ag := 0;
        END IF;

        INSERT INTO public.world_matches(
          league_id, home_team_id, away_team_id, round,
          season_month, season_year, scheduled_at, status,
          home_goals, away_goals, simulated, synced, played_at
        ) VALUES (
          lg.id, home_t, away_t, match_round,
          1, lg.season_year, match_date, match_status,
          hg, ag, match_status = 'finished', match_status = 'finished',
          CASE WHEN match_status = 'finished' THEN match_date ELSE NULL END
        );
      END LOOP;
    END LOOP;

    -- 3) Generate second leg (rounds 16..30) with reversed home/away
    FOR r IN 0..14 LOOP
      pos := ARRAY[fixed_team];
      FOR k IN 1..15 LOOP
        pos := array_append(pos, team_ids[((k - 1 + r) % 15) + 2]);
      END LOOP;

      match_round := r + 16;
      match_status := CASE WHEN match_round <= 26 THEN 'finished' ELSE 'scheduled' END;
      match_date := base_date + ((r + 15) * interval '1 day');

      FOR i IN 1..8 LOOP
        home_t := pos[i];
        away_t := pos[17 - i];
        -- Reverse leg: flip versus first leg
        IF r % 2 = 0 THEN
          tmp := home_t; home_t := away_t; away_t := tmp;
        END IF;

        IF match_status = 'finished' THEN
          hg := floor(random() * 4)::int;
          ag := floor(random() * 4)::int;
        ELSE
          hg := 0; ag := 0;
        END IF;

        INSERT INTO public.world_matches(
          league_id, home_team_id, away_team_id, round,
          season_month, season_year, scheduled_at, status,
          home_goals, away_goals, simulated, synced, played_at
        ) VALUES (
          lg.id, home_t, away_t, match_round,
          1, lg.season_year, match_date, match_status,
          hg, ag, match_status = 'finished', match_status = 'finished',
          CASE WHEN match_status = 'finished' THEN match_date ELSE NULL END
        );
      END LOOP;
    END LOOP;

    -- 4) Compute standings from finished matches
    INSERT INTO public.world_league_standings(
      league_id, team_id, season_year, played, wins, draws, losses,
      goals_for, goals_against, goal_diff, points
    )
    SELECT
      lg.id, t.id, lg.season_year,
      COUNT(*) FILTER (WHERE m.id IS NOT NULL AND m.status = 'finished'),
      COUNT(*) FILTER (WHERE m.status = 'finished' AND (
        (m.home_team_id = t.id AND m.home_goals > m.away_goals) OR
        (m.away_team_id = t.id AND m.away_goals > m.home_goals)
      )),
      COUNT(*) FILTER (WHERE m.status = 'finished' AND m.home_goals = m.away_goals),
      COUNT(*) FILTER (WHERE m.status = 'finished' AND (
        (m.home_team_id = t.id AND m.home_goals < m.away_goals) OR
        (m.away_team_id = t.id AND m.away_goals < m.home_goals)
      )),
      COALESCE(SUM(CASE
        WHEN m.status = 'finished' AND m.home_team_id = t.id THEN m.home_goals
        WHEN m.status = 'finished' AND m.away_team_id = t.id THEN m.away_goals
        ELSE 0 END), 0),
      COALESCE(SUM(CASE
        WHEN m.status = 'finished' AND m.home_team_id = t.id THEN m.away_goals
        WHEN m.status = 'finished' AND m.away_team_id = t.id THEN m.home_goals
        ELSE 0 END), 0),
      0, 0
    FROM public.world_teams t
    LEFT JOIN public.world_matches m
      ON (m.home_team_id = t.id OR m.away_team_id = t.id) AND m.league_id = lg.id
    WHERE t.league_id = lg.id
    GROUP BY t.id;

    UPDATE public.world_league_standings
       SET goal_diff = goals_for - goals_against,
           points    = wins * 3 + draws,
           updated_at = now()
     WHERE league_id = lg.id;

    -- 5) Update league meta
    UPDATE public.world_leagues
       SET current_round = 27,
           max_teams     = 16,
           total_slots   = 16,
           total_matchdays = 30
     WHERE id = lg.id;

  END LOOP;
END $$;
