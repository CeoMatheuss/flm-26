import { useState, useMemo } from 'react';
import { Infrastructure, getPhysioUpgradeCost, getPhysioBonuses, getDailyStaminaRecovery } from '@/types/infrastructure';
import type { Player } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HeartPulse, ArrowUp, HelpCircle } from 'lucide-react';
import { useLiveMatchGuard } from './LiveMatchGuard';

interface Props {
  infrastructure: Infrastructure;
  budget: number;
  players?: Player[];
  onUpgrade: (facility: 'trainingCenter' | 'physiotherapy') => void;
}

export function InfrastructureTab({ infrastructure, budget, players = [], onUpgrade: _onUpgrade }: Props) {
  const { guard } = useLiveMatchGuard();
  const onUpgrade = guard(_onUpgrade);
  const [helpOpen, setHelpOpen] = useState(false);

  const facility = infrastructure?.physiotherapy ?? { level: 0, maxLevel: 20 };
  const cost = getPhysioUpgradeCost(facility.level);
  const isMaxed = facility.level >= facility.maxLevel;
  const pct = (facility.level / facility.maxLevel) * 100;
  const bonuses = getPhysioBonuses(facility.level);
  const dailyRecovery = getDailyStaminaRecovery(facility.level);

  // ── Squad status calculations ──
  const squadStatus = useMemo(() => {
    if (!players || players.length === 0) {
      return { avgStamina: 100, injured: 0, lowStamina: 0, riskLevel: 'low' as const };
    }
    const avgStamina = Math.round(players.reduce((s, p) => s + (p.stamina ?? 100), 0) / players.length);
    const injured = players.filter(p => (p as any).injury || (p as any).injuredCycles > 0).length;
    const lowStamina = players.filter(p => (p.stamina ?? 100) < 50).length;

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (avgStamina < 50 || lowStamina >= 5 || injured >= 3) riskLevel = 'high';
    else if (avgStamina < 70 || lowStamina >= 2 || injured >= 1) riskLevel = 'medium';

    return { avgStamina, injured, lowStamina, riskLevel };
  }, [players]);

  const fatigueText = squadStatus.avgStamina >= 70
    ? 'Baixo desgaste'
    : squadStatus.avgStamina >= 40
    ? 'Desgaste moderado'
    : 'Alto desgaste';

  const riskBadge = squadStatus.riskLevel === 'low'
    ? { text: '🟢 Baixo risco', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' }
    : squadStatus.riskLevel === 'medium'
    ? { text: '🟡 Atenção', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }
    : { text: '🔴 Alto risco', cls: 'bg-red-500/15 text-red-400 border-red-500/30' };

  return (
    <div className="space-y-4">
      <Card className="game-card-accent overflow-hidden">
        <CardHeader className="section-header pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-pink-400" />
            Fisioterapia
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              aria-label="Como funciona a Fisioterapia"
              className="inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <span className="game-badge bg-primary/15 text-primary ml-auto">Nv. {facility.level}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-3">
          <p className="text-sm text-muted-foreground">
            💊 Recupera energia diária dos jogadores, reduz risco de lesão, acelera recuperação e diminui recaídas.
          </p>

          {/* Level + recovery */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Nível {facility.level}/{facility.maxLevel}</span>
              <span className="game-badge bg-primary/15 text-primary">+{dailyRecovery} stamina/dia</span>
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

          {/* Bonuses grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-muted/30 p-2">
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Recup. lesão</p>
              <p className="font-bold text-emerald-400">+{Math.round(bonuses.recoverySpeed * 100)}%</p>
            </div>
            <div className="rounded-md bg-muted/30 p-2">
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Risco lesão</p>
              <p className="font-bold text-emerald-400">-{Math.round(bonuses.injuryRiskReduction * 100)}%</p>
            </div>
            <div className="rounded-md bg-muted/30 p-2">
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Recaída</p>
              <p className="font-bold text-emerald-400">-{Math.round(bonuses.relapseReduction * 100)}%</p>
            </div>
            <div className="rounded-md bg-muted/30 p-2">
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Stamina baixa</p>
              <p className="font-bold text-emerald-400">-{Math.round(bonuses.lowStaminaProtection * 100)}%</p>
            </div>
          </div>

          {/* Squad status */}
          <div className="rounded-lg border border-border/40 bg-card/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status do Elenco</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${riskBadge.cls}`}>
                {riskBadge.text}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Stamina</p>
                <p className="text-base font-black text-foreground">{squadStatus.avgStamina}%</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{fatigueText}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Cansados</p>
                <p className="text-base font-black text-foreground">{squadStatus.lowStamina}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">&lt; 50% stamina</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Lesionados</p>
                <p className="text-base font-black text-foreground">{squadStatus.injured}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">em recuperação</p>
              </div>
            </div>
          </div>

          {!isMaxed ? (
            <Button onClick={() => onUpgrade('physiotherapy')} disabled={budget < cost} className="w-full gap-2 h-11 text-sm font-semibold">
              <ArrowUp className="h-4 w-4" />
              Melhorar para Nível {facility.level + 1} — {cost >= 1_000_000 ? `R$ ${(cost / 1_000_000).toFixed(cost >= 10_000_000 ? 0 : 1)}M` : `R$ ${(cost / 1000).toFixed(0)}k`}
            </Button>
          ) : (
            <div className="text-center py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm font-semibold text-emerald-400">✅ Nível Máximo Alcançado!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-pink-400">
              <HeartPulse className="h-5 w-5" /> Fisioterapia — Como Funciona
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <ul className="space-y-1.5 text-foreground/90">
              <li>• Recupera stamina diariamente <strong className="text-emerald-400">(+30 + nível, máx +50)</strong></li>
              <li>• Reduz <strong>risco de lesão</strong> dos jogadores</li>
              <li>• Acelera recuperação de jogadores lesionados</li>
              <li>• Reduz a chance de <strong>recaída</strong></li>
              <li>• Ajuda jogadores cansados (&lt; 50 stamina)</li>
            </ul>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400">💡 Dicas</p>
              <ul className="space-y-1 text-xs text-foreground/80">
                <li>• Jogadores com baixa stamina têm <strong>mais risco de lesão</strong></li>
                <li>• Rotacione o elenco para evitar desgaste</li>
                <li>• Fisio alto melhora a estabilidade do time</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
