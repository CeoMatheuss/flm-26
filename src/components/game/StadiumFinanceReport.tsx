import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import {
  summarizeFinance, FINANCE_CATEGORY_META,
  type StadiumFinanceEntry,
} from '@/match/stadiumWeather';

interface Props {
  financeLog?: StadiumFinanceEntry[];
  weeklyMaintenance: number;
  monthlyVipContracts: number;
}

function fmt(v: number) {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toFixed(1)}k`;
  return `${sign}R$ ${abs.toLocaleString('pt-BR')}`;
}

export function StadiumFinanceReport({ financeLog = [], weeklyMaintenance, monthlyVipContracts }: Props) {
  const summary = useMemo(() => summarizeFinance(financeLog, 30), [financeLog]);

  // Estimar manutenção mensal projetada (não está no log ainda — informativo)
  const projectedMonthlyMaint = weeklyMaintenance * 4;

  const categories = Object.entries(summary.byCategory).sort((a, b) =>
    (b[1].in + b[1].out) - (a[1].in + a[1].out),
  );

  const netColor = summary.net >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <Card className="border-emerald-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-400" /> Relatório Financeiro do Estádio
          </span>
          <Badge variant="outline" className="text-[10px]">Últimos 30 dias</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-center">
            <p className="text-[9px] uppercase text-muted-foreground flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3" /> Receitas
            </p>
            <p className="text-sm font-extrabold text-emerald-300">{fmt(summary.totalRevenue)}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-center">
            <p className="text-[9px] uppercase text-muted-foreground flex items-center justify-center gap-1">
              <TrendingDown className="h-3 w-3" /> Despesas
            </p>
            <p className="text-sm font-extrabold text-red-300">{fmt(summary.totalExpense)}</p>
          </div>
          <div className={`${summary.net >= 0 ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-red-500/10 border-red-500/40'} border rounded-lg p-2 text-center`}>
            <p className="text-[9px] uppercase text-muted-foreground flex items-center justify-center gap-1">
              <Wallet className="h-3 w-3" /> Saldo
            </p>
            <p className={`text-sm font-extrabold ${netColor}`}>{fmt(summary.net)}</p>
          </div>
        </div>

        {/* Projeções fixas */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border border-border bg-muted/20 p-2">
            <p className="text-[9px] uppercase text-muted-foreground">Manutenção projetada</p>
            <p className="font-bold text-amber-300">-{fmt(projectedMonthlyMaint)}/mês</p>
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-2">
            <p className="text-[9px] uppercase text-muted-foreground">Contratos VIP</p>
            <p className="font-bold text-amber-400">+{fmt(monthlyVipContracts)}/mês</p>
          </div>
        </div>

        {/* Por categoria */}
        {categories.length > 0 && (
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-bold mb-1.5">Por categoria</p>
            <div className="space-y-1">
              {categories.map(([cat, vals]) => {
                const meta = FINANCE_CATEGORY_META[cat] ?? { label: cat, emoji: '•', color: 'text-foreground' };
                const net = vals.in - vals.out;
                return (
                  <div key={cat} className="flex items-center justify-between bg-muted/20 rounded p-1.5 text-xs">
                    <span className={`flex items-center gap-1.5 ${meta.color}`}>
                      <span className="text-base">{meta.emoji}</span>
                      <span className="font-medium">{meta.label}</span>
                    </span>
                    <div className="flex items-center gap-2 text-[10px]">
                      {vals.in > 0 && <span className="text-emerald-300">+{fmt(vals.in)}</span>}
                      {vals.out > 0 && <span className="text-red-300">-{fmt(vals.out)}</span>}
                      <span className={`font-bold ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fmt(net)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lançamentos recentes */}
        {summary.entries.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-2">
            📊 Nenhum lançamento ainda. Aceite eventos ou contrate seguro para começar a movimentar a planilha.
          </p>
        ) : (
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-bold mb-1.5">Últimos lançamentos</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {summary.entries.slice(0, 8).map((e, i) => {
                const meta = FINANCE_CATEGORY_META[e.category] ?? { label: e.category, emoji: '•', color: '' };
                return (
                  <div key={i} className="flex items-center justify-between text-[11px] bg-background/40 rounded px-2 py-1">
                    <span className="truncate flex items-center gap-1.5">
                      <span>{meta.emoji}</span>
                      <span className="truncate">{e.label}</span>
                    </span>
                    <span className={`font-bold shrink-0 ml-2 ${e.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {e.amount >= 0 ? '+' : ''}{fmt(e.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
