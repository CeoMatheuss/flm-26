import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Send, RefreshCw, Clock, EyeOff, AlertTriangle, CheckCircle, X, History, Inbox, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/formatMoney';

interface FreeAgent {
  id: string;
  player_data: any;
  player_name: string;
  player_position: string;
  player_age: number;
  visible_stats: any;
  origin: string;
  origin_club_name: string | null;
  available_from: string;
  available_until: string;
}

interface FreeAgentOffer {
  id: string;
  agent_id: string;
  buyer_id: string;
  buyer_club_name: string;
  offered_salary: number;
  offered_contract_years: number;
  signing_bonus: number;
  status: string;
  decision_deadline: string;
  rejection_reason: string | null;
  counter_salary: number | null;
  created_at: string;
  resolved_at: string | null;
}

const posColors: Record<string, string> = {
  GOL: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  ZAG: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  LAT: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  VOL: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  MEI: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  ATA: 'bg-red-500/15 text-red-400 border-red-500/30',
};

interface Props {
  userId: string;
  clubName: string;
  transferBudget: number;
  salaryBudgetRemaining: number;
  onPlayerSigned: (playerData: any, salary: number, contractYears: number) => void;
}

const ACTIVE_STATUSES = ['pending', 'counter_salary', 'accepted'];

export function FreeAgentMarketPanel({ userId, clubName, transferBudget, salaryBudgetRemaining, onPlayerSigned }: Props) {
  const [agents, setAgents] = useState<FreeAgent[]>([]);
  const [activeOffers, setActiveOffers] = useState<FreeAgentOffer[]>([]);
  const [historyOffers, setHistoryOffers] = useState<FreeAgentOffer[]>([]);
  const [agentMap, setAgentMap] = useState<Record<string, FreeAgent>>({});
  const [searchText, setSearchText] = useState('');
  const [posFilter, setPosFilter] = useState<string>('all');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'signed' | 'rejected'>('all');
  const [loading, setLoading] = useState(false);
  const [offerAgent, setOfferAgent] = useState<FreeAgent | null>(null);
  const [offerSalary, setOfferSalary] = useState(500);
  const [offerYears, setOfferYears] = useState(2);
  const [signingBonus, setSigningBonus] = useState(0);
  const [now, setNow] = useState(Date.now());

  // ── Loaders ──
  const loadAgents = useCallback(async () => {
    const { data } = await supabase
      .from('free_agents_market')
      .select('*')
      .gte('available_until', new Date().toISOString())
      .order('player_overall', { ascending: false })
      .limit(200);
    if (data) setAgents(data as any);
  }, []);

  const loadActiveOffers = useCallback(async () => {
    const { data } = await supabase
      .from('free_agent_offers')
      .select('*')
      .eq('buyer_id', userId)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: false });
    if (data) setActiveOffers(data as any);
  }, [userId]);

  const loadHistory = useCallback(async () => {
    // Sent offers (any status)
    const { data: sent } = await supabase
      .from('free_agent_offers')
      .select('*')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    // Received offers: agents that originated from this club
    const { data: myAgentsRows } = await supabase
      .from('free_agents_market')
      .select('id')
      .eq('origin_club_name', clubName);
    const myAgentIds = (myAgentsRows || []).map((r: any) => r.id);

    let received: FreeAgentOffer[] = [];
    if (myAgentIds.length > 0) {
      const { data } = await supabase
        .from('free_agent_offers')
        .select('*')
        .in('agent_id', myAgentIds)
        .neq('buyer_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (data) received = data as any;
    }

    const all = [...(sent || []), ...received] as FreeAgentOffer[];
    // Sort by date desc
    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setHistoryOffers(all);

    // Load agent details for any agents we don't already have cached
    const allAgentIds = Array.from(new Set(all.map(o => o.agent_id)));
    const missing = allAgentIds.filter(id => !agentMap[id] && !agents.find(a => a.id === id));
    if (missing.length > 0) {
      const { data: extra } = await supabase
        .from('free_agents_market')
        .select('*')
        .in('id', missing);
      if (extra) {
        const map: Record<string, FreeAgent> = {};
        (extra as any[]).forEach(a => { map[a.id] = a; });
        setAgentMap(prev => ({ ...prev, ...map }));
      }
    }
  }, [userId, clubName, agentMap, agents]);

  const resolveDecisions = useCallback(async () => {
    await supabase.functions.invoke('process-free-agent', { body: { action: 'resolve-decisions' } });
  }, []);

  const seedPool = useCallback(async () => {
    await supabase.functions.invoke('process-free-agent', { body: { action: 'seed-pool' } });
  }, []);

  useEffect(() => {
    resolveDecisions().then(() => {
      loadAgents();
      loadActiveOffers();
      loadHistory();
    });
    const ch = supabase.channel('free-agents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'free_agents_market' }, () => loadAgents())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'free_agent_offers' }, () => { loadActiveOffers(); loadHistory(); })
      .subscribe();
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { supabase.removeChannel(ch); clearInterval(tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Actions ──
  const sendOffer = async () => {
    if (!offerAgent) return;
    if (offerSalary <= 0) { toast.error('Defina um salário'); return; }
    if (signingBonus > transferBudget) {
      toast.error(`Luvas excedem sua verba de transferências (${formatMoney(transferBudget)} disponível).`);
      return;
    }
    const annualSalary = offerSalary * 12;
    if (annualSalary > salaryBudgetRemaining) {
      toast.error(`Salário anual (${formatMoney(annualSalary)}) excede sua verba de salários disponível.`);
      return;
    }

    setLoading(true);
    const res = await supabase.functions.invoke('process-free-agent', {
      body: {
        action: 'make-offer',
        agentId: offerAgent.id,
        offeredSalary: offerSalary,
        contractYears: offerYears,
        signingBonus,
        clubName,
        transferBudgetAvailable: transferBudget,
      },
    });
    setLoading(false);
    if (res.error || res.data?.error) {
      toast.error(res.data?.error || 'Erro ao enviar proposta');
    } else {
      toast.success(`Proposta enviada para ${offerAgent.player_name}! Aguarde 7h.`);
      setOfferAgent(null);
      loadActiveOffers();
      loadHistory();
    }
  };

  const acceptCounter = async (offer: FreeAgentOffer) => {
    setLoading(true);
    const res = await supabase.functions.invoke('process-free-agent', {
      body: { action: 'accept-counter', offerId: offer.id, transferBudgetAvailable: transferBudget },
    });
    setLoading(false);
    if (res.error || res.data?.error) toast.error(res.data?.error || 'Erro');
    else { toast.success('Contraproposta aceita!'); loadActiveOffers(); }
  };

  const completeSigning = async (offer: FreeAgentOffer) => {
    setLoading(true);
    const res = await supabase.functions.invoke('process-free-agent', {
      body: { action: 'complete-signing', offerId: offer.id },
    });
    setLoading(false);
    if (res.error || res.data?.error) {
      toast.error(res.data?.error || 'Erro ao finalizar');
      return;
    }
    const { player, salary, contractYears } = res.data;
    onPlayerSigned(player, salary, contractYears);
    toast.success(`${player.name} contratado!`);
    loadActiveOffers();
    loadAgents();
    loadHistory();
  };

  const cancelOffer = async (offerId: string) => {
    const { error } = await supabase.from('free_agent_offers').delete().eq('id', offerId);
    if (error) toast.error('Erro ao cancelar');
    else { toast.info('Proposta cancelada'); loadActiveOffers(); loadHistory(); }
  };

  const openOfferDialog = (agent: FreeAgent) => {
    const suggested = agent.player_data?.salary || 500;
    setOfferAgent(agent);
    setOfferSalary(suggested);
    setOfferYears(2);
    setSigningBonus(0);
  };

  // ── Filters ──
  const filtered = useMemo(() => {
    return agents.filter(a => {
      if (posFilter !== 'all' && a.player_position !== posFilter) return false;
      if (searchText.trim() && !a.player_name.toLowerCase().includes(searchText.trim().toLowerCase())) return false;
      return true;
    });
  }, [agents, posFilter, searchText]);

  const pendingOffersByAgent = useMemo(() => {
    const map: Record<string, FreeAgentOffer> = {};
    activeOffers.forEach(o => { map[o.agent_id] = o; });
    return map;
  }, [activeOffers]);

  const findAgent = useCallback((agentId: string): FreeAgent | undefined => {
    return agents.find(a => a.id === agentId) || agentMap[agentId];
  }, [agents, agentMap]);

  const filteredHistory = useMemo(() => {
    return historyOffers.filter(o => {
      if (historyFilter === 'signed') return o.status === 'signed' || o.status === 'accepted_completed';
      if (historyFilter === 'rejected') return o.status === 'rejected' || o.status === 'cancelled' || o.status === 'expired';
      return true;
    });
  }, [historyOffers, historyFilter]);

  const formatCountdown = (deadlineIso: string) => {
    const ms = new Date(deadlineIso).getTime() - now;
    if (ms <= 0) return 'Resolvendo...';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const statusConfig = (status: string): { label: string; className: string } => {
    switch (status) {
      case 'pending': return { label: '⏳ Pendente', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      case 'counter_salary': return { label: '💰 Contraproposta', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
      case 'accepted': return { label: '✅ Aceita', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'signed':
      case 'accepted_completed': return { label: '✅ Assinado', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'rejected': return { label: '❌ Recusado', className: 'bg-red-500/15 text-red-400 border-red-500/30' };
      case 'cancelled': return { label: '🚫 Cancelado', className: 'bg-muted text-muted-foreground border-border' };
      case 'expired': return { label: '⌛ Expirado', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' };
      default: return { label: status, className: 'bg-muted text-muted-foreground border-border' };
    }
  };

  return (
    <div className="space-y-3">
      {/* Info banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3 flex items-start gap-2">
          <EyeOff className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-bold text-foreground">Mercado Livre — Atributos ocultos.</span>{' '}
            Você só vê <span className="text-foreground">nome, idade, posição, gols, assistências e nota média</span>.
            O OVR e os atributos só serão revelados após assinar. Propostas demoram <strong>7 horas</strong> para serem respondidas.
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid grid-cols-3 w-full h-9 rounded-xl">
          <TabsTrigger value="available" className="text-[11px] gap-1.5 rounded-lg">
            <Globe className="h-3 w-3" /> Disponíveis
          </TabsTrigger>
          <TabsTrigger value="active" className="text-[11px] gap-1.5 rounded-lg relative">
            <Inbox className="h-3 w-3" /> Ativas
            {activeOffers.length > 0 && (
              <Badge variant="outline" className="h-4 px-1 text-[8px]">{activeOffers.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="text-[11px] gap-1.5 rounded-lg">
            <History className="h-3 w-3" /> Histórico
          </TabsTrigger>
        </TabsList>

        {/* ── DISPONÍVEIS — Drop schedule notice ── */}
        <TabsContent value="available" className="mt-3">
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-6 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Clock className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Novos Agentes Livres no Mercado</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed max-w-sm mx-auto">
                Jogadores que não receberam lances no leilão são enviados <span className="font-bold text-primary">automaticamente</span> para o mercado livre.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
              <div className="p-2.5 rounded-xl bg-accent/40 border border-border/20">
                <p className="text-[9px] text-muted-foreground">Frequência</p>
                <p className="text-xs font-bold text-foreground mt-0.5">Semanal</p>
              </div>
              <div className="p-2.5 rounded-xl bg-accent/40 border border-border/20">
                <p className="text-[9px] text-muted-foreground">Quantidade</p>
                <p className="text-xs font-bold text-primary mt-0.5">10 jogadores</p>
              </div>
              <div className="p-2.5 rounded-xl bg-accent/40 border border-border/20">
                <p className="text-[9px] text-muted-foreground">Decisão</p>
                <p className="text-xs font-bold text-foreground mt-0.5">7 horas</p>
              </div>
            </div>

            <div className="pt-2 text-[10px] text-muted-foreground leading-relaxed max-w-md mx-auto">
              <EyeOff className="h-3 w-3 inline mr-1 text-primary" />
              Atributos ocultos até a assinatura. Você só verá nome, idade, posição e estatísticas básicas.
            </div>
          </div>
        </TabsContent>

        {/* ── ATIVAS ── */}
        <TabsContent value="active" className="space-y-2 mt-3">
          {activeOffers.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground rounded-xl border border-border/15 bg-card/50">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Nenhuma proposta ativa no momento.
            </div>
          ) : (
            <div className="space-y-1.5">
              {activeOffers.map(offer => {
                const agent = findAgent(offer.agent_id);
                if (!agent) return null;
                return (
                  <div key={offer.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-accent/30 border border-border/20">
                    <Badge variant="outline" className={`text-[9px] ${posColors[agent.player_position]}`}>{agent.player_position}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{agent.player_name}</p>
                      <p className="text-[9px] text-muted-foreground">{formatMoney(offer.offered_salary)}/mês • {offer.offered_contract_years}a {offer.signing_bonus > 0 && `• 🎁 ${formatMoney(offer.signing_bonus)}`}</p>
                    </div>
                    {offer.status === 'pending' && (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[9px]">{formatCountdown(offer.decision_deadline)}</Badge>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => cancelOffer(offer.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {offer.status === 'counter_salary' && (
                      <div className="flex items-center gap-1.5">
                        <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30">Pediu R${offer.counter_salary}</Badge>
                        <Button size="sm" className="h-7 text-[10px] px-2" onClick={() => acceptCounter(offer)} disabled={loading}>Aceitar</Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => cancelOffer(offer.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {offer.status === 'accepted' && (
                      <Button size="sm" className="h-7 text-[10px] px-2 gap-1 bg-emerald-500 hover:bg-emerald-600" onClick={() => completeSigning(offer)} disabled={loading}>
                        <CheckCircle className="h-3 w-3" /> Finalizar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── HISTÓRICO ── */}
        <TabsContent value="history" className="space-y-3 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground shrink-0">Filtrar:</span>
            {([
              { v: 'all', label: 'Tudo' },
              { v: 'signed', label: '✅ Assinaturas' },
              { v: 'rejected', label: '❌ Recusas' },
            ] as const).map(f => (
              <Button
                key={f.v}
                size="sm"
                variant={historyFilter === f.v ? 'default' : 'outline'}
                className="h-7 px-2 text-[10px]"
                onClick={() => setHistoryFilter(f.v)}
              >
                {f.label}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={loadHistory} className="h-7 ml-auto text-[10px] gap-1">
              <RefreshCw className="h-3 w-3" /> Atualizar
            </Button>
          </div>

          <ScrollArea className="h-[450px] pr-2">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Nenhuma proposta no histórico.
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredHistory.map(offer => {
                  const agent = findAgent(offer.agent_id);
                  const isSent = offer.buyer_id === userId;
                  const sc = statusConfig(offer.status);
                  return (
                    <div key={offer.id} className="flex items-start gap-2 p-2.5 rounded-xl bg-card/50 border border-border/20">
                      <Badge variant="outline" className={`text-[9px] shrink-0 mt-0.5 ${agent ? posColors[agent.player_position] : ''}`}>
                        {agent?.player_position || '?'}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold truncate">{agent?.player_name || 'Jogador'}</span>
                          <Badge variant="outline" className={`text-[8px] h-4 ${isSent ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'bg-purple-500/15 text-purple-400 border-purple-500/30'}`}>
                            {isSent ? '📤 Enviada' : '📥 Recebida'}
                          </Badge>
                          <Badge variant="outline" className={`text-[8px] h-4 ${sc.className}`}>{sc.label}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatMoney(offer.offered_salary)}/mês • {offer.offered_contract_years}a
                          {offer.signing_bonus > 0 && ` • 🎁 ${formatMoney(offer.signing_bonus)}`}
                          {!isSent && ` • por ${offer.buyer_club_name}`}
                        </p>
                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground mt-0.5">
                          <span>📅 {formatDate(offer.created_at)}</span>
                          {offer.resolved_at && <span>· ✓ {formatDate(offer.resolved_at)}</span>}
                        </div>
                        {offer.rejection_reason && (
                          <p className="text-[9px] text-orange-400 mt-1 leading-relaxed">💬 {offer.rejection_reason}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Offer Dialog */}
      <Dialog open={!!offerAgent} onOpenChange={(o) => !o && setOfferAgent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Proposta para {offerAgent?.player_name}</DialogTitle>
            <DialogDescription>
              Atributos serão revelados apenas após a assinatura. Decisão em até 7 horas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">💰 Salário mensal</label>
              <Input type="number" value={offerSalary} onChange={e => setOfferSalary(Math.max(100, Number(e.target.value) || 100))} className="h-9 text-sm" />
              <p className="text-[10px] text-muted-foreground mt-1">Anual: {formatMoney(offerSalary * 12)} (verba salários disponível: {formatMoney(salaryBudgetRemaining)})</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">📄 Duração do contrato</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(y => (
                  <Button key={y} size="sm" variant={offerYears === y ? 'default' : 'outline'} className="h-8 flex-1 text-xs" onClick={() => setOfferYears(y)}>{y}a</Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">🎁 Luvas (R$)</label>
              <Input type="number" value={signingBonus} onChange={e => setSigningBonus(Math.max(0, Number(e.target.value) || 0))} className="h-9 text-sm" />
              <p className="text-[10px] text-muted-foreground mt-1">Verba transferências disponível: {formatMoney(transferBudget)}</p>
              {signingBonus > transferBudget && (
                <p className="text-[10px] text-destructive flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3" /> Luvas excedem verba de transferências
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOfferAgent(null)}>Cancelar</Button>
            <Button onClick={sendOffer} disabled={loading} className="gap-1.5">
              <Send className="h-4 w-4" /> Enviar Proposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
