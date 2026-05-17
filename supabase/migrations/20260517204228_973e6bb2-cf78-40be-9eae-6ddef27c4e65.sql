
ALTER TABLE public.club_active_effects
  ADD COLUMN IF NOT EXISTS last_delivery_at timestamptz NOT NULL DEFAULT now();

-- Permite registrar resgates gratuitos (price 0) como pedido aprovado do próprio usuário.
DROP POLICY IF EXISTS "Users insert own free orders" ON public.payment_orders;
CREATE POLICY "Users insert own free orders" ON public.payment_orders
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND amount_cents >= 0
    AND status = 'approved'
  );
