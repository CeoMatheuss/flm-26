import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LifeBuoy, Send, MessageCircle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  userId: string;
  displayName: string;
  userEmail?: string;
}

interface Ticket {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
}

export function SupportTab({ userId, displayName, userEmail }: Props) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('geral');
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const loadTickets = useCallback(async () => {
    const { data } = await supabase
      .from('support_messages')
      .select('id, subject, message, category, status, admin_response, responded_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setTickets(data as Ticket[]);
  }, [userId]);

  useEffect(() => {
    loadTickets();
    const ch = supabase.channel('support-tickets-' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages', filter: `user_id=eq.${userId}` }, () => loadTickets())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, loadTickets]);

  const send = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Preencha assunto e mensagem');
      return;
    }
    setSending(true);
    const { error } = await supabase.from('support_messages').insert([{
      user_id: userId,
      user_name: displayName,
      user_email: userEmail || null,
      subject: subject.trim().slice(0, 200),
      message: message.trim().slice(0, 2000),
      category,
    }]);
    if (error) toast.error('Erro ao enviar: ' + error.message);
    else {
      toast.success('✅ Mensagem enviada! A equipe responderá em breve.');
      setSubject('');
      setMessage('');
      setCategory('geral');
      loadTickets();
    }
    setSending(false);
  };

  return (
    <div className="space-y-3">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <LifeBuoy className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold">Central de Suporte</p>
            <p className="text-[11px] text-muted-foreground">Envie sua dúvida, sugestão ou reporte um bug. A equipe responde diretamente aqui.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" /> Nova mensagem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-xs col-span-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="geral">📨 Geral</SelectItem>
                <SelectItem value="bug">🐛 Bug</SelectItem>
                <SelectItem value="sugestao">💡 Sugestão</SelectItem>
                <SelectItem value="conta">👤 Conta</SelectItem>
                <SelectItem value="premium">👑 Premium</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Assunto"
              maxLength={200}
              className="h-9 text-xs col-span-2"
            />
          </div>
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Descreva sua mensagem..."
            maxLength={2000}
            rows={5}
            className="text-xs"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{message.length}/2000</span>
            <Button size="sm" onClick={send} disabled={sending} className="h-8 gap-1.5">
              <Send className="h-3.5 w-3.5" /> {sending ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" /> Suas mensagens ({tickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tickets.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma mensagem enviada ainda.</p>
          ) : tickets.map(t => (
            <div key={t.id} className="border border-border/40 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold truncate">{t.subject}</p>
                {t.status === 'resolved' || t.admin_response ? (
                  <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30 shrink-0">
                    <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Respondida
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] text-amber-400 border-amber-500/30 shrink-0">
                    <Clock className="h-2.5 w-2.5 mr-0.5" /> Aguardando
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed">{t.message}</p>
              {t.admin_response && (
                <div className="bg-primary/5 border-l-2 border-primary/40 rounded p-2 mt-2">
                  <p className="text-[10px] font-bold text-primary mb-1">📩 Resposta da equipe:</p>
                  <p className="text-[11px] whitespace-pre-wrap leading-relaxed">{t.admin_response}</p>
                </div>
              )}
              <p className="text-[9px] text-muted-foreground/60">{new Date(t.created_at).toLocaleString('pt-BR')}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
