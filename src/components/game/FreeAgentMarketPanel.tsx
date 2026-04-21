import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Send, RefreshCw, Clock, Eye, EyeOff, Sparkles, AlertTriangle, CheckCircle, X } from 'lucide-react';
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
  offered_salary: number;
  offered_contract_years: number;
  signing_bonus: number;
  status: string;
  decision_deadline: string;
  rejection_reason: string | null;
  counter_salary: number | null;
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

export function FreeAgentMarketPanel({ userId, clubName, transferBudget, salaryBudgetRemaining, onPlayerSigned }: Props) {
  const [agents, setAgents] = useState<FreeAgent[]>([]);
  const [myOffers, setMyOffers] = useState<FreeAgentOffer[]>([]);
  const [searchText, setSearchText] = useState('');
  const [posFilter, setPosFilter] = useState<string>('all');
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

  const loadMyOffers = useCallback(async () => {
    const { data } = await supabase
      .from('free_agent_offers')
      .select('*')
      .eq('buyer_id', userId)
      .in('status', ['pending', 'counter_salary', 'accepted'])
      .order('created_at', { ascending: false });
    if (data) setMyOffers(data as any);
  }, [userId]);

  const resolveDecisions = useCallback(async () => {
    await supabase.functions.invoke('process-free-agent', { body: { action: 'resolve-decisions' } });
  }, []);

  const seedPool = useCallback(async () => {
    await supabase.functions.invoke('process-free-agent', { body: { action: 'seed-pool' } });
  }, []);

  useEffect(() => {
    seedPool().then(() => resolveDecisions()).then(() => {
      loadAgents();
      loadMyOffers();
    });
    const ch = supabase.channel('free-agents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'free_agents_market' }, () => loadAgents())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'free_agent_offers' }, () => loadMyOffers())
      .subscribe();
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { supabase.removeChannel(ch); clearInterval(tick); };
  }, [loadAgents, loadMyOffers, resolveDecisions, seedPool]);

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
      loadMyOffers();
    }
  };

  const acceptCounter = async (offer: FreeAgentOffer) => {
    setLoading(true);
    const res = await supabase.functions.invoke('process-free-agent', {
      body: { action: 'accept-counter', offerId: offer.id, transferBudgetAvailable: transferBudget },
    });
    setLoading(false);
    if (res.error || res.data?.error) toast.error(res.data?.error || 'Erro');
    else { toast.success('Contraproposta aceita!'); loadMyOffers(); }
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
    loadMyOffers();
    loadAgents();
  };

  const cancelOffer = async (offerId: string) => {
    const { error } = await supabase.from('free_agent_offers').delete().eq('id', offerId);
    if (error) toast.error('Erro ao cancelar');
    else { toast.info('Proposta cancelada'); loadMyOffers(); }
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
    myOffers.forEach(o => { if (o.status === 'pending' || o.status === 'counter_salary' || o.status === 'accepted') map[o.agent_id] = o; });
    return map;
  }, [myOffers]);

  const formatCountdown = (deadlineIso: string) => {
    const ms = new Date(deadlineIso).getTime() - now;
    if (ms <= 0) return 'Resolvendo...';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
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

      {/* My pending offers */}
      {myOffers.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <p className="text-xs font-bold flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> Minhas propostas ({myOffers.length})</p>
            <div className="space-y-1.5">
              {myOffers.map(offer => {
                const agent = agents.find(a => a.id === offer.agent_id);
                if (!agent) return null;
                return (
                  <div key={offer.id} className="flex items-center gap-2 p-2 rounded-lg bg-accent/30 border border-border/15">
                    <Badge variant="outline" className={`text-[9px] ${posColors[agent.player_position]}`}>{agent.player_position}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{agent.player_name}</p>
                      <p className="text-[9px] text-muted-foreground">{formatMoney(offer.offered_salary)}/mês • {offer.offered_contract_years}a</p>
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
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar jogador..." value={searchText} onChange={e => setSearchText(e.target.value)} className="h-8 pl-8 text-xs rounded-lg" />
        </div>
        <div className="flex gap-1">
          {['all', 'GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'].map(p => (
            <Button key={p} size="sm" variant={posFilter === p ? 'default' : 'outline'} className="h-8 px-2 text-[10px]" onClick={() => setPosFilter(p)}>
              {p === 'all' ? 'Todos' : p}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={loadAgents} className="h-8 text-xs gap-1.5">
          <RefreshCw className="h-3 w-3" /> Atualizar
        </Button>
      </div>

      {/* Agents list */}
      <ScrollArea className="h-[480px] pr-2">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">
            <EyeOff className="h-8 w-8 mx-auto mb-2 opacity-30" />
            Nenhum jogador no Mercado Livre no momento.
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(agent => {
              const stats = agent.visible_stats || {};
              const isPending = !!pendingOffersByAgent[agent.id];
              const onCooldown = new Date(agent.available_from) > new Date();
              return (
                <div key={agent.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/20 bg-card/50 hover:border-primary/30 transition-colors">
                  {/* Hidden OVR */}
                  <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 border border-border/30 bg-muted/30">
                    <span className="text-sm font-black text-muted-foreground/60">???</span>
                    <span className="text-[7px] text-muted-foreground">OVR</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <Badge variant="outline" className={`text-[8px] px-1 py-0 h-4 ${posColors[agent.player_position]}`}>{agent.player_position}</Badge>
                      <span className="font-semibold text-xs truncate">{agent.player_name}</span>
                      {agent.origin === 'rescinded' && (
                        <Badge variant="outline" className="text-[8px] h-4 bg-orange-500/15 text-orange-400 border-orange-500/30">
                          Rescindido{agent.origin_club_name ? ` por ${agent.origin_club_name}` : ''}
                        </Badge>
                      )}
                      {agent.origin === 'generated' && (
                        <Badge variant="outline" className="text-[8px] h-4 text-muted-foreground">Livre</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{agent.player_age}a</span>
                      <span>🏟️ {stats.gamesPlayed ?? 0}</span>
                      <span>⚽ {stats.goals ?? 0}</span>
                      <span>🅰️ {stats.assists ?? 0}</span>
                      {stats.avgRating != null && (
                        <span className={`font-bold ${stats.avgRating >= 7 ? 'text-emerald-400' : stats.avgRating >= 6 ? 'text-primary' : 'text-red-400'}`}>
                          ★{Number(stats.avgRating).toFixed(1)}
                        </span>
                      )}
                    </div>
                    {onCooldown && (
                      <p className="text-[9px] text-amber-400 mt-0.5">Disponível em {formatCountdown(agent.available_from)}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="h-8 text-[10px] gap-1"
                    disabled={isPending || onCooldown}
                    onClick={() => openOfferDialog(agent)}
                  >
                    {isPending ? 'Em proposta' : <><Send className="h-3 w-3" /> Propor</>}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

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
