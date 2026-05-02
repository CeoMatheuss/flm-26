-- 1. Ensure core tables exist and have correct structure (using existing names for compatibility with frontend types)
-- world_leagues, world_league_teams, world_matches

-- Add current_round to world_leagues if not exists (already exists as current_matchday, let's keep that name)

-- 2. Create authoritative view for standings
DROP VIEW IF EXISTS public.world_league_table;
CREATE VIEW public.world_league_table AS
WITH match_results AS (
    -- Results as Home Team
    SELECT 
        home_team_id AS team_id,
        league_id,
        COUNT(*) FILTER (WHERE status = 'finished') as played,
        COUNT(*) FILTER (WHERE status = 'finished' AND home_goals > away_goals) as wins,
        COUNT(*) FILTER (WHERE status = 'finished' AND home_goals = away_goals) as draws,
        COUNT(*) FILTER (WHERE status = 'finished' AND home_goals < away_goals) as losses,
        SUM(COALESCE(home_goals, 0)) FILTER (WHERE status = 'finished') as goals_for,
        SUM(COALESCE(away_goals, 0)) FILTER (WHERE status = 'finished') as goals_against
    FROM public.world_matches
    GROUP BY home_team_id, league_id
    
    UNION ALL
    
    -- Results as Away Team
    SELECT 
        away_team_id AS team_id,
        league_id,
        COUNT(*) FILTER (WHERE status = 'finished') as played,
        COUNT(*) FILTER (WHERE status = 'finished' AND away_goals > home_goals) as wins,
        COUNT(*) FILTER (WHERE status = 'finished' AND away_goals = home_goals) as draws,
        COUNT(*) FILTER (WHERE status = 'finished' AND away_goals < home_goals) as losses,
        SUM(COALESCE(away_goals, 0)) FILTER (WHERE status = 'finished') as goals_for,
        SUM(COALESCE(home_goals, 0)) FILTER (WHERE status = 'finished') as goals_against
    FROM public.world_matches
    GROUP BY away_team_id, league_id
)
SELECT 
    t.team_id,
    t.league_id,
    lt.club_name,
    lt.club_logo,
    SUM(t.played) as mp,
    SUM(t.wins) as w,
    SUM(t.draws) as d,
    SUM(t.losses) as l,
    SUM(t.goals_for) as gf,
    SUM(t.goals_against) as ga,
    SUM(t.goals_for - t.goals_against) as gd,
    SUM(t.wins * 3 + t.draws) as pts
FROM match_results t
JOIN public.world_league_teams lt ON lt.id = t.team_id
GROUP BY t.team_id, t.league_id, lt.club_name, lt.club_logo
ORDER BY pts DESC, gd DESC, gf DESC;

-- 3. Robust Round Robin Generator
CREATE OR REPLACE FUNCTION public.generate_league_matches(p_league_id UUID)
RETURNS void AS $$
DECLARE
    v_teams UUID[];
    v_n INT;
    v_kickoff_hour INT;
    v_kickoff_minute INT;
    v_season INT;
    v_start_date DATE;
    v_home UUID;
    v_away UUID;
    v_home_idx INT;
    v_away_idx INT;
    v_matchday INT;
    v_kickoff TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT kickoff_hour, kickoff_minute, season INTO v_kickoff_hour, v_kickoff_minute, v_season
    FROM public.world_leagues WHERE id = p_league_id;

    SELECT array_agg(id) INTO v_teams FROM (SELECT id FROM public.world_league_teams WHERE league_id = p_league_id ORDER BY id) t;
    v_n := array_length(v_teams, 1);
    
    IF v_n != 20 THEN RETURN; END IF;

    DELETE FROM public.world_matches WHERE league_id = p_league_id;

    v_start_date := (now() AT TIME ZONE 'UTC' - INTERVAL '3 hours')::date;

    FOR r in 0..(v_n - 2) LOOP
        FOR i in 0..(v_n/2 - 1) LOOP
            IF i = 0 THEN
                v_home_idx := 0;
                v_away_idx := (v_n - 1 - r) % (v_n - 1) + 1;
            ELSE
                v_home_idx := (i + r) % (v_n - 1) + 1;
                v_away_idx := (v_n - 1 - i + r) % (v_n - 1) + 1;
            END IF;

            v_home := v_teams[v_home_idx + 1];
            v_away := v_teams[v_away_idx + 1];

            IF r % 2 = 1 THEN
                DECLARE temp UUID := v_home; BEGIN v_home := v_away; v_away := temp; END;
            END IF;

            -- Turno (Matchdays 1-19)
            v_matchday := r + 1;
            v_kickoff := (v_start_date + (v_matchday - 1) * INTERVAL '1 day')::timestamp + (v_kickoff_hour || ' hours')::interval + (v_kickoff_minute || ' minutes')::interval + INTERVAL '3 hours';
            INSERT INTO public.world_matches (league_id, season, matchday, home_team_id, away_team_id, kickoff_at, status)
            VALUES (p_league_id, v_season, v_matchday, v_home, v_away, v_kickoff, 'scheduled');

            -- Returno (Matchdays 20-38)
            v_matchday := r + v_n;
            INSERT INTO public.world_matches (league_id, season, matchday, home_team_id, away_team_id, kickoff_at, status)
            VALUES (p_league_id, v_season, v_matchday, v_away, v_home, v_kickoff, 'scheduled');
        END LOOP;
    END LOOP;

    UPDATE public.world_leagues SET status = 'in_progress', current_matchday = 1 WHERE id = p_league_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Automatic Simulation for Bots
CREATE OR REPLACE FUNCTION public.simulate_league_matchday(p_league_id UUID, p_matchday INT)
RETURNS void AS $$
BEGIN
    UPDATE public.world_matches
    SET status = 'finished',
        home_goals = floor(random() * 4),
        away_goals = floor(random() * 3),
        match_data = jsonb_build_object('simulated', true, 'simulated_at', now())
    WHERE league_id = p_league_id 
      AND matchday = p_matchday 
      AND status = 'scheduled'
      AND (SELECT is_bot FROM public.world_league_teams WHERE id = home_team_id) = true
      AND (SELECT is_bot FROM public.world_league_teams WHERE id = away_team_id) = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Auto-advance logic
CREATE OR REPLACE FUNCTION public.check_and_advance_round(p_league_id UUID)
RETURNS void AS $$
DECLARE
    v_current_md INT;
    v_pending INT;
BEGIN
    SELECT current_matchday INTO v_current_md FROM public.world_leagues WHERE id = p_league_id;
    
    SELECT count(*) INTO v_pending 
    FROM public.world_matches 
    WHERE league_id = p_league_id AND matchday = v_current_md AND status = 'scheduled';

    IF v_pending = 0 AND v_current_md < 38 THEN
        UPDATE public.world_leagues SET current_matchday = v_current_md + 1 WHERE id = p_league_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Trigger for league completion
CREATE OR REPLACE FUNCTION public.trg_auto_init_league()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT count(*) FROM public.world_league_teams WHERE league_id = NEW.league_id) = 20 THEN
        IF NOT EXISTS (SELECT 1 FROM public.world_matches WHERE league_id = NEW.league_id) THEN
            PERFORM public.generate_league_matches(NEW.league_id);
            -- Simulate Matchday 1 immediately if it's bot vs bot
            PERFORM public.simulate_league_matchday(NEW.league_id, 1);
            PERFORM public.check_and_advance_round(NEW.league_id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_auto_init_league ON public.world_league_teams;
CREATE TRIGGER trg_auto_init_league
AFTER INSERT ON public.world_league_teams
FOR EACH ROW EXECUTE FUNCTION public.trg_auto_init_league();

-- 7. Global self-correction function
CREATE OR REPLACE FUNCTION public.sync_league_integrity(_user_id UUID)
RETURNS jsonb AS $$
DECLARE
    v_league_id UUID;
    v_team_count INT;
    v_match_count INT;
BEGIN
    SELECT league_id INTO v_league_id FROM public.world_league_teams WHERE user_id = _user_id LIMIT 1;
    IF v_league_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'No league'); END IF;

    SELECT count(*) INTO v_team_count FROM public.world_league_teams WHERE league_id = v_league_id;
    SELECT count(*) INTO v_match_count FROM public.world_matches WHERE league_id = v_league_id;

    IF v_team_count = 20 AND v_match_count < 380 THEN
        PERFORM public.generate_league_matches(v_league_id);
        PERFORM public.simulate_league_matchday(v_league_id, 1);
        PERFORM public.check_and_advance_round(v_league_id);
        RETURN jsonb_build_object('ok', true, 'action', 'regenerated');
    END IF;

    RETURN jsonb_build_object('ok', true, 'action', 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
