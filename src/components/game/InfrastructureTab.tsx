import { Infrastructure, getUpgradeCost, getPhysiotherapyRecovery, getPhysioBonuses, getDailyStaminaRecovery } from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Building2, ArrowUp, HeartPulse } from 'lucide-react';

interface Props {
  infrastructure: Infrastructure;
  budget: number;
  onUpgrade: (facility: 'trainingCenter' | 'physiotherapy') => void;
}

const facilityInfo = {
  trainingCenter: {
    name: 'Centro de Treinamento',
    icon: Building2,
    desc: 'Melhora a efetividade dos treinos. Quanto maior o nível, mais rápido os jogadores evoluem.',
    color: 'text-emerald-400',
    emoji: '🏋️',
  },
  physiotherapy: {
    name: 'Centro de Fisioterapia',
    icon: HeartPulse,
    desc: 'Recupera a energia diária dos jogadores e reduz risco/recaída de lesões.',
    color: 'text-pink-400',
    emoji: '💊',
    getExtra: (level: number) => `+${getDailyStaminaRecovery(level)} stamina/dia`,
  },
};

export function InfrastructureTab({ infrastructure, budget, onUpgrade }: Props) {
  return (
    <div className="space-y-4">
      {(Object.keys(facilityInfo) as Array<keyof typeof facilityInfo>).map(key => {
        const facility = infrastructure?.[key] ?? { level: 1, maxLevel: 10 };
        const info = facilityInfo[key];
        const Icon = info.icon;
        const cost = getUpgradeCost(facility.level, key);
        const isMaxed = facility.level >= facility.maxLevel;
        const pct = (facility.level / facility.maxLevel) * 100;
        const physioBonuses = key === 'physiotherapy' ? getPhysioBonuses(facility.level) : null;

        return (
          <Card key={key} className="game-card-accent overflow-hidden">
            <CardHeader className="section-header pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className={`h-5 w-5 ${info.color}`} />
                {info.name}
                <span className="game-badge bg-primary/15 text-primary ml-auto">Nv. {facility.level}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-3">
              <p className="text-sm text-muted-foreground">{info.emoji} {info.desc}</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Nível {facility.level}/{facility.maxLevel}</span>
                  {'getExtra' in info && (
                    <span className="game-badge bg-primary/15 text-primary">{(info as any).getExtra(facility.level)}</span>
                  )}
                </div>
                <Progress value={pct} className="h-3 progress-glow" />
              </div>

              <div className="flex gap-0.5">
                {Array.from({ length: facility.maxLevel }, (_, i) => (
                  <div
                    key={i}
                    className={`h-2.5 flex-1 rounded-sm transition-colors ${i < facility.level ? 'bg-primary glow-primary' : 'bg-muted/50'}`}
                  />
                ))}
              </div>

              {physioBonuses && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted/30 p-2">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Recup. lesão</p>
                    <p className="font-bold text-emerald-400">+{Math.round(physioBonuses.recoverySpeed * 100)}%</p>
                  </div>
                  <div className="rounded-md bg-muted/30 p-2">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Risco lesão</p>
                    <p className="font-bold text-emerald-400">-{Math.round(physioBonuses.injuryRiskReduction * 100)}%</p>
                  </div>
                  <div className="rounded-md bg-muted/30 p-2">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Recaída</p>
                    <p className="font-bold text-emerald-400">-{Math.round(physioBonuses.relapseReduction * 100)}%</p>
                  </div>
                  <div className="rounded-md bg-muted/30 p-2">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Stamina baixa</p>
                    <p className="font-bold text-emerald-400">-{Math.round(physioBonuses.lowStaminaProtection * 100)}%</p>
                  </div>
                </div>
              )}

              {!isMaxed ? (
                <Button onClick={() => onUpgrade(key)} disabled={budget < cost} className="w-full gap-2 h-11 text-sm font-semibold">
                  <ArrowUp className="h-4 w-4" />
                  Melhorar para Nível {facility.level + 1} — R$ {(cost / 1000000).toFixed(2)}M
                </Button>
              ) : (
                <div className="text-center py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-sm font-semibold text-emerald-400">✅ Nível Máximo Alcançado!</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
