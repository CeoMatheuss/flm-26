import { FinanceEntry } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, DollarSign, Users, Landmark, GraduationCap, Eye, Handshake, Ticket, Trophy, Wallet, Building2, Info } from 'lucide-react';
import { Infrastructure, getStadiumCapacity } from '@/types/infrastructure';
import { Sponsor, sponsorTypeLabels } from '@/types/sponsor';
import { Player, Scout } from '@/types/game';
import { useState, useMemo } from 'react';
import { formatMoney, formatMoneyFull } from '@/lib/formatMoney';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BudgetBreakdown } from './BudgetBreakdown';
import { calculateStadiumEconomy, safeNumber } from '@/match/stadiumEconomyEngine';


interface Props {
  budget: number;
  finances: FinanceEntry[];
  totalSalaries: number;
  players: Player[];
  scouts: Scout[];
  sponsors: Sponsor[];
  infrastructure: Infrastructure;
  fans: number;
  ticketPrice: number;
  youthInvestment: number;
}

type FilterType = 'all' | 'receita' | 'despesa';

export function FinanceTab({ budget, finances, totalSalaries, players, scouts, sponsors, infrastructure, fans, ticketPrice, youthInvestment }: Props) {
  const [filter, setFilter] = useState<FilterType>('all');

  const totalReceitas = finances.filter(f => f.type === 'receita').reduce((s, f) => s + f.amount, 0);
  const totalDespesas = finances.filter(f => f.type === 'despesa').reduce((s, f) => s + f.amount, 0);
  const saldo = totalReceitas - totalDespesas;

  // Centralized Stadium Economy Engine for revenue projection
  const stadiumEconomy = useMemo(() => {
    return calculateStadiumEconomy({
      fans: safeNumber(fans),
      reputation: safeNumber(infrastructure.trainingCenter.level * 4 + 40), // Heuristic
      ticketPrice: safeNumber(ticketPrice),
      winStreak: 0, // Dashboard projection is average
      loseStreak: 0,
      importance: 'liga',
      stadiumCapacity: getStadiumCapacity(infrastructure.stadium.level),
      stadiumLevel: infrastructure.stadium.level,
      vipUnits: Object.values((infrastructure as any).vipBoxesBuilt || {}).reduce((a: any, b: any) => a + (b || 0), 0) as number
    });
  }, [fans, infrastructure, ticketPrice]);

  const estimatedMatchRevenue = stadiumEconomy.revenue.total;
  const sponsorMonthly = sponsors.reduce((s, sp) => s + sp.monthlyPay, 0);


  // Group finances by category
  const categoryTotals = finances.reduce((acc, f) => {
    const key = `${f.type}:${f.category}`;
    acc[key] = (acc[key] || 0) + f.amount;
    return acc;
  }, {} as Record<string, number>);

  const receitaCategories = Object.entries(categoryTotals)
    .filter(([k]) => k.startsWith('receita:'))
    .map(([k, v]) => ({ category: k.split(':')[1], amount: v }))
    .sort((a, b) => b.amount - a.amount);

  const despesaCategories = Object.entries(categoryTotals)
    .filter(([k]) => k.startsWith('despesa:'))
    .map(([k, v]) => ({ category: k.split(':')[1], amount: v }))
    .sort((a, b) => b.amount - a.amount);

  const filteredFinances = finances.filter(f => filter === 'all' || f.type === filter);

  const balancoMensal = sponsorMonthly - totalSalaries - scoutSalaries;

  return (
    <TooltipProvider delayDuration={150}>
    <div className="space-y-4">
      {/* Verbas 40/40/20 — trava rígida do orçamento */}
      <BudgetBreakdown budget={budget} totalSalaries={totalSalaries} variant="full" />

      {/* Como funciona — Guia rápido */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Como funciona:</span>{' '}
            Você ganha dinheiro com <span className="text-emerald-400 font-medium">patrocínios</span>, <span className="text-emerald-400 font-medium">ingressos</span> e <span className="text-emerald-400 font-medium">premiações</span>. Você gasta com <span className="text-red-400 font-medium">salários</span>, <span className="text-red-400 font-medium">olheiros</span> e <span className="text-red-400 font-medium">categoria de base</span>. Mantenha o balanço positivo para investir em estádio e jogadores!
            <span className="block mt-1 text-[10px]">💡 Passe o mouse sobre os valores para ver o número exato em reais.</span>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <CardContent className="p-3 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase">Saldo do Clube</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-lg font-bold cursor-help truncate">{formatMoney(budget)}</p>
                </TooltipTrigger>
                <TooltipContent>{formatMoneyFull(budget)}</TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardContent className="p-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase">Receitas (total)</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-lg font-bold text-emerald-400 cursor-help truncate">{formatMoney(totalReceitas)}</p>
                </TooltipTrigger>
                <TooltipContent>{formatMoneyFull(totalReceitas)}</TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
          <CardContent className="p-3 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase">Despesas (total)</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-lg font-bold text-red-400 cursor-help truncate">{formatMoney(totalDespesas)}</p>
                </TooltipTrigger>
                <TooltipContent>{formatMoneyFull(totalDespesas)}</TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-br ${saldo >= 0 ? 'from-emerald-500/10 border-emerald-500/20' : 'from-red-500/10 border-red-500/20'} to-transparent`}>
          <CardContent className="p-3 flex items-center gap-2">
            <DollarSign className={`h-5 w-5 shrink-0 ${saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase">Balanço</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className={`text-lg font-bold cursor-help truncate ${saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {saldo >= 0 ? '+' : ''}{formatMoney(saldo)}
                  </p>
                </TooltipTrigger>
                <TooltipContent>{formatMoneyFull(saldo)}</TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Costs Panel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Custos Mensais Atuais
          </CardTitle>
          <p className="text-xs text-muted-foreground">Quanto sai e entra do seu caixa todo mês.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <CostRow icon={<Users className="h-4 w-4 text-blue-400" />} label="Folha Salarial (Jogadores)" value={totalSalaries} detail={`${players.length} jogadores no elenco`} />
            <CostRow icon={<Eye className="h-4 w-4 text-amber-400" />} label="Salários Olheiros" value={scoutSalaries} detail={`${scouts.length} olheiro(s) contratado(s)`} />
            <CostRow icon={<GraduationCap className="h-4 w-4 text-purple-400" />} label="Investimento na Base" value={youthInvestment} detail={`Pago a cada 4 jogos`} />
            <CostRow icon={<Handshake className="h-4 w-4 text-emerald-400" />} label="Receita de Patrocínios" value={sponsorMonthly} detail={`${sponsors.length}/3 contratos ativos`} isRevenue />
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-medium text-muted-foreground">Balanço mensal estimado</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`text-sm font-bold cursor-help ${balancoMensal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {balancoMensal >= 0 ? '+' : ''}{formatMoney(balancoMensal)} / mês
                </span>
              </TooltipTrigger>
              <TooltipContent>{formatMoneyFull(balancoMensal)} por mês</TooltipContent>
            </Tooltip>
          </div>
          {balancoMensal < 0 && (
            <p className="text-[10px] text-red-400 px-1">⚠️ Seus gastos mensais estão maiores que suas receitas. Considere conseguir mais patrocinadores ou vender jogadores.</p>
          )}
        </CardContent>
      </Card>

      {/* Revenue Projection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Projeções por Partida
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <CostRow icon={<Landmark className="h-4 w-4 text-primary" />} label="Receita Ingressos" value={estimatedMatchRevenue} detail={`${estimatedAttendance.toLocaleString()} pagantes × R$${ticketPrice}`} isRevenue />
            <CostRow icon={<Trophy className="h-4 w-4 text-amber-400" />} label="Prêmio Vitória" value={150000 + infrastructure.stadium.level * 20000} detail="Base + bônus estádio" isRevenue />
            <CostRow icon={<Trophy className="h-4 w-4 text-muted-foreground" />} label="Prêmio Empate" value={75000 + infrastructure.stadium.level * 20000} detail="Base + bônus estádio" isRevenue />
            <CostRow icon={<Trophy className="h-4 w-4 text-red-400" />} label="Prêmio Derrota" value={30000 + infrastructure.stadium.level * 20000} detail="Base + bônus estádio" isRevenue />
          </div>
        </CardContent>
      </Card>

      {/* Sponsors Detail */}
      {sponsors.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2"><Handshake className="h-5 w-5" /> Patrocinadores Ativos</span>
              <span className="text-sm font-normal text-muted-foreground">{formatMoney(sponsorMonthly)}/mês</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {sponsors.map(sp => (
                <div key={sp.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                  <Badge variant="secondary" className="text-[10px]">{sponsorTypeLabels[sp.type]}</Badge>
                  <span className="text-sm flex-1">{sp.name}</span>
                  <span className="text-xs text-muted-foreground">{sp.duration}T</span>
                  <span className="text-sm font-bold text-primary">{formatMoney(sp.monthlyPay)}/mês</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {receitaCategories.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" /> Receitas por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {receitaCategories.map(c => (
                <div key={c.category} className="flex justify-between items-center p-1.5 rounded bg-emerald-500/5">
                  <span className="text-sm">{c.category}</span>
                  <span className="text-sm font-bold text-emerald-400">{formatMoney(c.amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {despesaCategories.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-400" /> Despesas por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {despesaCategories.map(c => (
                <div key={c.category} className="flex justify-between items-center p-1.5 rounded bg-red-500/5">
                  <span className="text-sm">{c.category}</span>
                  <span className="text-sm font-bold text-red-400">{formatMoney(c.amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            Histórico de Transações
            <div className="flex gap-1">
              {(['all', 'receita', 'despesa'] as FilterType[]).map(f => (
                <Badge
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  className="text-[10px] cursor-pointer"
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'Tudo' : f === 'receita' ? 'Receitas' : 'Despesas'}
                </Badge>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFinances.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma transação ainda</p>
          ) : (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {filteredFinances.slice().reverse().map(entry => (
                <div key={entry.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <Badge variant={entry.type === 'receita' ? 'default' : 'destructive'} className="text-[10px] w-6 h-6 flex items-center justify-center p-0">
                    {entry.type === 'receita' ? '+' : '-'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.description}</p>
                    <p className="text-[10px] text-muted-foreground">{entry.category} • {entry.date}</p>
                  </div>
                  <p className={`text-sm font-bold shrink-0 ${entry.type === 'receita' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatMoney(entry.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}

function CostRow({ icon, label, value, detail, isRevenue }: { icon: React.ReactNode; label: string; value: number; detail?: string; isRevenue?: boolean }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg" title={formatMoneyFull(value)}>
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{label}</p>
        {detail && <p className="text-[9px] text-muted-foreground">{detail}</p>}
      </div>
      <p className={`text-sm font-bold shrink-0 ${isRevenue ? 'text-emerald-400' : 'text-red-400'}`}>
        {formatMoney(value)}
      </p>
    </div>
  );
}
