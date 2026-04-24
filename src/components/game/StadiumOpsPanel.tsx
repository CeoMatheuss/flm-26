import {
  EVENT_CATALOG, DAMAGE_PROFILES, INSURANCE_PLANS,
  getInsuranceMonthlyCost, detectEventCalendarConflict,
  type StadiumOpsState, type StadiumEventProposal, type StadiumDamage, type StadiumInsurance,
  type MatchScheduleEntry,
} from '@/match/stadiumEvents';
import { buildStadiumModules } from '@/match/stadiumEconomics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Inbox, Calendar, ShieldAlert, ShieldCheck, Hammer, Clock, AlertTriangle, PartyPopper, X, Check, CalendarClock } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Props {
  ops: StadiumOpsState;
  budget: number;
  stadiumLevel: number;
  vipBoxesBuilt?: { bronze?: number; prata?: number; ouro?: number; master?: number };
  /** Fase 3: partidas oficiais em casa para detecção de conflito */
  upcomingHomeMatches?: MatchScheduleEntry[];
  onAccept: (proposalId: string) => void;
  onReject: (proposalId: string) => void;
  onRepair: (damageId: string) => void;
  onBuyInsurance: (tier: NonNullable<StadiumInsurance['tier']>) => void;
  onCancelInsurance: () => void;
}

function timeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expirou';
  const h = Math.floor(ms / 3600_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  const m = Math.floor(ms / 60_000) % 60;
  return `${h}h ${m}m`;
}

export function StadiumOpsPanel({
  ops, budget, stadiumLevel, vipBoxesBuilt, upcomingHomeMatches = [],
  onAccept, onReject, onRepair, onBuyInsurance, onCancelInsurance,
}: Props) {
  const modules = useMemo(() => buildStadiumModules(stadiumLevel, vipBoxesBuilt), [stadiumLevel, vipBoxesBuilt]);
  const activeDamages = ops.damages.filter(d => !d.repairing);
  const repairingDamages = ops.damages.filter(d => d.repairing);
  /** ids de propostas com conflito que o usuário decidiu sobrescrever */
  const [overrides, setOverrides] = useState<Set<string>>(new Set());

  return (
    <div className="space-y-4">
      {/* Inbox de propostas */}
      <Card className="border-fuchsia-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-fuchsia-400" /> Inbox — Propostas de Eventos
            </span>
            <Badge variant="outline" className="text-[10px]">{ops.proposals.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ops.proposals.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">
              📭 Nenhuma proposta no momento. Promotores enviam novas a cada 1-2 dias.
            </p>
          ) : ops.proposals.map(p => {
            const cfg = EVENT_CATALOG.find(c => c.category === p.category)!;
            const dmg = DAMAGE_PROFILES[p.damageSeverity];
            return (
              <div key={p.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-2xl">{cfg.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{cfg.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">por {p.promoter}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-emerald-400">R$ {(p.revenue/1000).toFixed(0)}k</p>
                    <p className="text-[9px] text-muted-foreground flex items-center gap-1 justify-end">
                      <Clock className="h-2.5 w-2.5" /> {timeUntil(p.expiresAt)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-background/40 rounded p-1.5">
                    <p className="text-[9px] uppercase text-muted-foreground">Data</p>
                    <p className="text-[11px] font-bold">{new Date(p.scheduledFor).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                  </div>
                  <div className="bg-background/40 rounded p-1.5">
                    <p className="text-[9px] uppercase text-muted-foreground">Bloqueia</p>
                    <p className="text-[11px] font-bold text-orange-300">{p.blockDays}d</p>
                  </div>
                  <div className="bg-background/40 rounded p-1.5">
                    <p className="text-[9px] uppercase text-muted-foreground">Risco</p>
                    <p className={`text-[11px] font-bold ${dmg.color}`}>
                      {dmg.emoji} {Math.round(p.damageChance * 100)}%
                    </p>
                  </div>
                </div>
                {p.fanImpact !== 0 && (
                  <p className={`text-[10px] ${p.fanImpact > 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {p.fanImpact > 0 ? '👍' : '⚠️'} Impacto na torcida: {p.fanImpact > 0 ? '+' : ''}{p.fanImpact}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-8 gap-1" onClick={() => onAccept(p.id)}>
                    <Check className="h-3.5 w-3.5" /> Aceitar
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 h-8 gap-1" onClick={() => onReject(p.id)}>
                    <X className="h-3.5 w-3.5" /> Recusar
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Eventos agendados */}
      {ops.acceptedEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-sky-400" /> Eventos Agendados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {ops.acceptedEvents.map(e => {
              const cfg = EVENT_CATALOG.find(c => c.category === e.category);
              return (
                <div key={e.proposalId} className="flex items-center justify-between bg-muted/30 rounded p-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{cfg?.emoji}</span>
                    <span className="font-medium">{cfg?.label}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(e.scheduledFor).toLocaleDateString('pt-BR')} • R$ {(e.revenue/1000).toFixed(0)}k
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Danos / Reparos */}
      {(activeDamages.length > 0 || repairingDamages.length > 0) && (
        <Card className="border-red-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-400" /> Danos do Estádio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeDamages.map(d => {
              const profile = DAMAGE_PROFILES[d.severity];
              const canAfford = budget >= d.repairCost;
              return (
                <div key={d.id} className="rounded-lg border border-red-500/30 bg-red-500/5 p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{profile.emoji}</span>
                      <div>
                        <p className="text-sm font-bold">{d.sourceLabel}</p>
                        <p className={`text-[10px] ${profile.color}`}>
                          Dano {profile.label} • -{d.capacityCutPct}% capacidade
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-300">R$ {(d.repairCost/1000).toFixed(0)}k</p>
                      <p className="text-[9px] text-muted-foreground">{d.repairDays} dia(s)</p>
                    </div>
                  </div>
                  <Button
                    size="sm" className="w-full h-8 gap-1.5"
                    disabled={!canAfford} onClick={() => onRepair(d.id)}
                    variant={canAfford ? 'default' : 'outline'}
                  >
                    <Hammer className="h-3.5 w-3.5" />
                    {canAfford ? 'Iniciar Reparo' : 'Orçamento insuficiente'}
                  </Button>
                </div>
              );
            })}
            {repairingDamages.map(d => (
              <div key={d.id} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 flex items-center justify-between">
                <span className="text-xs flex items-center gap-2">
                  <Hammer className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                  Reparando: <strong>{d.sourceLabel}</strong>
                </span>
                <span className="text-[10px] text-amber-200">
                  conclui em {d.repairCompletesAt ? timeUntil(d.repairCompletesAt) : '...'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Seguro */}
      <Card className="border-sky-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-400" /> Seguro do Estádio
            </span>
            {ops.insurance.tier && (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                ATIVO
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ops.insurance.tier ? (
            <>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">
                    {INSURANCE_PLANS.find(p => p.tier === ops.insurance.tier)?.emoji}{' '}
                    Plano {INSURANCE_PLANS.find(p => p.tier === ops.insurance.tier)?.label}
                  </span>
                  <span className="text-xs text-emerald-300">
                    Cobre {Math.round(ops.insurance.coverage * 100)}%
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Mensal: R$ {(ops.insurance.monthlyCost/1000).toFixed(0)}k
                  {ops.insurance.renewsAt && ` • Renova em ${timeUntil(ops.insurance.renewsAt)}`}
                </p>
              </div>
              <Button size="sm" variant="outline" className="w-full h-8" onClick={onCancelInsurance}>
                Cancelar Seguro
              </Button>
            </>
          ) : (
            <>
              <p className="text-[11px] text-muted-foreground">
                Eventos podem causar danos caros. Contrate um seguro para reduzir custos de reparo:
              </p>
              {INSURANCE_PLANS.map(plan => {
                const cost = getInsuranceMonthlyCost(plan.tier, modules);
                const canAfford = budget >= cost;
                return (
                  <div key={plan.tier} className="rounded-lg border border-border bg-muted/20 p-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${plan.color}`}>
                        {plan.emoji} {plan.label}
                      </span>
                      <span className="text-xs font-bold text-emerald-300">
                        Cobre {Math.round(plan.coverage * 100)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{plan.description}</p>
                    <Button
                      size="sm" className="w-full h-7 text-[11px]"
                      disabled={!canAfford} onClick={() => onBuyInsurance(plan.tier)}
                      variant={canAfford ? 'default' : 'outline'}
                    >
                      Contratar — R$ {(cost/1000).toFixed(0)}k/mês
                    </Button>
                  </div>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>

      {/* Log recente */}
      {ops.recentLog.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PartyPopper className="h-3.5 w-3.5" /> Histórico Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-44 overflow-y-auto">
              {ops.recentLog.map((l, i) => (
                <div
                  key={i}
                  className={`text-[11px] p-1.5 rounded border-l-2 ${
                    l.type === 'success' ? 'border-emerald-500 bg-emerald-500/5' :
                    l.type === 'danger'  ? 'border-red-500 bg-red-500/5' :
                    l.type === 'warning' ? 'border-amber-500 bg-amber-500/5' :
                                            'border-sky-500 bg-sky-500/5'
                  }`}
                >
                  {l.message}
                  <span className="text-[9px] text-muted-foreground ml-2">
                    {new Date(l.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
