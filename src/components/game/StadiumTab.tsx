import { Infrastructure, getStadiumUpgradeCost } from '@/types/infrastructure';
import {
  buildStadiumModules,
  computeMatchRevenue,
  computeExpectedAttendance,
  getMonthlyVipContractIncome,
  evaluateTicketPrice,
  getVipTierConfig,
  VIP_CATALOG,
  type MatchImportance,
  type VipTier,
} from '@/match/stadiumEconomics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Landmark, ArrowUp, Users, Ticket, DollarSign, TrendingUp,
  Crown, ShoppingBag, Car, Wrench, Sparkles, Lock, Hammer,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useLiveMatchGuard } from './LiveMatchGuard';
import stadiumHero from '@/assets/stadium-management-hero.jpg';
import { StadiumOpsPanel } from './StadiumOpsPanel';
import type { StadiumOpsState, StadiumInsurance } from '@/match/stadiumEvents';
import { emptyStadiumOps, getEffectiveCapacity } from '@/match/stadiumEvents';

interface Props {
  infrastructure: Infrastructure;
  budget: number;
  fans: number;
  stadiumName: string;
  ticketPrice: number;
  reputation: number;
  /** Sequência de vitórias atuais (mesma fonte da FansTab) */
  winStreak: number;
  /** Sequência de derrotas atuais */
  loseStreak: number;
  /** Camarotes já construídos por tier */
  vipBoxesBuilt?: { bronze?: number; prata?: number; ouro?: number; master?: number };
  stadiumOps?: StadiumOpsState;
  /** Fase 3: lista de partidas oficiais futuras (em casa) — para detectar conflito com eventos */
  upcomingHomeMatches?: Array<{ id: string; date: string; isHome: boolean; competition?: string; opponent?: string }>;
  onUpgrade: (facility: 'stadium') => void;
  onSetTicketPrice: (price: number) => void;
  onRenameStadium: (name: string) => void;
  onBuildVipBox: (tier: VipTier, cost: number, cap: number) => void;
  onAcceptStadiumEvent: (proposalId: string) => void;
  onRejectStadiumEvent: (proposalId: string) => void;
  onStartStadiumRepair: (damageId: string) => void;
  onBuyStadiumInsurance: (tier: NonNullable<StadiumInsurance['tier']>) => void;
  onCancelStadiumInsurance: () => void;
}

const IMPORTANCE_LABEL: Record<MatchImportance, string> = {
  amistoso: 'Amistoso',
  liga: 'Liga',
  classico: 'Clássico',
  final: 'Final',
};

export function StadiumTab({
  infrastructure, budget, fans, stadiumName, ticketPrice, reputation,
  winStreak, loseStreak, vipBoxesBuilt, stadiumOps, upcomingHomeMatches = [],
  onUpgrade: _onUpgrade, onSetTicketPrice: _onSetTicketPrice,
  onRenameStadium: _onRenameStadium, onBuildVipBox: _onBuildVipBox,
  onAcceptStadiumEvent, onRejectStadiumEvent, onStartStadiumRepair,
  onBuyStadiumInsurance, onCancelStadiumInsurance,
}: Props) {
  const { guard } = useLiveMatchGuard();
  const onUpgrade = guard(_onUpgrade);
  const onSetTicketPrice = guard(_onSetTicketPrice);
  const onRenameStadium = guard(_onRenameStadium);
  const onBuildVipBox = guard(_onBuildVipBox);

  const stadium = infrastructure?.stadium ?? { level: 1, maxLevel: 15 };
  const cost = getStadiumUpgradeCost(stadium.level);
  const isMaxed = stadium.level >= stadium.maxLevel;
  const ops = stadiumOps ?? emptyStadiumOps();

  const [previewImportance, setPreviewImportance] = useState<MatchImportance>('liga');

  const modules = useMemo(
    () => buildStadiumModules(stadium.level, vipBoxesBuilt),
    [stadium.level, vipBoxesBuilt],
  );
  const revenue = useMemo(
    () => computeMatchRevenue(modules, {
      fans, reputation, ticketPrice, winStreak, loseStreak, importance: previewImportance,
    }),
    [modules, fans, reputation, ticketPrice, winStreak, loseStreak, previewImportance],
  );
  const monthlyVipContracts = useMemo(() => getMonthlyVipContractIncome(modules), [modules]);
  const priceVerdict = useMemo(() => evaluateTicketPrice(ticketPrice, reputation), [ticketPrice, reputation]);

  // Cenários de público para o avaliador
  const moodScenarios = useMemo(() => {
    const base = (ws: number, ls: number) => computeExpectedAttendance({
      fans, reputation, ticketPrice, winStreak: ws, loseStreak: ls,
      capacity: modules.seatingCapacity, importance: previewImportance,
    });
    return [
      { mood: 'Crise', emoji: '😡', color: 'text-red-400', count: base(0, 5) },
      { mood: 'Estável', emoji: '😊', color: 'text-foreground', count: base(0, 0) },
      { mood: 'Empolgada', emoji: '🔥', color: 'text-emerald-300', count: base(3, 0) },
      { mood: 'Eufórica', emoji: '🏆', color: 'text-emerald-400', count: base(5, 0) },
    ];
  }, [fans, reputation, ticketPrice, modules.seatingCapacity, previewImportance]);

  const occupancyPct = Math.round(revenue.occupancy * 100);

  return (
    <div className="space-y-4">
      {/* Hero */}
      <Card className="overflow-hidden border-amber-500/30 relative">
        <div className="absolute inset-0">
          <img
            src={stadiumHero}
            alt="Estádio premium iluminado à noite"
            loading="lazy"
            width={1920}
            height={1080}
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        </div>
        <div className="relative p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 mb-2">
                <Sparkles className="h-3 w-3 mr-1" /> Gestão de Estádio
              </Badge>
              <h2 className="text-2xl font-extrabold tracking-tight">{stadiumName}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Nv {stadium.level}/{stadium.maxLevel} • Capacidade {modules.seatingCapacity.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase text-muted-foreground">Receita estimada</p>
              <p className="text-2xl font-extrabold text-amber-400">
                R$ {(revenue.total / 1000).toFixed(0)}k
              </p>
              <p className="text-[10px] text-muted-foreground">/ partida ({IMPORTANCE_LABEL[previewImportance]})</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <KpiCard icon={Users} label="Capacidade" value={getEffectiveCapacity(modules.seatingCapacity, ops.damages).toLocaleString()} />
            <KpiCard icon={TrendingUp} label="Ocupação" value={`${occupancyPct}%`} accent />
            <KpiCard icon={Users} label="Público" value={revenue.attendance.toLocaleString()} />
            <KpiCard icon={Wrench} label="Manut./sem" value={`R$${(modules.weeklyMaintenance/1000).toFixed(0)}k`} muted />
          </div>
          {ops.damages.filter(d => !d.repairing).length > 0 && (
            <div className="mt-2 rounded-md bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-[11px] text-red-300">
              ⚠️ Capacidade reduzida por danos não reparados. Veja a aba abaixo.
            </div>
          )}
        </div>
      </Card>

      {/* Operações do estádio: inbox de eventos, danos, seguro */}
      <StadiumOpsPanel
        ops={ops}
        budget={budget}
        stadiumLevel={stadium.level}
        vipBoxesBuilt={vipBoxesBuilt}
        upcomingHomeMatches={upcomingHomeMatches}
        onAccept={onAcceptStadiumEvent}
        onReject={onRejectStadiumEvent}
        onRepair={onStartStadiumRepair}
        onBuyInsurance={onBuyStadiumInsurance}
        onCancelInsurance={onCancelStadiumInsurance}
      />

      {/* Receita detalhada */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              Receita por Partida
            </span>
            <div className="flex gap-1 flex-wrap">
              {(['amistoso', 'liga', 'classico', 'final'] as MatchImportance[]).map(i => (
                <Button
                  key={i}
                  size="sm"
                  variant={previewImportance === i ? 'default' : 'outline'}
                  className="h-6 px-2 text-[10px]"
                  onClick={() => setPreviewImportance(i)}
                >
                  {IMPORTANCE_LABEL[i]}
                </Button>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <RevenueRow icon={Ticket} label="Ingressos" value={revenue.ticketRevenue}
            hint={`${revenue.attendance.toLocaleString()} × R$${ticketPrice}`} color="text-primary" />
          <RevenueRow icon={Crown} label="Camarotes VIP" value={revenue.vipRevenue}
            hint={`${modules.vipBoxes.reduce((s,b)=>s+b.built,0)} unidades construídas`} color="text-amber-400" />
          <RevenueRow icon={ShoppingBag} label="Área Comercial" value={revenue.commercialRevenue}
            hint={`R$${modules.commercialPerFan}/torcedor presente`} color="text-fuchsia-400" />
          <RevenueRow icon={Car} label="Estacionamento" value={revenue.parkingRevenue}
            hint={`${revenue.parkingUsed}/${modules.parkingSpots} vagas`} color="text-sky-400" />
          <div className="border-t border-border pt-2 flex items-center justify-between">
            <span className="font-bold text-sm">Total da Partida</span>
            <span className="font-extrabold text-lg text-emerald-400">R$ {revenue.total.toLocaleString()}</span>
          </div>
          {monthlyVipContracts > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 text-xs flex items-center justify-between">
              <span className="text-amber-200">+ Contratos VIP (mensal fixo)</span>
              <span className="font-bold text-amber-300">R$ {monthlyVipContracts.toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preço do ingresso + Avaliador */}
      <Card className={`border-2 ${
        priceVerdict.level === 'great' || priceVerdict.level === 'good' ? 'border-emerald-500/30' :
        priceVerdict.level === 'fair' ? 'border-amber-500/30' :
        'border-red-500/30'
      }`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Ticket className="h-4 w-4 text-primary" /> Preço do Ingresso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Avaliador */}
          <div className={`rounded-lg p-3 border ${
            priceVerdict.level === 'great' || priceVerdict.level === 'good' ? 'bg-emerald-500/10 border-emerald-500/30' :
            priceVerdict.level === 'fair' ? 'bg-amber-500/10 border-amber-500/30' :
            'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{priceVerdict.emoji}</span>
              <div>
                <p className={`text-sm font-extrabold ${priceVerdict.color}`}>
                  Preço {priceVerdict.label}
                </p>
                <p className="text-[10px] text-muted-foreground">{priceVerdict.description}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">R$</span>
            <Input
              type="number"
              min={5}
              max={200}
              value={ticketPrice}
              onChange={e => onSetTicketPrice(Number(e.target.value))}
              className="w-24"
            />
            <div className="flex gap-1.5 flex-wrap">
              {[10, 25, 40, 60, 100, 150].map(p => (
                <Button
                  key={p}
                  size="sm"
                  variant={ticketPrice === p ? 'default' : 'outline'}
                  className="h-7 px-2 text-[10px]"
                  onClick={() => onSetTicketPrice(p)}
                >
                  R${p}
                </Button>
              ))}
            </div>
          </div>

          {/* Cenários de público por humor */}
          <div>
            <p className="text-[10px] uppercase text-muted-foreground mb-1.5 font-bold">
              Público estimado por humor da torcida
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {moodScenarios.map(s => (
                <div key={s.mood} className="bg-muted/30 rounded-md p-2 text-center">
                  <p className="text-base">{s.emoji}</p>
                  <p className={`text-sm font-bold ${s.color}`}>{s.count.toLocaleString()}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">{s.mood}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Sua sequência atual: {winStreak >= 2 ? `🔥 ${winStreak} vitórias` : loseStreak >= 2 ? `🔻 ${loseStreak} derrotas` : '➖ Estável'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Camarotes VIP - construção */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-400" /> Camarotes VIP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {VIP_CATALOG.map(cfg => {
            const owned = modules.vipBoxes.find(b => b.tier === cfg.tier);
            if (!owned) return null;
            const unlocked = owned.unlocked;
            const built = owned.built;
            const cap = owned.cap;
            const atCap = built >= cap;
            const canAfford = budget >= cfg.buildCost;

            return (
              <div
                key={cfg.tier}
                className={`p-2.5 rounded-lg border ${
                  unlocked ? 'bg-muted/30 border-border' : 'bg-muted/10 border-dashed border-muted opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl">{cfg.emoji}</span>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
                      {unlocked ? (
                        <p className="text-[10px] text-muted-foreground">
                          R$ {cfg.priceMatch.toLocaleString()}/jogo • R$ {(cfg.monthlyContract / 1000).toFixed(0)}k/mês
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Desbloqueia no Nv {cfg.unlockLevel}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-extrabold">{built}/{cap}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">construídos</p>
                  </div>
                </div>
                {unlocked && (
                  <Button
                    size="sm"
                    className="w-full mt-2 h-8 gap-1.5"
                    variant={atCap ? 'outline' : 'default'}
                    disabled={atCap || !canAfford}
                    onClick={() => onBuildVipBox(cfg.tier, cfg.buildCost, cap)}
                  >
                    <Hammer className="h-3.5 w-3.5" />
                    {atCap
                      ? `Limite do Nv ${stadium.level} atingido`
                      : `Construir 1× ${cfg.label} — R$ ${(cfg.buildCost / 1000).toFixed(0)}k`}
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Upgrade global */}
      <Card className="border-emerald-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-emerald-400" /> Expansão do Estádio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium whitespace-nowrap">Nv {stadium.level}/{stadium.maxLevel}</span>
            <Progress value={(stadium.level / stadium.maxLevel) * 100} className="flex-1 h-3" />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Subir de nível aumenta a capacidade, libera camarotes VIP de tier superior, expande o estacionamento
            e aumenta a receita comercial por torcedor.
          </p>
          {!isMaxed ? (
            <Button onClick={() => onUpgrade('stadium')} disabled={budget < cost} className="w-full gap-2">
              <ArrowUp className="h-4 w-4" />
              Expandir para Nv {stadium.level + 1} — R$ {(cost / 1_000_000).toFixed(2)}M
            </Button>
          ) : (
            <p className="text-sm text-center text-emerald-400 font-semibold py-2">✅ Estádio no Nível Máximo!</p>
          )}
        </CardContent>
      </Card>

      {/* Renomear */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="h-4 w-4 text-muted-foreground" /> Renomear Estádio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              defaultValue={stadiumName}
              placeholder="Nome do estádio"
              id="stadium-name-input"
              className="flex-1"
            />
            <Button onClick={() => {
              const input = document.getElementById('stadium-name-input') as HTMLInputElement;
              if (input?.value) onRenameStadium(input.value);
            }}>
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, accent, muted }: {
  icon: any; label: string; value: string; accent?: boolean; muted?: boolean;
}) {
  return (
    <div className={`rounded-lg p-2.5 text-center backdrop-blur-sm ${
      accent ? 'bg-amber-500/15 border border-amber-500/30' :
      muted ? 'bg-background/40 border border-border' :
      'bg-background/60 border border-border'
    }`}>
      <Icon className={`h-3.5 w-3.5 mx-auto mb-1 ${accent ? 'text-amber-400' : muted ? 'text-muted-foreground' : 'text-primary'}`} />
      <p className="text-base font-bold leading-tight">{value}</p>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}

function RevenueRow({ icon: Icon, label, value, hint, color }: {
  icon: any; label: string; value: number; hint: string; color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={`h-4 w-4 shrink-0 ${color}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{label}</p>
          <p className="text-[10px] text-muted-foreground truncate">{hint}</p>
        </div>
      </div>
      <span className={`text-sm font-bold ${color}`}>R$ {value.toLocaleString()}</span>
    </div>
  );
}
