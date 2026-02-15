
-- Fix: private_messages INSERT should verify sender is a league member
DROP POLICY IF EXISTS "Users can send private messages" ON public.private_messages;
CREATE POLICY "Users can send private messages"
  ON public.private_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM league_members lm
      WHERE lm.league_id = private_messages.league_id AND lm.user_id = auth.uid()
    )
  );

-- Fix: trade_proposals INSERT should verify sender is a league member
DROP POLICY IF EXISTS "Users can send proposals" ON public.trade_proposals;
CREATE POLICY "Users can send proposals"
  ON public.trade_proposals FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM league_members lm
      WHERE lm.league_id = trade_proposals.league_id AND lm.user_id = auth.uid()
    )
  );
