-- Reset Shop Items
DELETE FROM public.shop_items;

-- 1. Sponsorships (Price: 0, pays the user)
INSERT INTO public.shop_items (id, category, name, description, price_cents, duration_days, min_fans, bonus_data, rarity) VALUES
('spons_betgol', 'sponsorship', 'BetGol', 'Um patrocinador ideal para clubes em crescimento, oferecendo renda estável e bônus por desempenho.', 0, 30, 1000, '{"immediate_cash": 100000, "daily_cash": 15000, "plan_id": "betgol"}', 'common'),
('spons_megabet', 'sponsorship', 'MegaBet', 'Expanda os ganhos do clube com um patrocinador agressivo focado em crescimento financeiro.', 0, 30, 3000, '{"immediate_cash": 300000, "daily_cash": 25000, "plan_id": "megabet"}', 'rare'),
('spons_arenabank', 'sponsorship', 'ArenaBank', 'Um banco esportivo premium focado em estabilidade financeira e evolução do clube.', 0, 30, 5000, '{"immediate_cash": 500000, "daily_cash": 35000, "plan_id": "arenabank"}', 'rare'),
('spons_sportpay', 'sponsorship', 'SportPay', 'Tecnologia financeira esportiva para clubes que desejam crescimento profissional.', 0, 30, 8000, '{"immediate_cash": 800000, "daily_cash": 50000, "plan_id": "sportpay"}', 'epic'),
('spons_nitro', 'sponsorship', 'Nitro Energy', 'Patrocinador energético premium voltado para clubes competitivos e grandes campanhas.', 0, 30, 12000, '{"immediate_cash": 1500000, "daily_cash": 75000, "plan_id": "nitro"}', 'epic'),
('spons_vision', 'sponsorship', 'Vision Telecom', 'Empresa tecnológica esportiva de elite para clubes de alto nível.', 0, 30, 20000, '{"immediate_cash": 2500000, "daily_cash": 100000, "plan_id": "vision"}', 'legendary'),
('spons_maxcola', 'sponsorship', 'Max Cola', 'Marca mundial focada em clubes populares e crescimento de torcida.', 0, 30, 35000, '{"immediate_cash": 4000000, "daily_cash": 150000, "plan_id": "maxcola"}', 'legendary'),
('spons_flyair', 'sponsorship', 'FlyAir', 'Patrocinador lendário reservado para clubes gigantes e extremamente populares.', 0, 30, 60000, '{"immediate_cash": 7000000, "daily_cash": 250000, "plan_id": "flyair"}', 'legendary');

-- 2. Marketing Campaigns (Aumentam torcida)
INSERT INTO public.shop_items (id, category, name, description, price_cents, duration_days, min_fans, bonus_data, rarity) VALUES
('mkt_local', 'marketing', 'Campanha Local', 'Aumente a presença do clube na cidade e conquiste novos torcedores locais.', 25000, 10, 0, '{"fans_min": 500, "fans_max": 2000, "revenue_bonus": 0.05}', 'common'),
('mkt_regional', 'marketing', 'Marketing Regional', 'Expanda sua influência para cidades vizinhas e aumente a popularidade regional.', 75000, 10, 2000, '{"fans_min": 2000, "fans_max": 5000, "revenue_bonus": 0.10}', 'rare'),
('mkt_nacional', 'marketing', 'Marketing Nacional', 'Leve o nome do clube para todo o país com campanhas de mídia esportiva.', 250000, 15, 8000, '{"fans_min": 10000, "fans_max": 20000, "revenue_bonus": 0.20}', 'epic'),
('mkt_mundial', 'marketing', 'Campanha Mundial', 'Transforme seu clube em uma marca global e aumente drasticamente sua torcida.', 1000000, 20, 20000, '{"fans_fixed": 50000, "revenue_bonus": 0.35}', 'legendary'),
('mkt_elite', 'marketing', 'FLM Media Elite', 'O maior pacote de mídia e marketing do Football Life Manager.', 2500000, 30, 50000, '{"fans_fixed": 100000, "revenue_bonus": 0.60}', 'legendary');

-- 3. Infrastructure
INSERT INTO public.shop_items (id, category, name, description, price_cents, duration_days, min_fans, bonus_data, rarity) VALUES
('infra_stadium', 'infrastructure', 'Reforma do Estádio', 'Modernize seu estádio para aumentar receitas e melhorar experiência da torcida.', 1000000, NULL, 5000, '{"type": "stadium_upgrade"}', 'epic'),
('infra_ct', 'infrastructure', 'Novo CT', 'Centro de treinamento profissional focado em evolução do elenco.', 300000, NULL, 1000, '{"type": "ct_upgrade"}', 'rare'),
('infra_academy', 'infrastructure', 'Academia de Base', 'Desenvolva jovens talentos e aumente o potencial da base.', 500000, NULL, 3000, '{"type": "academy_upgrade"}', 'epic'),
('infra_medical', 'infrastructure', 'Centro Médico', 'Reduza lesões e acelere recuperação dos jogadores.', 400000, NULL, 2000, '{"type": "medical_upgrade"}', 'rare');

-- 4. Staff
INSERT INTO public.shop_items (id, category, name, description, price_cents, duration_days, min_fans, bonus_data, rarity) VALUES
('staff_physio', 'staff', 'Preparador Físico', 'Melhore desempenho físico e reduza fadiga do elenco.', 50000, 30, 500, '{"role": "physio_coach", "skill": 9}', 'common'),
('staff_analyst', 'staff', 'Analista Tático', 'Melhore leitura de jogo e eficiência tática da equipe.', 150000, 30, 5000, '{"role": "tactical_analyst", "skill": 10}', 'epic');

-- 5. Physio
INSERT INTO public.shop_items (id, category, name, description, price_cents, duration_days, min_fans, bonus_data, rarity) VALUES
('physio_ice', 'physio', 'Câmara de Gelo', 'Recuperação muscular avançada para jogos intensos.', 40000, NULL, 300, '{"type": "ice_chamber"}', 'common'),
('physio_rehab', 'physio', 'Centro de Reabilitação', 'Estrutura premium para recuperação de lesões.', 300000, NULL, 8000, '{"type": "rehab_center"}', 'epic');

-- Update deliver_shop_item RPC to apply all bonuses
CREATE OR REPLACE FUNCTION public.deliver_shop_item(p_order_id UUID)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_item_id TEXT;
  v_category TEXT;
  v_bonus_data JSONB;
  v_fans_to_add INT;
  v_immediate_cash BIGINT;
  v_daily_cash BIGINT;
  v_plan_id TEXT;
  v_plan_name TEXT;
  v_duration_days INT;
BEGIN
  -- Get order details
  SELECT user_id, item_id INTO v_user_id, v_item_id FROM public.payment_orders WHERE id = p_order_id;
  
  -- Get item info
  SELECT category, bonus_data, duration_days, name 
  INTO v_category, v_bonus_data, v_duration_days, v_plan_name
  FROM public.shop_items 
  WHERE id = v_item_id;

  -- Add to inventory
  INSERT INTO public.shop_inventory (user_id, item_id, quantity)
  VALUES (v_user_id, v_item_id, 1)
  ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = shop_inventory.quantity + 1;

  -- Apply side effects based on category
  
  -- 1. Marketing (Add Fans)
  IF v_category = 'marketing' THEN
    IF v_bonus_data ? 'fans_fixed' THEN
      v_fans_to_add := (v_bonus_data->>'fans_fixed')::INT;
    ELSE
      -- Random between min and max
      v_fans_to_add := floor(random() * ((v_bonus_data->>'fans_max')::INT - (v_bonus_data->>'fans_min')::INT + 1) + (v_bonus_data->>'fans_min')::INT)::INT;
    END IF;
    
    UPDATE public.clubs SET fans = fans + v_fans_to_add WHERE user_id = v_user_id;
  END IF;

  -- 2. Sponsorship (Add immediate cash + setup daily payout)
  IF v_category = 'sponsorship' THEN
    v_immediate_cash := (v_bonus_data->>'immediate_cash')::BIGINT;
    v_daily_cash := (v_bonus_data->>'daily_cash')::BIGINT;
    v_plan_id := v_bonus_data->>'plan_id';
    
    -- Add immediate budget
    UPDATE public.clubs SET budget = budget + v_immediate_cash WHERE user_id = v_user_id;
    
    -- Setup daily payout
    INSERT INTO public.premium_sponsorships (
      user_id, plan_id, plan_name, total_value, received_value, payout_days, daily_value, active, activated_at
    ) VALUES (
      v_user_id, v_plan_id, v_plan_name, (v_daily_cash * 30), 0, 30, v_daily_cash, true, NOW()
    )
    ON CONFLICT (user_id) WHERE active = true DO NOTHING;
  END IF;

  -- 3. AUTOMATIC PREMIUM ACTIVATION (30 Days)
  INSERT INTO public.premium_users (user_id, status, activated_at)
  VALUES (v_user_id, 'active', NOW())
  ON CONFLICT (user_id) DO UPDATE 
  SET status = 'active', 
      activated_at = GREATEST(premium_users.activated_at, NOW()) + INTERVAL '30 days';

  -- Update order to completed
  UPDATE public.payment_orders SET status = 'approved' WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
