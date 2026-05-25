INSERT INTO public.shop_items (id, name, description, category, rarity, price_cents, active)
VALUES ('uniform_launch', 'Lançamento de Uniforme', 'Taxa de lançamento premium de uniforme do clube', 'uniform', 'premium', 1, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, active = true;