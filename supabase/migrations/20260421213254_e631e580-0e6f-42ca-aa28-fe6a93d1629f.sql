-- Pool global de jogadores livres
CREATE TABLE public.free_agents_market (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_data jsonb NOT NULL,
  player_name text NOT NULL,
  player_position text NOT NULL,
  player_age integer NOT NULL,
  player_overall integer NOT NULL,
  visible_stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  origin text NOT NULL DEFAULT 'generated',
  origin_club_name text,
  available_from timestamptz NOT NULL DEFAULT now(),
  available_until timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_free_agents_available ON public.free_agents_market (available_until);
CREATE INDEX idx_free_agents_position ON public.free_agents_market (player_position);

ALTER TABLE public.free_agents_market ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view free agents"
ON public.free_agents_market FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage free agents"
ON public.free_agents_market FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Propostas para jogadores livres
CREATE TABLE public.free_agent_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.free_agents_market(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  buyer_club_name text NOT NULL,
  offered_salary bigint NOT NULL DEFAULT 0,
  offered_contract_years integer NOT NULL DEFAULT 2,
  signing_bonus bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  decision_deadline timestamptz NOT NULL DEFAULT (now() + interval '7 hours'),
  rejection_reason text,
  counter_salary bigint,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_free_agent_offers_buyer ON public.free_agent_offers (buyer_id);
CREATE INDEX idx_free_agent_offers_agent ON public.free_agent_offers (agent_id);
CREATE INDEX idx_free_agent_offers_status ON public.free_agent_offers (status, decision_deadline);

ALTER TABLE public.free_agent_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view offers"
ON public.free_agent_offers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create offers as themselves"
ON public.free_agent_offers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can update own offers"
ON public.free_agent_offers FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id);

CREATE POLICY "Users can cancel own offers"
ON public.free_agent_offers FOR DELETE
TO authenticated
USING (auth.uid() = buyer_id AND status = 'pending');