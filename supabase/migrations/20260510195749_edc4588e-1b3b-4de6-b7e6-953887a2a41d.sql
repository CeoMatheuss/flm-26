-- Clear existing cup data
TRUNCATE TABLE public.cup_matches CASCADE;
TRUNCATE TABLE public.cup_teams CASCADE;
TRUNCATE TABLE public.cup_competitions CASCADE;

-- Insert Competitions
INSERT INTO public.cup_competitions (id, name, cup_type, country, continent, status, current_round, total_rounds, format)
VALUES 
  (gen_random_uuid(), 'Copa do Brasil', 'national', 'BR', 'South America', 'active', 2, 5, 'knockout'),
  (gen_random_uuid(), 'Libertadores', 'continental', NULL, 'South America', 'active', 2, 5, 'knockout'),
  (gen_random_uuid(), 'Sul-Americana', 'continental', NULL, 'South America', 'active', 2, 5, 'knockout'),
  (gen_random_uuid(), 'Champions League', 'continental', NULL, 'Europe', 'active', 2, 5, 'knockout'),
  (gen_random_uuid(), 'FA Cup', 'national', 'UK', 'Europe', 'active', 2, 5, 'knockout'),
  (gen_random_uuid(), 'Copa del Rey', 'national', 'ES', 'Europe', 'active', 2, 5, 'knockout'),
  (gen_random_uuid(), 'Coppa Italia', 'national', 'IT', 'Europe', 'active', 2, 5, 'knockout');

-- Function to seed teams and matches for each cup
DO $$
DECLARE
    cup_rec RECORD;
    club_rec RECORD;
    team_count INTEGER;
    i INTEGER;
    v_home_id UUID;
    v_away_id UUID;
    v_scheduled_at TIMESTAMP WITH TIME ZONE;
    v_cup_team_ids UUID[];
BEGIN
    -- Set scheduled time to tomorrow at 12:00 BRT
    v_scheduled_at := (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '12 hours')::TIMESTAMP WITH TIME ZONE;

    FOR cup_rec IN SELECT * FROM public.cup_competitions LOOP
        team_count := 0;
        v_cup_team_ids := '{}';

        -- Try to pull real clubs first (from league_members)
        FOR club_rec IN (SELECT DISTINCT club_name, user_id FROM public.league_members WHERE club_name IS NOT NULL LIMIT 16) LOOP
            INSERT INTO public.cup_teams (id, cup_id, user_id, club_name, club_logo, is_bot, eliminated)
            VALUES (gen_random_uuid(), cup_rec.id, club_rec.user_id, club_rec.club_name, '⚽', club_rec.user_id IS NULL, false)
            RETURNING id INTO v_home_id;
            
            v_cup_team_ids := array_append(v_cup_team_ids, v_home_id);
            team_count := team_count + 1;
        END LOOP;

        -- Fill with bots if needed to reach 16
        WHILE team_count < 16 LOOP
            INSERT INTO public.cup_teams (id, cup_id, user_id, club_name, club_logo, is_bot, eliminated, bot_strength)
            VALUES (gen_random_uuid(), cup_rec.id, NULL, 'Bot FC ' || (1000 + team_count), '🤖', true, false, 50 + (random() * 30)::int)
            RETURNING id INTO v_home_id;
            
            v_cup_team_ids := array_append(v_cup_team_ids, v_home_id);
            team_count := team_count + 1;
        END LOOP;

        -- Generate matches for Round 2 (Oitavas)
        FOR i IN 1..8 LOOP
            v_home_id := v_cup_team_ids[(i*2)-1];
            v_away_id := v_cup_team_ids[i*2];
            
            INSERT INTO public.cup_matches (id, cup_id, round, leg, home_team_id, away_team_id, status, scheduled_at)
            VALUES (gen_random_uuid(), cup_rec.id, 2, 1, v_home_id, v_away_id, 'scheduled', v_scheduled_at);
        END LOOP;
    END LOOP;
END $$;
