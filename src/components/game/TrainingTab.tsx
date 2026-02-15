import { Player } from '@/types/game';
import { Infrastructure } from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dumbbell, TrendingUp, Zap, HeartPulse } from 'lucide-react';

interface Props {
  players: Player[];
  infrastructure: Infrastructure;
  budget: number;
  onUpgrade: (facility: 'trainingCenter' | 'physiotherapy') => void;
}

const posColors: Record<string, string> = {
  GOL: 'bg-primary/15 text-primary',
  ZAG: 'bg-blue-500/15 text-blue-400',
  LAT: 'bg-cyan-500/15 text-cyan-400',
  VOL: 'bg-emerald-500/15 text-emerald-400',
  MEI: 'bg-purple-500/15 text-purple-400',
  ATA: 'bg-red-500/15 text-red-400',
};

export function TrainingTab({ players, infrastructure, budget, onUpgrade }: Props) {
  const trainingLevel = infrastructure.trainingCenter.level;
  const physioLevel = infrastructure.physiotherapy.level;
  const trainingChance = Math.round((0.5 + trainingLevel * 0.15) * 100);
  const physioRecovery = 5 + physioLevel * 3;

  const trainingCost = [0, 300000, 750000, 1500000, 3000000, 6000000, 10000000, 18000000, 30000000, 50000000][trainingLevel] ?? 999999999;
  const physioCost = [0, 300000, 750000, 1500000, 3000000, 6000000, 10000000, 18000000, 30000000, 50000000][physioLevel] ?? 999999999;

  const sorted = [...players].sort((a, b) => b.trainingProgress - a.trainingProgress || b.overall - a.overall);
  const closeToUpgrade = sorted.filter(p => p.trainingProgress >= 7 && p.age <= 33 && !p.injury);
  const injured = sorted.filter(p => !!p.injury);

  return (
    <div className="space-y-4">
      {/* Facilities Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-emerald-400" /> Centro de Treinamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Nível</span>
              <Badge className="text-sm">{trainingLevel}/10</Badge>
            </div>
            <Progress value={trainingLevel * 10} className="h-2" />
            <div className="bg-muted/30 rounded p-2 space-y-1">
              <p className="text-xs"><span className="text-muted-foreground">Chance de evolução:</span> <span className="text-emerald-400 font-bold">{trainingChance}%</span></p>
              <p className="text-[10px] text-muted-foreground">A cada 10 jogos, jogadores até 33 anos têm {trainingChance}% de chance de ganhar +1 OVR</p>
            </div>
            {trainingLevel < 10 && (
              <Button size="sm" className="w-full text-xs" disabled={budget < trainingCost} onClick={() => onUpgrade('trainingCenter')}>
                Upgrade → Nv{trainingLevel + 1} (R$ {(trainingCost / 1000000).toFixed(1)}M)
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-pink-400" /> Centro de Fisioterapia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Nível</span>
              <Badge className="text-sm">{physioLevel}/10</Badge>
            </div>
            <Progress value={physioLevel * 10} className="h-2" />
            <div className="bg-muted/30 rounded p-2 space-y-1">
              <p className="text-xs"><span className="text-muted-foreground">Recuperação de stamina:</span> <span className="text-pink-400 font-bold">+{physioRecovery}/jogo</span></p>
              <p className="text-[10px] text-muted-foreground">Reduz tempo de lesão e recupera energia dos jogadores após cada partida</p>
            </div>
            {physioLevel < 10 && (
              <Button size="sm" className="w-full text-xs" disabled={budget < physioCost} onClick={() => onUpgrade('physiotherapy')}>
                Upgrade → Nv{physioLevel + 1} (R$ {(physioCost / 1000000).toFixed(1)}M)
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Close to Upgrade */}
      {closeToUpgrade.length > 0 && (
        <Card className="border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-yellow-400" /> Próximos a Evoluir ({closeToUpgrade.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {closeToUpgrade.map(p => (
              <div key={p.id} className="flex items-center gap-2 p-2 bg-yellow-500/5 rounded">
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${posColors[p.position]}`}>{p.position}</span>
                <span className="text-xs font-medium flex-1 truncate">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.age}a</span>
                <span className="text-sm font-bold">{p.overall}</span>
                <div className="w-16">
                  <Progress value={p.trainingProgress * 10} className="h-1.5" />
                </div>
                <span className="text-[10px] font-mono text-yellow-400">{p.trainingProgress}/10</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Injured Players */}
      {injured.length > 0 && (
        <Card className="border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-destructive" /> Departamento Médico ({injured.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {injured.map(p => (
              <div key={p.id} className="flex items-center gap-2 p-2 bg-red-500/5 rounded">
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${posColors[p.position]}`}>{p.position}</span>
                <span className="text-xs font-medium flex-1 truncate">{p.name}</span>
                <Badge variant="destructive" className="text-[9px]">{p.injury?.severity}</Badge>
                <span className="text-[10px] text-muted-foreground">{p.injury?.type}</span>
                <span className="text-[10px] font-mono text-destructive">{p.injury?.weeksRemaining}j restantes</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All Players Training Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" /> Progresso de Treino — Todos os Jogadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {sorted.map(p => (
              <div key={p.id} className="flex items-center gap-2 py-1">
                <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${posColors[p.position]}`}>{p.position}</span>
                <span className="text-[10px] sm:text-xs font-medium flex-1 truncate">{p.name}</span>
                <span className="text-[10px] text-muted-foreground">{p.age}a</span>
                {p.injury && <Badge variant="destructive" className="text-[8px] h-4 px-1">🏥</Badge>}
                {p.age > 33 && <Badge variant="secondary" className="text-[8px] h-4 px-1">declínio</Badge>}
                <span className="text-xs font-bold w-6 text-right">{p.overall}</span>
                <div className="w-14 sm:w-20">
                  <Progress value={p.trainingProgress * 10} className="h-1.5" />
                </div>
                <span className="text-[10px] font-mono w-8 text-right">{p.trainingProgress}/10</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
