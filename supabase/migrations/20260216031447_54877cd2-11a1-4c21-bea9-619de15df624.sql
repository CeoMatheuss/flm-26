
-- 1. Fix premium_users: restrict SELECT to own data + admins
DROP POLICY IF EXISTS "Anyone can check premium status" ON public.premium_users;
CREATE POLICY "Users can view own premium status"
ON public.premium_users FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix user_roles: restrict SELECT to own roles + admins
DROP POLICY IF EXISTS "Authenticated can view roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix player_auctions: restrict UPDATE to legitimate bidders/sellers
DROP POLICY IF EXISTS "Users can update auctions" ON public.player_auctions;
CREATE POLICY "Seller can update own auction"
ON public.player_auctions FOR UPDATE
USING (auth.uid() = seller_id);
CREATE POLICY "Bidders can place bids on active auctions"
ON public.player_auctions FOR UPDATE
USING (auth.uid() IS NOT NULL AND status = 'active' AND auth.uid() != seller_id);

-- 4. Fix chat_bans: restrict SELECT to own bans + admins
DROP POLICY IF EXISTS "Authenticated can view bans" ON public.chat_bans;
CREATE POLICY "Users can view own bans"
ON public.chat_bans FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));
