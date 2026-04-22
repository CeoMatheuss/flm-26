/**
 * InfraHubTab — Aba unificada de Infraestrutura.
 * Sub-tabs:
 *   🏥 Fisioterapia   — InfrastructureTab (atual)
 *   🎓 Categorias de Base — YouthAcademyTab
 *   🏋️ Centro de Treinamento — bloco de upgrade do CT (não confundir com a aba "Treinos" que executa sessões)
 *
 * Mantém a aba "Treinos" separada para a execução diária de treinos.
 */
import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { HeartPulse, GraduationCap, Dumbbell, ArrowUp } from 'lucide-react';
import { Infrastructure, getTrainingCenterUpgradeCost, getCTEfficiency } from '@/types/infrastructure';
import type { Player } from '@/types/game';
import type { YouthProspect } from '@/types/infrastructure';
import { InfrastructureTab } from './InfrastructureTab';
import { YouthAcademyTab } from './YouthAcademyTab';
import { useLiveMatchGuard } from './LiveMatchGuard';
import { formatMoney } from '@/lib/formatMoney';

interface InfraHubProps {
  // shared
  infrastructure: Infrastructure;
  budget: number;
  isPremium?: boolean;
  // Fisio
  players: Player[];
  // Youth
  youthProspects: YouthProspect[];
  monthlyInvestment: number;
  hasScouts: boolean;
  currentSeason: number;
  onPromote: (id: string) => void;
  onSell: (id: string) => void;
  onEnrollCopinha: () => void;
  onSetInvestment: (v: number) => void;
  onUpgradeAcademy: () => void;
  // Upgrade callbacks
  onUpgradeFacility: (f: 'trainingCenter' | 'physiotherapy' | 'youthAcademy' | 'stadium') => void;
}

export function InfraHubTab({
  infrastructure,
  budget,
  isPremium = false,
  players,
  youthProspects,
  monthlyInvestment,
  hasScouts,
  currentSeason,
  onPromote,
  onSell,
  onEnrollCopinha,
  onSetInvestment,
  onUpgradeAcademy,
  onUpgradeFacility,
}: InfraHubProps) {
  const { guard, isInLiveMatch } = useLiveMatchGuard();
  const onUpgradeCT = guard(() => onUpgradeFacility('trainingCenter'));

  const ct = infrastructure?.trainingCenter ?? { level: 1, maxLevel: 30 };
  const ctCost = getTrainingCenterUpgradeCost(ct.level);
  const ctIsMaxed = ct.level >= ct.maxLevel;
  const ctPct = (ct.level / ct.maxLevel) * 100;
  const ctEfficiency = getCTEfficiency(ct.level);
  const ctNextEfficiency = useMemo(() => getCTEfficiency(ct.level + 1), [ct.level]);

  return (
    <div className="space-y-3">
      <Tabs defaultValue="physio" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="physio" className="text-[11px] gap-1.5 py-2">
            <HeartPulse className="h-3.5 w-3.5 text-pink-400" /> Fisioterapia
          </TabsTrigger>
          <TabsTrigger value="youth" className="text-[11px] gap-1.5 py-2">
            <GraduationCap className="h-3.5 w-3.5 text-emerald-400" /> Base
          </TabsTrigger>
          <TabsTrigger value="ct" className="text-[11px] gap-1.5 py-2">
            <Dumbbell className="h-3.5 w-3.5 text-amber-400" /> CT
          </TabsTrigger>
        </TabsList>

        <TabsContent value="physio" className="mt-3">
          <InfrastructureTab
            infrastructure={infrastructure}
            budget={budget}
            players={players}
            onUpgrade={onUpgradeFacility}
          />
        </TabsContent>

        <TabsContent value="youth" className="mt-3">
          <YouthAcademyTab
            prospects={youthProspects}
            academyLevel={infrastructure?.youthAcademy?.level ?? 0}
            academyUpgradeCompletesAt={infrastructure?.youthAcademy?.upgradeCompletesAt}
            isPremium={isPremium}
            monthlyInvestment={monthlyInvestment}
            budget={budget}
            hasScouts={hasScouts}
            currentSeason={currentSeason}
            onPromote={onPromote}
            onSell={onSell}
            onEnrollCopinha={onEnrollCopinha}
            onSetInvestment={onSetInvestment}
            onUpgradeAcademy={onUpgradeAcademy}
          />
        </TabsContent>

        <TabsContent value="ct" className="mt-3">
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
                🏋️ Aumenta a eficiência semanal de evolução dos jogadores. Para executar treinos diários, use a aba <strong>Treinos</strong>.
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Nível {ct.level}/{ct.maxLevel}</span>
                  <span className="game-badge bg-primary/15 text-primary">+{ctEfficiency.toFixed(1)}%/semana</span>
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
                    <p className="font-bold text-foreground">+{ctEfficiency.toFixed(1)}%/sem</p>
                  </div>
                  <div className="rounded-md bg-muted/30 p-2">
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Próximo Nv</p>
                    <p className="font-bold text-emerald-400">+{ctNextEfficiency.toFixed(1)}%/sem</p>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
