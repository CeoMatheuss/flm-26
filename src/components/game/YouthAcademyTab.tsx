import { useState, useEffect } from 'react';
import {
  YouthProspect, getAcademyUpgradeCost, getYouthMinOverall, getYouthMaxOverall,
  youthInvestmentTiers, getYouthTierByCost, potentialTierInfo, evolutionStatusInfo, youthTagInfo,
  computeEvolutionStatus, computeYouthTag, getPotentialTier,
} from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  UserPlus, Info, ArrowUp, Sparkles, GraduationCap, Coins, TrendingUp,
  DollarSign, Eye, Trophy, Hammer, Crown,
} from 'lucide-react';
import { formatMoney } from '@/lib/formatMoney';
import { useLiveMatchGuard } from './LiveMatchGuard';

interface Props {
  prospects: YouthProspect[];
  academyLevel: number;
  academyUpgradeCompletesAt?: string;
  isPremium?: boolean;
  monthlyInvestment: number;
  budget: number;
  hasScouts: boolean;
  currentSeason: number;
  onPromote: (id: string) => void;
  onSell: (id: string) => void;
  onEnrollCopinha: () => void;
  onSetInvestment: (amount: number) => void;
  onUpgradeAcademy?: () => void;
}

const getLevelTier = (level: number) => {
  if (level <= 5) return { label: 'Inicial', color: 'text-muted-foreground', emoji: '🔹', desc: 'Jovens fracos (OVR 40-55)' };
  if (level <= 10) return { label: 'Básico', color: 'text-blue-400', emoji: '🔸', desc: 'Algum potencial (OVR 45-60)' };
  if (level <= 20) return { label: 'Intermediário', color: 'text-emerald-400', emoji: '🔶', desc: 'Boas promessas (OVR 50-70)' };
  if (level <= 25) return { label: 'Avançado', color: 'text-orange-400', emoji: '🟠', desc: 'Talentos raros (OVR 55-80)' };
  return { label: 'Elite Mundial', color: 'text-amber-400', emoji: '🌟', desc: 'Craques geracionais (OVR 60-85, POT 99)' };
};

export function YouthAcademyTab({
  prospects, academyLevel, academyUpgradeCompletesAt, isPremium = false,
  monthlyInvestment, budget, hasScouts, currentSeason,
  onPromote: _onPromote, onSell: _onSell, onEnrollCopinha: _onEnrollCopinha, onSetInvestment: _onSetInvestment, onUpgradeAcademy: _onUpgradeAcademy,
}: Props) {
  const { guard } = useLiveMatchGuard();
  const onPromote = guard(_onPromote);
  const onSell = guard(_onSell);
  const onEnrollCopinha = guard(_onEnrollCopinha);
  const onSetInvestment = guard(_onSetInvestment);
  const onUpgradeAcademy = _onUpgradeAcademy ? guard(_onUpgradeAcademy) : undefined;
  const upgradeCost = getAcademyUpgradeCost(academyLevel);
  const canUpgrade = budget >= upgradeCost && academyLevel < 30;
  const tier = getLevelTier(academyLevel);
  const minOvr = getYouthMinOverall(academyLevel);
  const maxOvr = getYouthMaxOverall(academyLevel);
  const nextMinOvr = academyLevel < 30 ? getYouthMinOverall(academyLevel + 1) : minOvr;
  const nextMaxOvr = academyLevel < 30 ? getYouthMaxOverall(academyLevel + 1) : maxOvr;
  const currentTier = getYouthTierByMonthlyCost(monthlyInvestment);
  const copinhaUnlocked = currentSeason >= 2;
  const eligibleForCopinha = prospects.filter(p => p.age <= 20).length;

  const [observed, setObserved] = useState<YouthProspect | null>(null);

  // Live ticker for construction countdown (re-render every 30s)
  const [, setNowTick] = useState(0);
  useEffect(() => {
    if (!academyUpgradeCompletesAt) return;
    const interval = setInterval(() => setNowTick(t => t + 1), 30_000);
    return () => clearInterval(interval);
  }, [academyUpgradeCompletesAt]);

  const isConstructing = !!academyUpgradeCompletesAt && new Date(academyUpgradeCompletesAt).getTime() > Date.now();
  const constructionProgress = (() => {
    if (!isConstructing || !academyUpgradeCompletesAt) return 0;
    const target = new Date(academyUpgradeCompletesAt).getTime();
    const start = target - 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - start;
    return Math.max(0, Math.min(100, (elapsed / (24 * 60 * 60 * 1000)) * 100));
  })();
  const constructionRemaining = (() => {
    if (!isConstructing || !academyUpgradeCompletesAt) return '';
    const diff = new Date(academyUpgradeCompletesAt).getTime() - Date.now();
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  })();

  return (
    <div className="space-y-4">
      {/* Quick Guide */}
      <Card className="game-card border-primary/20">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs sm:text-sm">
              <p className="font-bold text-foreground">Como funciona a Base V2?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-muted-foreground">
                <p>🏗️ <strong className="text-foreground">Nível</strong> = Qualidade dos jovens (OVR/POT)</p>
                <p>💰 <strong className="text-foreground">Investimento</strong> = Quantidade de jovens/mês</p>
                <p>👶 Jovens surgem com <strong className="text-foreground">16 anos</strong></p>
                <p>🔍 <strong className="text-foreground">Olheiros</strong> revelam o Potencial (POT)</p>
                <p>⚽ Partidas da base aceleram a evolução</p>
                <p>🏆 <strong className="text-foreground">Copinha</strong> dá grande boost (≤20 anos)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Academy Level Card */}
      <Card className="game-card-accent overflow-hidden">
        <CardHeader className="section-header pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-400" />
            Nível da Base
            <span className="game-badge bg-primary/15 text-primary ml-auto">Nv. {academyLevel}/30</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-3">
          <div className="flex items-center gap-4 p-3 rounded-lg bg-accent/50 border border-border/20">
            <div className="text-center min-w-[50px]">
              <p className="text-3xl font-bold text-primary">{academyLevel}</p>
              <p className="text-[10px] text-muted-foreground">/ 30</p>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-sm font-semibold ${tier.color}`}>{tier.emoji} {tier.label}</span>
              </div>
              <Progress value={(academyLevel / 30) * 100} className="h-2.5 mb-1 progress-glow" />
              <p className="text-[10px] text-muted-foreground">{tier.desc}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-accent/30">
            <TrendingUp className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium">Qualidade dos Jovens Gerados</p>
              <p className="text-[10px] text-muted-foreground">Overall entre <strong className="text-foreground">{minOvr}</strong> e <strong className="text-foreground">{maxOvr}</strong></p>
            </div>
            <Badge variant="outline" className="text-[10px]">OVR {minOvr}–{maxOvr}</Badge>
          </div>

          {isConstructing ? (
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 space-y-2.5">
              <div className="flex items-center gap-2">
                <Hammer className="h-4 w-4 text-orange-400 animate-pulse" />
                <p className="text-sm font-bold text-orange-300">Obra em andamento → Nv {academyLevel + 1}</p>
                <Badge variant="outline" className="ml-auto text-[10px] border-orange-500/40 text-orange-300 font-mono">
                  ⏱ {constructionRemaining}
                </Badge>
              </div>
              <Progress value={constructionProgress} className="h-2.5" />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{Math.round(constructionProgress)}% concluído</span>
                <span>Free: 24h · ⭐ Premium: instantâneo</span>
              </div>
              <Button
                size="sm"
                disabled
                className="w-full gap-1.5 h-9 bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/20"
              >
                <Crown className="h-3.5 w-3.5" /> Concluir agora (Premium)
              </Button>
            </div>
          ) : academyLevel < 30 ? (
            <div className="p-3 rounded-lg bg-accent/30 border border-border/20">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <ArrowUp className="h-3.5 w-3.5 text-primary" />
                    Melhorar para Nível {academyLevel + 1}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    OVR: {minOvr}–{maxOvr} → <strong className="text-primary">{nextMinOvr}–{nextMaxOvr}</strong>
                  </p>
                </div>
                {!isPremium && (
                  <Badge variant="outline" className="text-[9px] border-orange-500/30 text-orange-400 shrink-0">
                    ⏱ 24h obra
                  </Badge>
                )}
                {isPremium && (
                  <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 shrink-0">
                    ⭐ Instantâneo
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                disabled={!canUpgrade}
                onClick={onUpgradeAcademy}
                className="w-full gap-1.5 h-10"
              >
                <Coins className="h-3.5 w-3.5" />
                {formatMoney(upgradeCost)}
                {!canUpgrade && budget < upgradeCost && <span className="text-[9px] opacity-70 ml-1">(sem orçamento)</span>}
              </Button>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-sm font-bold text-amber-400">🌟 Base no nível máximo!</p>
              <p className="text-xs text-muted-foreground">Sua academia é referência mundial</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Investment Tiers — 2x3 grid */}
      <Card className="game-card">
        <CardHeader className="section-header pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            Plano Mensal de Investimento
          </CardTitle>
          <CardDescription className="text-[10px]">
            Mais investimento = mais jovens gerados por mês (qualidade depende do nível da base)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-2">
            {youthInvestmentTiers.map(t => {
              const isActive = currentTier.tier === t.tier;
              return (
                <button
                  key={t.tier}
                  onClick={() => onSetInvestment(t.cost)}
                  className={`flex flex-col text-left rounded-xl border transition-all p-3 ${
                    isActive
                      ? 'bg-primary/15 border-primary/60 ring-1 ring-primary/30'
                      : 'bg-card/40 border-border/30 hover:border-primary/40 hover:bg-card/60'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center mb-2 text-lg">
                    {t.emoji}
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t.label}</span>
                  <span className="text-base font-black mt-0.5">{formatMoney(t.cost)}<span className="text-[10px] font-normal text-muted-foreground">/mês</span></span>
                  <span className="text-[10px] text-muted-foreground">
                    {t.minPlayers === 0 ? '0 jogadores' : t.minPlayers === t.maxPlayers ? `${t.minPlayers} jogador${t.minPlayers > 1 ? 'es' : ''}/mês` : `${t.minPlayers}–${t.maxPlayers} jogadores/mês`}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Copinha */}
      <Card className={`game-card ${copinhaUnlocked ? 'border-amber-500/30' : ''}`}>
        <CardHeader className="section-header pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            Copinha Sub-20
            {!copinhaUnlocked && <Badge variant="outline" className="text-[9px] ml-auto">Temporada 2+</Badge>}
          </CardTitle>
          <CardDescription className="text-[10px]">
            {copinhaUnlocked
              ? 'Inscreva sua base na Copinha — apenas jogadores ≤20 anos. Boost de até +15 OVR para os campeões!'
              : 'Disponível a partir da 2ª temporada do save.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 border border-border/20">
            <div className="flex-1">
              <p className="text-xs font-medium">Jogadores elegíveis</p>
              <p className="text-[10px] text-muted-foreground">{eligibleForCopinha} jovens com 20 anos ou menos</p>
            </div>
            <Button
              size="sm"
              disabled={!copinhaUnlocked || eligibleForCopinha < 5}
              onClick={onEnrollCopinha}
              className="gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
            >
              <Trophy className="h-3.5 w-3.5" />
              Inscrever
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prospects List */}
      <Card className="game-card">
        <CardHeader className="section-header pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Jovens na Base
            <span className="game-badge bg-accent text-foreground ml-auto">{prospects.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {!hasScouts && prospects.length > 0 && (
            <div className="flex items-center gap-2 p-2.5 mb-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="text-sm">🔍</span>
              <p className="text-[11px] text-amber-300">Contrate um <strong>olheiro</strong> para revelar o potencial (POT) e o tier dos jovens!</p>
            </div>
          )}
          {prospects.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum jovem na base</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Invista e aguarde a próxima geração mensal</p>
            </div>
          ) : (
            <div className="space-y-2">
              {prospects.map(p => {
                const evoStatus = p.evolutionStatus ?? computeEvolutionStatus(p);
                const tag = p.youthTag ?? computeYouthTag(p);
                const potTier = p.potentialTier ?? getPotentialTier(p.potential, p.overall);
                const tagInfo = tag ? youthTagInfo[tag] : null;
                const evoInfo = evolutionStatusInfo[evoStatus];
                const potInfo = potentialTierInfo[potTier];
                const isInjured = (p.injuredCycles ?? 0) > 0;

                return (
                  <div key={p.id} className={`flex flex-col gap-2 p-3 rounded-lg bg-accent/30 border border-border/10 hover:bg-accent/50 transition-colors ${isInjured ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Badge variant="outline" className="text-[10px] shrink-0">{p.position}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-medium text-xs sm:text-sm truncate">{p.name}</p>
                          {tagInfo && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${tagInfo.color}`}>
                              {tagInfo.emoji} {tagInfo.label}
                            </span>
                          )}
                          {isInjured && <span className="text-[9px] px-1.5 py-0.5 rounded border bg-red-500/20 text-red-300 border-red-500/40">🏥 Lesionado</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {p.age} anos • {p.monthsInAcademy ?? 0}m na base • <span className={evoInfo.color}>{evoInfo.emoji} {evoInfo.label}</span>
                        </p>
                      </div>
                      <div className="text-center shrink-0">
                        <p className="text-base font-bold">{p.overall}</p>
                        <p className="text-[8px] text-muted-foreground uppercase">OVR</p>
                      </div>
                      {hasScouts ? (
                        <div className="text-center shrink-0">
                          <p className={`text-base font-bold ${potInfo.color}`}>{p.potential}</p>
                          <p className="text-[8px] text-muted-foreground uppercase">POT</p>
                        </div>
                      ) : (
                        <div className="text-center shrink-0">
                          <p className="text-base font-bold text-muted-foreground/30">???</p>
                          <p className="text-[8px] text-muted-foreground uppercase">POT</p>
                        </div>
                      )}
                    </div>
                    {hasScouts && (
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-semibold ${potInfo.color} shrink-0`}>{potInfo.emoji} {potInfo.label}</span>
                        <Progress value={(p.overall / Math.max(1, p.potential)) * 100} className="h-1.5 progress-glow flex-1" />
                        <span className="text-[9px] text-muted-foreground shrink-0">{Math.round((p.overall / Math.max(1, p.potential)) * 100)}%</span>
                      </div>
                    )}
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => onPromote(p.id)} disabled={isInjured} className="flex-1 h-8 text-[10px] gap-1">
                        <UserPlus className="h-3 w-3" /> Promover
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onSell(p.id)} disabled={isInjured} className="flex-1 h-8 text-[10px] gap-1">
                        <DollarSign className="h-3 w-3" /> Vender ({formatMoney(p.overall * 50_000)})
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setObserved(p)} className="h-8 text-[10px] gap-1 px-2">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observe modal */}
      <Dialog open={!!observed} onOpenChange={(o) => !o && setObserved(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" /> Observar Jovem
            </DialogTitle>
          </DialogHeader>
          {observed && (
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-lg bg-accent/40 space-y-1">
                <p className="font-bold text-base">{observed.name}</p>
                <p className="text-xs text-muted-foreground">
                  {observed.position} • {observed.age} anos • {observed.monthsInAcademy ?? 0} meses na base
                </p>
                {observed.personality && (
                  <p className="text-xs"><strong>Personalidade:</strong> <span className="capitalize">{observed.personality}</span></p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-accent/40 text-center">
                  <p className="text-2xl font-bold">{observed.overall}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">OVR Atual</p>
                </div>
                <div className="p-2 rounded bg-accent/40 text-center">
                  {hasScouts ? (
                    <>
                      <p className={`text-2xl font-bold ${potentialTierInfo[observed.potentialTier ?? getPotentialTier(observed.potential)].color}`}>
                        {observed.potential}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">POT Máximo</p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-muted-foreground/30">???</p>
                      <p className="text-[10px] text-muted-foreground uppercase">POT (precisa olheiro)</p>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <p><strong>Status:</strong> <span className={evolutionStatusInfo[observed.evolutionStatus ?? computeEvolutionStatus(observed)].color}>
                  {evolutionStatusInfo[observed.evolutionStatus ?? computeEvolutionStatus(observed)].emoji} {evolutionStatusInfo[observed.evolutionStatus ?? computeEvolutionStatus(observed)].label}
                </span></p>
                <p><strong>Jogos pela base:</strong> {observed.gamesPlayed ?? 0}</p>
                <p><strong>Moral:</strong> {observed.morale ?? 0}/100</p>
                <p><strong>Estamina:</strong> {observed.stamina ?? 0}/100</p>
                {hasScouts && (
                  <p><strong>Tier de potencial:</strong> <span className={potentialTierInfo[observed.potentialTier ?? getPotentialTier(observed.potential)].color}>
                    {potentialTierInfo[observed.potentialTier ?? getPotentialTier(observed.potential)].emoji} {potentialTierInfo[observed.potentialTier ?? getPotentialTier(observed.potential)].label}
                  </span></p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
