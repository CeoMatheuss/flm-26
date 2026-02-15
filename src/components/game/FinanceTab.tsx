import { FinanceEntry } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface Props {
  budget: number;
  finances: FinanceEntry[];
  totalSalaries: number;
}

export function FinanceTab({ budget, finances, totalSalaries }: Props) {
  const totalReceitas = finances.filter(f => f.type === 'receita').reduce((s, f) => s + f.amount, 0);
  const totalDespesas = finances.filter(f => f.type === 'despesa').reduce((s, f) => s + f.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-emerald-400" />
            <div>
              <p className="text-xs text-muted-foreground">Saldo Atual</p>
              <p className="text-xl font-bold">R$ {(budget / 1000000).toFixed(2)}M</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">Total Receitas</p>
              <p className="text-xl font-bold text-emerald-400">R$ {(totalReceitas / 1000).toFixed(0)}k</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingDown className="h-6 w-6 text-red-400" />
            <div>
              <p className="text-xs text-muted-foreground">Total Despesas</p>
              <p className="text-xl font-bold text-red-400">R$ {(totalDespesas / 1000).toFixed(0)}k</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Folha Salarial
            <span className="text-sm font-normal text-muted-foreground">R$ {(totalSalaries / 1000).toFixed(0)}k/mês</span>
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico Financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          {finances.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma transação ainda</p>
          ) : (
            <div className="space-y-2">
              {finances.slice().reverse().map(entry => (
                <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <Badge variant={entry.type === 'receita' ? 'default' : 'destructive'} className="text-xs">
                    {entry.type === 'receita' ? '+' : '-'}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">{entry.category} • {entry.date}</p>
                  </div>
                  <p className={`text-sm font-bold ${entry.type === 'receita' ? 'text-emerald-400' : 'text-red-400'}`}>
                    R$ {(entry.amount / 1000).toFixed(0)}k
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
