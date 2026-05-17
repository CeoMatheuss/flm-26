-- Atualiza geração de jovens para seguir tabela oficial nível 1-30

CREATE OR REPLACE FUNCTION public.youth_potential_bounds(lvl INT)
RETURNS TABLE(min_pot INT, max_pot INT, rare_chance NUMERIC, rare_bonus_min INT, rare_bonus_max INT)
LANGUAGE sql IMMUTABLE AS $$
  SELECT min_pot, max_pot, rare_chance, rare_bonus_min, rare_bonus_max
  FROM (VALUES
    (1,45,52,0.005,4,8),(2,46,53,0.005,4,8),(3,47,54,0.005,4,8),
    (4,48,55,0.015,4,9),(5,49,56,0.015,4,9),
    (6,50,58,0.025,5,9),(7,51,59,0.025,5,9),
    (8,52,60,0.04,5,10),(9,53,61,0.04,5,10),
    (10,56,64,0.06,5,10),(11,57,65,0.06,5,10),(12,58,66,0.06,5,10),
    (13,59,67,0.09,6,11),(14,60,68,0.09,6,11),(15,61,69,0.09,6,11),
    (16,62,71,0.12,6,11),(17,63,72,0.12,6,11),
    (18,64,73,0.16,6,12),(19,65,74,0.16,6,12),(20,66,75,0.16,6,12),
    (21,67,77,0.20,7,12),(22,68,78,0.20,7,12),
    (23,69,79,0.25,7,13),(24,70,80,0.25,7,13),(25,71,81,0.25,7,13),
    (26,72,83,0.32,8,14),(27,73,84,0.32,8,14),(28,74,85,0.32,8,14),
    (29,75,86,0.38,9,15),
    (30,76,88,0.45,10,16)
  ) AS t(level,min_pot,max_pot,rare_chance,rare_bonus_min,rare_bonus_max)
  WHERE level = LEAST(30, GREATEST(1, lvl));
$$;

CREATE OR REPLACE FUNCTION public.cron_generate_youth_for_all()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_save RECORD;
  v_club_id UUID;
  v_country TEXT;
  v_last_gen TIMESTAMPTZ;
  v_processed INT := 0;
  v_generated INT := 0;
  v_skipped INT := 0;
  v_academy JSONB;
  v_academy_level INT;
  v_academy_active BOOLEAN;
  v_investment NUMERIC;
  v_cycle_days INT;
  v_cycle_interval INTERVAL;
  v_max_prospects INT;
  v_current_count INT;
  v_name TEXT;
  v_first_names TEXT[] := ARRAY['Gabriel','Lucas','Matheus','Vinícius','Pedro','João','Felipe','Thiago','Bruno','Rodrigo','Arthur','Diego','Rafael','Vitor','Gustavo','Carlos','Eduardo','Henrique','Ícaro','Júnior','Kauã','Leonardo','Murilo','Nathan','Otávio','Paulo','Renan','Samuel','Tiago','Wesley'];
  v_surnames TEXT[] := ARRAY['Silva','Santos','Oliveira','Souza','Rodrigues','Ferreira','Alves','Pereira','Lima','Gomes','Costa','Ribeiro','Martins','Carvalho','Lopes','Almeida','Barros','Cardoso','Dias','Mendes','Nogueira','Pinto','Rocha','Teixeira','Vieira','Moreira','Cavalcanti','Tavares','Andrade','Moura'];
  v_positions TEXT[] := ARRAY['GOL','ZAG','LAT','VOL','MEI','ATA'];
  v_personalities TEXT[] := ARRAY['lider','festeiro','dedicado','ambicioso','leal','calmo','competitivo','introvertido'];
  v_position TEXT;
  v_age INT;
  v_min_ovr INT;
  v_max_ovr INT;
  v_overall INT;
  v_potential INT;
  v_pot_min INT;
  v_pot_max INT;
  v_rare_chance NUMERIC;
  v_rare_bonus_min INT;
  v_rare_bonus_max INT;
  v_rare_roll NUMERIC;
  v_invest_rare_boost NUMERIC;
  v_is_rare BOOLEAN;
  v_rarity TEXT;
  v_dominant TEXT;
  v_height INT;
  v_weight INT;
  v_market_value BIGINT;
  v_attrs JSONB;
  v_prospect_id UUID;
BEGIN
  FOR v_save IN
    SELECT gs.user_id, gs.club_data
    FROM public.game_saves gs
    WHERE gs.user_id IS NOT NULL
      AND COALESCE((gs.club_data->'infrastructure'->'youthAcademy'->>'level')::INT, 0) >= 1
  LOOP
    v_processed := v_processed + 1;

    SELECT id, country, last_youth_generation_at INTO v_club_id, v_country, v_last_gen
    FROM public.clubs WHERE user_id = v_save.user_id LIMIT 1;

    IF v_club_id IS NULL THEN
      INSERT INTO public.clubs (user_id, name, country, fans, reputation)
      VALUES (
        v_save.user_id,
        COALESCE(v_save.club_data->>'name', 'Meu Clube'),
        COALESCE(v_save.club_data->>'country', 'Brasil'),
        COALESCE((v_save.club_data->>'fans')::INT, 1000),
        COALESCE((v_save.club_data->>'reputation')::INT, 65)
      )
      ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, country, last_youth_generation_at INTO v_club_id, v_country, v_last_gen;
    END IF;

    v_academy := COALESCE(v_save.club_data->'infrastructure'->'youthAcademy', '{}'::jsonb);
    v_academy_level := COALESCE((v_academy->>'level')::INT, 0);
    v_academy_active := v_academy_level >= 1 AND COALESCE((v_academy->>'active')::BOOLEAN, true);
    v_investment := COALESCE((v_save.club_data->>'youthInvestment')::NUMERIC, 0);

    IF NOT v_academy_active THEN v_skipped := v_skipped + 1; CONTINUE; END IF;

    v_cycle_days := GREATEST(7, 15 - v_academy_level);
    v_cycle_interval := (v_cycle_days || ' days')::INTERVAL;

    IF v_last_gen IS NOT NULL AND (now() - v_last_gen) < v_cycle_interval THEN
      v_skipped := v_skipped + 1; CONTINUE;
    END IF;

    v_max_prospects := LEAST(40, 10 + v_academy_level * 2);
    SELECT COUNT(*) INTO v_current_count FROM public.youth_prospects WHERE club_id = v_club_id;
    IF v_current_count >= v_max_prospects THEN v_skipped := v_skipped + 1; CONTINUE; END IF;

    v_position := v_positions[1 + floor(random() * array_length(v_positions, 1))::INT];
    v_age := 15 + floor(random() * 3)::INT;
    v_min_ovr := CASE v_age WHEN 15 THEN 45 WHEN 16 THEN 48 ELSE 52 END + (v_academy_level / 3);
    v_max_ovr := CASE v_age WHEN 15 THEN 58 WHEN 16 THEN 62 ELSE 66 END + (v_academy_level / 3);
    v_overall := v_min_ovr + floor(random() * (v_max_ovr - v_min_ovr + 1))::INT;

    IF v_investment >= 2400000 THEN v_overall := v_overall + 5;
    ELSIF v_investment >= 1200000 THEN v_overall := v_overall + 3;
    ELSIF v_investment >= 600000 THEN v_overall := v_overall + 1;
    END IF;

    -- Potencial pela tabela oficial nível 1-30
    SELECT min_pot, max_pot, rare_chance, rare_bonus_min, rare_bonus_max
      INTO v_pot_min, v_pot_max, v_rare_chance, v_rare_bonus_min, v_rare_bonus_max
    FROM public.youth_potential_bounds(v_academy_level);

    v_rare_roll := random();
    v_invest_rare_boost := CASE
      WHEN v_investment >= 2400000 THEN 0.04
      WHEN v_investment >= 1200000 THEN 0.02
      WHEN v_investment >= 600000 THEN 0.01
      ELSE 0
    END;
    v_is_rare := v_rare_roll < (v_rare_chance + v_invest_rare_boost);

    IF v_is_rare THEN
      v_potential := LEAST(99, v_pot_max + v_rare_bonus_min
        + floor(random() * (v_rare_bonus_max - v_rare_bonus_min + 1))::INT);
    ELSE
      v_potential := v_pot_min + floor(random() * (v_pot_max - v_pot_min + 1))::INT;
    END IF;

    -- Potencial nunca abaixo do OVR atual + 3
    v_potential := LEAST(99, GREATEST(v_potential, v_overall + 3));

    v_rarity := CASE
      WHEN v_potential >= 90 THEN 'Craque geracional'
      WHEN v_potential >= 82 THEN 'Promessa'
      WHEN v_potential >= 75 THEN 'Bom talento'
      ELSE 'Comum'
    END;

    v_dominant := CASE WHEN random() < 0.7 THEN 'Destro' WHEN random() < 0.9 THEN 'Canhoto' ELSE 'Ambidestro' END;
    v_height := 165 + (v_age - 15) * 3 + CASE WHEN v_position IN ('GOL','ZAG') THEN 8 WHEN v_position = 'ATA' THEN 3 ELSE 0 END + floor(random() * 15)::INT;
    v_weight := v_height - 105 + floor(random() * 15)::INT;
    v_market_value := (v_overall::BIGINT * v_overall * 1200) + (v_potential::BIGINT * v_potential * 2500);

    v_name := v_first_names[1 + floor(random() * array_length(v_first_names, 1))::INT] || ' '
           || v_surnames[1 + floor(random() * array_length(v_surnames, 1))::INT];

    v_attrs := jsonb_build_object(
      'speed', v_overall, 'shooting', v_overall, 'passing', v_overall, 'defending', v_overall,
      'physical', v_overall, 'dribbling', v_overall, 'positioning', v_overall, 'heading', v_overall,
      'marking', v_overall, 'vision', v_overall, 'crossing', v_overall, 'longShots', v_overall,
      'workRate', v_overall, 'composure', v_overall, 'aggression', v_overall, 'setPieces', v_overall,
      'goalkeeping', CASE WHEN v_position = 'GOL' THEN v_overall + 5 ELSE GREATEST(1, v_overall - 30) END
    );

    INSERT INTO public.youth_prospects (
      club_id, name, age, position, overall, potential, attributes, market_value,
      personality, dominant_foot, rarity, nationality, morale, months_in_academy,
      height, weight, tactical_iq, interception, stamina_stat, energy, fatigue,
      contract_status, evolution_history
    ) VALUES (
      v_club_id, v_name, v_age, v_position, v_overall, v_potential, v_attrs, v_market_value,
      v_personalities[1 + floor(random() * array_length(v_personalities, 1))::INT],
      v_dominant, v_rarity,
      CASE WHEN random() < 0.9 THEN COALESCE(v_country, 'Brasil') ELSE 'Brasil' END,
      100, 0, v_height, v_weight,
      30 + floor(random() * 20)::INT + (v_overall / 5),
      CASE WHEN v_position IN ('ZAG','VOL') THEN LEAST(99, v_overall + 10) ELSE GREATEST(10, v_overall - 15) END,
      v_overall + floor(random() * 11)::INT - 5,
      100, 0, 'base',
      jsonb_build_array(jsonb_build_object('date', now(), 'overall', v_overall, 'attributes', v_attrs))
    ) RETURNING id INTO v_prospect_id;

    UPDATE public.clubs SET last_youth_generation_at = now() WHERE id = v_club_id;

    INSERT INTO public.user_notifications (user_id, type, category, priority, title, message, icon, data)
    VALUES (
      v_save.user_id,
      CASE WHEN v_rarity = 'Comum' THEN 'info' ELSE 'success' END,
      'Base',
      CASE WHEN v_rarity IN ('Promessa','Craque geracional') THEN 'high' ELSE 'medium' END,
      CASE WHEN v_rarity = 'Comum' THEN '🌟 Novo talento na base!' ELSE format('⭐ Nova %s na base!', v_rarity) END,
      format('%s (%s, OVR %s, POT %s) acaba de surgir na categoria de base.', v_name, v_position, v_overall, v_potential),
      '🎓',
      jsonb_build_object('prospect_id', v_prospect_id, 'rarity', v_rarity, 'source', 'cron_auto')
    );

    v_generated := v_generated + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'processed', v_processed, 'generated', v_generated, 'skipped', v_skipped, 'ran_at', now());
END;
$function$;