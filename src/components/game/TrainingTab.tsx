import { useState, useRef, useCallback } from 'react';
import type { Player } from '@/types/game';
import type { Infrastructure } from '@/types/infrastructure';
import type { TacticsConfig } from '@/types/tactics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dumbbell, Target, Users, TrendingUp, Calendar, Play, AlertTriangle, ChevronDown, ChevronUp, Info, Gamepad2 } from 'lucide-react';
import { toast } from 'sonner';
import { TrainingHelpButton } from './TrainingHelpPanel';
import { TrainingMatchCanvas } from './TrainingMatchCanvas';

import type { TrainingFocusKey, TrainingIntensity, PlayerTrainingConfig, WeeklyTrainingResult } from '@/training/TrainingTypes';
import { focusLabels, focusToAttr, intensityConfig, positionRecommendations } from '@/training/TrainingTypes';
import { getTrainingManager, defaultStaff, type StaffConfig } from '@/training/TrainingManager';


// Re-export for backward compatibility (useGame still uses TrainingFocus type)
export type TrainingFocus = TrainingFocusKey;

interface Props {
  players: Player[];
  infrastructure: Infrastructure;
  trainingFocus: Record<string, TrainingFocusKey>;
  onSetTrainingFocus: (playerId: string, focus: TrainingFocusKey) => void;
  tactics?: TacticsConfig;
  onPlayersUpdate?: (players: Player[]) => void;
  currentWeek?: number;
}

const posColors: Record<string, string> = {
  GOL: 'bg-primary/15 text-primary',
  ZAG: 'bg-blue-500/15 text-blue-400',
  LAT: 'bg-cyan-500/15 text-cyan-400',
  VOL: 'bg-emerald-500/15 text-emerald-400',
  MEI: 'bg-purple-500/15 text-purple-400',
  ATA: 'bg-red-500/15 text-red-400',
};

// ── Mini subcomponent: relatório de desempenho ───────────────────────────────
function TrainingInsights({ players, trainingFocus }: { players: Player[]; trainingFocus: Record<string, TrainingFocusKey> }) {
  const activeTraining = players.filter(p => trainingFocus[p.id] && trainingFocus[p.id] !== 'none');
  const youngTalents = players.filter(p => p.age <= 22).sort((a, b) => b.overall - a.overall).slice(0, 3);
  const veterans = players.filter(p => p.age >= 30).sort((a, b) => b.overall - a.overall).slice(0, 3);
  const lowStamina = players.filter(p => (p.stamina ?? 100) < 60).sort((a, b) => (a.stamina ?? 100) - (b.stamina ?? 100)).slice(0, 3);
  const topPlayers = [...players].sort((a, b) => b.overall - a.overall).slice(0, 3);

  return (
    <div className="rounded-lg border border-border/40 bg-muted/10 p-3 space-y-3">
      <div className="flex items-center justify-center gap-2 text-xs">
        <TrendingUp className="h-3.5 w-3.5 text-primary" />
        <span className="font-bold text-primary">Relatório de Desempenho</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card/50 rounded-lg p-2 border border-border/30">
          <p className="text-[8px] font-bold text-emerald-400 uppercase mb-1.5">🌱 Jovens Promissores</p>
          {youngTalents.length > 0 ? youngTalents.map(p => (
            <div key={p.id} className="flex items-center justify-between text-[9px] py-0.5">
              <span className="truncate">{p.name.split(' ').pop()}</span>
              <span className="text-muted-foreground">{p.age}a • {p.overall}</span>
            </div>
          )) : <p className="text-[8px] text-muted-foreground">Nenhum sub-22</p>}
        </div>
        <div className="bg-card/50 rounded-lg p-2 border border-border/30">
          <p className="text-[8px] font-bold text-yellow-400 uppercase mb-1.5">⭐ Top do Elenco</p>
          {topPlayers.map(p => (
            <div key={p.id} className="flex items-center justify-between text-[9px] py-0.5">
              <span className="truncate">{p.name.split(' ').pop()}</span>
              <Badge variant="outline" className="text-[7px] h-4">{p.overall}</Badge>
            </div>
          ))}
        </div>
        <div className="bg-card/50 rounded-lg p-2 border border-border/30">
          <p className="text-[8px] font-bold text-amber-400 uppercase mb-1.5">🏅 Veteranos (30+)</p>
          {veterans.length > 0 ? veterans.map(p => (
            <div key={p.id} className="flex items-center justify-between text-[9px] py-0.5">
              <span className="truncate">{p.name.split(' ').pop()}</span>
              <span className="text-muted-foreground">{p.age}a</span>
            </div>
          )) : <p className="text-[8px] text-muted-foreground">Nenhum 30+</p>}
        </div>
        <div className="bg-card/50 rounded-lg p-2 border border-border/30">
          <p className="text-[8px] font-bold text-red-400 uppercase mb-1.5">😓 Cansados</p>
          {lowStamina.length > 0 ? lowStamina.map(p => (
            <div key={p.id} className="flex items-center justify-between text-[9px] py-0.5">
              <span className="truncate">{p.name.split(' ').pop()}</span>
              <span className="text-destructive">{p.stamina ?? 100}%</span>
            </div>
          )) : <p className="text-[8px] text-emerald-400">Todos descansados ✓</p>}
        </div>
      </div>
      <p className="text-[8px] text-muted-foreground text-center">
        {activeTraining.length} jogador(es) em foco de treino ativo
      </p>
    </div>
  );
}

// ── Mini subcomponent: card de jogador ─────────────────────────────────────
function PlayerTrainingRow({
  player,
  config,
  onFocusChange,
  onIntensityChange,
  roundsNeeded,
}: {
  player: Player;
  config: PlayerTrainingConfig;
  onFocusChange: (focus: TrainingFocusKey) => void;
  onIntensityChange: (intensity: TrainingIntensity) => void;
  roundsNeeded: number;
}) {
  const [open, setOpen] = useState(false);
  const { focus, intensity } = config;
  const attr = focusToAttr[focus];
  const currentVal = attr ? ((player.attributes[attr] as number | undefined) ?? 0) : null;
  const tooOld = player.age > 33;
  const recommended = positionRecommendations[player.position] ?? [];
  const isRecommended = recommended.includes(focus);
  const intCfg = intensityConfig[intensity];
  const injRiskClass = intensity === 'pesado' ? 'text-destructive' : intensity === 'moderado' ? 'text-yellow-400' : 'text-emerald-400';

  return (
    <div className={`rounded-lg border transition-colors ${player.injury ? 'border-destructive/30 bg-destructive/5' : 'border-border/30 bg-muted/20 hover:bg-muted/40'}`}>
      {/* Header row */}
      <div className="flex items-center gap-2 px-2 py-1.5">
        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${posColors[player.position]}`}>{player.position}</span>
        <span className="text-[10px] sm:text-xs font-medium flex-1 truncate">{player.name}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">{player.age}a</span>
        <span className="text-xs font-bold w-6 text-right shrink-0">{player.overall}</span>
        {player.injury && <Badge variant="destructive" className="text-[8px] h-4 px-1 shrink-0">Lesão</Badge>}
        {tooOld && !player.injury && <Badge variant="secondary" className="text-[8px] h-4 px-1 shrink-0">Declínio</Badge>}
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => setOpen(o => !o)}>
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {/* Compact info row */}
      <div className="flex items-center gap-2 px-2 pb-1.5">
        {currentVal !== null && (
          <Badge variant="outline" className={`text-[8px] px-1 h-4 ${isRecommended ? 'border-emerald-500/50 text-emerald-400' : ''}`}>
            {attr}: {currentVal}
          </Badge>
        )}
        <Badge variant="outline" className={`text-[8px] px-1 h-4 ${injRiskClass}`}>
          {intCfg.emoji} {intCfg.label}
        </Badge>
        <div className="flex-1">
          <Progress value={player.trainingProgress * (100 / Math.max(1, roundsNeeded))} className="h-1" />
        </div>
        <span className="text-[9px] font-mono text-muted-foreground shrink-0">{player.trainingProgress}/{roundsNeeded}</span>
      </div>

      {/* Expanded controls */}
      {open && !player.injury && (
        <div className="px-2 pb-2 space-y-2 border-t border-border/20 pt-2">
          {/* Focus select */}
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold">Foco de Treino</p>
            <Select value={focus} onValueChange={v => onFocusChange(v as TrainingFocusKey)} disabled={tooOld}>
              <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(focusLabels).map(([key, label]) => {
                  const isRec = recommended.includes(key as TrainingFocusKey);
                  return (
                    <SelectItem key={key} value={key} className="text-xs">
                      {label} {isRec && key !== 'none' ? '⭐' : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Intensity */}
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold">Intensidade</p>
            <div className="flex gap-1">
              {(['leve', 'moderado', 'pesado'] as TrainingIntensity[]).map(int => {
                const ic = intensityConfig[int];
                return (
                  <Button
                    key={int}
                    size="sm"
                    variant={intensity === int ? 'default' : 'outline'}
                    className="flex-1 h-6 text-[9px] gap-1"
                    onClick={() => onIntensityChange(int)}
                    disabled={tooOld}
                  >
                    {ic.emoji} {ic.label}
                  </Button>
                );
              })}
            </div>
            <p className={`text-[9px] ${injRiskClass}`}>
              Risco de lesão: {intensity === 'leve' ? 'Baixo' : intensity === 'moderado' ? 'Médio' : 'Alto'} •
              Fadiga: -{intCfg.fatiguePerSession} stamina/sessão
            </p>
          </div>

          {/* Stamina bar */}
          <div className="space-y-0.5">
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>Stamina</span>
              <span className={player.stamina < 40 ? 'text-destructive' : player.stamina < 60 ? 'text-yellow-400' : 'text-emerald-400'}>
                {player.stamina}%
              </span>
            </div>
            <Progress
              value={player.stamina}
              className="h-1.5"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────
export function TrainingTab({
  players,
  infrastructure,
  trainingFocus = {},
  onSetTrainingFocus,
  tactics,
  onPlayersUpdate,
  currentWeek = 1,
}: Props) {
  const [filterPos, setFilterPos] = useState<string>('all');
  const [intensityMap, setIntensityMap] = useState<Record<string, TrainingIntensity>>({});
  const [globalIntensity, setGlobalIntensity] = useState<TrainingIntensity>('moderado');
  const [lastResult, setLastResult] = useState<WeeklyTrainingResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showPitch, setShowPitch] = useState(false);
  const [showTraining2D, setShowTraining2D] = useState(false);

  const trainingLevel = infrastructure?.trainingCenter?.level ?? 1;
  const physioLevel = infrastructure?.physiotherapy?.level ?? 1;
  const roundsNeeded = Math.max(2, 10 - trainingLevel);
  const successChance = Math.round((0.3 + trainingLevel * 0.07) * 100);

  const sorted = [...players].sort((a, b) => b.overall - a.overall);
  const injured = sorted.filter(p => !!p.injury);
  const healthy = sorted.filter(p => !p.injury);
  const filtered = filterPos === 'all' ? healthy : healthy.filter(p => p.position === filterPos);

  const trainingCount = Object.values(trainingFocus).filter(f => f !== 'none').length;

  const getConfig = useCallback((playerId: string): PlayerTrainingConfig => ({
    focus: trainingFocus[playerId] ?? 'none',
    intensity: intensityMap[playerId] ?? globalIntensity,
  }), [trainingFocus, intensityMap, globalIntensity]);

  const handleGlobalIntensity = (int: TrainingIntensity) => {
    setGlobalIntensity(int);
    // Apply to all players who haven't customized
    const updated: Record<string, TrainingIntensity> = {};
    players.forEach(p => { updated[p.id] = int; });
    setIntensityMap(updated);
  };

  // ── Processar semana de treinos ─────────────────────────────────────
  const handleProcessWeek = useCallback(async () => {
    if (processing) return;
    setProcessing(true);

    const configs: Record<string, PlayerTrainingConfig> = {};
    players.forEach(p => { configs[p.id] = getConfig(p.id); });

    const staff: StaffConfig = defaultStaff; // TODO: integrar staff real quando implementado

    try {
      const manager = getTrainingManager();
      const { players: updated, result } = manager.processWeek(
        players,
        configs,
        trainingLevel,
        physioLevel,
        staff,
        tactics ?? { formation: '4-4-2', playStyle: 'equilibrado', pressing: 'medio', tempo: 'normal', marking: 'zona', passingStyle: 'misto', defenseLine: 'media', width: 'normal', playerInstructions: [] },
        currentWeek
      );

      if (onPlayersUpdate) onPlayersUpdate(updated);
      setLastResult(result);
      setShowResult(true);

      const evolCount = result.developmentLogs.length;
      const injCount = result.events.filter(e => e.type === 'injury_scare').length;
      if (evolCount > 0) toast.success(`📈 ${evolCount} jogador(es) evoluíram nesta semana!`);
      if (injCount > 0) toast.warning(`⚠️ ${injCount} lesão(ões) no treino!`);
      if (evolCount === 0 && injCount === 0) toast.info('Semana de treino concluída. Continue assim!');
    } catch (err) {
      console.error('[TrainingTab] processWeek error:', err);
      toast.error('Erro ao processar treino.');
    }

    setProcessing(false);
  }, [players, getConfig, trainingLevel, physioLevel, tactics, currentWeek, onPlayersUpdate, processing]);

  return (
    <div className="space-y-4">
      {/* ── Header: Informações do CT ──────────────────────────────── */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" /> Sistema de Treinos FLM 26
            </CardTitle>
            <TrainingHelpButton />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2">
            <div className="bg-muted/30 rounded p-2 text-center">
              <p className="text-[9px] text-muted-foreground">CT Nível</p>
              <p className="text-base font-bold text-primary">{trainingLevel}/10</p>
            </div>
            <div className="bg-muted/30 rounded p-2 text-center">
              <p className="text-[9px] text-muted-foreground">Sem. p/ +1</p>
              <p className="text-base font-bold text-primary">{roundsNeeded}</p>
            </div>
            <div className="bg-muted/30 rounded p-2 text-center">
              <p className="text-[9px] text-muted-foreground">Chance</p>
              <p className="text-base font-bold text-primary">{successChance}%</p>
            </div>
            <div className="bg-muted/30 rounded p-2 text-center">
              <p className="text-[9px] text-muted-foreground">Em treino</p>
              <p className="text-base font-bold text-primary">{trainingCount}/{healthy.length}</p>
            </div>
          </div>

          {/* Intensidade global */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Intensidade Global</p>
            <div className="flex gap-1.5">
              {(['leve', 'moderado', 'pesado'] as TrainingIntensity[]).map(int => {
                const ic = intensityConfig[int];
                return (
                  <Button
                    key={int}
                    size="sm"
                    variant={globalIntensity === int ? 'default' : 'outline'}
                    className="flex-1 h-8 text-[10px] gap-1"
                    onClick={() => handleGlobalIntensity(int)}
                  >
                    {ic.emoji} {ic.label}
                  </Button>
                );
              })}
            </div>
            <p className="text-[9px] text-muted-foreground">
              🟢 Leve: seguro, evolução lenta • 🟡 Moderado: equilibrado • 🔴 Pesado: rápido, risco de lesão
            </p>
          </div>

          {/* Sugestão tática */}
          {tactics && (
            <div className="bg-primary/10 rounded p-2 text-[9px] text-muted-foreground">
              <Info className="h-3 w-3 inline mr-1 text-primary" />
              Com táticas <span className="text-primary font-semibold">{tactics.playStyle}</span>,
              recomendamos focar em <span className="text-primary font-semibold">
                {focusLabels[getTrainingManager().suggestFocusFromTactics(tactics)] ?? 'Físico'}
              </span>
            </div>
          )}

          {/* Relatório de Desempenho */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-xs h-8"
            onClick={() => setShowPitch(v => !v)}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            {showPitch ? 'Ocultar Relatório' : 'Ver Relatório de Desempenho'}
          </Button>

          {showPitch && (
            <TrainingInsights players={healthy} trainingFocus={trainingFocus} />
          )}
        </CardContent>
      </Card>

      {/* ── Treino 2D Tático ─────────────────────────────────── */}
      <Card className="border-border/30">
        <CardHeader className="pb-0 pt-3 px-3">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between h-8 px-1"
            onClick={() => setShowTraining2D(v => !v)}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Gamepad2 className="h-4 w-4 text-primary" /> Treino Tático 2D
            </span>
            {showTraining2D ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardHeader>
        {showTraining2D && (
          <CardContent className="px-3 pb-3 pt-2">
            <TrainingMatchCanvas clubName="Meu Clube" />
          </CardContent>
        )}

      {/* ── Resultado da última semana ─────────────────────────────── */}
      {showResult && lastResult && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Resultado — Semana {lastResult.week}
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-[9px]" onClick={() => setShowResult(false)}>Fechar</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {lastResult.developmentLogs.length === 0 && lastResult.events.filter(e => e.type === 'injury_scare').length === 0 && (
              <p className="text-xs text-muted-foreground text-center">Nenhuma evolução esta semana. Continue treinando!</p>
            )}
            {lastResult.developmentLogs.map((log, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-primary/10 rounded text-xs">
                <span className="text-primary font-bold">📈</span>
                <span className="font-medium flex-1">{log.playerName}</span>
                <Badge variant="outline" className="text-[8px] text-primary border-primary/40">
                  {String(log.attribute)} {log.oldValue} → {log.newValue}
                </Badge>
              </div>
            ))}
            {lastResult.events.map((ev, i) => (
              <div key={i} className={`flex items-start gap-2 p-2 rounded text-xs ${ev.type === 'injury_scare' ? 'bg-destructive/10' : ev.type === 'team_chemistry' || ev.type === 'dedication' ? 'bg-primary/10' : 'bg-muted/30'}`}>
                <span className="text-base shrink-0">{ev.icon}</span>
                <div>
                  <p className="font-bold text-[10px]">{ev.title}</p>
                  <p className="text-[9px] text-muted-foreground">{ev.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Filtro de posição ────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex gap-1 flex-wrap">
          {['all', 'GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'].map(pos => (
            <Button
              key={pos}
              variant={filterPos === pos ? 'default' : 'outline'}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setFilterPos(pos)}
            >
              {pos === 'all' ? 'Todos' : pos}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Lista de jogadores ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" /> Elenco Saudável ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.map(p => (
              <PlayerTrainingRow
                key={p.id}
                player={p}
                config={getConfig(p.id)}
                onFocusChange={(focus) => onSetTrainingFocus(p.id, focus)}
                onIntensityChange={(intensity) => setIntensityMap(prev => ({ ...prev, [p.id]: intensity }))}
                roundsNeeded={roundsNeeded}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum jogador encontrado.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Departamento Médico ──────────────────────────────────────── */}
      {injured.length > 0 && (
        <Card className="border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Departamento Médico ({injured.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {injured.map(p => (
              <div key={p.id} className="flex items-center gap-2 p-2 bg-destructive/5 rounded">
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${posColors[p.position]}`}>{p.position}</span>
                <span className="text-xs font-medium flex-1 truncate">{p.name}</span>
                <Badge variant="destructive" className="text-[9px]">{p.injury?.severity}</Badge>
                <span className="text-[10px] text-muted-foreground truncate">{p.injury?.type}</span>
                <span className="text-[10px] font-mono text-destructive shrink-0">{p.injury?.weeksRemaining}j</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
