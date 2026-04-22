import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LifeBuoy, Send, Trash2, RefreshCw, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  subject: string;
  message: string;
  category: string;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
}

interface Props { adminUserId: string }

export function AdminSupportPanel({ adminUserId }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [responses, setResponses] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('support_messages').select('*').order('created_at', { ascending: false }).limit(100);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    if (data) setTickets(data as Ticket[]);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    load();
    const ch = supabase.channel('admin-support')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const respond = async (id: string) => {
    const text = (responses[id] || '').trim();
    if (!text) return toast.error('Digite uma resposta');
    const { error } = await supabase.from('support_messages').update({
      admin_response: text,
      responded_by: adminUserId,
      responded_at: new Date().toISOString(),
      status: 'resolved',
    }).eq('id', id);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('✅ Resposta enviada!');
      setResponses(prev => ({ ...prev, [id]: '' }));
      load();
    }
  };

  const del = async (id: string) => {
    if (!confirm('Deletar este ticket?')) return;
    const { error } = await supabase.from('support_messages').delete().eq('id', id);
    if (error) toast.error('Erro');
    else { toast.success('Deletado'); load(); }
  };

  const catEmoji: Record<string, string> = { geral: '📨', bug: '🐛', sugestao: '💡', conta: '👤', premium: '👑' };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <LifeBuoy className="h-4 w-4 text-primary" /> Suporte ({tickets.length})
          <Button size="sm" variant="ghost" className="h-7 ml-auto" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        <div className="flex items-center gap-2 pt-1">
          <Filter className="h-3 w-3 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-7 text-xs w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Abertos</SelectItem>
              <SelectItem value="resolved">Respondidos</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tickets.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum ticket.</p>
        ) : tickets.map(t => (
          <div key={t.id} className="border border-border/40 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="text-[9px]">{catEmoji[t.category] || '📨'} {t.category}</Badge>
                <p className="text-xs font-bold truncate">{t.subject}</p>
              </div>
              <Badge variant="outline" className={`text-[9px] ${t.status === 'resolved' ? 'text-emerald-400 border-emerald-500/30' : 'text-amber-400 border-amber-500/30'}`}>
                {t.status === 'resolved' ? '✓ Respondido' : '⏳ Aberto'}
              </Badge>
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-2 flex-wrap">
              <span>👤 {t.user_name}</span>
              {t.user_email && <span>📧 {t.user_email}</span>}
              <span>🕐 {new Date(t.created_at).toLocaleString('pt-BR')}</span>
            </div>
            <p className="text-[11px] whitespace-pre-wrap leading-relaxed bg-muted/30 rounded p-2">{t.message}</p>
            {t.admin_response ? (
              <div className="bg-primary/5 border-l-2 border-primary/40 rounded p-2">
                <p className="text-[10px] font-bold text-primary mb-1">📩 Sua resposta ({t.responded_at ? new Date(t.responded_at).toLocaleString('pt-BR') : ''}):</p>
                <p className="text-[11px] whitespace-pre-wrap">{t.admin_response}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={responses[t.id] || ''}
                  onChange={e => setResponses(prev => ({ ...prev, [t.id]: e.target.value }))}
                  placeholder="Digite sua resposta..."
                  rows={3}
                  className="text-xs"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => respond(t.id)}>
                    <Send className="h-3 w-3" /> Responder
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 text-destructive" onClick={() => del(t.id)}>
                    <Trash2 className="h-3 w-3" /> Excluir
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
