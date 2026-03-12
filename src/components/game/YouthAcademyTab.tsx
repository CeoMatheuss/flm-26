import { YouthProspect } from '@/types/infrastructure';
import { getAcademyUpgradeCost, getYouthMinOverall, getYouthMaxOverall } from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UserPlus, Star, Info, ArrowUp, Sparkles, GraduationCap, Coins, TrendingUp } from 'lucide-react';

interface Props {
  prospects: YouthProspect[];
  academyLevel: number;
  monthlyInvestment: number;
  budget: number;
  hasScouts: boolean;
  onPromote: (id: string) => void;
  onSetInvestment: (amount: number) => void;
  onGenerateYouth?: () => void;
  onUpgradeAcademy?: () => void;
}

const investmentTiers = [
  { amount: 0, label: 'R$ 0', players: '0', desc: 'Sem Investimento', emoji: '❌', hint: 'Nenhum jovem será gerado' },
  { amount: 500000, label: 'R$ 500k', players: '1–2', desc: 'Básico', emoji: '🔹', hint: 'Poucos jovens, bom para começar' },
  { amount: 1500000, label: 'R$ 1.5M', players: '2–3', desc: 'Médio', emoji: '🔸', hint: 'Volume moderado de jovens' },
  { amount: 3000000, label: 'R$ 3M', players: '3–5', desc: 'Alto', emoji: '🔶', hint: 'Máximo volume de jovens' },
];

const getLevelTier = (level: number) => {
  if (level <= 5) return { label: 'Inicial', color: 'text-muted-foreground', emoji: '🔹', desc: 'Jogadores fracos (OVR baixo)' };
  if (level <= 10) return { label: 'Básico', color: 'text-blue-400', emoji: '🔸', desc: 'Jogadores com algum potencial' };
  if (level <= 15) return { label: 'Intermediário', color: 'text-emerald-400', emoji: '🔶', desc: 'Bons jogadores para o elenco' };
  if (level <= 20) return { label: 'Avançado', color: 'text-orange-400', emoji: '🔴', desc: 'Promessas frequentes' };
  if (level <= 25) return { label: 'Elite', color: 'text-purple-400', emoji: '🟣', desc: 'Talentos de alto potencial' };
  return { label: 'Mundial', color: 'text-primary', emoji: '🟡', desc: '⭐ Craques geracionais possíveis!' };
};

export function YouthAcademyTab({ prospects, academyLevel, monthlyInvestment, budget, hasScouts, onPromote, onSetInvestment, onGenerateYouth, onUpgradeAcademy }: Props) {
  const upgradeCost = getAcademyUpgradeCost(academyLevel);
  const canUpgrade = budget >= upgradeCost && academyLevel < 30;
  const tier = getLevelTier(academyLevel);
  const minOvr = getYouthMinOverall(academyLevel);
  const maxOvr = getYouthMaxOverall(academyLevel);
  const nextMinOvr = academyLevel < 30 ? getYouthMinOverall(academyLevel + 1) : minOvr;
  const nextMaxOvr = academyLevel < 30 ? getYouthMaxOverall(academyLevel + 1) : maxOvr;

  return (
    <div className="space-y-4">
      {/* How it works - Quick Guide */}
      <Card className="game-card border-primary/20">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs sm:text-sm">
              <p className="font-bold text-foreground">Como funciona a Base?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-muted-foreground">
                <p>🏗️ <strong className="text-foreground">Nível da Base</strong> = Qualidade (OVR) dos jovens</p>
                <p>💰 <strong className="text-foreground">Investimento</strong> = Quantidade de jovens gerados</p>
                <p>📅 Jovens chegam a cada <strong className="text-foreground">4 rodadas</strong></p>
                <p>🔍 <strong className="text-foreground">Olheiros</strong> revelam o Potencial (POT)</p>
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
          {/* Level Display */}
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

          {/* OVR Range */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-accent/30">
            <TrendingUp className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium">Qualidade dos Jovens Gerados</p>
              <p className="text-[10px] text-muted-foreground">Overall entre <strong className="text-foreground">{minOvr}</strong> e <strong className="text-foreground">{maxOvr}</strong></p>
            </div>
            <Badge variant="outline" className="text-[10px]">OVR {minOvr}–{maxOvr}</Badge>
          </div>

          {/* Upgrade Button */}
          {academyLevel < 30 ? (
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
              </div>
              <Button 
                size="sm" 
                disabled={!canUpgrade}
                onClick={onUpgradeAcademy}
                className="w-full gap-1.5 h-10"
              >
                <Coins className="h-3.5 w-3.5" />
                R$ {upgradeCost >= 1000000 ? `${(upgradeCost / 1000000).toFixed(1)}M` : `${(upgradeCost / 1000).toFixed(0)}k`}
                {!canUpgrade && budget < upgradeCost && <span className="text-[9px] opacity-70 ml-1">(sem orçamento)</span>}
              </Button>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
              <p className="text-sm font-bold text-emerald-400">🏆 Base no nível máximo!</p>
              <p className="text-xs text-muted-foreground">Sua academia é referência mundial</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Investment Tier Card */}
      <Card className="game-card">
        <CardHeader className="section-header pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            Investimento por Temporada
          </CardTitle>
          <CardDescription className="text-[10px]">
            Escolha quanto investir — mais dinheiro = mais jovens (não melhores)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-2">
            {investmentTiers.map(t => {
              const isActive = monthlyInvestment === t.amount;
              return (
                <button
                  key={t.amount}
                  onClick={() => onSetInvestment(t.amount)}
                  className={`flex flex-col items-start p-3 rounded-xl text-left transition-all border ${
                    isActive 
                      ? 'bg-primary/15 border-primary/30 ring-1 ring-primary/20' 
                      : 'bg-accent/40 border-border/20 hover:bg-accent/60 hover:border-primary/20'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t.emoji} {t.desc}</span>
                  <span className="text-sm font-bold mt-0.5">{t.label}</span>
                  <span className="text-[10px] text-muted-foreground">{t.players} jogadores/ciclo</span>
                  <span className="text-[9px] text-muted-foreground/70 mt-0.5">{t.hint}</span>
                </button>
              );
            })}
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
              <p className="text-[11px] text-amber-300">Contrate um <strong>olheiro</strong> para revelar o potencial (POT) dos jovens!</p>
            </div>
          )}
          {prospects.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum jovem na base</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Invista e aguarde 4 rodadas para gerar uma safra</p>
            </div>
          ) : (
            <div className="space-y-2">
              {prospects.map(p => (
                <div key={p.id} className="flex items-center gap-2 sm:gap-3 p-2.5 rounded-lg bg-accent/30 border border-border/10 hover:bg-accent/50 transition-colors">
                  <Badge variant="outline" className="text-[10px] shrink-0">{p.position}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.age} anos • {p.monthsInAcademy}m na base</p>
                  </div>
                   <div className="text-center shrink-0">
                     <p className="text-base font-bold">{p.overall}</p>
                     <p className="text-[8px] text-muted-foreground uppercase">OVR</p>
                   </div>
                   {hasScouts ? (
                     <div className="text-center shrink-0">
                       <p className="text-base font-bold text-primary">{p.potential}</p>
                       <p className="text-[8px] text-muted-foreground uppercase">POT</p>
                     </div>
                   ) : (
                     <div className="text-center shrink-0">
                       <p className="text-base font-bold text-muted-foreground/30">???</p>
                       <p className="text-[8px] text-muted-foreground uppercase">POT</p>
                     </div>
                   )}
                   <div className="w-10 shrink-0">
                     {hasScouts ? (
                       <Progress value={(p.overall / p.potential) * 100} className="h-1.5 progress-glow" />
                     ) : (
                       <Progress value={50} className="h-1.5 opacity-30" />
                     )}
                   </div>
                  <Button size="sm" onClick={() => onPromote(p.id)} className="shrink-0 h-7 text-[10px] sm:text-xs px-2 sm:px-3">
                    <UserPlus className="h-3 w-3 sm:mr-1" /> <span className="hidden sm:inline">Promover</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
