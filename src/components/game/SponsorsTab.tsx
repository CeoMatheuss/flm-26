import {
  Sponsor, SponsorOffer, sponsorTypeLabels,
  premiumSponsorPlans,
} from '@/types/sponsor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Handshake, Plus, DollarSign, AlertTriangle, Target, Calendar,
  Trophy, Crown, Lock, Sparkles, CheckCircle2, Clock,
} from 'lucide-react';
import { usePremiumSponsorship } from '@/hooks/usePremiumSponsorship';

interface Props {
  sponsors: Sponsor[];
  offers: SponsorOffer[];
  reputation: number;
  onAccept: (offer: SponsorOffer) => void;
  onRefreshOffers: () => void;
  userId?: string;
  addBonus?: (amount: number, description: string) => void;
}

const fmtBRL = (v: number) =>
  v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(2)}M`
  : v >= 1_000 ? `R$ ${(v / 1_000).toFixed(0)}k`
  : `R$ ${v}`;

export function SponsorsTab({ sponsors, offers, reputation, onAccept, onRefreshOffers, userId, addBonus }: Props) {
  const atLimit = sponsors.length >= 3;
  const totalMonthly = sponsors
    .filter(s => s.payMode === 'monthly')
    .reduce((s, sp) => s + sp.monthlyPay, 0);

  const premium = usePremiumSponsorship(userId, addBonus);
  const activePremium = premium.active;
  const remainingPremium = activePremium ? Math.max(0, activePremium.total_value - activePremium.received_value) : 0;
  const premiumProgress = activePremium ? (activePremium.received_value / activePremium.total_value) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* ─── Contratos Ativos ───────────────────────────────────── */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Handshake className="h-5 w-5" /> Patrocínios Ativos ({sponsors.length}/3)
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              Receita mensal: <span className="text-primary font-bold">{fmtBRL(totalMonthly)}</span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sponsors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum patrocinador ativo. Aceite ofertas abaixo!
            </p>
          ) : (
            <div className="space-y-3">
              {sponsors.map(sp => {
                const progress = (sp.installmentsPaid / Math.max(1, sp.installmentsTotal)) * 100;
                const winsTarget = sp.objective.target ?? 0;
                const winsTracked = sp.winsTracked ?? 0;
                const winsProgress = sp.objective.kind === 'win_n_matches'
                  ? Math.min(100, (winsTracked / Math.max(1, winsTarget)) * 100)
                  : null;

                return (
                  <div key={sp.id} className="p-3 bg-muted/30 rounded-lg border border-border/40 space-y-2">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {sponsorTypeLabels[sp.type]}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{sp.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Total: <span className="text-primary font-semibold">{fmtBRL(sp.totalValue)}</span>
                          {' · '}
                          {sp.payMode === 'monthly'
                            ? `${fmtBRL(sp.monthlyPay)}/parcela`
                            : 'Pagamento ao concluir'}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        <Calendar className="h-3 w-3 mr-1" />
                        {sp.duration} temp.
                      </Badge>
                    </div>

                    {/* Objetivo */}
                    <div className="flex items-center gap-2 text-xs bg-primary/5 rounded px-2 py-1.5 border border-primary/20">
                      <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium">{sp.objective?.label ?? 'Sem objetivo'}</span>
                      {winsProgress !== null && (
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {winsTracked}/{winsTarget}
                        </span>
                      )}
                    </div>
                    {winsProgress !== null && (
                      <Progress value={winsProgress} className="h-1" />
                    )}

                    {/* Parcelas */}
                    {sp.payMode === 'monthly' && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Parcelas pagas: {sp.installmentsPaid}/{sp.installmentsTotal}</span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} className="h-1" />
                      </div>
                    )}

                    {/* Multa */}
                    <div className="flex items-center gap-2 text-[11px] text-destructive/90 bg-destructive/5 rounded px-2 py-1 border border-destructive/20">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>Multa por descumprir: <strong>{fmtBRL(sp.penalty)}</strong> — pode falir o clube</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Ofertas ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Ofertas Disponíveis</span>
            <Button size="sm" variant="outline" onClick={onRefreshOffers}>Buscar Novas</Button>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Reputação: <span className="text-primary font-semibold">{reputation}</span> — Quanto maior, mais ousados (e lucrativos) os contratos
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {offers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma oferta no momento.</p>
            )}
            {offers.map(offer => {
              const eligible = reputation >= offer.minReputation && !atLimit;
              return (
                <div key={offer.id} className="p-3 bg-accent/20 rounded-lg border border-border/30 space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge className="text-xs shrink-0">{sponsorTypeLabels[offer.type]}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{offer.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {offer.duration} temporada(s) · Rep. mín: {offer.minReputation}
                        {' · '}
                        <span className="text-primary font-semibold">
                          {offer.payMode === 'monthly'
                            ? `${fmtBRL(offer.monthlyPay)}/parcela`
                            : 'Pago ao concluir objetivo'}
                        </span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onAccept(offer)}
                      disabled={!eligible}
                      className="shrink-0"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {atLimit ? 'Limite' : reputation < offer.minReputation ? 'Rep. baixa' : 'Aceitar'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="bg-primary/10 rounded px-2 py-1.5 border border-primary/20">
                      <div className="text-[9px] text-muted-foreground uppercase">Valor total</div>
                      <div className="font-bold text-primary">{fmtBRL(offer.totalValue)}</div>
                    </div>
                    <div className="bg-yellow-500/10 rounded px-2 py-1.5 border border-yellow-500/20">
                      <div className="text-[9px] text-muted-foreground uppercase">Objetivo</div>
                      <div className="font-bold text-yellow-400 text-[10px] leading-tight">{offer.objective.label}</div>
                    </div>
                    <div className="bg-destructive/10 rounded px-2 py-1.5 border border-destructive/20">
                      <div className="text-[9px] text-muted-foreground uppercase">Multa</div>
                      <div className="font-bold text-destructive">{fmtBRL(offer.penalty)}</div>
                    </div>
                  </div>

                  {offer.payMode === 'on_complete' && (
                    <div className="flex items-center gap-2 text-[10px] text-yellow-300 bg-yellow-500/5 rounded px-2 py-1 border border-yellow-500/20">
                      <Trophy className="h-3 w-3 shrink-0" />
                      Pagamento integral apenas se objetivo for cumprido
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Patrocínios Premium SmartPit ─────────────────────── */}
      <Card className="border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 via-amber-500/5 to-orange-500/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <span className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent font-black">
              SmartPit — Patrocínio Premium
            </span>
            <Badge variant="outline" className="ml-auto text-[10px] border-yellow-500/40 text-yellow-400">
              <Sparkles className="h-3 w-3 mr-1" /> COMPRA ÚNICA
            </Badge>
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Compre uma vez e receba o valor pingando todo dia no caixa, até zerar. Sem assinatura, sem renovação automática.
          </p>
        </CardHeader>
        <CardContent>
          {/* Contrato Premium ATIVO */}
          {activePremium && (
            <div className="mb-4 p-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-yellow-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{activePremium.plan_name} <span className="text-[10px] text-yellow-300">ativo</span></p>
                  <p className="text-[10px] text-muted-foreground">
                    {fmtBRL(activePremium.daily_value)}/dia · Total: {fmtBRL(activePremium.total_value)}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-300 shrink-0">
                  <Clock className="h-3 w-3 mr-1" /> {Math.ceil(remainingPremium / Math.max(1, activePremium.daily_value))}d
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="bg-card/40 rounded px-2 py-1.5 border border-yellow-500/20 text-center">
                  <div className="text-[9px] text-muted-foreground uppercase">Recebido</div>
                  <div className="font-bold text-yellow-400">{fmtBRL(activePremium.received_value)}</div>
                </div>
                <div className="bg-card/40 rounded px-2 py-1.5 border border-yellow-500/20 text-center">
                  <div className="text-[9px] text-muted-foreground uppercase">Restante</div>
                  <div className="font-bold text-yellow-300">{fmtBRL(remainingPremium)}</div>
                </div>
                <div className="bg-card/40 rounded px-2 py-1.5 border border-yellow-500/20 text-center">
                  <div className="text-[9px] text-muted-foreground uppercase">Total</div>
                  <div className="font-bold text-amber-300">{fmtBRL(activePremium.total_value)}</div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Progresso</span>
                  <span>{premiumProgress.toFixed(0)}%</span>
                </div>
                <Progress value={premiumProgress} className="h-1.5" />
              </div>
              <p className="text-[9px] text-muted-foreground/70 leading-snug">
                Você só poderá comprar outro plano premium depois que este contrato for totalmente quitado.
              </p>
            </div>
          )}

          {/* Planos disponíveis */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {premiumSponsorPlans.map(plan => {
              const dailyValue = Math.floor(plan.inGameValue / plan.payoutDays);
              const blocked = !!activePremium || !userId;
              return (
                <div key={plan.id} className="p-3 bg-card/60 rounded-lg border border-yellow-500/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{plan.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{plan.name}</p>
                      <p className="text-[10px] text-muted-foreground">{plan.realPriceLabel}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">{plan.description}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-yellow-500/10 rounded px-2 py-1 border border-yellow-500/20 text-center">
                      <div className="text-[9px] text-muted-foreground uppercase">Total</div>
                      <div className="text-[11px] font-black text-yellow-400">{fmtBRL(plan.inGameValue)}</div>
                    </div>
                    <div className="bg-yellow-500/10 rounded px-2 py-1 border border-yellow-500/20 text-center">
                      <div className="text-[9px] text-muted-foreground uppercase">Por dia</div>
                      <div className="text-[11px] font-black text-yellow-400">{fmtBRL(dailyValue)}</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={blocked}
                    onClick={() => premium.activate({
                      planId: plan.id,
                      planName: plan.name,
                      totalValue: plan.inGameValue,
                      payoutDays: plan.payoutDays,
                    })}
                    className="w-full h-8 text-xs bg-yellow-500 hover:bg-yellow-600 text-black font-bold disabled:bg-yellow-500/40 disabled:text-black/60"
                  >
                    {activePremium
                      ? <><Lock className="h-3 w-3 mr-1" /> Já há um ativo</>
                      : <><Sparkles className="h-3 w-3 mr-1" /> Ativar agora</>}
                  </Button>
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-center text-muted-foreground/60 mt-3">
            Mockup visual: ativação imediata sem cobrança real. Em breve, integração via PIX.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
