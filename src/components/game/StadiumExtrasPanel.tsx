import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Briefcase, Check, X, Clock, Sparkles, Lock } from 'lucide-react';
import {
  STADIUM_ACHIEVEMENTS, STADIUM_SPONSOR_SLOT_META,
  type StadiumSponsorOffer, type StadiumSponsorContract, type StadiumAchievementState,
} from '@/match/stadiumExtras';

interface Props {
  sponsorOffers?: StadiumSponsorOffer[];
  sponsorContracts?: StadiumSponsorContract[];
  achievements?: StadiumAchievementState;
  onAcceptSponsor: (offerId: string) => void;
  onRejectSponsor: (offerId: string) => void;
}

function timeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expirou';
  const d = Math.floor(ms / (24 * 3600_000));
  if (d > 0) return `${d}d`;
  const h = Math.floor(ms / 3600_000);
  return `${h}h`;
}

export function StadiumExtrasPanel({
  sponsorOffers = [], sponsorContracts = [], achievements,
  onAcceptSponsor, onRejectSponsor,
}: Props) {
  const ach = achievements ?? { unlocked: [], progress: {} };
  const unlockedCount = ach.unlocked.length;
  const totalAch = STADIUM_ACHIEVEMENTS.length;
  const pct = Math.round((unlockedCount / totalAch) * 100);

  return (
    <div className="space-y-4">
      {/* Sponsors */}
      <Card className="border-amber-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-amber-400" /> Patrocínios do Estádio
            </span>
            <Badge variant="outline" className="text-[10px]">
              {sponsorContracts.length} ativos
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Contratos ativos */}
          {sponsorContracts.length > 0 && (
            <div className="space-y-1.5">
              {sponsorContracts.map(c => {
                const meta = STADIUM_SPONSOR_SLOT_META[c.slot];
                return (
                  <div key={c.id} className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{meta.emoji}</span>
                        <div>
                          <p className="text-sm font-bold">{c.brand}</p>
                          <p className="text-[10px] text-muted-foreground">{meta.label}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-emerald-300">
                          R$ {(c.monthlyPay / 1000).toFixed(0)}k/mês
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          até {new Date(c.endsAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    {c.bonusIfHealthy > 0 && (
                      <p className="text-[10px] text-amber-300 mt-1">
                        ✨ +R$ {(c.bonusIfHealthy / 1000).toFixed(0)}k de bônus se o estádio estiver íntegro
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Ofertas pendentes */}
          {sponsorOffers.length === 0 && sponsorContracts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">
              📭 Sem ofertas no momento. Aumente reputação e nível do estádio para atrair marcas.
            </p>
          ) : sponsorOffers.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center pt-1">
              Nenhuma nova oferta. Próxima leva em alguns dias.
            </p>
          ) : (
            sponsorOffers.map(o => {
              const meta = STADIUM_SPONSOR_SLOT_META[o.slot];
              return (
                <div key={o.id} className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-2xl">{meta.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{o.brand}</p>
                        <p className="text-[10px] text-muted-foreground">{meta.label}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-emerald-400">
                        R$ {(o.monthlyPay / 1000).toFixed(0)}k/mês
                      </p>
                      <p className="text-[9px] text-muted-foreground flex items-center gap-1 justify-end">
                        <Clock className="h-2.5 w-2.5" /> exp. {timeUntil(o.expiresAt)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-center text-[10px]">
                    <div className="bg-background/40 rounded p-1.5">
                      <p className="uppercase text-muted-foreground">Duração</p>
                      <p className="font-bold">{o.durationMonths} meses</p>
                    </div>
                    <div className="bg-background/40 rounded p-1.5">
                      <p className="uppercase text-muted-foreground">Bônus íntegro</p>
                      <p className="font-bold text-amber-300">+R$ {((o.bonusIfHealthy ?? 0)/1000).toFixed(0)}k/mês</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 h-8 gap-1" onClick={() => onAcceptSponsor(o.id)}>
                      <Check className="h-3.5 w-3.5" /> Aceitar
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8 gap-1" onClick={() => onRejectSponsor(o.id)}>
                      <X className="h-3.5 w-3.5" /> Recusar
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Conquistas */}
      <Card className="border-fuchsia-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-fuchsia-400" /> Conquistas do Estádio
            </span>
            <Badge variant="outline" className="text-[10px]">{unlockedCount}/{totalAch}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={pct} className="h-2" />
          <div className="space-y-1.5">
            {STADIUM_ACHIEVEMENTS.map(a => {
              const unlocked = ach.unlocked.includes(a.id);
              return (
                <div
                  key={a.id}
                  className={`flex items-center justify-between rounded p-2 border ${
                    unlocked ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-muted/20 border-border opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl">{unlocked ? a.emoji : '🔒'}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate flex items-center gap-1">
                        {a.label}
                        {unlocked && <Sparkles className="h-3 w-3 text-amber-400" />}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{a.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className={`text-[11px] font-bold ${unlocked ? 'text-emerald-300' : 'text-muted-foreground'}`}>
                      +R$ {(a.reward / 1000).toFixed(0)}k
                    </p>
                    {a.reputationReward && (
                      <p className="text-[9px] text-fuchsia-300">+{a.reputationReward} rep.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
