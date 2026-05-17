
-- =========================================================
-- Geração automática de jovens da base (server-side, offline-safe)
-- =========================================================
CREATE OR REPLACE FUNCTION public.cron_generate_youth_for_all()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_club RECORD;
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
  v_first_names TEXT[] := ARRAY[
    'Gabriel','Lucas','Matheus','Vinícius','Pedro','João','Felipe','Thiago','Bruno','Rodrigo',
    'Arthur','Diego','Rafael','Vitor','Gustavo','Carlos','Eduardo','Henrique','Ícaro','Júnior',
    'Kauã','Leonardo','Murilo','Nathan','Otávio','Paulo','Renan','Samuel','Tiago','Wesley'
  ];
  v_surnames TEXT[] := ARRAY[
    'Silva','Santos','Oliveira','Souza','Rodrigues','Ferreira','Alves','Pereira','Lima','Gomes',
    'Costa','Ribeiro','Martins','Carvalho','Lopes','Almeida','Barros','Cardoso','Dias','Mendes',
    'Nogueira','Pinto','Rocha','Teixeira','Vieira','Moreira','Cavalcanti','Tavares','Andrade','Moura'
  ];
  v_positions TEXT[] := ARRAY['GOL','ZAG','LAT','VOL','MEI','ATA'];
  v_personalities TEXT[] := ARRAY['lider','festeiro','dedicado','ambicioso','leal','calmo','competitivo','introvertido'];
  v_position TEXT;
  v_age INT;
  v_min_ovr INT;
  v_max_ovr INT;
  v_overall INT;
  v_potential INT;
  v_rarity TEXT;
  v_rarity_luck NUMERIC;
  v_dominant TEXT;
  v_height INT;
  v_weight INT;
  v_market_value BIGINT;
  v_attrs JSONB;
  v_prospect_id UUID;
BEGIN
  FOR v_club IN
    SELECT c.id, c.user_id, c.country, c.last_youth_generation_at, gs.club_data
    FROM public.clubs c
    LEFT JOIN public.game_saves gs ON gs.user_id = c.user_id
    WHERE c.user_id IS NOT NULL
  LOOP
    v_processed := v_processed + 1;

    v_academy := COALESCE(v_club.club_data->'infrastructure'->'youthAcademy', '{}'::jsonb);
    v_academy_level := COALESCE((v_academy->>'level')::INT, 0);
    v_academy_active := v_academy_level >= 1 AND COALESCE((v_academy->>'active')::BOOLEAN, true);
    v_investment := COALESCE((v_club.club_data->>'youthInvestment')::NUMERIC, 0);

    IF NOT v_academy_active THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Ciclo: nível 1 = 14d, evolui até 7d (cap inferior para respeitar regra dos 7 dias)
    v_cycle_days := GREATEST(7, 15 - v_academy_level);
    v_cycle_interval := (v_cycle_days || ' days')::INTERVAL;

    IF v_club.last_youth_generation_at IS NOT NULL
       AND (now() - v_club.last_youth_generation_at) < v_cycle_interval THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_max_prospects := LEAST(40, 10 + v_academy_level * 2);
    SELECT COUNT(*) INTO v_current_count FROM public.youth_prospects WHERE club_id = v_club.id;
    IF v_current_count >= v_max_prospects THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Geração
    v_position := v_positions[1 + floor(random() * array_length(v_positions, 1))::INT];
    v_age := 15 + floor(random() * 3)::INT;

    v_min_ovr := CASE v_age WHEN 15 THEN 45 WHEN 16 THEN 48 ELSE 52 END;
    v_max_ovr := CASE v_age WHEN 15 THEN 58 WHEN 16 THEN 62 ELSE 66 END;
    v_min_ovr := v_min_ovr + (v_academy_level / 3);
    v_max_ovr := v_max_ovr + (v_academy_level / 3);
    v_overall := v_min_ovr + floor(random() * (v_max_ovr - v_min_ovr + 1))::INT;

    IF v_investment >= 2400000 THEN v_overall := v_overall + 5;
    ELSIF v_investment >= 1200000 THEN v_overall := v_overall + 3;
    ELSIF v_investment >= 600000 THEN v_overall := v_overall + 1;
    END IF;

    v_potential := v_overall + 10 + floor(random() * 15)::INT;
    v_rarity_luck := random() + (v_academy_level * 0.005) + CASE WHEN v_investment > 2000000 THEN 0.05 ELSE 0 END;

    IF v_rarity_luck > 0.98 THEN
      v_rarity := 'Craque geracional';
      v_potential := 95 + floor(random() * 5)::INT;
    ELSIF v_rarity_luck > 0.90 THEN
      v_rarity := 'Promessa';
      v_potential := 88 + floor(random() * 7)::INT;
    ELSIF v_rarity_luck > 0.75 THEN
      v_rarity := 'Bom talento';
      v_potential := 80 + floor(random() * 8)::INT;
    ELSE
      v_rarity := 'Comum';
    END IF;

    v_potential := LEAST(99, GREATEST(v_potential, v_overall + 5));
    v_dominant := CASE WHEN random() < 0.7 THEN 'Destro' WHEN random() < 0.9 THEN 'Canhoto' ELSE 'Ambidestro' END;
    v_height := 165 + (v_age - 15) * 3 + CASE WHEN v_position IN ('GOL','ZAG') THEN 8 WHEN v_position = 'ATA' THEN 3 ELSE 0 END + floor(random() * 15)::INT;
    v_weight := v_height - 105 + floor(random() * 15)::INT;
    v_market_value := (v_overall::BIGINT * v_overall * 1200) + (v_potential::BIGINT * v_potential * 2500);

    v_name := v_first_names[1 + floor(random() * array_length(v_first_names, 1))::INT]
           || ' '
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
      v_club.id, v_name, v_age, v_position, v_overall, v_potential, v_attrs, v_market_value,
      v_personalities[1 + floor(random() * array_length(v_personalities, 1))::INT],
      v_dominant, v_rarity,
      CASE WHEN random() < 0.9 THEN COALESCE(v_club.country, 'Brasil') ELSE 'Brasil' END,
      100, 0,
      v_height, v_weight,
      30 + floor(random() * 20)::INT + (v_overall / 5),
      CASE WHEN v_position IN ('ZAG','VOL') THEN LEAST(99, v_overall + 10) ELSE GREATEST(10, v_overall - 15) END,
      v_overall + floor(random() * 11)::INT - 5,
      100, 0,
      'base',
      jsonb_build_array(jsonb_build_object('date', now(), 'overall', v_overall, 'attributes', v_attrs))
    ) RETURNING id INTO v_prospect_id;

    UPDATE public.clubs SET last_youth_generation_at = now() WHERE id = v_club.id;

    INSERT INTO public.user_notifications (user_id, type, category, priority, title, message, icon, data)
    VALUES (
      v_club.user_id,
      CASE WHEN v_rarity = 'Comum' THEN 'info' ELSE 'success' END,
      'Base',
      CASE WHEN v_rarity IN ('Promessa','Craque geracional') THEN 'high' ELSE 'medium' END,
      CASE WHEN v_rarity = 'Comum' THEN '🌟 Novo talento na base!' ELSE format('⭐ Nova %s na base!', v_rarity) END,
      format('%s (%s, OVR %s, POT %s) acaba de surgir na categoria de base.', v_name, v_position, v_overall, v_potential),
      '🎓',
      jsonb_build_object('prospect_id', v_prospect_id, 'rarity', v_rarity, 'source', 'cron_auto')
    );

    INSERT INTO public.newspaper_entries (user_id, text, category, importance)
    VALUES (
      v_club.user_id,
      format('A categoria de base revelou %s — %s de %s anos com OVR %s e potencial %s.',
             v_name, v_position, v_age, v_overall, v_potential),
      'base',
      CASE WHEN v_rarity IN ('Promessa','Craque geracional') THEN 3 ELSE 1 END
    );

    v_generated := v_generated + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed', v_processed,
    'generated', v_generated,
    'skipped', v_skipped,
    'ran_at', now()
  );
END;
$$;

-- pg_cron: roda a cada hora
DO $$
BEGIN
  PERFORM cron.unschedule('cron-youth-generation-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cron-youth-generation-hourly',
  '0 * * * *',
  $$SELECT public.cron_generate_youth_for_all();$$
);
