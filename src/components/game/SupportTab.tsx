import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LifeBuoy, Send, MessageCircle, CheckCircle, Clock, Bug, HelpCircle, Sparkles, Mail, Search, Info, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { GAME_VERSION } from './UpdateAnnouncementModal';

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

const FAQ: Array<{ q: string; a: string; tag: string }> = [
  { tag: 'Conta', q: 'Como recupero minha senha?', a: 'Na tela de login clique em "Esqueci minha senha". Você receberá um e-mail com um link para criar uma nova senha. Se não chegar, verifique a pasta de Spam.' },
  { tag: 'Conta', q: 'Posso mudar o nome do meu clube?', a: 'Sim, na aba Configurações > Identidade do Clube. Algumas alterações podem ter cooldown.' },
  { tag: 'Mercado', q: 'Por que não consigo colocar um jogador no leilão?', a: 'O leilão exige jogadores com OVR ≥ 60 e até 35 anos. O preço inicial é calculado automaticamente como 130% do valor de mercado.' },
  { tag: 'Partidas', q: 'Por que minha partida foi simulada sem eu jogar?', a: 'Se você não entrar no lobby até o horário marcado, a partida é simulada automaticamente para não atrasar a competição.' },
  { tag: 'Eliminatórias', q: 'O que acontece em caso de empate em copa?', a: 'Toda partida eliminatória (Copas e mata-mata de torneios) tem prorrogação de 30 minutos. Se ainda houver empate, vai para os pênaltis.' },
  { tag: 'Premium', q: 'Quanto tempo dura o Premium?', a: 'O status Premium tem validade de 30 dias após a ativação. Você pode renovar a qualquer momento.' },
  { tag: 'Bugs', q: 'Encontrei um bug, o que faço?', a: 'Use o botão "Reportar bug" abaixo. Inclua passos para reproduzir, o que esperava e o que aconteceu. Anexamos automaticamente a versão do jogo.' },
  { tag: 'Atualizações', q: 'Por que apareceu uma tela de "Atualizando..."?', a: 'Quando o jogo é atualizado, seus dados podem precisar ser ajustados. O sistema faz isso automaticamente com backup, e libera assim que terminar (geralmente em segundos).' },
];

export function SupportTab({ userId, displayName, userEmail }: Props) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('geral');
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'answered'>('all');
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqs, setOpenFaqs] = useState<Set<number>>(new Set());

  const loadTickets = useCallback(async () => {
    const { data } = await supabase
      .from('support_messages')
      .select('id, subject, message, category, status, admin_response, responded_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setTickets(data as Ticket[]);
  }, [userId]);

  useEffect(() => {
    loadTickets();
    const ch = supabase.channel('support-tickets-' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages', filter: `user_id=eq.${userId}` }, () => loadTickets())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, loadTickets]);

  const send = async (extraContext?: string) => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Preencha assunto e mensagem');
      return;
    }
    setSending(true);
    const finalMessage = extraContext
      ? `${message.trim()}\n\n--- Info técnica ---\n${extraContext}`
      : message.trim();
    const { error } = await supabase.from('support_messages').insert([{
      user_id: userId,
      user_name: displayName,
      user_email: userEmail || null,
      subject: subject.trim().slice(0, 200),
      message: finalMessage.slice(0, 2000),
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

  const reportBug = () => {
    setCategory('bug');
    const ctx = `Versão: ${GAME_VERSION}\nNavegador: ${navigator.userAgent}\nResolução: ${window.innerWidth}x${window.innerHeight}\nData: ${new Date().toISOString()}`;
    send(ctx);
  };

  const filtered = useMemo(() => {
    if (filter === 'pending') return tickets.filter(t => !t.admin_response && t.status !== 'resolved');
    if (filter === 'answered') return tickets.filter(t => t.admin_response || t.status === 'resolved');
    return tickets;
  }, [tickets, filter]);

  const pendingCount = useMemo(() => tickets.filter(t => !t.admin_response && t.status !== 'resolved').length, [tickets]);
  const answeredCount = tickets.length - pendingCount;

  const filteredFaq = useMemo(() => {
    const q = faqSearch.toLowerCase().trim();
    if (!q) return FAQ;
    return FAQ.filter(f =>
      f.q.toLowerCase().includes(q) ||
      f.a.toLowerCase().includes(q) ||
      f.tag.toLowerCase().includes(q),
    );
  }, [faqSearch]);

  const toggleFaq = (idx: number) => {
    setOpenFaqs(s => {
      const next = new Set(s);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const categoryEmoji: Record<string, string> = { geral: '📨', bug: '🐛', sugestao: '💡', conta: '👤', premium: '👑' };

  return (
    <div className="space-y-3">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
        <CardContent className="p-4 flex items-start gap-3 flex-wrap">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <LifeBuoy className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold flex items-center gap-2 flex-wrap">
              Central de Suporte
              <Badge variant="outline" className="text-[9px]">v{GAME_VERSION}</Badge>
            </p>
            <p className="text-[11px] text-muted-foreground">
              Antes de enviar, dê uma olhada nas perguntas frequentes abaixo — a maioria das dúvidas tem resposta lá.
            </p>
          </div>
          <div className="flex gap-1.5">
            <Badge variant="outline" className="text-[10px]"><Mail className="h-2.5 w-2.5 mr-1" />{tickets.length} tickets</Badge>
            {pendingCount > 0 && (
              <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                <Clock className="h-2.5 w-2.5 mr-1" />{pendingCount} aguardando
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" /> Perguntas frequentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={faqSearch}
              onChange={e => setFaqSearch(e.target.value)}
              placeholder="Buscar na FAQ..."
              className="h-8 text-xs pl-8"
            />
          </div>
          {filteredFaq.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-3">
              Nada encontrado. Envie sua dúvida abaixo!
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredFaq.map((f, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left bg-muted/30 hover:bg-muted/50 transition rounded-lg p-2.5 border border-border/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-[9px] shrink-0">{f.tag}</Badge>
                      <span className="text-xs font-medium truncate">{f.q}</span>
                    </div>
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${openFaqs.has(idx) ? 'rotate-180' : ''}`} />
                  </div>
                  {openFaqs.has(idx) && (
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{f.a}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compose */}
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
            placeholder="Descreva com detalhes. Para bugs, inclua passos para reproduzir..."
            maxLength={2000}
            rows={5}
            className="text-xs"
          />
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" /> {message.length}/2000 — sua versão do jogo será anexada automaticamente em bugs
            </span>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={reportBug} disabled={sending} className="h-8 gap-1.5">
                <Bug className="h-3.5 w-3.5" /> Reportar bug
              </Button>
              <Button size="sm" onClick={() => send()} disabled={sending} className="h-8 gap-1.5">
                <Send className="h-3.5 w-3.5" /> {sending ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets list */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" /> Suas mensagens
          </CardTitle>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="h-7">
              <TabsTrigger value="all" className="text-[10px] h-5">Todas ({tickets.length})</TabsTrigger>
              <TabsTrigger value="pending" className="text-[10px] h-5">Aguardando ({pendingCount})</TabsTrigger>
              <TabsTrigger value="answered" className="text-[10px] h-5">Respondidas ({answeredCount})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              {tickets.length === 0
                ? 'Nenhuma mensagem enviada ainda. Use o formulário acima para começar.'
                : 'Nenhuma mensagem nesta categoria.'}
            </p>
          ) : filtered.map(t => (
            <div key={t.id} className="border border-border/40 rounded-lg p-3 space-y-2 hover:border-border/70 transition">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="text-sm shrink-0">{categoryEmoji[t.category] || '📨'}</span>
                  <p className="text-xs font-bold truncate">{t.subject}</p>
                </div>
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
                  <p className="text-[10px] font-bold text-primary mb-1 flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" /> Resposta da equipe
                    {t.responded_at && <span className="font-normal text-muted-foreground ml-1">· {new Date(t.responded_at).toLocaleString('pt-BR')}</span>}
                  </p>
                  <p className="text-[11px] whitespace-pre-wrap leading-relaxed">{t.admin_response}</p>
                </div>
              )}
              <p className="text-[9px] text-muted-foreground/60">Enviada em {new Date(t.created_at).toLocaleString('pt-BR')}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
