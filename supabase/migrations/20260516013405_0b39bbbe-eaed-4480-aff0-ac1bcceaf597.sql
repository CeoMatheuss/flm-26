DO $$
DECLARE
  v_league_id uuid := 'edb83ebc-95c3-4f26-99b3-0b758a5d08c6';
  v_team_ids uuid[];
  v_n int;
  v_round int;
  v_i int;
  v_home uuid;
  v_away uuid;
  v_kick timestamptz;
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_fixed uuid;
  v_rotating uuid[];
  v_left uuid[];
  v_right uuid[];
  v_status text;
  v_hg int;
  v_ag int;
  v_smonth int;
  v_syear int;
  v_round_volta int;
BEGIN
  SELECT season_month, season_year INTO v_smonth, v_syear FROM public.world_leagues WHERE id = v_league_id;
  DELETE FROM public.world_matches WHERE league_id = v_league_id;

  SELECT array_agg(id ORDER BY random()) INTO v_team_ids
  FROM public.world_teams WHERE league_id = v_league_id;

  v_n := array_length(v_team_ids, 1);
  IF v_n IS NULL OR v_n < 4 OR v_n % 2 <> 0 THEN RETURN; END IF;

  v_fixed := v_team_ids[1];
  v_rotating := v_team_ids[2:v_n];

  FOR v_round IN 1..(v_n - 1) LOOP
    v_left := array_prepend(v_fixed, v_rotating[1:(v_n/2 - 1)]);
    v_right := (SELECT array_agg(x ORDER BY i DESC) FROM unnest(v_rotating[(v_n/2):(v_n-1)]) WITH ORDINALITY AS t(x, i));

    FOR v_i IN 1..(v_n/2) LOOP
      IF v_round % 2 = 1 THEN
        v_home := v_left[v_i]; v_away := v_right[v_i];
      ELSE
        v_home := v_right[v_i]; v_away := v_left[v_i];
      END IF;

      -- IDA
      v_kick := ((v_today - 16 + v_round)::text || ' 19:30:00-03')::timestamptz;
      v_status := CASE WHEN v_round <= 16 THEN 'finished' ELSE 'scheduled' END;
      v_hg := CASE WHEN v_status = 'finished' THEN floor(random()*4)::int ELSE 0 END;
      v_ag := CASE WHEN v_status = 'finished' THEN floor(random()*3)::int ELSE 0 END;
      INSERT INTO public.world_matches
        (league_id, home_team_id, away_team_id, round, status, home_goals, away_goals, scheduled_at, played_at, season_month, season_year)
      VALUES
        (v_league_id, v_home, v_away, v_round, v_status, v_hg, v_ag, v_kick,
         CASE WHEN v_status='finished' THEN v_kick END, v_smonth, v_syear);

      -- VOLTA
      v_round_volta := v_round + (v_n - 1);
      v_kick := ((v_today - 16 + v_round_volta)::text || ' 19:30:00-03')::timestamptz;
      v_status := CASE WHEN v_round_volta <= 16 THEN 'finished' ELSE 'scheduled' END;
      v_hg := CASE WHEN v_status = 'finished' THEN floor(random()*4)::int ELSE 0 END;
      v_ag := CASE WHEN v_status = 'finished' THEN floor(random()*3)::int ELSE 0 END;
      INSERT INTO public.world_matches
        (league_id, home_team_id, away_team_id, round, status, home_goals, away_goals, scheduled_at, played_at, season_month, season_year)
      VALUES
        (v_league_id, v_away, v_home, v_round_volta, v_status, v_hg, v_ag, v_kick,
         CASE WHEN v_status='finished' THEN v_kick END, v_smonth, v_syear);
    END LOOP;

    v_rotating := array_prepend(v_rotating[v_n - 1], v_rotating[1:(v_n - 2)]);
  END LOOP;

  UPDATE public.world_leagues SET current_round = 16 WHERE id = v_league_id;
END $$;