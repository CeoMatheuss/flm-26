-- 1) Remove sensitive tables from realtime publication
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['abuse_alerts','suspicious_activity','auth_verification_codes','beta_whitelist','game_saves','payment_webhooks_logs','support_messages']
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- 2) admin_shop_activity: drop public-true SELECT
DROP POLICY IF EXISTS "Admins can view activity" ON public.admin_shop_activity;

-- 3) match_sync_log: restrict to admins
DROP POLICY IF EXISTS "Logs visíveis para admin" ON public.match_sync_log;
CREATE POLICY "Admins can view match sync logs"
  ON public.match_sync_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) membership_revenue_history: restrict to club owner
DROP POLICY IF EXISTS "Public read membership_revenue_history" ON public.membership_revenue_history;
CREATE POLICY "Owners view own membership revenue"
  ON public.membership_revenue_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = membership_revenue_history.club_id AND c.user_id = auth.uid()));

-- 5) payment_orders: fix insert policy (force pending)
DROP POLICY IF EXISTS "Users insert own free orders" ON public.payment_orders;
CREATE POLICY "Users insert own pending orders"
  ON public.payment_orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND amount_cents >= 0 AND status = 'pending');

-- 6) player_fatigue_logs: restrict to player owner
DROP POLICY IF EXISTS "Users can view their own fatigue logs" ON public.player_fatigue_logs;
CREATE POLICY "Owners view own player fatigue logs"
  ON public.player_fatigue_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.world_players wp
    JOIN public.world_teams wt ON wt.id = wp.team_id
    WHERE wp.id = player_fatigue_logs.player_id AND wt.user_id = auth.uid()
  ));

-- 7) world_cup_teams: restrict listing to authenticated users
DROP POLICY IF EXISTS "Public world cup teams view" ON public.world_cup_teams;
CREATE POLICY "Authenticated view world cup teams"
  ON public.world_cup_teams FOR SELECT TO authenticated USING (true);

-- 8) club_scouts: enable RLS + owner policies
ALTER TABLE public.club_scouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage own club scouts" ON public.club_scouts;
CREATE POLICY "Owners manage own club scouts"
  ON public.club_scouts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_scouts.club_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_scouts.club_id AND c.user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins manage club scouts" ON public.club_scouts;
CREATE POLICY "Admins manage club scouts"
  ON public.club_scouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9) shop_scout_packs: enable RLS, public read, admin write
ALTER TABLE public.shop_scout_packs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read scout packs" ON public.shop_scout_packs;
CREATE POLICY "Anyone can read scout packs"
  ON public.shop_scout_packs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage scout packs" ON public.shop_scout_packs;
CREATE POLICY "Admins manage scout packs"
  ON public.shop_scout_packs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));