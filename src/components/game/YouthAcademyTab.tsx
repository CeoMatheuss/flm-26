import { YouthProspect } from '@/types/infrastructure';
import { getAcademyUpgradeCost, getYouthMinOverall, getYouthMaxOverall } from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UserPlus, Star, Info, ArrowUp, Sparkles, GraduationCap } from 'lucide-react';

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
  { amount: 0, label: 'Nenhum', players: '0', desc: 'Sem geração' },
  { amount: 500000, label: 'R$ 500k', players: '1–2', desc: 'Básico' },
  { amount: 1500000, label: 'R$ 1.5M', players: '2–3', desc: 'Médio' },
  { amount: 3000000, label: 'R$ 3M', players: '3–5', desc: 'Alto' },
];

const getLevelTier = (level: number) => {
  if (level <= 5) return { label: 'Inicial', color: 'text-zinc-400', emoji: '🔹' };
  if (level <= 10) return { label: 'Básico', color: 'text-blue-400', emoji: '🔸' };
  if (level <= 15) return { label: 'Intermediário', color: 'text-emerald-400', emoji: '🔶' };
  if (level <= 20) return { label: 'Avançado', color: 'text-orange-400', emoji: '🔴' };
  if (level <= 25) return { label: 'Elite', color: 'text-purple-400', emoji: '🟣' };
  return { label: 'Mundial', color: 'text-yellow-400', emoji: '🟡' };
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
    <div className="space-y-6">
      {/* Academy Level Card */}
      <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-400" />
            Base / Academia
          </CardTitle>
          <CardDescription className="text-xs">
            💰 Investimento gera jogadores • 🏗️ Nível da base determina qualidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Level Display */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border/50">
            <div className="text-center">
              <p className="text-3xl font-bold">{academyLevel}</p>
              <p className="text-[10px] text-muted-foreground">/ 30</p>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-sm font-semibold ${tier.color}`}>{tier.emoji} {tier.label}</span>
                <Badge variant="outline" className="text-[10px]">OVR {minOvr}–{maxOvr}</Badge>
              </div>
              <Progress value={(academyLevel / 30) * 100} className="h-2 mb-1" />
              <p className="text-[10px] text-muted-foreground">
                {academyLevel <= 5 && 'Jogadores fracos/comuns'}
                {academyLevel > 5 && academyLevel <= 10 && 'Jogadores básicos com algum potencial'}
                {academyLevel > 10 && academyLevel <= 15 && 'Jogadores úteis para o elenco'}
                {academyLevel > 15 && academyLevel <= 20 && 'Promessas frequentes aparecem'}
                {academyLevel > 20 && academyLevel <= 25 && 'Talentos especiais com alto potencial'}
                {academyLevel > 25 && '⭐ Chance rara de craque geracional!'}
              </p>
            </div>
          </div>

          {/* Upgrade Button */}
          {academyLevel < 30 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
              <div>
                <p className="text-sm font-medium">
                  Upgrade → Nível {academyLevel + 1}
                </p>
                <p className="text-xs text-muted-foreground">
                  OVR: {minOvr}–{maxOvr} → {nextMinOvr}–{nextMaxOvr}
                </p>
              </div>
              <Button 
                size="sm" 
                disabled={!canUpgrade}
                onClick={onUpgradeAcademy}
                className="gap-1"
              >
                <ArrowUp className="h-3 w-3" />
                R$ {upgradeCost >= 1000000 ? `${(upgradeCost / 1000000).toFixed(1)}M` : `${(upgradeCost / 1000).toFixed(0)}k`}
              </Button>
            </div>
          )}
          {academyLevel >= 30 && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
              <p className="text-sm font-bold text-yellow-400">🏆 Base no nível máximo!</p>
              <p className="text-xs text-muted-foreground">Sua academia é referência mundial</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Investment Tier Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="h-4 w-4 text-purple-400" />
            Investimento por Temporada
          </CardTitle>
          <CardDescription className="text-xs">
            Sem investir → nenhum jogador, mesmo com base nível 30
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {investmentTiers.map(t => (
              <Button
                key={t.amount}
                variant={monthlyInvestment === t.amount ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSetInvestment(t.amount)}
                className="flex-col h-auto py-2 text-xs"
              >
                <span className="font-bold">{t.desc}</span>
                <span className="text-[10px] opacity-80">{t.label} • {t.players} jog.</span>
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Jovens chegam a cada 4 rodadas. Qualidade depende do <strong>nível da base</strong>, não do valor investido.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Prospects List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Jovens na Base ({prospects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasScouts && prospects.length > 0 && (
            <div className="flex items-center gap-2 p-2.5 mb-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="text-sm">🔍</span>
              <p className="text-[11px] text-amber-300">Contrate um <strong>olheiro</strong> na aba Olheiros para revelar o potencial (POT) dos jovens!</p>
            </div>
          )}
          {prospects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum jovem na base. Invista para gerar uma safra!</p>
          ) : (
            <div className="space-y-3">
              {prospects.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                  <Badge variant="outline" className="text-xs">{p.position}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.age} anos • {p.monthsInAcademy} meses</p>
                  </div>
                   <div className="text-center mr-1">
                     <p className="text-lg font-bold">{p.overall}</p>
                     <p className="text-[10px] text-muted-foreground">OVR</p>
                   </div>
                   {hasScouts ? (
                     <div className="text-center mr-1">
                       <p className="text-lg font-bold text-yellow-400">{p.potential}</p>
                       <p className="text-[10px] text-muted-foreground">POT</p>
                     </div>
                   ) : (
                     <div className="text-center mr-1">
                       <p className="text-lg font-bold text-muted-foreground/40">???</p>
                       <p className="text-[10px] text-muted-foreground">POT</p>
                     </div>
                   )}
                   <div className="w-12">
                     {hasScouts ? (
                       <Progress value={(p.overall / p.potential) * 100} className="h-2" />
                     ) : (
                       <Progress value={50} className="h-2 opacity-30" />
                     )}
                   </div>
                  <Button size="sm" onClick={() => onPromote(p.id)}>
                    <UserPlus className="h-3 w-3 mr-1" /> Promover
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
