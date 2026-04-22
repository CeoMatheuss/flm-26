-- Tabela de mensagens de suporte (usuário → admin)
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  status TEXT NOT NULL DEFAULT 'open',
  admin_response TEXT,
  responded_by UUID,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own support tickets"
ON public.support_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own support tickets"
ON public.support_messages FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all support tickets"
ON public.support_messages FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update support tickets"
ON public.support_messages FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete support tickets"
ON public.support_messages FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER support_messages_updated_at
BEFORE UPDATE ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_support_messages_user ON public.support_messages(user_id, created_at DESC);
CREATE INDEX idx_support_messages_status ON public.support_messages(status, created_at DESC);

-- Tabela para persistir notificações dinâmicas (expiring, injured, budget, etc.) lidas por usuário
CREATE TABLE public.notification_read_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_key TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_key)
);

ALTER TABLE public.notification_read_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own read state"
ON public.notification_read_state FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_notif_read_user ON public.notification_read_state(user_id);