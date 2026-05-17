import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DollarSign, TrendingUp, TrendingDown, Users, Crown, Rocket, Package,
  Shirt, Building2, Trophy, RefreshCw, ArrowDownRight, ArrowUpRight,
  Wallet, History as HistoryIcon, Activity, Banknote, ShoppingBag, PieChart, BarChart3,
  CheckCircle2, Clock, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart as RPieChart, Pie, Cell, Legend
} from 'recharts';

interface PainelFLMProps {
  club: any;
  userId: string;
}

type LedgerEntry = {
  id: string;
  ts: string;
  kind: 'in' | 'out';
  category: keyof typeof CATEGORIES;
  label: string;
  amount: number; // R$
  source: string;
};

const CATEGORIES = {
  sponsorship: { label: 'Patrocínio', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: '#10b981' },
  members:     { label: 'Sócios',     icon: Crown,      color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   dot: '#f59e0b' },
  marketing:   { label: 'Marketing',  icon: Rocket,     color: 'text-pink-400',    bg: 'bg-pink-500/10',    border: 'border-pink-500/30',    dot: '#ec4899' },
  stickers:    { label: 'Pacotinhos', icon: Package,    color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  dot: '#fb923c' },
  shop:        { label: 'Loja Oficial', icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    dot: '#3b82f6' },
  stadium:     { label: 'Estádio',    icon: Building2,  color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    dot: '#06b6d4' },
  prize:       { label: 'Premiações', icon: Trophy,     color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  dot: '#eab308' },
  purchase:    { label: 'Compras',    icon: ShoppingBag, color: 'text-violet-400', bg: 'bg-violet-500/10',  border: 'border-violet-500/30',  dot: '#8b5cf6' },
  wages:       { label: 'Salários',   icon: Users,      color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    dot: '#f43f5e' },
  upgrades:    { label: 'Upgrades',   icon: Building2,  color: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500/30',     dot: '#0ea5e9' },
  other:       { label: 'Outros',     icon: Banknote,   color: 'text-white/70',    bg: 'bg-white/5',        border: 'border-white/10',       dot: '#94a3b8' },
} as const;

export function PainelFLM({ club, userId }: PainelFLMProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [budget, setBudget] = useState<number>(club?.budget || 0);

  // Real club id pode não vir do save local — resolve pelo userId.
  const [resolvedClubId, setResolvedClubId] = useState<string | null>(club?.id || null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (club?.id) { setResolvedClubId(club.id); return; }
      if (!userId) return;
      const { data } = await supabase.from('clubs').select('id, budget').eq('user_id', userId).maybeSingle();
      if (cancelled) return;
      if (data?.id) {
        setResolvedClubId(data.id);
        if (data.budget != null) setBudget(Number(data.budget));
      }
    })();
    return () => { cancelled = true; };
  }, [club?.id, userId]);

  const [sponsorships, setSponsorships] = useState<any[]>([]);
  const [membership, setMembership] = useState<any>(null);
  const [shopStats, setShopStats] = useState<any>(null);
  const [activeEffects, setActiveEffects] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const loadAll = useCallback(async () => {
    if (!resolvedClubId || !userId) return;
    setRefreshing(true);
    try {
      const client = supabase as any;
      const [spons, mem, stats, effects, ords, clubRow] = await Promise.all([
        client.from('club_sponsorships').select('*').eq('club_id', resolvedClubId).eq('is_active', true),
        client.from('club_memberships').select('*').eq('club_id', resolvedClubId).maybeSingle(),
        client.from('club_shop_stats').select('*').eq('club_id', resolvedClubId).maybeSingle(),
        client.from('club_active_effects').select('*').eq('club_id', resolvedClubId),
        client.from('payment_orders')
          .select('id, amount_cents, status, delivered, created_at, metadata, item_id, shop_items(name, category)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(80),
        client.from('clubs').select('budget').eq('id', resolvedClubId).maybeSingle(),
      ]);
      setSponsorships(spons.data || []);
      setMembership(mem.data || null);
      setShopStats(stats.data || null);
      setActiveEffects(effects.data || []);
      setOrders(ords.data || []);
      if (clubRow.data?.budget != null) setBudget(Number(clubRow.data.budget));
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [resolvedClubId, userId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Realtime: pagamentos + clube + sócios + loja
  useEffect(() => {
    if (!resolvedClubId || !userId) return;
    const ch = supabase.channel(`painel-${resolvedClubId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_orders', filter: `user_id=eq.${userId}` }, loadAll)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'clubs', filter: `id=eq.${resolvedClubId}` }, (p: any) => {
        if (p.new?.budget != null) setBudget(Number(p.new.budget));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_sponsorships', filter: `club_id=eq.${resolvedClubId}` }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_memberships', filter: `club_id=eq.${resolvedClubId}` }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_shop_stats', filter: `club_id=eq.${resolvedClubId}` }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_active_effects', filter: `club_id=eq.${resolvedClubId}` }, loadAll)
      .subscribe();
    const onRefresh = () => loadAll();
    window.addEventListener('flm:refresh-club-data', onRefresh);
    return () => { supabase.removeChannel(ch); window.removeEventListener('flm:refresh-club-data', onRefresh); };
  }, [resolvedClubId, userId, loadAll]);

  // ── Receitas agregadas ────────────────────────────────────────────────────
  const sponsorshipMonthly = useMemo(
    () => sponsorships.reduce((s, c) => s + (Number(c.contract_value_cents) / 100), 0),
    [sponsorships],
  );
  const membersMonthly = (membership?.monthly_revenue_cents ?? 0) / 100;
  const shopTotal = (shopStats?.total_revenue ?? 0) / 100;
  const shopDaily = (shopStats?.daily_revenue ?? 0) / 100;
  const marketingMonthly = useMemo(() => {
    const perDay = activeEffects
      .filter((e: any) => e.category === 'marketing')
      .reduce((s: number, e: any) => s + Number(e?.bonus_data?.dinheiroDia ?? e?.bonus_data?.daily_cash ?? 0), 0);
    return perDay * 30;
  }, [activeEffects]);

  const totalReceitas = sponsorshipMonthly + membersMonthly + marketingMonthly + shopDaily * 30;

  // ── Despesas (a partir de pedidos aprovados) ─────────────────────────────
  const approvedOrders = useMemo(() => orders.filter((o: any) => o.status === 'approved' || o.delivered), [orders]);
  const totalCompras = useMemo(
    () => approvedOrders.reduce((s: number, o: any) => s + Number(o.amount_cents || 0), 0) / 100,
    [approvedOrders],
  );

  // ── Linha do tempo unificada ─────────────────────────────────────────────
  const ledger = useMemo<LedgerEntry[]>(() => {
    const out: LedgerEntry[] = [];
    for (const o of orders) {
      const cat: any = o.shop_items?.category || (o.metadata as any)?.category || 'purchase';
      const knownCat = (CATEGORIES as any)[cat] ? cat : 'purchase';
      out.push({
        id: `order-${o.id}`,
        ts: o.created_at,
        kind: 'out',
        category: knownCat,
        label: o.shop_items?.name || (o.metadata as any)?.item_name || 'Compra',
        amount: Number(o.amount_cents || 0) / 100,
        source: o.status === 'approved' || o.delivered ? 'Aprovado' : (o.status || 'Pendente'),
      });
    }
    for (const s of sponsorships) {
      out.push({
        id: `spons-${s.id}`,
        ts: s.started_at || s.created_at,
        kind: 'in',
        category: 'sponsorship',
        label: s.sponsor_name,
        amount: Number(s.contract_value_cents) / 100,
        source: 'Contrato ativo',
      });
    }
    for (const e of activeEffects) {
      const cat = (e.category === 'marketing' ? 'marketing' : e.category === 'members' ? 'members' : 'other') as any;
      out.push({
        id: `eff-${e.id}`,
        ts: e.created_at || new Date().toISOString(),
        kind: 'in',
        category: cat,
        label: e?.bonus_data?.name || `${CATEGORIES[cat]?.label || 'Efeito'} ativo`,
        amount: Number(e?.bonus_data?.dinheiroSemanal ?? e?.bonus_data?.daily_cash ?? 0),
        source: 'Bônus ativo',
      });
    }
    return out.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 30);
  }, [orders, sponsorships, activeEffects]);

  // ── Série 7 dias (saídas reais via pedidos) ──────────────────────────────
  const last7 = useMemo(() => {
    const days: { date: string; label: string; entradas: number; saidas: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const sa = approvedOrders
        .filter((o: any) => { const t = new Date(o.created_at).getTime(); return t >= d.getTime() && t < next.getTime(); })
        .reduce((s: number, o: any) => s + Number(o.amount_cents || 0) / 100, 0);
      // entrada estimada/dia = (mensal/30)
      const en = (sponsorshipMonthly + membersMonthly + marketingMonthly) / 30 + shopDaily;
      days.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        entradas: Math.round(en),
        saidas: Math.round(sa),
      });
    }
    return days;
  }, [approvedOrders, sponsorshipMonthly, membersMonthly, marketingMonthly, shopDaily]);

  // ── Distribuição por categoria (pie) ─────────────────────────────────────
  const pieData = useMemo(() => ([
    { name: 'Patrocínios', value: Math.max(0, Math.round(sponsorshipMonthly)), color: CATEGORIES.sponsorship.dot },
    { name: 'Sócios',      value: Math.max(0, Math.round(membersMonthly)),     color: CATEGORIES.members.dot },
    { name: 'Marketing',   value: Math.max(0, Math.round(marketingMonthly)),   color: CATEGORIES.marketing.dot },
    { name: 'Loja',        value: Math.max(0, Math.round(shopDaily * 30)),     color: CATEGORIES.shop.dot },
  ].filter(d => d.value > 0)), [sponsorshipMonthly, membersMonthly, marketingMonthly, shopDaily]);

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header com saldo + ações */}
      <Card className="bg-gradient-to-br from-emerald-950/40 via-black/60 to-black border border-emerald-500/20 rounded-3xl overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-400/70">
                <Wallet className="h-4 w-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Saldo do Clube</p>
              </div>
              <p className={`mt-2 text-3xl sm:text-5xl font-black italic tracking-tighter ${budget >= 0 ? 'text-white' : 'text-red-400'}`}>
                R$ {budget.toLocaleString('pt-BR')}
              </p>
              <p className="text-[10px] text-white/40 font-medium mt-1">
                Atualizado em tempo real · {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatPill icon={<ArrowUpRight className="h-3.5 w-3.5" />} label="Receitas/mês" value={fmt(totalReceitas)} tone="emerald" />
              <StatPill icon={<ArrowDownRight className="h-3.5 w-3.5" />} label="Compras totais" value={fmt(totalCompras)} tone="rose" />
              <Button
                size="sm"
                variant="outline"
                onClick={loadAll}
                disabled={refreshing}
                className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl h-9 gap-1.5 text-[10px] font-black uppercase italic"
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} /> Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receitas */}
      <SectionTitle icon={<TrendingUp className="h-4 w-4 text-emerald-400" />} title="Receitas" subtitle="Tudo o que entra no caixa do clube" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <RevenueCard cat="sponsorship" amount={sponsorshipMonthly} suffix="/mês" hint={`${sponsorships.length} contrato(s) ativo(s)`} />
        <RevenueCard cat="members" amount={membersMonthly} suffix="/mês" hint={`${(membership?.total_members ?? 0).toLocaleString('pt-BR')} sócios`} />
        <RevenueCard cat="marketing" amount={marketingMonthly} suffix="/mês" hint={`${activeEffects.filter((e: any) => e.category === 'marketing').length} campanha(s)`} />
        <RevenueCard cat="shop" amount={shopDaily * 30} suffix="/mês" hint={`Total acumulado ${fmt(shopTotal)}`} />
      </div>

      {/* Despesas */}
      <SectionTitle icon={<TrendingDown className="h-4 w-4 text-rose-400" />} title="Despesas" subtitle="Compras e gastos registrados" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <ExpenseCard cat="purchase" amount={totalCompras} hint={`${approvedOrders.length} compra(s) aprovada(s)`} />
        <ExpenseCard cat="upgrades" amount={
          approvedOrders
            .filter((o: any) => ['infrastructure','stadium','staff'].includes(o.shop_items?.category))
            .reduce((s: number, o: any) => s + Number(o.amount_cents || 0)/100, 0)
        } hint="Estádio · CT · Equipe" />
        <ExpenseCard cat="other" amount={
          approvedOrders
            .filter((o: any) => !['infrastructure','stadium','staff'].includes(o.shop_items?.category))
            .reduce((s: number, o: any) => s + Number(o.amount_cents || 0)/100, 0)
        } hint="Demais saídas" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2 bg-black/40 border border-white/5 rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/5 px-4 py-3">
            <CardTitle className="text-xs font-black uppercase italic flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-400" /> Movimentação · últimos 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={last7} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"  stopColor="#10b981" stopOpacity={0.5}/>
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"  stopColor="#f43f5e" stopOpacity={0.45}/>
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: '#0A0D14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number, n: string) => [fmt(v), n === 'entradas' ? 'Entradas' : 'Saídas']}
                    labelFormatter={(l) => `Dia: ${l}`}
                  />
                  <Area type="monotone" dataKey="entradas" stroke="#10b981" fill="url(#gIn)" strokeWidth={2} />
                  <Area type="monotone" dataKey="saidas"   stroke="#f43f5e" fill="url(#gOut)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/5 px-4 py-3">
            <CardTitle className="text-xs font-black uppercase italic flex items-center gap-2">
              <PieChart className="h-4 w-4 text-emerald-400" /> Receitas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 h-56">
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[11px] text-white/40 italic">
                Nenhuma fonte de receita ativa.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RPieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={4}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="rgba(0,0,0,0.4)" />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0A0D14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} formatter={(v: number) => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </RPieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Produtos Ativos */}
      <SectionTitle icon={<Package className="h-4 w-4 text-emerald-400" />} title="Produtos Ativos" subtitle="Compras em vigor e seus benefícios" />
      <Card className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          {(() => {
            const items: Array<{
              id: string; name: string; category: keyof typeof CATEGORIES; startedAt: string; expiresAt: string | null;
              bonus: { cash?: number; daily?: number; weekly?: number; fans?: number; members?: number };
            }> = [];
            for (const s of sponsorships) {
              items.push({
                id: `s-${s.id}`,
                name: s.sponsor_name,
                category: 'sponsorship',
                startedAt: s.started_at || s.created_at,
                expiresAt: s.expires_at,
                bonus: {
                  weekly: Number(s.contract_value_cents || 0) / 100,
                  cash: Number(s.bonus_data?.immediate_cash || 0),
                  fans: Number(s.bonus_data?.immediate_fans || 0),
                },
              });
            }
            for (const e of activeEffects) {
              const cat = ((CATEGORIES as any)[e.category] ? e.category : 'other') as keyof typeof CATEGORIES;
              items.push({
                id: `e-${e.id}`,
                name: e?.bonus_data?.name || CATEGORIES[cat]?.label || e.category,
                category: cat,
                startedAt: e.started_at || e.created_at,
                expiresAt: e.expires_at,
                bonus: {
                  daily: Number(e?.bonus_data?.dinheiroDia || e?.bonus_data?.daily_cash || 0),
                  cash: Number(e?.bonus_data?.immediate_cash || 0),
                  fans: Number(e?.bonus_data?.immediate_fans || 0),
                  members: Number(e?.bonus_data?.initialMembers || e?.bonus_data?.immediate_members || 0),
                },
              });
            }
            if (items.length === 0) {
              return <div className="py-16 text-center text-[11px] text-white/40 italic">Nenhum produto ativo no momento.</div>;
            }
            return (
              <ul className="divide-y divide-white/5">
                {items.map((it) => {
                  const meta = CATEGORIES[it.category] || CATEGORIES.other;
                  const Icon = meta.icon;
                  const remainingMs = it.expiresAt ? new Date(it.expiresAt).getTime() - Date.now() : null;
                  const days = remainingMs != null ? Math.max(0, Math.floor(remainingMs / 86400000)) : null;
                  const hours = remainingMs != null ? Math.max(0, Math.floor((remainingMs % 86400000) / 3600000)) : null;
                  const expired = remainingMs != null && remainingMs <= 0;
                  return (
                    <li key={it.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition">
                      <div className={`p-2 rounded-xl ${meta.bg} border ${meta.border} shrink-0`}>
                        <Icon className={`h-4 w-4 ${meta.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <p className="text-xs font-black uppercase italic truncate">{it.name}</p>
                          <Badge className={`text-[8px] uppercase font-black tracking-widest border-none px-1.5 py-0 ${expired ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                            {expired ? <><Clock className="h-2.5 w-2.5 mr-1" />Expirado</> : <><CheckCircle2 className="h-2.5 w-2.5 mr-1" />Ativo</>}
                          </Badge>
                          <Badge className={`text-[8px] uppercase font-black tracking-widest border-none px-1.5 py-0 ${meta.bg} ${meta.color}`}>
                            {meta.label}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-white/60 font-medium">
                          {it.bonus.weekly ? <span className="text-emerald-300">💰 +{fmt(it.bonus.weekly)}/sem</span> : null}
                          {it.bonus.daily ? <span className="text-emerald-300">💰 +{fmt(it.bonus.daily)}/dia</span> : null}
                          {it.bonus.cash ? <span className="text-emerald-300">🎁 +{fmt(it.bonus.cash)} bônus</span> : null}
                          {it.bonus.fans ? <span className="text-pink-300">👥 +{it.bonus.fans.toLocaleString('pt-BR')} torcedores</span> : null}
                          {it.bonus.members ? <span className="text-amber-300">🤝 +{it.bonus.members.toLocaleString('pt-BR')} sócios</span> : null}
                        </div>
                        <p className="mt-1 text-[10px] text-white/40 font-medium">
                          <Sparkles className="h-2.5 w-2.5 inline mr-1" />
                          Desde {new Date(it.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          {it.expiresAt && (
                            <> · <Clock className="h-2.5 w-2.5 inline mx-1" />
                              {expired
                                ? 'encerrado'
                                : days != null && days > 0
                                  ? `termina em ${days}d ${hours}h`
                                  : `termina em ${hours}h`}
                              {' · '}
                              <span className="text-white/30">{new Date(it.expiresAt).toLocaleDateString('pt-BR')}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </CardContent>
      </Card>

      {/* Histórico unificado */}
      <Card className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/5 px-4 py-3">
          <CardTitle className="text-xs font-black uppercase italic flex items-center gap-2">
            <HistoryIcon className="h-4 w-4 text-emerald-400" /> Histórico financeiro
            <Badge className="ml-auto bg-emerald-500/15 text-emerald-300 border-none text-[9px] font-black uppercase tracking-widest">
              <Activity className="h-2.5 w-2.5 mr-1" /> ao vivo
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ledger.length === 0 ? (
            <div className="py-16 text-center text-[11px] text-white/40 italic">Nenhuma movimentação registrada ainda.</div>
          ) : (
            <ScrollArea className="h-[420px]">
              <ul className="divide-y divide-white/5">
                {ledger.map((e) => {
                  const meta = CATEGORIES[e.category] || CATEGORIES.other;
                  const Icon = meta.icon;
                  return (
                    <li key={e.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition">
                      <div className={`p-2 rounded-xl ${meta.bg} border ${meta.border}`}>
                        <Icon className={`h-4 w-4 ${meta.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black uppercase italic truncate">{e.label}</p>
                          <Badge className={`text-[8px] uppercase font-black tracking-widest border-none px-1.5 py-0 ${e.kind === 'in' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                            {e.kind === 'in' ? 'Entrada' : 'Saída'}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-white/40 font-medium">
                          <span className={meta.color}>{meta.label}</span> · {e.source} · {new Date(e.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <p className={`text-sm font-black tabular-nums ${e.kind === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {e.kind === 'in' ? '+' : '−'} {fmt(Math.abs(e.amount))}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {loading && (
        <p className="text-center text-[11px] text-white/40 italic">Carregando dados financeiros...</p>
      )}
    </div>
  );
}

// ── Sub-componentes ─────────────────────────────────────────────────────────
function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between mt-2">
      <div>
        <h3 className="text-sm font-black uppercase italic tracking-tight flex items-center gap-2">{icon} {title}</h3>
        {subtitle && <p className="text-[10px] text-white/40 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
}

function StatPill({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'emerald' | 'rose' }) {
  const c = tone === 'emerald' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300';
  return (
    <div className={`flex items-center gap-2 px-3 h-9 rounded-xl border ${c}`}>
      {icon}
      <div className="text-left leading-tight">
        <p className="text-[8px] font-black uppercase tracking-widest opacity-80">{label}</p>
        <p className="text-[11px] font-black italic">{value}</p>
      </div>
    </div>
  );
}

function RevenueCard({ cat, amount, suffix, hint }: { cat: keyof typeof CATEGORIES; amount: number; suffix?: string; hint?: string }) {
  const meta = CATEGORIES[cat];
  const Icon = meta.icon;
  return (
    <Card className={`${meta.bg} border ${meta.border} rounded-2xl`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-black/30"><Icon className={`h-3.5 w-3.5 ${meta.color}`} /></div>
          <p className={`text-[10px] font-black uppercase italic tracking-wider ${meta.color}`}>{meta.label}</p>
        </div>
        <p className="text-lg sm:text-xl font-black italic text-white">
          R$ {amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          {suffix && <span className="text-[10px] text-white/40 font-bold ml-1">{suffix}</span>}
        </p>
        {hint && <p className="text-[9px] text-white/40 font-medium mt-1 truncate">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ExpenseCard({ cat, amount, hint }: { cat: keyof typeof CATEGORIES; amount: number; hint?: string }) {
  const meta = CATEGORIES[cat];
  const Icon = meta.icon;
  return (
    <Card className={`${meta.bg} border ${meta.border} rounded-2xl`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-black/30"><Icon className={`h-3.5 w-3.5 ${meta.color}`} /></div>
          <p className={`text-[10px] font-black uppercase italic tracking-wider ${meta.color}`}>{meta.label}</p>
        </div>
        <p className="text-lg sm:text-xl font-black italic text-white">R$ {amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
        {hint && <p className="text-[9px] text-white/40 font-medium mt-1 truncate">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default PainelFLM;
