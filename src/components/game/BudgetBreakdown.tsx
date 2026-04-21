import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Wallet, ShoppingCart, Users, Building2, Info } from 'lucide-react';
import { formatMoney, formatMoneyFull } from '@/lib/formatMoney';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  budget: number;
  totalSalaries: number;
  variant?: 'full' | 'compact';
}

/** Calcula breakdown 40/40/20 */
export function calcBudgetBreakdown(budget: number, totalSalaries: number) {
  const transferBudget = Math.floor(budget * 0.4);
  const salaryBudget = Math.floor(budget * 0.4);
  const reservaBudget = Math.floor(budget * 0.2);
  const annualSalaries = totalSalaries * 12;
  const salaryUsed = Math.min(salaryBudget, annualSalaries);
  const salaryBudgetRemaining = Math.max(0, salaryBudget - annualSalaries);
  const salaryUsedPercent = salaryBudget > 0 ? (annualSalaries / salaryBudget) * 100 : 0;
  return {
    transferBudget,
    salaryBudget,
    reservaBudget,
    annualSalaries,
    salaryUsed,
    salaryBudgetRemaining,
    salaryUsedPercent,
  };
}

function getBarColor(percent: number) {
  if (percent >= 90) return 'bg-destructive';
  if (percent >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export function BudgetBreakdown({ budget, totalSalaries, variant = 'full' }: Props) {
  const b = calcBudgetBreakdown(budget, totalSalaries);

  if (variant === 'compact') {
    return (
      <TooltipProvider delayDuration={150}>
        <div className="rounded-xl border border-border/20 bg-card/60 p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> Verba Transferências</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-bold text-emerald-400 cursor-help">{formatMoney(b.transferBudget)}</span>
              </TooltipTrigger>
              <TooltipContent>{formatMoneyFull(b.transferBudget)} (40% do orçamento)</TooltipContent>
            </Tooltip>
          </div>
          <div>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Folha (anual)</span>
              <span className={`font-bold ${b.salaryUsedPercent >= 100 ? 'text-destructive' : 'text-foreground'}`}>
                {formatMoney(b.annualSalaries)} / {formatMoney(b.salaryBudget)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full transition-all ${getBarColor(b.salaryUsedPercent)}`} style={{ width: `${Math.min(100, b.salaryUsedPercent)}%` }} />
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" /> Verbas do Clube (40/40/20)
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">
            Orçamento total dividido em 3 categorias com travas rígidas. Você não pode comprar/contratar acima da verba disponível.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Total */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <span className="text-xs flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5 text-emerald-400" /> Orçamento Total</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-base font-black text-emerald-400 cursor-help">{formatMoney(budget)}</span>
              </TooltipTrigger>
              <TooltipContent>{formatMoneyFull(budget)}</TooltipContent>
            </Tooltip>
          </div>

          {/* Transfer */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5"><ShoppingCart className="h-3.5 w-3.5 text-blue-400" /> 💸 Verba de Transferências (40%)</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="font-bold text-blue-400 cursor-help">{formatMoney(b.transferBudget)}</span>
                </TooltipTrigger>
                <TooltipContent>{formatMoneyFull(b.transferBudget)} disponível para compras e luvas</TooltipContent>
              </Tooltip>
            </div>
            <p className="text-[10px] text-muted-foreground pl-5">Usada em compras diretas, luvas e taxas de rescisão.</p>
          </div>

          {/* Salary */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-amber-400" /> 🧾 Verba de Salários (40%)</span>
              <span className={`font-bold ${b.salaryUsedPercent >= 100 ? 'text-destructive' : b.salaryUsedPercent >= 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {formatMoney(b.annualSalaries)} / {formatMoney(b.salaryBudget)}
              </span>
            </div>
            <Progress value={Math.min(100, b.salaryUsedPercent)} className="h-2" />
            <p className="text-[10px] text-muted-foreground pl-5">
              Folha mensal × 12. Bloqueia novos contratos quando esgota. Restante: {formatMoney(b.salaryBudgetRemaining)}/ano.
            </p>
          </div>

          {/* Reserva */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /> 🏛️ Reserva Operacional (20%)</span>
              <span className="font-bold text-muted-foreground">{formatMoney(b.reservaBudget)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground pl-5">Informativo. Reserva sugerida para infraestrutura e operação.</p>
          </div>

          <div className="rounded-lg bg-muted/40 p-2 flex items-start gap-2">
            <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Travas rígidas:</strong> compras, luvas e rescisões debitam da verba de transferências. Novos contratos validam contra a verba de salários. Vendas e patrocínios reabastecem o orçamento total.
            </p>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
