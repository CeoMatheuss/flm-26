/**
 * UpgradesTab — Centro de upgrades estruturais do clube.
 * Centraliza Estádio, CT, Base/Juniores e Fisioterapia em cards com:
 *  - nível atual / próximo nível
 *  - custo
 *  - benefícios
 *  - duração (24h padrão, instantâneo se Premium)
 *  - barra de progresso quando há obra em andamento
 *  - confirmação antes de descontar
 * Reutiliza onUpgradeFacility do useInfraState (já trata cobrança/finanças/notificação).
 */
import { useEffect, useMemo, useState } from 'react';
import type { Infrastructure } from '@/types/infrastructure';
import {
  getStadiumUpgradeCost, getAcademyUpgradeCost,
  getTrainingCenterUpgradeCost, getPhysioUpgradeCost,
  getStadiumCapacity,
} from '@/types/infrastructure';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatMoney } from '@/lib/formatMoney';
import { cn } from '@/lib/utils';
import { Landmark, Dumbbell, GraduationCap, HeartPulse, Clock, ArrowUpRight, Wrench, CheckCircle2 } from 'lucide-react';

type FacilityKey = 'trainingCenter' | 'physiotherapy' | 'youthAcademy' | 'stadium';

interface Props {
  infrastructure: Infrastructure;
  budget: number;
  isPremium?: boolean;
  onUpgradeFacility: (facility: FacilityKey) => void;
}

interface CardDef {
  key: FacilityKey;
  title: string;
  icon: any;
  accent: string;
  maxLevel: number;
  cost: number;
  benefits: string[];
}

function computeCountdown(target: string | undefined, now: number) {
  if (!target) return null;
  const end = new Date(target).getTime();
  const diff = end - now;
  if (diff <= 0) return { done: true, label: 'Concluindo...', pct: 100 };
  const total = 24 * 60 * 60 * 1000;
  const elapsed = total - diff;
  const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return { done: false, label: `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m`, pct };
}

export function UpgradesTab({ infrastructure, budget, isPremium, onUpgradeFacility }: Props) {
  const [confirming, setConfirming] = useState<CardDef | null>(null);

  const cards = useMemo<CardDef[]>(() => {
    const stLvl = infrastructure.stadium.level;
    const ctLvl = infrastructure.trainingCenter.level;
    const yaLvl = infrastructure.youthAcademy.level;
    const phLvl = infrastructure.physiotherapy.level;
    return [
      {
        key: 'stadium', title: 'Estádio', icon: Landmark, accent: 'text-amber-400',
        maxLevel: 15, cost: getStadiumUpgradeCost(stLvl),
        benefits: [
          `Capacidade: ${getStadiumCapacity(stLvl).toLocaleString()} → ${getStadiumCapacity(stLvl+1).toLocaleString()}`,
          'Mais bilheteria por jogo',
          'Reputação e atração de patrocinadores',
        ],
      },
      {
        key: 'trainingCenter', title: 'Centro de Treinamento', icon: Dumbbell, accent: 'text-emerald-400',
        maxLevel: 30, cost: getTrainingCenterUpgradeCost(ctLvl),
        benefits: [
          'Mais chance de evolução por sessão',
          'Libera treinos avançados e prêmios',
          'Acelera desenvolvimento de jovens',
        ],
      },
      {
        key: 'youthAcademy', title: 'Base / Juniores', icon: GraduationCap, accent: 'text-sky-400',
        maxLevel: 30, cost: getAcademyUpgradeCost(yaLvl),
        benefits: [
          'OVR máximo de jovens aumenta',
          'Mais chance de Promessa / Craque',
          'Frequência maior de talentos',
        ],
      },
      {
        key: 'physiotherapy', title: 'Fisioterapia', icon: HeartPulse, accent: 'text-rose-400',
        maxLevel: 20, cost: getPhysioUpgradeCost(phLvl),
        benefits: [
          'Reduz tempo de lesão',
          'Acelera recuperação de energia',
          'Diminui desgaste em sequência de jogos',
        ],
      },
    ];
  }, [infrastructure]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Wrench className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-black uppercase tracking-wide">Upgrades do Clube</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          Caixa: <span className="text-foreground font-bold">{formatMoney(budget)}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cards.map((c) => {
          const lvl = infrastructure[c.key].level;
          const pending = infrastructure[c.key].upgradeCompletesAt;
          const cd = useCountdown(pending && new Date(pending).getTime() > Date.now() ? pending : undefined);
          const maxed = lvl >= c.maxLevel;
          const canAfford = budget >= c.cost;
          const Icon = c.icon;
          const inProgress = !!cd && !cd.done;

          return (
            <div
              key={c.key}
              className="relative rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-4 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <div className={cn('h-10 w-10 rounded-lg bg-muted/40 flex items-center justify-center', c.accent)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-black uppercase tracking-wide">{c.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Nível {lvl} / {c.maxLevel}
                    {!maxed && <span className="text-foreground/70"> → {lvl + 1}</span>}
                  </div>
                </div>
                {maxed && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Máx
                  </span>
                )}
              </div>

              <ul className="text-[11px] text-muted-foreground space-y-1 pl-1">
                {c.benefits.map((b, i) => (
                  <li key={i} className="flex gap-2"><span className="text-primary">•</span>{b}</li>
                ))}
              </ul>

              {inProgress ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-amber-400 flex items-center gap-1"><Clock className="h-3 w-3" /> Em obra</span>
                    <span className="text-amber-400/70">{cd!.label}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div className="h-full bg-amber-400 transition-all" style={{ width: `${cd!.pct}%` }} />
                  </div>
                </div>
              ) : (
                <div className="flex items-end justify-between gap-3 mt-auto">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Custo</div>
                    <div className={cn('text-sm font-black', canAfford ? 'text-foreground' : 'text-red-400')}>
                      {maxed ? '—' : formatMoney(c.cost)}
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">
                      {isPremium ? 'Premium: instantâneo' : 'Duração: 24h'}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={maxed || !canAfford}
                    onClick={() => setConfirming(c)}
                    className="h-8 px-3 text-xs font-black uppercase tracking-wider"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 mr-1" /> Evoluir
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!confirming} onOpenChange={(o) => !o && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🏗️ Iniciar melhoria?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <div><b>{confirming?.title}</b> — Nível {confirming ? infrastructure[confirming.key].level : 0} → {confirming ? infrastructure[confirming.key].level + 1 : 0}</div>
                <div>Custo: <b>{confirming ? formatMoney(confirming.cost) : '—'}</b></div>
                <div>Duração: <b>{isPremium ? 'Instantâneo (Premium)' : '24 horas'}</b></div>
                <div className="pt-1 text-muted-foreground">Benefícios:</div>
                <ul className="text-xs pl-3 space-y-0.5">
                  {confirming?.benefits.map((b, i) => <li key={i}>• {b}</li>)}
                </ul>
                <div className="text-xs text-muted-foreground pt-1">
                  O valor será descontado do caixa e registrado no financeiro.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirming) onUpgradeFacility(confirming.key);
                setConfirming(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
