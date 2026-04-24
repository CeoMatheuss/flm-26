import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MEMBERSHIP_CATALOG, MODULAR_UPGRADES, computeUpgradeEffects, billMembership,
  type MembershipTier, type ModularUpgradeId, type StadiumPhase6State,
} from '@/match/stadiumPhase6';
import { Ticket, Zap, Check, Lock, Sparkles, Wrench } from 'lucide-react';

interface Props {
  phase6: StadiumPhase6State | undefined;
  budget: number;
  fans: number;
  reputation: number;
  stadiumLevel: number;
  onToggleMembership: (tier: MembershipTier) => void;
  onBuyUpgrade: (id: ModularUpgradeId) => void;
}

export function StadiumPhase6Panel({
  phase6, budget, fans, reputation, stadiumLevel,
  onToggleMembership, onBuyUpgrade,
}: Props) {
  const safe = phase6 ?? { membership: { activeTiers: [], membersByTier: {} }, upgrades: { owned: [], purchasedAt: {} } };
  const billing = billMembership(safe.membership);
  const upgEff = computeUpgradeEffects(safe.upgrades);

  return (
    <div className="space-y-3">
      {/* Sócio-Torcedor */}
      <Card className="border-sky-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-sky-400" /> Sócio-Torcedor
            </span>
            {billing.totalMembers > 0 && (
              <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40">
                {billing.totalMembers.toLocaleString()} sócios • R$ {(billing.totalRevenue/1000).toFixed(0)}k/mês
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Mensalidade recorrente. Sócios garantem público mínimo em cada partida e melhoram o humor da torcida.
          </p>
          {MEMBERSHIP_CATALOG.map(cfg => {
            const active = safe.membership.activeTiers.includes(cfg.tier);
            const unlocked = stadiumLevel >= cfg.minStadiumLevel;
            const members = safe.membership.membersByTier[cfg.tier] ?? 0;
            const projected = Math.floor(fans * cfg.conversionRate * (0.7 + (reputation/100) * 0.6));
            return (
              <div key={cfg.tier} className={`p-2.5 rounded-lg border ${active ? 'bg-sky-500/10 border-sky-500/40' : unlocked ? 'bg-muted/30 border-border' : 'bg-muted/10 border-dashed border-muted opacity-60'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl">{cfg.emoji}</span>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label} • R$ {cfg.monthlyPrice}/mês</p>
                      <p className="text-[10px] text-muted-foreground">{cfg.description}</p>
                      {!unlocked ? (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Lock className="h-3 w-3" /> Requer Nv {cfg.minStadiumLevel}
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {active ? `${members.toLocaleString()} sócios ativos` : `~${projected.toLocaleString()} sócios estimados`}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={active ? 'destructive' : 'default'}
                    disabled={!unlocked}
                    onClick={() => onToggleMembership(cfg.tier)}
                    className="h-8 text-[11px]"
                  >
                    {active ? 'Encerrar' : 'Abrir'}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Upgrades Modulares */}
      <Card className="border-emerald-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" /> Modernizações
            </span>
            {upgEff.totalMonthlyCost > 0 && (
              <Badge variant="outline" className="text-[10px]">
                <Wrench className="h-3 w-3 mr-1" /> R$ {(upgEff.totalMonthlyCost/1000).toFixed(0)}k/mês
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Upgrades pontuais que dão bônus específicos: receita, proteção contra clima/eventos e segurança.
          </p>
          {MODULAR_UPGRADES.map(cfg => {
            const owned = safe.upgrades.owned.includes(cfg.id);
            const unlocked = stadiumLevel >= cfg.minStadiumLevel;
            const canAfford = budget >= cfg.cost;
            return (
              <div key={cfg.id} className={`p-2.5 rounded-lg border ${owned ? 'bg-emerald-500/10 border-emerald-500/40' : unlocked ? 'bg-muted/30 border-border' : 'bg-muted/10 border-dashed border-muted opacity-60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="text-2xl mt-0.5">{cfg.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{cfg.label}</p>
                      <p className="text-[10px] text-muted-foreground">{cfg.description}</p>
                      <p className="text-[10px] text-emerald-300 flex items-center gap-1 mt-0.5">
                        <Zap className="h-3 w-3" /> {cfg.effect}
                      </p>
                      {!unlocked && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Lock className="h-3 w-3" /> Requer Nv {cfg.minStadiumLevel}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {owned ? (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                        <Check className="h-3 w-3 mr-1" /> Instalado
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!unlocked || !canAfford}
                        onClick={() => onBuyUpgrade(cfg.id)}
                        className="h-8 text-[11px]"
                      >
                        R$ {(cfg.cost/1_000_000).toFixed(2)}M
                      </Button>
                    )}
                    <p className="text-[9px] text-muted-foreground mt-1">
                      Manut. R$ {(cfg.monthlyCost/1000).toFixed(0)}k/mês
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
