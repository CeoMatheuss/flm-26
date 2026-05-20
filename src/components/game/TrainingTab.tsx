/**
 * TrainingTab V3 — Sistema de Progresso (%) + Treino em Grupo (até 5)
 * - Modo "Treinar em Grupo": multi-seleção (≤5) + painel sticky com aplicação em massa.
 * - Toast "💾 Treino salvo" ao alterar foco/intensidade.
 * - Persistência via setters em useClubState (auto-save reativo do useGame).
 */
import { useState, useMemo, useCallback } from 'react';
import type { Player } from '@/types/game';
import type { Infrastructure } from '@/types/infrastructure';
import type { TacticsConfig } from '@/types/tactics';
import { getCTEfficiency, getTrainingCenterUpgradeCost } from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Dumbbell, HelpCircle, TrendingUp, AlertTriangle, Flame, Scale, Turtle, X, Users, CheckCircle2, History } from 'lucide-react';
import { toast } from 'sonner';
import type { TrainingFocusKey, TrainingIntensity } from '@/training/TrainingTypes';
import { focusLabels, intensityConfig, isGroupFocus, groupWeights } from '@/training/TrainingTypes';
import { PlayerDevelopmentEngine, defaultStaff } from '@/training/PlayerDevelopmentEngine';
import { TrainingHelpPopup, type HelpSection } from './TrainingHelpPopup';
import { formatMoney } from '@/lib/formatMoney';
import { TrainingReportModal } from './TrainingReportModal';

interface Props {
  players: Player[];
  infrastructure: Infrastructure;
  trainingFocus: Record<string, TrainingFocusKey>;
  onSetTrainingFocus: (playerId: string, focus: TrainingFocusKey) => void;
  trainingIntensity?: Record<string, TrainingIntensity>;
  onSetTrainingIntensity?: (playerId: string, intensity: TrainingIntensity) => void;
  tactics?: TacticsConfig;
  onPlayersUpdate?: (players: Player[]) => void;
  currentWeek?: number;
  userId?: string;
  budget?: number;
  onUpgradeCT?: () => void;
  lastTrainingResult?: any;
}

const MAX_GROUP_SIZE = 5;

const posColors: Record<string, string> = {
  GOL: 'bg-primary/20 text-primary border-primary/30 shadow-[0_0_10px_-3px_rgba(var(--primary),0.2)]',
  ZAG: 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_10px_-3px_rgba(59,130,246,0.2)]',
  LAT: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_-3px_rgba(6,182,212,0.2)]',
  VOL: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_-3px_rgba(16,185,129,0.2)]',
  MEI: 'bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-[0_0_10px_-3px_rgba(168,85,247,0.2)]',
  ATA: 'bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_10px_-3px_rgba(239,68,68,0.2)]',
};

const groupOptions: TrainingFocusKey[] = [
  'finalizacao_grupo', 'tecnico_grupo', 'defensivo_grupo', 'fisico_grupo', 'mental_grupo',
];

const specificOptions: TrainingFocusKey[] = [
  'speed', 'shooting', 'passing', 'defending', 'physical', 'dribbling',
  'positioning', 'heading', 'vision', 'composure', 'marking', 'crossing',
  'longShots', 'workRate', 'aggression', 'setPieces',
];

function StatusBadge({ status }: { status: 'evoluindo' | 'normal' | 'lento' | 'travado' }) {
  const map = {
    evoluindo: { icon: Flame, label: 'Evoluindo rápido', cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
    normal: { icon: Scale, label: 'Normal', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    lento: { icon: Turtle, label: 'Lento', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
    travado: { icon: X, label: 'Travado', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
  } as const;
  const { icon: Icon, label, cls } = map[status];
  return (
    <Badge variant="outline" className={`${cls} text-[9px] sm:text-[10px] gap-1 h-5`}>
      <Icon className="h-2.5 w-2.5" /> {label}
    </Badge>
  );
}

function progressColor(status: string) {
  return status === 'evoluindo' ? '[&>div]:bg-orange-500' :
         status === 'normal' ? '[&>div]:bg-blue-500' :
         status === 'lento' ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500';
}

function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
      aria-label="Ajuda"
    >
      <HelpCircle className="h-3.5 w-3.5" />
    </button>
  );
}

  const intensityColors = {
    leve: 'border-emerald-500/30 hover:bg-emerald-500/10 data-[state=on]:bg-emerald-500 data-[state=on]:text-white',
    moderado: 'border-amber-500/30 hover:bg-amber-500/10 data-[state=on]:bg-amber-500 data-[state=on]:text-white',
    pesado: 'border-red-500/30 hover:bg-red-500/10 data-[state=on]:bg-red-500 data-[state=on]:text-white',
  };

  return (
    <div
      className={`relative rounded-xl border p-3 sm:p-4 space-y-4 transition-all duration-300 ${
        selected ? 'border-primary bg-primary/10 ring-2 ring-primary/40 shadow-[0_0_20px_rgba(var(--primary),0.1)]' :
        isInjured ? 'border-red-500/30 bg-red-500/5' : 'game-card-accent border-white/5'
      }`}
    >
      {/* Selection Overlay for Mode */}
      {selectionMode && !isGrave && (
        <div 
          className="absolute inset-0 z-10 cursor-pointer" 
          onClick={onToggleSelect}
        />
      )}

      {/* Header Row */}
      <div className="flex items-center gap-3">
        {selectionMode && (
          <div className="relative z-20">
            <Checkbox
              checked={selected}
              onCheckedChange={onToggleSelect}
              disabled={isGrave}
              className="h-5 w-5 rounded-md border-primary/50 data-[state=checked]:bg-primary"
            />
          </div>
        )}
        
        <div className="flex flex-col items-center">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${posColors[player.position]}`}>
            {player.position}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-bold truncate leading-tight tracking-tight">{player.name}</h4>
            {isInjured && (
              <Badge variant="destructive" className="text-[8px] h-4 px-1.5 uppercase font-black tracking-tighter animate-pulse">
                🏥 DM
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">🗓️ {player.age} anos</span>
            <span className="opacity-30">•</span>
            <span className="flex items-center gap-1 font-medium text-emerald-500/80">
              🔋 {player.stamina ?? 100}%
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter opacity-70">OVR</span>
            <span className="text-xl sm:text-2xl font-black text-primary leading-none drop-shadow-sm">{player.overall}</span>
          </div>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Progress & Gain */}
      <div className="bg-muted/30 rounded-lg p-2.5 space-y-1.5 border border-white/5">
        <div className="flex items-center justify-between text-[10px] sm:text-xs">
          <div className="flex items-center gap-1 font-bold text-foreground/90">
            🚀 Evolução Semanal
            <HelpButton onClick={() => onHelp('progress')} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-mono text-[10px]">{progress.toFixed(1)}%</span>
            <span className="font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">+{gain.toFixed(1)}%</span>
          </div>
        </div>
        <Progress value={progress} className={`h-1.5 ${progressColor(status)} bg-muted/50`} />
      </div>

      {/* Selectors Group */}
      <div className={`grid grid-cols-2 gap-3 relative z-20 ${selectionMode ? 'opacity-40 grayscale-[0.5] pointer-events-none' : ''}`}>
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-muted-foreground/70 flex items-center gap-1 uppercase tracking-widest px-1">
            Método
            <HelpButton onClick={() => onHelp(trainingType === 'group' ? 'group' : 'specific')} />
          </label>
          <Select
            value={trainingType}
            onValueChange={(v) => {
              if (v === 'group') onChangeFocus('mental_grupo');
              else onChangeFocus('passing');
            }}
          >
            <SelectTrigger className="h-9 text-xs bg-muted/20 border-white/5 rounded-lg hover:bg-muted/40 transition-colors shadow-inner">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="group" className="text-xs font-medium">👥 Treino Coletivo</SelectItem>
              <SelectItem value="specific" className="text-xs font-medium">🎯 Foco Individual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-muted-foreground/70 flex items-center gap-1 uppercase tracking-widest px-1">
            Foco de Treino
            <HelpButton onClick={() => onHelp('overview')} />
          </label>
          <Select value={focus === 'none' ? '' : focus} onValueChange={(v) => onChangeFocus(v as TrainingFocusKey)}>
            <SelectTrigger className="h-9 text-xs bg-muted/20 border-white/5 rounded-lg hover:bg-muted/40 transition-colors shadow-inner">
              <SelectValue placeholder="Escolher..." />
            </SelectTrigger>
            <SelectContent>
              {trainingType === 'group' ? (
                <SelectGroup>
                  <SelectLabel className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-tighter py-2">Categorias Coletivas</SelectLabel>
                  {groupOptions.map(k => <SelectItem key={k} value={k} className="text-xs font-medium">{focusLabels[k]}</SelectItem>)}
                </SelectGroup>
              ) : (
                <SelectGroup>
                  <SelectLabel className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-tighter py-2">Atributos Técnicos</SelectLabel>
                  {specificOptions.map(k => <SelectItem key={k} value={k} className="text-xs font-medium">{focusLabels[k]}</SelectItem>)}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Intensity Selector */}
      <div className={`space-y-1.5 relative z-20 ${selectionMode ? 'opacity-40 grayscale-[0.5] pointer-events-none' : ''}`}>
        <label className="text-[9px] font-bold text-muted-foreground/70 flex items-center gap-1 uppercase tracking-widest px-1">
          Carga de Treinamento
          <HelpButton onClick={() => onHelp('intensity')} />
        </label>
        <div className="flex gap-2 p-1.5 bg-muted/30 rounded-xl border border-white/5 shadow-inner">
          {(['leve', 'moderado', 'pesado'] as TrainingIntensity[]).map(int => {
            const ic = intensityConfig[int];
            const isActive = intensity === int;
            return (
              <Button
                key={int}
                size="sm"
                variant="ghost"
                data-state={isActive ? 'on' : 'off'}
                className={`flex-1 h-8 text-[10px] font-black gap-1.5 rounded-lg transition-all duration-300 ${intensityColors[int]} ${isActive ? 'shadow-md scale-[1.03] z-10' : 'opacity-40 hover:opacity-100 hover:scale-[1.02]'}`}
                onClick={() => onChangeIntensity(int)}
              >
                <span className="text-xs drop-shadow-sm">{ic.emoji}</span>
                {ic.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Detailed Info (Group Weight or Injury) */}
      {isGroup && !isInjured && (
        <div className="text-[9px] leading-relaxed text-muted-foreground/80 bg-primary/5 rounded-lg p-2.5 border border-primary/10 backdrop-blur-sm">
          <p className="font-bold text-primary mb-1 flex items-center gap-1.5 uppercase tracking-widest text-[8px]">
            <Users className="h-3 w-3" /> Distribuição de Foco:
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {groupWeights[focus as keyof typeof groupWeights].map((w) => (
              <span key={String(w.attr)} className="flex items-center gap-1.5 bg-background/30 px-1.5 py-0.5 rounded border border-white/5">
                <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                {focusLabels[w.attr as TrainingFocusKey] ?? String(w.attr)} <span className="font-bold text-foreground/70">{Math.round(w.weight * 100)}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {isInjured && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 flex items-start gap-2.5 backdrop-blur-sm">
          <div className="bg-red-500/20 p-1 rounded-md mt-0.5">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
          </div>
          <p className="text-[10px] font-medium text-red-400/90 leading-relaxed">
            {player.injury?.severity === 'grave' 
              ? 'ALERTA: Lesão Grave. O atleta está sob cuidados médicos intensivos e não pode participar de nenhuma atividade de treino.' 
              : `DM: ${player.injury?.severity}. Atleta em transição física. O treino está limitado pelos próximos ${player.injury?.weeksRemaining} semanas.`}
          </p>
        </div>
      )}
    </div>
  );
}

export function TrainingTab({
  players, infrastructure, trainingFocus = {}, onSetTrainingFocus,
  trainingIntensity = {}, onSetTrainingIntensity, budget = 0, onUpgradeCT,
  lastTrainingResult,
}: Props) {
  const [reportOpen, setReportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSection, setHelpSection] = useState<HelpSection | undefined>(undefined);
  const [filterPos, setFilterPos] = useState('all');

  // Group selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkType, setBulkType] = useState<'group' | 'specific'>('group');
  const [bulkFocus, setBulkFocus] = useState<TrainingFocusKey>('mental_grupo');
  const [bulkIntensity, setBulkIntensity] = useState<TrainingIntensity>('moderado');

  const ctLevel = infrastructure?.trainingCenter?.level ?? 1;
  const efficiency = getCTEfficiency(ctLevel);
  const upgradeCost = getTrainingCenterUpgradeCost(ctLevel);
  const canUpgrade = ctLevel < 30 && budget >= upgradeCost;

  const engine = useMemo(() => new PlayerDevelopmentEngine(), []);

  const healthy = players.filter(p => !p.injury || p.injury.severity !== 'grave');
  const injured = players.filter(p => !!p.injury);
  const filtered = filterPos === 'all' ? healthy : healthy.filter(p => p.position === filterPos);

  const openHelp = useCallback((section?: HelpSection) => {
    setHelpSection(section);
    setHelpOpen(true);
  }, []);

  const handleUpgrade = useCallback(() => {
    if (!canUpgrade) {
      toast.error(ctLevel >= 30 ? 'CT já está no nível máximo!' : `Saldo insuficiente. Necessário ${formatMoney(upgradeCost)}`);
      return;
    }
    onUpgradeCT?.();
  }, [canUpgrade, ctLevel, upgradeCost, onUpgradeCT]);

  // Single-player setters with toast feedback
  const setFocusForPlayer = useCallback((playerId: string, focus: TrainingFocusKey) => {
    onSetTrainingFocus(playerId, focus);
    console.log('[Persist] trainingFocus', playerId, focus);
    toast.success('💾 Treino salvo', { duration: 1200 });
  }, [onSetTrainingFocus]);

  const setIntensityForPlayer = useCallback((playerId: string, intensity: TrainingIntensity) => {
    onSetTrainingIntensity?.(playerId, intensity);
    console.log('[Persist] trainingIntensity', playerId, intensity);
    toast.success('💾 Intensidade salva', { duration: 1200 });
  }, [onSetTrainingIntensity]);

  // Selection mode helpers
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(s => {
      if (s) setSelectedIds(new Set());
      return !s;
    });
  }, []);

  const togglePlayer = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_GROUP_SIZE) {
          toast.warning(`Máximo ${MAX_GROUP_SIZE} jogadores por grupo.`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  }, []);

  const applyBulk = useCallback(() => {
    if (selectedIds.size === 0) {
      toast.warning('Selecione ao menos 1 jogador.');
      return;
    }
    selectedIds.forEach(id => {
      onSetTrainingFocus(id, bulkFocus);
      onSetTrainingIntensity?.(id, bulkIntensity);
    });
    console.log('[Persist] bulk training applied', { ids: Array.from(selectedIds), bulkFocus, bulkIntensity });
    toast.success(`✅ Treino aplicado a ${selectedIds.size} jogador(es)`, {
      description: `${focusLabels[bulkFocus]} • ${intensityConfig[bulkIntensity].label}`,
    });
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [selectedIds, bulkFocus, bulkIntensity, onSetTrainingFocus, onSetTrainingIntensity]);

  return (
    <div className="space-y-3 sm:space-y-4 pb-32">
      {/* HEADER: Centro de Treinamento */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Centro de Treinamento
              <HelpButton onClick={() => openHelp('ct')} />
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 border-primary/30 hover:bg-primary/10"
                onClick={() => setReportOpen(true)}
              >
                <History className="h-4 w-4" />
                Resumo do Treino
              </Button>
              <Badge variant="outline" className="text-xs">Nível {ctLevel}/30</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Nível</p>
              <p className="text-2xl sm:text-3xl font-black text-primary">{ctLevel}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Eficiência/sem</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400">{efficiency.toFixed(1)}%</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center col-span-2 sm:col-span-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Elenco</p>
              <p className="text-2xl sm:text-3xl font-black text-primary">{healthy.length}</p>
            </div>
          </div>

          {ctLevel < 30 && (
            <Button
              onClick={handleUpgrade}
              className="w-full gap-2"
              variant={canUpgrade ? 'default' : 'outline'}
              disabled={!onUpgradeCT}
            >
              <TrendingUp className="h-4 w-4" />
              Melhorar CT — {formatMoney(upgradeCost)}
              {!canUpgrade && budget < upgradeCost && (
                <Badge variant="destructive" className="ml-2 text-[9px]">Saldo insuficiente</Badge>
              )}
            </Button>
          )}
          {ctLevel >= 30 && (
            <div className="bg-primary/15 border border-primary/30 rounded-lg p-2 text-center">
              <p className="text-xs text-primary font-bold">🏆 CT no nível máximo!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* JOGADORES */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Treino dos Jogadores
              <HelpButton onClick={() => openHelp('overview')} />
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant={selectionMode ? 'default' : 'outline'}
                className="h-7 text-[10px] gap-1.5"
                onClick={toggleSelectionMode}
              >
                <Users className="h-3.5 w-3.5" />
                {selectionMode ? `Cancelar (${selectedIds.size}/${MAX_GROUP_SIZE})` : 'Treinar em Grupo'}
              </Button>
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
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum jogador encontrado.</p>
          )}
          {filtered.sort((a, b) => b.overall - a.overall).map(p => {
            const focus = trainingFocus[p.id] ?? 'mental_grupo';
            const intensity = trainingIntensity[p.id] ?? 'moderado';
            const bd = engine.computeBreakdown(p, { focus, intensity }, ctLevel);
            const gain = bd.expectedWeekly;
            const status = engine.computeStatus(gain, p);
            return (
              <div key={p.id} className="space-y-1">
                <PlayerTrainingCard
                  player={p}
                  focus={focus}
                  intensity={intensity}
                  gain={gain}
                  status={status}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(p.id)}
                  onToggleSelect={() => togglePlayer(p.id)}
                  onChangeFocus={(f) => setFocusForPlayer(p.id, f)}
                  onChangeIntensity={(i) => setIntensityForPlayer(p.id, i)}
                  onHelp={openHelp}
                />
                <div className="flex flex-wrap items-center justify-end gap-1.5 text-[9px] sm:text-[10px] font-mono px-2">
                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">CT {bd.ct}%</span>
                  <span className={`px-1.5 py-0.5 rounded ${bd.age >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    Idade {bd.age >= 0 ? '+' : ''}{bd.age}%
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">Inv +{bd.investment}%</span>
                  <span className="px-1.5 py-0.5 rounded bg-foreground/10 text-foreground font-bold">
                    Chance {bd.total}% · +{bd.gainPerEvent.toFixed(1)}/evt
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* DEPARTAMENTO MÉDICO */}
      {injured.length > 0 && (
        <Card className="border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" /> Departamento Médico ({injured.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {injured.map(p => (
              <div key={p.id} className="flex items-center gap-2 p-2 bg-red-500/5 rounded-lg">
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${posColors[p.position]}`}>{p.position}</span>
                <span className="text-xs font-medium flex-1 truncate">{p.name}</span>
                <Badge variant="destructive" className="text-[9px]">{p.injury?.severity}</Badge>
                <span className="text-[10px] font-mono text-red-400">{p.injury?.weeksRemaining}sem</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* PAINEL FLUTUANTE — Treino em Grupo */}
      {selectionMode && (
        <div className="fixed bottom-3 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[680px] z-40">
          <div className="rounded-2xl border border-primary/40 bg-card/95 backdrop-blur-md shadow-2xl p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold">Treino em Grupo</p>
                <Badge variant="outline" className="text-[10px]">{selectedIds.size}/{MAX_GROUP_SIZE} selecionados</Badge>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={toggleSelectionMode}>
                <X className="h-3.5 w-3.5 mr-1" /> Sair
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Tipo</label>
                <Select
                  value={bulkType}
                  onValueChange={(v) => {
                    const t = v as 'group' | 'specific';
                    setBulkType(t);
                    setBulkFocus(t === 'group' ? 'mental_grupo' : 'passing');
                  }}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">👥 Grupo</SelectItem>
                    <SelectItem value="specific">🎯 Específico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Foco</label>
                <Select value={bulkFocus} onValueChange={(v) => setBulkFocus(v as TrainingFocusKey)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {bulkType === 'group' ? (
                      <SelectGroup>
                        <SelectLabel>Grupos</SelectLabel>
                        {groupOptions.map(k => <SelectItem key={k} value={k} className="text-xs">{focusLabels[k]}</SelectItem>)}
                      </SelectGroup>
                    ) : (
                      <SelectGroup>
                        <SelectLabel>Atributos</SelectLabel>
                        {specificOptions.map(k => <SelectItem key={k} value={k} className="text-xs">{focusLabels[k]}</SelectItem>)}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Intensidade</label>
              <div className="flex gap-1.5">
                {(['leve', 'moderado', 'pesado'] as TrainingIntensity[]).map(int => {
                  const ic = intensityConfig[int];
                  return (
                    <Button
                      key={int}
                      size="sm"
                      variant={bulkIntensity === int ? 'default' : 'outline'}
                      className="flex-1 h-8 text-[10px] sm:text-xs gap-1"
                      onClick={() => setBulkIntensity(int)}
                    >
                      {ic.emoji} {ic.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Button onClick={applyBulk} className="w-full gap-2" disabled={selectedIds.size === 0}>
              <CheckCircle2 className="h-4 w-4" />
              Aplicar a todos ({selectedIds.size})
            </Button>
          </div>
        </div>
      )}

      <TrainingHelpPopup open={helpOpen} onClose={() => setHelpOpen(false)} section={helpSection} />
      
      <TrainingReportModal 
        isOpen={reportOpen} 
        onClose={() => setReportOpen(false)} 
        result={lastTrainingResult} 
      />
    </div>
  );
}

// Re-export type for back-compat
export type TrainingFocus = TrainingFocusKey;
