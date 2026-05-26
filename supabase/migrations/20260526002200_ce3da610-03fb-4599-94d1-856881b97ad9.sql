CREATE OR REPLACE FUNCTION public.sync_post_match_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Atualiza ranking global do usuário (best-effort, nunca bloqueia)
    BEGIN
        IF NEW.user_id IS NOT NULL THEN
            IF NEW.is_home THEN
                IF NEW.home_goals > NEW.away_goals THEN
                    UPDATE public.global_ranking
                       SET ranking_points = ranking_points + 10,
                           wins = COALESCE(wins,0) + 1,
                           games_played = COALESCE(games_played,0) + 1,
                           updated_at = now()
                     WHERE user_id = NEW.user_id;
                ELSIF NEW.home_goals < NEW.away_goals THEN
                    UPDATE public.global_ranking
                       SET losses = COALESCE(losses,0) + 1,
                           games_played = COALESCE(games_played,0) + 1,
                           updated_at = now()
                     WHERE user_id = NEW.user_id;
                ELSE
                    UPDATE public.global_ranking
                       SET ranking_points = ranking_points + 4,
                           draws = COALESCE(draws,0) + 1,
                           games_played = COALESCE(games_played,0) + 1,
                           updated_at = now()
                     WHERE user_id = NEW.user_id;
                END IF;
            ELSE
                IF NEW.away_goals > NEW.home_goals THEN
                    UPDATE public.global_ranking
                       SET ranking_points = ranking_points + 10,
                           wins = COALESCE(wins,0) + 1,
                           games_played = COALESCE(games_played,0) + 1,
                           updated_at = now()
                     WHERE user_id = NEW.user_id;
                ELSIF NEW.away_goals < NEW.home_goals THEN
                    UPDATE public.global_ranking
                       SET losses = COALESCE(losses,0) + 1,
                           games_played = COALESCE(games_played,0) + 1,
                           updated_at = now()
                     WHERE user_id = NEW.user_id;
                ELSE
                    UPDATE public.global_ranking
                       SET ranking_points = ranking_points + 4,
                           draws = COALESCE(draws,0) + 1,
                           games_played = COALESCE(games_played,0) + 1,
                           updated_at = now()
                     WHERE user_id = NEW.user_id;
                END IF;
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- log silencioso, nunca bloqueia
        NULL;
    END;

    -- Bump sync version para forçar refresh no front
    BEGIN
        IF NEW.user_id IS NOT NULL THEN
            UPDATE public.world_sync_state
               SET sync_version = sync_version + 1,
                   updated_at = now()
             WHERE user_id = NEW.user_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN NEW;
END;
$function$;