-- 1. Create Olheiros (Scouting) items
INSERT INTO public.shop_items (id, name, description, category, rarity, price_cents, bonus_data, active)
VALUES 
  ('scouting_basic', 'Pacote Olheiro Regional', 'Encontre promessas em sua região com relatórios básicos.', 'scouting', 'common', 500, '{"type": "scouting_bonus", "quality": 1.1}'::jsonb, true),
  ('scouting_pro', 'Rede de Olheiros Pro', 'Rede nacional de olheiros para encontrar jogadores de elite.', 'scouting', 'epic', 1500, '{"type": "scouting_bonus", "quality": 1.3, "discover_promisses": true}'::jsonb, true),
  ('scouting_elite', 'Olheiros Mundiais Elite', 'A melhor rede de olheiros do mundo à sua disposição.', 'scouting', 'legendary', 3500, '{"type": "scouting_bonus", "quality": 1.6, "discover_promisses": true, "full_reports": true}'::jsonb, true);

-- 2. Create Torcida (Fans) items
INSERT INTO public.shop_items (id, name, description, category, rarity, price_cents, bonus_data, active)
VALUES 
  ('fan_boost_local', 'Pacote Apoio Local', 'Aumenta a presença da torcida e o barulho no estádio.', 'fans', 'common', 300, '{"type": "fan_boost", "attendance_multiplier": 1.1, "home_bonus": 0.05}'::jsonb, true),
  ('fan_boost_national', 'Caravana Nacional', 'Sua torcida presente em todos os cantos do país.', 'fans', 'rare', 900, '{"type": "fan_boost", "attendance_multiplier": 1.25, "home_bonus": 0.1, "away_presence": true}'::jsonb, true),
  ('fan_boost_fanatic', 'Torcida Organizada Fanática', 'Atmosfera hostil para os adversários e apoio incondicional.', 'fans', 'legendary', 2500, '{"type": "fan_boost", "attendance_multiplier": 1.5, "home_bonus": 0.2, "moral_boost": 0.1}'::jsonb, true);

-- 3. Update existing items if needed (ensure category matches UI expectations)
UPDATE public.shop_items SET category = 'sponsorship' WHERE category = 'patrocinios';
UPDATE public.shop_items SET category = 'members' WHERE category = 'socio';

-- 4. Ensure customization_unlock is in the right category
UPDATE public.shop_items SET category = 'customization' WHERE id = 'customization_unlock';
