import { useState } from 'react';
import { Player, PlayerAttributes } from '@/types/game';
import { Infrastructure } from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dumbbell, TrendingUp, Zap, HeartPulse, Target, Users } from 'lucide-react';

export type TrainingFocus = 'speed' | 'shooting' | 'passing' | 'defending' | 'physical' | 'dribbling' | 'positioning' | 'heading' | 'vision' | 'composure' | 'marking' | 'crossing' | 'longShots' | 'workRate' | 'aggression' | 'setPieces' | 'none';

interface Props {
  players: Player[];
  infrastructure: Infrastructure;
  trainingFocus: Record<string, TrainingFocus>;
  onSetTrainingFocus: (playerId: string, focus: TrainingFocus) => void;
}

const focusLabels: Record<TrainingFocus, string> = {
  none: 'Sem foco',
  speed: '⚡ Velocidade',
  shooting: '🎯 Finalização',
  passing: '📐 Passe',
  defending: '🛡️ Defesa',
  physical: '💪 Físico',
  dribbling: '🏃 Drible',
  positioning: '📍 Posicionamento',
  heading: '🤕 Cabeceio',
  vision: '👁️ Visão de Jogo',
  composure: '🧠 Compostura',
  marking: '🔒 Marcação',
  crossing: '↗️ Cruzamento',
  longShots: '🚀 Chute de Longe',
  workRate: '🔥 Intensidade',
  aggression: '⚔️ Agressividade',
  setPieces: '🎯 Bola Parada',
};

const focusToAttribute: Record<TrainingFocus, keyof PlayerAttributes | null> = {
  none: null,
  speed: 'speed',
  shooting: 'shooting',
  passing: 'passing',
  defending: 'defending',
  physical: 'physical',
  dribbling: 'dribbling',
  positioning: 'positioning',
  heading: 'heading',
  vision: 'vision',
  composure: 'composure',
  marking: 'marking',
  crossing: 'crossing',
  longShots: 'longShots',
  workRate: 'workRate',
  aggression: 'aggression',
  setPieces: 'setPieces',
};

// Recommended training by position
const positionRecommendations: Record<string, TrainingFocus[]> = {
  GOL: ['defending', 'positioning', 'composure', 'physical'],
  ZAG: ['defending', 'marking', 'heading', 'physical', 'aggression'],
  LAT: ['speed', 'crossing', 'passing', 'workRate'],
  VOL: ['defending', 'marking', 'passing', 'workRate', 'aggression'],
  MEI: ['passing', 'vision', 'dribbling', 'composure', 'longShots'],
  ATA: ['shooting', 'speed', 'dribbling', 'positioning', 'heading'],
};

const posColors: Record<string, string> = {
  GOL: 'bg-primary/15 text-primary',
  ZAG: 'bg-blue-500/15 text-blue-400',
  LAT: 'bg-cyan-500/15 text-cyan-400',
  VOL: 'bg-emerald-500/15 text-emerald-400',
  MEI: 'bg-purple-500/15 text-purple-400',
  ATA: 'bg-red-500/15 text-red-400',
};

export function TrainingTab({ players, infrastructure, trainingFocus = {}, onSetTrainingFocus }: Props) {
  const [filterPos, setFilterPos] = useState<string>('all');
  const trainingLevel = infrastructure?.trainingCenter?.level ?? 1;
  const roundsNeeded = Math.max(3, 12 - trainingLevel);
  const successChance = Math.round((0.3 + trainingLevel * 0.07) * 100);

  const sorted = [...players].sort((a, b) => b.overall - a.overall);
  const injured = sorted.filter(p => !!p.injury);
  const healthy = sorted.filter(p => !p.injury);
  const filtered = filterPos === 'all' ? healthy : healthy.filter(p => p.position === filterPos);

  const trainingCount = Object.values(trainingFocus).filter(f => f !== 'none').length;

  return (
    <div className="space-y-4">
      {/* Training Info */}
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-emerald-400" /> Como Funciona o Treino
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/30 rounded p-2">
              <p className="text-[10px] text-muted-foreground">CT Nível</p>
              <p className="text-lg font-bold text-emerald-400">{trainingLevel}/10</p>
            </div>
            <div className="bg-muted/30 rounded p-2">
              <p className="text-[10px] text-muted-foreground">Rodadas p/ Evolução</p>
              <p className="text-lg font-bold text-primary">{roundsNeeded}</p>
            </div>
            <div className="bg-muted/30 rounded p-2">
              <p className="text-[10px] text-muted-foreground">Em treino</p>
              <p className="text-lg font-bold text-amber-400">{trainingCount}/{healthy.length}</p>
            </div>
          </div>
          <div className="bg-muted/30 rounded p-2 space-y-1">
            <p className="text-xs"><span className="text-muted-foreground">Chance de +1 atributo:</span> <span className="text-emerald-400 font-bold">{successChance}%</span></p>
            <p className="text-[10px] text-muted-foreground">
              Selecione um foco de treino para cada jogador. A cada {roundsNeeded} rodadas, o atributo escolhido tem {successChance}% de chance de subir +1. 
              Jovens ({'<'}25a) evoluem mais rápido. Acima de 33 anos não evoluem.
            </p>
          </div>

          {/* Position recommendations */}
          <div className="bg-muted/30 rounded p-2">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">💡 Treinos recomendados por posição:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {Object.entries(positionRecommendations).map(([pos, focuses]) => (
                <div key={pos} className="text-[9px]">
                  <span className={`font-mono px-1 py-0.5 rounded ${posColors[pos]}`}>{pos}</span>
                  <span className="text-muted-foreground ml-1">{focuses.map(f => focusLabels[f].split(' ')[1]).join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex gap-1 flex-wrap">
          {['all', 'GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'].map(pos => (
            <Button key={pos} variant={filterPos === pos ? 'default' : 'outline'} size="sm" className="h-6 text-[10px] px-2" onClick={() => setFilterPos(pos)}>
              {pos === 'all' ? 'Todos' : pos}
            </Button>
          ))}
        </div>
      </div>

      {/* Training Assignment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" /> Foco de Treino — Jogadores ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {filtered.map(p => {
              const currentFocus = trainingFocus[p.id] || 'none';
              const attr = focusToAttribute[currentFocus];
              const currentVal = attr ? (p.attributes[attr] ?? 0) : null;
              const tooOld = p.age > 33;
              const recommended = positionRecommendations[p.position] || [];
              const isRecommended = recommended.includes(currentFocus);

              return (
                <div key={p.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/20 hover:bg-muted/40 transition-colors">
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${posColors[p.position]}`}>{p.position}</span>
                  <span className="text-[10px] sm:text-xs font-medium flex-1 truncate">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground">{p.age}a</span>
                  <span className="text-xs font-bold w-6 text-right">{p.overall}</span>
                  {currentVal !== null && (
                    <Badge variant="outline" className={`text-[8px] px-1 h-4 ${isRecommended ? 'border-emerald-500/50 text-emerald-400' : ''}`}>{currentVal}</Badge>
                  )}
                  <div className="w-32 sm:w-40">
                    <Select
                      value={currentFocus}
                      onValueChange={(v) => onSetTrainingFocus(p.id, v as TrainingFocus)}
                      disabled={tooOld}
                    >
                      <SelectTrigger className="h-7 text-[10px] sm:text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(focusLabels).map(([key, label]) => {
                          const isRec = recommended.includes(key as TrainingFocus);
                          return (
                            <SelectItem key={key} value={key} className="text-xs">
                              {label} {isRec && key !== 'none' ? '⭐' : ''}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  {tooOld && <Badge variant="secondary" className="text-[8px] h-4 px-1">declínio</Badge>}
                  <div className="w-10 sm:w-14">
                    <Progress value={p.trainingProgress * (100 / roundsNeeded)} className="h-1.5" />
                  </div>
                  <span className="text-[10px] font-mono w-10 text-right">{p.trainingProgress}/{roundsNeeded}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Injured Players */}
      {injured.length > 0 && (
        <Card className="border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-destructive" /> Departamento Médico ({injured.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {injured.map(p => (
              <div key={p.id} className="flex items-center gap-2 p-2 bg-destructive/5 rounded">
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
    </div>
  );
}
