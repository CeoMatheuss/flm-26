-- Tabela de patrocínios premium (compra única, pagamento progressivo diário)
CREATE TABLE IF NOT EXISTS public.premium_sponsorships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  total_value BIGINT NOT NULL CHECK (total_value > 0 AND total_value <= 10000000),
  received_value BIGINT NOT NULL DEFAULT 0 CHECK (received_value >= 0),
  payout_days INTEGER NOT NULL CHECK (payout_days BETWEEN 1 AND 90),
  daily_value BIGINT NOT NULL CHECK (daily_value > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_payout_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Apenas 1 contrato ativo por usuário
CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_sponsorships_one_active
  ON public.premium_sponsorships(user_id) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_premium_sponsorships_user
  ON public.premium_sponsorships(user_id, active);

ALTER TABLE public.premium_sponsorships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own premium sponsorships"
  ON public.premium_sponsorships FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own premium sponsorships"
  ON public.premium_sponsorships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own premium sponsorships"
  ON public.premium_sponsorships FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_premium_sponsorships_updated_at
  BEFORE UPDATE ON public.premium_sponsorships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();