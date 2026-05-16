import { FinanceEntry, FinanceType, FinanceCategory } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Landmark, 
  GraduationCap, Eye, Handshake, Ticket, Trophy, Wallet, 
  Building2, Info, PieChart, Activity, AlertCircle, History
} from 'lucide-react';
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

type FilterType = 'all' | 'receita' | 'despesa' | 'investimento' | 'premiação';

export function FinanceTab({ budget, finances, totalSalaries, players, scouts, sponsors, infrastructure, fans, ticketPrice, youthInvestment }: Props) {
  const [filter, setFilter] = useState<FilterType>('all');

  const financialStats = useMemo(() => {
    const totalReceitas = finances.filter(f => f.type === 'receita' || f.type === 'premiação').reduce((s, f) => s + f.amount, 0);
    const totalDespesas = finances.filter(f => f.type === 'despesa' || f.type === 'investimento').reduce((s, f) => s + f.amount, 0);
    
    // Group by category
    const categoryTotals = finances.reduce((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + (f.type === 'receita' || f.type === 'premiação' ? f.amount : -f.amount);
      return acc;
    }, {} as Record<string, number>);

    return { totalReceitas, totalDespesas, saldo: totalReceitas - totalDespesas, categoryTotals };
  }, [finances]);

  const { totalReceitas, totalDespesas, saldo, categoryTotals } = financialStats;

  // Costs breakdown
  const scoutSalaries = scouts.reduce((s, sc) => s + sc.salary, 0);
  const infrastructureMaintenance = infrastructure.stadium.level * 15000 + infrastructure.trainingCenter.level * 10000;

  // Stadium Economy
  const stadiumEconomy = useMemo(() => {
    return calculateStadiumEconomy({
      fans: safeNumber(fans),
      reputation: safeNumber(infrastructure.trainingCenter.level * 4 + 40),
      ticketPrice: safeNumber(ticketPrice),
      winStreak: 0,
      loseStreak: 0,
      importance: 'liga',
      stadiumCapacity: getStadiumCapacity(infrastructure.stadium.level),
      stadiumLevel: infrastructure.stadium.level,
      vipUnits: Object.values((infrastructure as any).vipBoxesBuilt || {}).reduce((a: any, b: any) => a + (b || 0), 0) as number
    });
  }, [fans, infrastructure, ticketPrice]);

  const estimatedMatchRevenue = stadiumEconomy.revenue.total;
  const estimatedAttendance = stadiumEconomy.expectedAttendance;
  const sponsorMonthly = sponsors.reduce((s, sp) => s + sp.monthlyPay, 0);

  const filteredFinances = finances.filter(f => filter === 'all' || f.type === filter);
  const balancoMensal = sponsorMonthly - totalSalaries - scoutSalaries - infrastructureMaintenance;

  const getEntryColor = (type: FinanceType) => {
    switch (type) {
      case 'receita': return 'text-emerald-400';
      case 'premiação': return 'text-amber-400';
      case 'despesa': return 'text-red-400';
      case 'investimento': return 'text-blue-400';
      default: return 'text-foreground';
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-background border-emerald-500/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Caixa do Clube</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h2 className="text-2xl font-black cursor-help">{formatMoney(budget)}</h2>
                  </TooltipTrigger>
                  <TooltipContent>{formatMoneyFull(budget)}</TooltipContent>
                </Tooltip>
              </div>
              <Wallet className="h-8 w-8 text-emerald-500 opacity-50" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-background border-blue-500/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Lucro Líquido (30d)</p>
                <h2 className={`text-2xl font-black ${saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {saldo >= 0 ? '+' : ''}{formatMoney(saldo)}
                </h2>
              </div>
              <Activity className="h-8 w-8 text-blue-500 opacity-50" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-background border-purple-500/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Despesa Mensal</p>
                <h2 className="text-2xl font-black text-red-400">
                  -{formatMoney(totalSalaries + scoutSalaries + infrastructureMaintenance)}
                </h2>
              </div>
              <TrendingDown className="h-8 w-8 text-purple-500 opacity-50" />
            </CardContent>
          </Card>
        </div>

        {/* Budgets Breakdown */}
        <BudgetBreakdown budget={budget} totalSalaries={totalSalaries} variant="full" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Financial Report */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Relatório de Operações
              </CardTitle>
              {balancoMensal < 0 && (
                <Badge variant="destructive" className="animate-pulse gap-1">
                  <AlertCircle className="h-3 w-3" /> Déficit
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase">Receitas Automáticas</h4>
                  <div className="space-y-2">
                    <CostRow icon={<Handshake className="h-4 w-4 text-emerald-400" />} label="Patrocínios" value={sponsorMonthly} detail="Contratos mensais" isRevenue />
                    <CostRow icon={<Users className="h-4 w-4 text-emerald-400" />} label="Sócios Torcedores" value={categoryTotals['Sócios'] || 0} detail="Mensalidades" isRevenue />
                    <CostRow icon={<Ticket className="h-4 w-4 text-emerald-400" />} label="Renda Média Jogo" value={estimatedMatchRevenue} detail="Bilheteria + VIP" isRevenue />
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase">Despesas Automáticas</h4>
                  <div className="space-y-2">
                    <CostRow icon={<Users className="h-4 w-4 text-red-400" />} label="Folha Salarial" value={totalSalaries} detail="Jogadores" />
                    <CostRow icon={<Eye className="h-4 w-4 text-red-400" />} label="Staff e Olheiros" value={scoutSalaries} detail="Comissão técnica" />
                    <CostRow icon={<Building2 className="h-4 w-4 text-red-400" />} label="Manutenção CT/Estádio" value={infrastructureMaintenance} detail="Contas fixas" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${balancoMensal >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Fluxo de Caixa Mensal</p>
                    <p className={`text-xl font-black ${balancoMensal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {balancoMensal >= 0 ? '+' : ''}{formatMoney(balancoMensal)} <span className="text-xs font-normal">/mês</span>
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-end sm:items-center">
                  <p className="text-[10px] text-muted-foreground leading-tight max-w-[200px]">
                    {balancoMensal >= 0 
                      ? "Operação saudável. O clube gera lucro mensal e pode reinvestir." 
                      : "Operação deficitária. O clube queima caixa mensalmente. Risco de crise financeira!"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions / Summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Projeção Premiações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Vitória</span>
                  <span className="font-bold text-emerald-400">+{formatMoney(150000)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Empate</span>
                  <span className="font-bold text-amber-400">+{formatMoney(75000)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Campeão</span>
                  <span className="font-bold text-emerald-500">+{formatMoney(2000000)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <Info className="h-8 w-8 text-primary opacity-50" />
                <h4 className="text-sm font-bold">Conselho Financeiro</h4>
                <p className="text-xs text-muted-foreground">
                  Mantenha sempre uma reserva de emergência equivalente a 3 meses de folha salarial ({formatMoney(totalSalaries * 3)}).
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Fluxo de Caixa Detalhado
            </CardTitle>
            <div className="flex gap-1 overflow-x-auto pb-1 max-w-[200px] sm:max-w-none">
              {(['all', 'receita', 'despesa', 'premiação', 'investimento'] as FilterType[]).map(f => (
                <Badge
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  className="text-[9px] cursor-pointer whitespace-nowrap capitalize"
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'Tudo' : f === 'premiação' ? 'Prêmios' : f === 'investimento' ? 'Aporte' : f + 's'}
                </Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {filteredFinances.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <History className="h-12 w-12 text-muted-foreground/20 mx-auto" />
                <p className="text-sm text-muted-foreground">Nenhuma transação registrada nesta categoria.</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredFinances.map(entry => (
                  <div key={entry.id} className="group flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-all">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 
                      ${entry.type === 'receita' || entry.type === 'premiação' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {entry.type === 'receita' || entry.type === 'premiação' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold truncate">{entry.description}</p>
                        <Badge variant="outline" className="text-[9px] h-4 px-1 leading-none uppercase tracking-tighter opacity-70">
                          {entry.category}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{entry.date}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-black ${getEntryColor(entry.type)}`}>
                        {entry.type === 'receita' || entry.type === 'premiação' ? '+' : '-'}{formatMoney(entry.amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground/50 italic">{entry.type}</p>
                    </div>
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
    <div className="flex items-center gap-3 p-2.5 bg-muted/20 rounded-xl border border-transparent hover:border-primary/10 transition-colors" title={formatMoneyFull(value)}>
      <div className="p-2 bg-background rounded-lg shadow-sm">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate">{label}</p>
        {detail && <p className="text-[10px] text-muted-foreground leading-tight">{detail}</p>}
      </div>
      <p className={`text-sm font-black shrink-0 ${isRevenue ? 'text-emerald-400' : 'text-red-400'}`}>
        {isRevenue ? '+' : '-'}{formatMoney(value)}
      </p>
    </div>
  );
}

