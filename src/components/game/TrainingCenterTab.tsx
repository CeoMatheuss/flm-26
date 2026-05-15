/**
 * TrainingCenterTab — Aba dedicada do Centro de Treinamento (CT).
 * Card 1: Upgrade do nível do CT.
 * Card 2: Investimento mensal em treino (impacta a chance de evolução).
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dumbbell, ArrowUp, TrendingUp, Wallet, Sparkles } from 'lucide-react';
import {
  Infrastructure,
  getTrainingCenterUpgradeCost,
  getCTEfficiency,
  getCTEvolutionChance,
  getInvestmentEvolutionBonus,
  trainingInvestmentTiers,
} from '@/types/infrastructure';
import { useLiveMatchGuard } from './LiveMatchGuard';
import { formatMoney } from '@/lib/formatMoney';
import { toast } from 'sonner';

interface TrainingCenterTabProps {
  infrastructure: Infrastructure;
  budget: number;
  onUpgradeFacility: (f: 'trainingCenter' | 'physiotherapy' | 'youthAcademy' | 'stadium') => void;
  trainingInvestment?: number;
  onSetTrainingInvestment?: (value: number) => void;
}

export function TrainingCenterTab({
  infrastructure,
  budget,
  onUpgradeFacility,
  trainingInvestment = 0,
  onSetTrainingInvestment,
}: TrainingCenterTabProps) {
  const { guard, isInLiveMatch } = useLiveMatchGuard();
  const onUpgradeCT = guard(() => onUpgradeFacility('trainingCenter'));

  const ct = infrastructure?.trainingCenter ?? { level: 1, maxLevel: 30 };
  const ctCost = getTrainingCenterUpgradeCost(ct.level);
  const ctIsMaxed = ct.level >= ct.maxLevel;
  const ctPct = (ct.level / ct.maxLevel) * 100;
  const ctEfficiency = getCTEfficiency(ct.level);
  const ctNextEfficiency = useMemo(() => getCTEfficiency(ct.level + 1), [ct.level]);

  const ctChance = getCTEvolutionChance(ct.level);
  const investBonus = getInvestmentEvolutionBonus(trainingInvestment);

  const handleInvestmentChange = (value: number) => {
    if (!onSetTrainingInvestment) return;
    if (value > budget) {
      toast.error('Orçamento atual insuficiente para esse nível de investimento.');
      return;
    }
    onSetTrainingInvestment(value);
    toast.success(
      value === 0
        ? 'Investimento em treino removido.'
        : `Investimento mensal definido: R$ ${value.toLocaleString('pt-BR')} (+${getInvestmentEvolutionBonus(value)}% chance).`,
    );
  };

  return (
    <div className="space-y-4">
      <Card className="game-card-accent overflow-hidden">
        <CardHeader className="section-header pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-amber-400" />
            Centro de Treinamento
            <span className="game-badge bg-primary/15 text-primary ml-auto">Nv. {ct.level}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-3">
          <p className="text-sm text-muted-foreground">
            🏋️ Aumenta a chance semanal de evolução dos jogadores. Para executar treinos diários, use a aba <strong>Treinos</strong>.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Nível {ct.level}/{ct.maxLevel}</span>
              <span className="game-badge bg-primary/15 text-primary">{ctChance}% chance/sem</span>
            </div>
            <Progress value={ctPct} className="h-3" />
          </div>

          <div className="flex gap-0.5">
            {Array.from({ length: ct.maxLevel }, (_, i) => (
              <div
                key={i}
                className={`h-2.5 flex-1 rounded-sm transition-colors ${i < ct.level ? 'bg-primary' : 'bg-muted/50'}`}
              />
            ))}
          </div>

          {!ctIsMaxed && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-muted/30 p-2">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Atual</p>
                <p className="font-bold text-foreground">{ctChance}% / +{ctEfficiency.toFixed(1)}%/sem</p>
              </div>
              <div className="rounded-md bg-muted/30 p-2">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Próximo Nv</p>
                <p className="font-bold text-emerald-400">{getCTEvolutionChance(ct.level + 1)}% / +{ctNextEfficiency.toFixed(1)}%/sem</p>
              </div>
            </div>
          )}

          {!ctIsMaxed ? (
            <Button
              onClick={onUpgradeCT}
              disabled={budget < ctCost || isInLiveMatch}
              className="w-full gap-2 h-11 text-sm font-semibold"
            >
              <ArrowUp className="h-4 w-4" />
              Melhorar para Nv {ct.level + 1} — {formatMoney(ctCost)}
            </Button>
          ) : (
            <div className="text-center py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm font-semibold text-emerald-400">✅ Nível Máximo Alcançado!</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
