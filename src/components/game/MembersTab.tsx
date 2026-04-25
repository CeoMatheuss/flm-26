/**
 * MembersTab — Sistema de Sócios Torcedores
 * Design: dark com detalhes em dourado, premium mobile-style.
 * Planos totalmente personalizáveis (nome, preço, benefícios).
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Crown, Users, TrendingUp, Star, DollarSign, Pencil, Sparkles, Heart, Trophy, Gem, Award, Medal } from 'lucide-react';
import { formatMoney } from '@/lib/formatMoney';
import { toast } from 'sonner';

interface MemberPlan {
  id: string;
  name: string;
  tier: 'bronze' | 'prata' | 'ouro' | 'diamante';
  monthlyPrice: number;
  benefits: string[];
  subscribers: number;
}

interface Props {
  totalFans: number;
  reputation: number;
  /** Estatísticas da temporada — alimentam o crescimento/perda dinâmica de sócios. */
  wins?: number;
  draws?: number;
  losses?: number;
}

const tierConfig: Record<MemberPlan['tier'], { icon: typeof Medal; color: string; gradient: string; ring: string }> = {
  bronze: { icon: Medal, color: 'text-amber-700', gradient: 'from-amber-700/20 to-amber-900/10', ring: 'border-amber-700/30' },
  prata: { icon: Award, color: 'text-slate-300', gradient: 'from-slate-400/20 to-slate-600/10', ring: 'border-slate-400/30' },
  ouro: { icon: Trophy, color: 'text-yellow-400', gradient: 'from-yellow-500/20 to-amber-600/10', ring: 'border-yellow-500/40' },
  diamante: { icon: Gem, color: 'text-cyan-300', gradient: 'from-cyan-400/20 to-blue-600/10', ring: 'border-cyan-400/40' },
};

const defaultPlans: MemberPlan[] = [
  { id: '1', name: 'Sócio Bronze', tier: 'bronze', monthlyPrice: 25, benefits: ['Desconto 10% em ingressos', 'Newsletter exclusiva'], subscribers: 0 },
  { id: '2', name: 'Sócio Prata', tier: 'prata', monthlyPrice: 60, benefits: ['Desconto 20% em ingressos', 'Acesso a eventos', 'Brinde mensal'], subscribers: 0 },
  { id: '3', name: 'Sócio Ouro', tier: 'ouro', monthlyPrice: 120, benefits: ['Ingresso grátis em jogos selecionados', 'Cadeira reservada', 'Meet & Greet anual'], subscribers: 0 },
  { id: '4', name: 'Sócio Diamante', tier: 'diamante', monthlyPrice: 250, benefits: ['Camarote VIP', 'Acesso ao vestiário', 'Camisa autografada', 'Viagens com o time'], subscribers: 0 },
];

const muralNames = [
  'Carlos M.', 'Ana Paula', 'João V.', 'Marina S.', 'Roberto F.',
  'Patrícia L.', 'Lucas T.', 'Fernanda R.', 'Eduardo K.', 'Beatriz N.',
  'Rafael O.', 'Camila Z.', 'Bruno P.', 'Larissa H.', 'Diego A.',
];

export function MembersTab({ totalFans, reputation, wins = 0, draws = 0, losses = 0 }: Props) {
  const [plans, setPlans] = useState<MemberPlan[]>(() => {
    // Taxa base ainda muito conservadora — sócios são uma parcela difícil de conquistar.
    // Reputação dá um piso; desempenho recente é o que faz crescer ou cair.
    const totalGames = wins + draws + losses;
    const winRate = totalGames > 0 ? wins / totalGames : 0.4;
    const lossRate = totalGames > 0 ? losses / totalGames : 0.4;
    // Performance modifier: -40% (muitas derrotas) até +60% (muitas vitórias)
    const perfMod = 1 + (winRate - 0.5) * 1.2 - lossRate * 0.4;
    // Conversão base: 1.5% a 5.5% dos fãs viram sócios — bem mais difícil que antes.
    const baseRate = Math.min(0.055, 0.015 + reputation / 2500) * Math.max(0.5, perfMod);
    return defaultPlans.map((p, i) => ({
      ...p,
      // Distribuição natural: muitos bronze, poucos diamante
      subscribers: Math.max(0, Math.floor(totalFans * baseRate * (i === 0 ? 0.55 : i === 1 ? 0.27 : i === 2 ? 0.13 : 0.05))),
    }));
  });
  const [editingPlan, setEditingPlan] = useState<MemberPlan | null>(null);

  const totalSubscribers = useMemo(() => plans.reduce((s, p) => s + p.subscribers, 0), [plans]);
  const weeklyRevenue = useMemo(() => Math.floor(plans.reduce((s, p) => s + p.subscribers * p.monthlyPrice, 0) / 4), [plans]);
  const monthlyRevenue = weeklyRevenue * 4;

  // Engagement Level: 1-50, baseado em receita + número de sócios
  const engagementLevel = Math.min(50, Math.floor(1 + Math.log10(Math.max(1, monthlyRevenue)) * 4 + totalSubscribers / 100));
  const nextLevelProgress = Math.min(100, ((monthlyRevenue % 10000) / 10000) * 100);

  // Crescimento/queda baseado em desempenho (V/D dominam o sentimento da torcida)
  const totalGames = wins + draws + losses;
  const recentGrowth = useMemo(() => {
    if (totalGames === 0) return Math.max(1, Math.floor(totalSubscribers * 0.02));
    const winRate = wins / totalGames;
    const lossRate = losses / totalGames;
    const swing = (winRate - lossRate); // -1..+1
    // ±5% dos sócios por semana, dependendo do desempenho
    const delta = Math.round(totalSubscribers * 0.05 * swing);
    return delta;
  }, [totalSubscribers, wins, draws, losses, totalGames]);

  const savePlan = (updated: MemberPlan) => {
    setPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
    setEditingPlan(null);
    toast.success(`Plano "${updated.name}" atualizado!`);
  };

  return (
    <div className="space-y-3 pb-4">
      {/* HEADER */}
      <div className="text-center space-y-1.5 py-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30">
          <Crown className="h-3.5 w-3.5 text-yellow-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400">FLM 26</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-b from-yellow-300 to-yellow-600 bg-clip-text text-transparent">
          Sócios Torcedores
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground italic max-w-md mx-auto px-2">
          Mais torcedores. Mais receita. Mais força para o seu clube.
        </p>
      </div>

      {/* O QUE É */}
      <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 via-card to-card">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-yellow-400 mb-1">O que é o Sistema de Sócios?</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                Sócios são fãs que pagam mensalmente para apoiar o clube. Eles geram receita recorrente, aumentam o engajamento da torcida e desbloqueiam bônus exclusivos para o seu time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BENEFÍCIOS */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Star className="h-4 w-4 text-yellow-400" /> Benefícios para o Clube
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: '💰', label: 'Receita Semanal', desc: 'Entrada fixa garantida' },
              { icon: '📣', label: 'Apoio da Torcida', desc: '+15% moral nos jogos' },
              { icon: '🚀', label: 'Evolução do Clube', desc: 'Mais infra, mais força' },
              { icon: '🤝', label: 'Bônus Patrocínios', desc: 'Atrai marcas maiores' },
            ].map(b => (
              <div key={b.label} className="bg-muted/20 border border-border/30 rounded-lg p-2 flex items-start gap-2">
                <span className="text-lg shrink-0">{b.icon}</span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold leading-tight">{b.label}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* PLANOS */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-sm font-black text-yellow-400 flex items-center gap-1.5">
            <Crown className="h-4 w-4" /> Planos de Sócios
          </p>
          <Badge variant="outline" className="text-[9px] border-yellow-500/30 text-yellow-400 h-5">100% Personalizável</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {plans.map(plan => {
            const cfg = tierConfig[plan.tier];
            const Icon = cfg.icon;
            return (
              <Card key={plan.id} className={`overflow-hidden border-2 ${cfg.ring} bg-gradient-to-br ${cfg.gradient} relative`}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                      <p className={`text-sm font-black ${cfg.color}`}>{plan.name}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5">{plan.subscribers} sócios</Badge>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-black ${cfg.color}`}>R$ {plan.monthlyPrice}</span>
                    <span className="text-[10px] text-muted-foreground">/mês</span>
                  </div>
                  <ul className="space-y-0.5">
                    {plan.benefits.map((b, i) => (
                      <li key={i} className="text-[10px] text-foreground/85 flex items-start gap-1">
                        <span className={cfg.color}>✓</span>
                        <span className="leading-tight">{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-full h-7 text-[10px] gap-1 border-current/30 ${cfg.color} hover:bg-current/10`}
                    onClick={() => setEditingPlan(plan)}
                  >
                    <Pencil className="h-3 w-3" /> Editar plano
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ENGAJAMENTO + RECEITA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Engajamento */}
        <Card className="border-yellow-500/20">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Engajamento</p>
              <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30 h-5">Lv. {engagementLevel}</Badge>
            </div>
            <Progress value={nextLevelProgress} className="h-2" />
            <p className="text-[10px] text-muted-foreground">
              Próximo bônus: <span className="text-yellow-400 font-bold">+5% receita</span> em Lv. {engagementLevel + 1}
            </p>
          </CardContent>
        </Card>

        {/* Receita */}
        <Card className="border-emerald-500/20">
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Receita Semanal</p>
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <p className="text-xl font-black text-emerald-400">{formatMoney(weeklyRevenue)}</p>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground"><Users className="h-3 w-3 inline" /> {totalSubscribers} sócios</span>
              <span className="text-emerald-400 font-bold flex items-center gap-0.5"><TrendingUp className="h-3 w-3" /> +{recentGrowth}/sem</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PERSONALIZAÇÃO */}
      <Card className="border-yellow-500/20 bg-gradient-to-br from-card to-yellow-500/5">
        <CardContent className="p-3 flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
            <Pencil className="h-3.5 w-3.5 text-yellow-400" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-yellow-400 mb-1">Personalização Total</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Você pode <span className="text-foreground font-bold">criar planos</span>, <span className="text-foreground font-bold">alterar preços</span> e <span className="text-foreground font-bold">definir benefícios</span> a qualquer momento. Adapte cada plano à sua estratégia.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* MURAL DE SÓCIOS */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-red-400" /> Mural de Sócios
            <Badge variant="outline" className="ml-auto text-[9px] h-4">Recentes</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {muralNames.slice(0, 15).map((name, i) => {
              const tierKeys: MemberPlan['tier'][] = ['bronze', 'prata', 'ouro', 'diamante'];
              const tier = tierKeys[i % 4];
              const cfg = tierConfig[tier];
              return (
                <div key={i} className={`bg-muted/20 border ${cfg.ring} rounded-lg p-1.5 text-center`}>
                  <div className={`w-7 h-7 mx-auto rounded-full bg-gradient-to-br ${cfg.gradient} border ${cfg.ring} flex items-center justify-center mb-1`}>
                    <span className={`text-[10px] font-black ${cfg.color}`}>{name.charAt(0)}</span>
                  </div>
                  <p className="text-[9px] font-medium truncate">{name}</p>
                  <p className={`text-[8px] ${cfg.color} uppercase`}>{tier}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* MODAL EDITAR PLANO */}
      <EditPlanDialog plan={editingPlan} onClose={() => setEditingPlan(null)} onSave={savePlan} />
    </div>
  );
}

function EditPlanDialog({ plan, onClose, onSave }: { plan: MemberPlan | null; onClose: () => void; onSave: (p: MemberPlan) => void }) {
  const [name, setName] = useState(plan?.name || '');
  const [price, setPrice] = useState(plan?.monthlyPrice.toString() || '0');
  const [benefits, setBenefits] = useState(plan?.benefits.join('\n') || '');

  // Sync when plan changes
  useMemo(() => {
    if (plan) {
      setName(plan.name);
      setPrice(plan.monthlyPrice.toString());
      setBenefits(plan.benefits.join('\n'));
    }
  }, [plan]);

  if (!plan) return null;

  const handleSave = () => {
    const priceNum = parseInt(price);
    if (!name.trim()) { toast.error('Nome obrigatório'); return; }
    if (isNaN(priceNum) || priceNum < 5) { toast.error('Preço mínimo R$ 5'); return; }
    const benefitList = benefits.split('\n').map(b => b.trim()).filter(Boolean);
    if (benefitList.length === 0) { toast.error('Adicione ao menos 1 benefício'); return; }
    onSave({ ...plan, name: name.trim(), monthlyPrice: priceNum, benefits: benefitList });
  };

  const cfg = tierConfig[plan.tier];

  return (
    <Dialog open={!!plan} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${cfg.color}`}>
            <Pencil className="h-4 w-4" /> Editar {plan.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Nome do plano</label>
            <Input value={name} onChange={e => setName(e.target.value)} maxLength={30} className="h-9" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Preço mensal (R$)</label>
            <Input type="number" min={5} value={price} onChange={e => setPrice(e.target.value)} className="h-9" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Benefícios (um por linha)</label>
            <Textarea
              value={benefits}
              onChange={e => setBenefits(e.target.value)}
              rows={5}
              className="text-xs resize-none"
              placeholder="Desconto 20% em ingressos&#10;Brinde mensal&#10;Acesso a eventos"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleSave} className={`flex-1 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-bold`}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
