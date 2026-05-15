-- Drop existing function first to avoid return type change error
DROP FUNCTION IF EXISTS public.deliver_shop_item(uuid);

-- Reset Shop Items
DELETE FROM public.shop_items;

-- 1. Marketing Campaigns (Aumentam torcida)
INSERT INTO public.shop_items (id, category, name, description, price_cents, duration_days, min_fans, bonus_data, rarity) VALUES
('mkt_local', 'marketing', 'Campanha Local', 'Crescimento pequeno na sua cidade.', 50000, 10, 0, '{"fans_min": 500, "fans_max": 2000}', 'common'),
('mkt_regional', 'marketing', 'Marketing Regional', 'Crescimento médio no estado.', 150000, 10, 2000, '{"fans_min": 2000, "fans_max": 5000}', 'rare'),
('mkt_nacional', 'marketing', 'Marketing Nacional', 'Grande crescimento no país inteiro.', 500000, 10, 8000, '{"fans_min": 10000, "fans_max": 20000}', 'epic'),
('mkt_mundial', 'marketing', 'Campanha Mundial', 'Crescimento enorme e visibilidade global.', 1500000, 20, 20000, '{"fans_fixed": 50000}', 'legendary'),
('mkt_elite', 'marketing', 'FLM Media Elite', 'Crescimento máximo e grande aumento de receita.', 3000000, 30, 50000, '{"fans_fixed": 100000, "revenue_bonus": 0.15}', 'legendary');

-- 2. Infrastructure Upgrades
INSERT INTO public.shop_items (id, category, name, description, price_cents, duration_days, min_fans, bonus_data, rarity) VALUES
('infra_stadium', 'infrastructure', 'Reforma do Estádio', 'Aumenta receita e moral da torcida.', 1000000, NULL, 5000, '{"type": "stadium_upgrade"}', 'epic'),
('infra_ct', 'infrastructure', 'Novo CT Moderno', 'Acelera a evolução dos jogadores.', 250000, NULL, 1000, '{"type": "ct_upgrade"}', 'rare'),
('infra_academy', 'infrastructure', 'Academia de Base', 'Gera jovens com maior potencial.', 800000, NULL, 3000, '{"type": "academy_upgrade"}', 'epic'),
('infra_medical', 'infrastructure', 'Centro Médico', 'Reduz tempo de lesão do elenco.', 400000, NULL, 2000, '{"type": "medical_upgrade"}', 'rare'),
('infra_analysis', 'infrastructure', 'Sala de Análise', 'Melhora o desempenho tático.', 300000, NULL, 1500, '{"type": "analysis_upgrade"}', 'rare'),
('infra_scout', 'infrastructure', 'Departamento Scout', 'Encontra talentos internacionais.', 500000, NULL, 4000, '{"type": "scout_upgrade"}', 'epic'),
('infra_pitch', 'infrastructure', 'Modernização do Gramado', 'Reduz fadiga durante jogos em casa.', 150000, NULL, 500, '{"type": "pitch_upgrade"}', 'common');

-- 3. Staff Specialist
INSERT INTO public.shop_items (id, category, name, description, price_cents, duration_days, min_fans, bonus_data, rarity) VALUES
('staff_physio', 'staff', 'Preparador Físico', 'Melhora stamina e recuperação.', 45000, 30, 500, '{"role": "physio_coach", "skill": 8}', 'common'),
('staff_doctor', 'staff', 'Médico Especialista', 'Recuperação rápida de lesões.', 80000, 30, 2000, '{"role": "specialist_doctor", "skill": 9}', 'rare'),
('staff_psych', 'staff', 'Psicólogo Esportivo', 'Mantém a moral do elenco alta.', 60000, 30, 1000, '{"role": "psychologist", "skill": 7}', 'rare'),
('staff_finance', 'staff', 'Diretor Financeiro', 'Reduz gastos fixos em 10%.', 120000, 30, 5000, '{"role": "cfo", "skill": 9}', 'epic'),
('staff_analyst', 'staff', 'Analista Tático', 'Insights profundos sobre adversários.', 200000, 30, 10000, '{"role": "tactical_analyst", "skill": 10}', 'epic'),
('staff_scout', 'staff', 'Olheiro Internacional', 'Encontra jogadores lendários.', 150000, 30, 8000, '{"role": "int_scout", "skill": 9}', 'epic');

-- 4. Physiotherapy
INSERT INTO public.shop_items (id, category, name, description, price_cents, duration_days, min_fans, bonus_data, rarity) VALUES
('physio_ice', 'physio', 'Câmara de Gelo', 'Recuperação 2x mais rápida após jogos.', 35000, NULL, 300, '{"type": "ice_chamber"}', 'common'),
('physio_intensive', 'physio', 'Tratamento Intensivo', 'Reduz tempo de lesão em 50%.', 120000, NULL, 2000, '{"type": "intensive_treatment"}', 'rare'),
('physio_equip', 'physio', 'Equipamentos Modernos', 'Reduz risco de lesões musculares.', 90000, NULL, 1000, '{"type": "modern_equip"}', 'rare'),
('physio_recovery', 'physio', 'Recuperação Avançada', 'Melhora condição física geral.', 200000, NULL, 5000, '{"type": "advanced_recovery"}', 'epic'),
('physio_rehab', 'physio', 'Centro de Reabilitação', 'Suporte a múltiplos jogadores.', 350000, NULL, 8000, '{"type": "rehab_center"}', 'epic');

-- 5. Packs
INSERT INTO public.shop_items (id, category, name, description, price_cents, duration_days, min_fans, bonus_data, rarity) VALUES
('pack_start', 'packs', 'Pack Inicial', 'Tudo o que você precisa para começar.', 25000, NULL, 0, '{"items": ["budget_50k", "fans_100"]}', 'common'),
('pack_champ', 'packs', 'Pack Campeão', 'Itens de elite para quem quer títulos.', 500000, NULL, 10000, '{"items": ["budget_1m", "fans_1k", "special_sponsor"]}', 'legendary'),
('pack_fans', 'packs', 'Pack Torcida', 'Impulsione sua base de fãs.', 150000, NULL, 1000, '{"items": ["fans_5k"]}', 'rare'),
('pack_evo', 'packs', 'Pack Evolução', 'Acelere o treino de todo o elenco.', 250000, NULL, 5000, '{"items": ["training_boost_25pct"]}', 'epic'),
('pack_finance', 'packs', 'Pack Financeiro', 'Injeção imediata de R$ 2M no orçamento.', 100000, NULL, 2000, '{"items": ["budget_2m"]}', 'epic');

-- Recreate deliver_shop_item
CREATE OR REPLACE FUNCTION public.deliver_shop_item(p_order_id UUID)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_item_id TEXT;
BEGIN
  -- Get order details
  SELECT user_id, item_id INTO v_user_id, v_item_id FROM public.payment_orders WHERE id = p_order_id;

  -- Add to inventory
  INSERT INTO public.shop_inventory (user_id, item_id, quantity)
  VALUES (v_user_id, v_item_id, 1)
  ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = shop_inventory.quantity + 1;

  -- AUTOMATIC PREMIUM ACTIVATION (30 Days)
  INSERT INTO public.premium_users (user_id, status, activated_at)
  VALUES (v_user_id, 'active', NOW())
  ON CONFLICT (user_id) DO UPDATE 
  SET status = 'active', 
      activated_at = GREATEST(premium_users.activated_at, NOW()) + INTERVAL '30 days';

  -- Update order to completed
  UPDATE public.payment_orders SET status = 'approved' WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
