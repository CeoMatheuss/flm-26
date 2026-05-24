CREATE OR REPLACE FUNCTION public.sync_match_to_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID;
    v_home_club_name TEXT;
    v_away_club_name TEXT;
    v_stadium TEXT;
BEGIN
    IF NEW.status = 'finished' AND (OLD.status IS DISTINCT FROM 'finished') THEN

        SELECT user_id, name INTO v_user_id, v_home_club_name
        FROM public.world_teams WHERE id = NEW.home_team_id;

        SELECT name INTO v_away_club_name
        FROM public.world_teams WHERE id = NEW.away_team_id;

        v_stadium := COALESCE(NULLIF(NEW.stadium, ''), v_home_club_name || ' Arena', 'Estádio');

        IF v_user_id IS NOT NULL THEN
            INSERT INTO public.match_history (
                user_id, match_type, competition, home_team, away_team,
                home_goals, away_goals, is_home, stadium_name, played_at
            ) VALUES (
                v_user_id, 'league', 'Liga', v_home_club_name, v_away_club_name,
                NEW.home_goals, NEW.away_goals, TRUE, v_stadium, NOW()
            );
        END IF;

        SELECT user_id INTO v_user_id FROM public.world_teams WHERE id = NEW.away_team_id;

        IF v_user_id IS NOT NULL THEN
            INSERT INTO public.match_history (
                user_id, match_type, competition, home_team, away_team,
                home_goals, away_goals, is_home, stadium_name, played_at
            ) VALUES (
                v_user_id, 'league', 'Liga', v_home_club_name, v_away_club_name,
                NEW.home_goals, NEW.away_goals, FALSE, v_stadium, NOW()
            );
        END IF;

        UPDATE public.world_league_table
        SET played = played + 1,
            wins = wins + CASE WHEN NEW.home_goals > NEW.away_goals THEN 1 ELSE 0 END,
            draws = draws + CASE WHEN NEW.home_goals = NEW.away_goals THEN 1 ELSE 0 END,
            losses = losses + CASE WHEN NEW.home_goals < NEW.away_goals THEN 1 ELSE 0 END,
            goals_for = goals_for + NEW.home_goals,
            goals_against = goals_against + NEW.away_goals,
            points = points + CASE WHEN NEW.home_goals > NEW.away_goals THEN 3
                                   WHEN NEW.home_goals = NEW.away_goals THEN 1 ELSE 0 END
        WHERE team_id = NEW.home_team_id;

        UPDATE public.world_league_table
        SET played = played + 1,
            wins = wins + CASE WHEN NEW.away_goals > NEW.home_goals THEN 1 ELSE 0 END,
            draws = draws + CASE WHEN NEW.away_goals = NEW.home_goals THEN 1 ELSE 0 END,
            losses = losses + CASE WHEN NEW.away_goals < NEW.home_goals THEN 1 ELSE 0 END,
            goals_for = goals_for + NEW.away_goals,
            goals_against = goals_against + NEW.home_goals,
            points = points + CASE WHEN NEW.away_goals > NEW.home_goals THEN 3
                                   WHEN NEW.away_goals = NEW.home_goals THEN 1 ELSE 0 END
        WHERE team_id = NEW.away_team_id;
    END IF;
    RETURN NEW;
END;
$function$;

ALTER TABLE public.match_history ALTER COLUMN stadium_name SET DEFAULT 'Estádio';