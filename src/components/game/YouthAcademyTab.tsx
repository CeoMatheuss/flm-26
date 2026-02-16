import { YouthProspect } from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UserPlus, Star, Info } from 'lucide-react';

interface Props {
  prospects: YouthProspect[];
  academyLevel: number;
  monthlyInvestment: number;
  budget: number;
  onPromote: (id: string) => void;
  onSetInvestment: (amount: number) => void;
  onGenerateYouth?: () => void;
}

const investmentTiers = [
  { amount: 0, label: 'R$ 0', players: 0 },
  { amount: 100000, label: 'R$ 100k', players: 2 },
  { amount: 250000, label: 'R$ 250k', players: 3 },
  { amount: 500000, label: 'R$ 500k', players: 5 },
  { amount: 1000000, label: 'R$ 1M', players: 6 },
  { amount: 2000000, label: 'R$ 2M', players: 8 },
];

export function YouthAcademyTab({ prospects, academyLevel, monthlyInvestment, budget, onPromote, onSetInvestment, onGenerateYouth }: Props) {
  return (
    <div className="space-y-6">
      <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5 text-purple-400" />
            Investimento Mensal na Base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Quanto maior o investimento, mais jogadores a base gera por mês. O nível da academia determina a qualidade.
          </p>

          <div className="flex flex-wrap gap-2">
            {investmentTiers.map(tier => (
              <Button
                key={tier.amount}
                variant={monthlyInvestment === tier.amount ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSetInvestment(tier.amount)}
              >
                {tier.label} ({tier.players} jogadores)
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">Investimento: <span className="text-primary">R$ {(monthlyInvestment / 1000).toFixed(0)}k/mês</span></p>
              <p className="text-xs text-muted-foreground">Nível da Academia: {academyLevel} • Overall: {45 + academyLevel * 4}-{55 + academyLevel * 4} • Jovens chegam automaticamente a cada 4 rodadas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Jovens na Base ({prospects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {prospects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum jovem na base. Invista e gere uma safra!</p>
          ) : (
            <div className="space-y-3">
              {prospects.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                  <Badge variant="outline" className="text-xs">{p.position}</Badge>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.age} anos • {p.monthsInAcademy} meses na base</p>
                  </div>
                  <div className="text-center mr-2">
                    <p className="text-lg font-bold">{p.overall}</p>
                    <p className="text-[10px] text-muted-foreground">OVR</p>
                  </div>
                  <div className="text-center mr-2">
                    <p className="text-lg font-bold text-yellow-400">{p.potential}</p>
                    <p className="text-[10px] text-muted-foreground">POT</p>
                  </div>
                  <div className="w-16">
                    <Progress value={(p.overall / p.potential) * 100} className="h-2" />
                  </div>
                  <Button size="sm" onClick={() => onPromote(p.id)}>
                    <UserPlus className="h-3 w-3 mr-1" /> Promover
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
