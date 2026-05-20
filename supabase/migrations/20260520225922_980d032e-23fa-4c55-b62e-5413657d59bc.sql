INSERT INTO public.shop_items (id, name, description, category, rarity, price_cents, bonus_data, active)
VALUES (
  'customization_unlock',
  'Personalização Premium',
  'Desbloqueia edição ilimitada do nome do clube, nome do estádio e escudo.',
  'customization',
  'epic',
  1000,
  '{"type": "customization_unlock"}'::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  bonus_data = EXCLUDED.bonus_data,
  active = true;