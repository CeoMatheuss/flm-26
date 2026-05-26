
ALTER TABLE public.world_player_stats
  ADD COLUMN IF NOT EXISTS penalties_saved INT NOT NULL DEFAULT 0 CHECK (penalties_saved >= 0);

ALTER TABLE public.global_player_ranking
  ADD COLUMN IF NOT EXISTS penalties_saved INT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gpr_non_negative_stats') THEN
    ALTER TABLE public.global_player_ranking
      ADD CONSTRAINT gpr_non_negative_stats
      CHECK (
        total_goals >= 0 AND total_assists >= 0 AND
        total_clean_sheets >= 0 AND penalties_saved >= 0 AND
        ranking_points >= 0
      );
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.calculate_player_ranking_points()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    p_record RECORD;
    v_score NUMERIC;
    v_reputation INTEGER;
    v_level TEXT;
BEGIN
    FOR p_record IN
        SELECT
            wp.id, wp.overall, wp.potential, wp.age, wp.position,
            COALESCE(SUM(wps.goals), 0)              AS goals,
            COALESCE(SUM(wps.assists), 0)            AS assists,
            COALESCE(SUM(wps.clean_sheets), 0)       AS clean_sheets,
            COALESCE(SUM(wps.penalties_saved), 0)    AS pen_saved,
            COALESCE(AVG(NULLIF(wps.avg_rating,0)),0) AS avg_rating
        FROM public.world_players wp
        LEFT JOIN public.world_player_stats wps ON wp.id = wps.player_id
        GROUP BY wp.id
    LOOP
        IF p_record.position = 'Goleiro' THEN
            v_score := (p_record.clean_sheets * 15)
                     + (p_record.pen_saved   * 20)
                     + (GREATEST(p_record.avg_rating - 5, 0) * 30);
        ELSE
            v_score := (p_record.goals   * 12)
                     + (p_record.assists *  8)
                     + (GREATEST(p_record.avg_rating - 5, 0) * 30);
            IF p_record.position IN ('Zagueiro','Lateral Esquerdo','Lateral Direito') THEN
                v_score := v_score + (p_record.clean_sheets * 5);
            END IF;
        END IF;

        v_score := GREATEST(v_score, 0);
        v_reputation := LEAST(GREATEST(ROUND(v_score / 15), 0), 100);
        IF v_reputation >= 90 THEN v_level := 'Mundial';
        ELSIF v_reputation >= 70 THEN v_level := 'Continental';
        ELSIF v_reputation >= 40 THEN v_level := 'Nacional';
        ELSE v_level := 'Local';
        END IF;

        INSERT INTO public.global_player_ranking AS gpr (
            player_id, ranking_points, total_goals, total_assists,
            total_clean_sheets, penalties_saved, avg_rating, mvp_count,
            reputation_score, reputation_level, last_update
        ) VALUES (
            p_record.id, v_score, p_record.goals, p_record.assists,
            p_record.clean_sheets, p_record.pen_saved, p_record.avg_rating, 0,
            v_reputation, v_level, now()
        )
        ON CONFLICT (player_id) DO UPDATE SET
            ranking_points     = EXCLUDED.ranking_points,
            total_goals        = EXCLUDED.total_goals,
            total_assists      = EXCLUDED.total_assists,
            total_clean_sheets = EXCLUDED.total_clean_sheets,
            penalties_saved    = EXCLUDED.penalties_saved,
            avg_rating         = EXCLUDED.avg_rating,
            reputation_score   = EXCLUDED.reputation_score,
            reputation_level   = EXCLUDED.reputation_level,
            last_update        = now();

        UPDATE public.world_players SET reputation = v_reputation WHERE id = p_record.id;
    END LOOP;

    WITH RankedPlayers AS (
        SELECT id, ROW_NUMBER() OVER (
            ORDER BY ranking_points DESC, total_goals DESC, avg_rating DESC
        ) AS pos
        FROM public.global_player_ranking
    )
    UPDATE public.global_player_ranking gpr
    SET prev_position = COALESCE(gpr.current_position, rp.pos),
        current_position = rp.pos
    FROM RankedPlayers rp
    WHERE gpr.id = rp.id;

    WITH PosRanked AS (
        SELECT gpr.id, ROW_NUMBER() OVER (
            PARTITION BY wp.position
            ORDER BY gpr.ranking_points DESC, gpr.total_goals DESC
        ) AS p_pos
        FROM public.global_player_ranking gpr
        JOIN public.world_players wp ON gpr.player_id = wp.id
    )
    UPDATE public.global_player_ranking gpr
    SET position_rank = pr.p_pos
    FROM PosRanked pr
    WHERE gpr.id = pr.id;
END;
$function$;

ALTER TABLE public.global_player_ranking REPLICA IDENTITY FULL;
ALTER TABLE public.global_ranking        REPLICA IDENTITY FULL;

SELECT public.calculate_player_ranking_points();
