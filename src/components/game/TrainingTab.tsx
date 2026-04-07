import { useState, useEffect, useCallback } from 'react';
import type { Player } from '@/types/game';
import type { Infrastructure } from '@/types/infrastructure';
import type { TacticsConfig } from '@/types/tactics';
import { getTrainingThreshold, getTrainingPointsPerSession, getTrainingFatiguePerSession } from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dumbbell, Target, Users, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, Sun, Moon, Zap, Shield, Heart, Swords, BarChart3, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import type { TrainingFocusKey, TrainingIntensity } from '@/training/TrainingTypes';
import { focusLabels, intensityConfig } from '@/training/TrainingTypes';

export type TrainingFocus = TrainingFocusKey;

// Training types with descriptions
const trainingTypes = [
  { key: 'tecnico', label: '🟢 Técnico', color: 'border-emerald-500/40 bg-emerald-500/10', desc: 'Melhora passe, drible e finalização. Ideal para evolução ofensiva.', attrs: ['passing', 'dribbling', 'shooting', 'crossing'] },
  { key: 'tatico', label: '🔵 Tático', color: 'border-blue-500/40 bg-blue-500/10', desc: 'Posicionamento, leitura de jogo e organização tática.', attrs: ['positioning', 'vision', 'composure', 'marking'] },
  { key: 'fisico', label: '🔴 Físico', color: 'border-red-500/40 bg-red-500/10', desc: 'Resistência, velocidade e força. Gera mais cansaço.', attrs: ['speed', 'physical', 'heading', 'aggression'] },
  { key: 'recuperacao', label: '🟡 Recuperação', color: 'border-yellow-500/40 bg-yellow-500/10', desc: 'Reduz fadiga e risco de lesão. Essencial após jogos.', attrs: [] },
  { key: 'preparacao', label: '🟣 Preparação', color: 'border-purple-500/40 bg-purple-500/10', desc: 'Boost geral para a próxima partida. Aumenta entrosamento.', attrs: ['workRate'] },
];

const focusOptions = [
  { key: 'ofensivo', label: '⚔️ Ofensivo', desc: 'Shooting, dribbling, crossing' },
  { key: 'defensivo', label: '🛡️ Defensivo', desc: 'Defending, marking, heading' },
  { key: 'equilibrado', label: '⚖️ Equilibrado', desc: 'Distribuição entre todos' },
  { key: 'individual', label: '🎯 Individual', desc: 'Foco em 1 jogador (+50%)' },
];

interface Props {
  players: Player[];
  infrastructure: Infrastructure;
  trainingFocus: Record<string, TrainingFocusKey>;
  onSetTrainingFocus: (playerId: string, focus: TrainingFocusKey) => void;
  tactics?: TacticsConfig;
  onPlayersUpdate?: (players: Player[]) => void;
  currentWeek?: number;
  userId?: string;
}

const posColors: Record<string, string> = {
  GOL: 'bg-primary/15 text-primary',
  ZAG: 'bg-blue-500/15 text-blue-400',
  LAT: 'bg-cyan-500/15 text-cyan-400',
  VOL: 'bg-emerald-500/15 text-emerald-400',
  MEI: 'bg-purple-500/15 text-purple-400',
  ATA: 'bg-red-500/15 text-red-400',
};

// Player progress row
function PlayerProgressRow({ player, ctLevel, devPoints }: {
  player: Player;
  ctLevel: number;
  devPoints: Record<string, { accumulated: number; threshold: number }>;
}) {
  const [open, setOpen] = useState(false);
  const threshold = getTrainingThreshold(ctLevel);
  const attrs = Object.entries(devPoints).filter(([, v]) => v.accumulated > 0);
  const bestAttr = attrs.length > 0 ? attrs.sort((a, b) => b[1].accumulated - a[1].accumulated)[0] : null;

  const staminaColor = (player.stamina ?? 100) < 40 ? 'text-red-400' : (player.stamina ?? 100) < 60 ? 'text-yellow-400' : 'text-emerald-400';
  const moraleEmoji = player.morale >= 80 ? '😊' : player.morale >= 50 ? '😐' : '😤';

  return (
    <div className={`rounded-lg border transition-colors ${player.injury ? 'border-red-500/30 bg-red-500/5' : 'border-border/30 bg-muted/20 hover:bg-muted/30'}`}>
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${posColors[player.position]}`}>{player.position}</span>
        <span className="text-xs font-medium flex-1 truncate">{player.name}</span>
        <span className="text-[10px] text-muted-foreground">{player.age}a</span>
        <Badge variant="outline" className="text-[9px] h-5">{player.overall}</Badge>
        <span className={`text-[9px] ${staminaColor}`}>⚡{player.stamina ?? 100}%</span>
        <span className="text-[10px]">{moraleEmoji}</span>
        {player.injury && <Badge variant="destructive" className="text-[8px] h-4">🏥 Lesão</Badge>}
        {open ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </div>

      {bestAttr && !open && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 text-[9px]">
            <span className="text-muted-foreground">{bestAttr[0]}:</span>
            <Progress value={(bestAttr[1].accumulated / bestAttr[1].threshold) * 100} className="h-1.5 flex-1" />
            <span className="text-muted-foreground font-mono">{bestAttr[1].accumulated}/{bestAttr[1].threshold}</span>
          </div>
        </div>
      )}

      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/20 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-[9px]">
              <span className="text-muted-foreground">Stamina: </span>
              <span className={staminaColor}>{player.stamina ?? 100}%</span>
            </div>
            <div className="text-[9px]">
              <span className="text-muted-foreground">Moral: </span>
              <span>{moraleEmoji} {player.morale}</span>
            </div>
            <div className="text-[9px]">
              <span className="text-muted-foreground">Personalidade: </span>
              <span className="capitalize">{player.personality ?? 'normal'}</span>
            </div>
            <div className="text-[9px]">
              <span className="text-muted-foreground">Lesão risco: </span>
              <span className={(player.stamina ?? 100) < 40 ? 'text-red-400' : 'text-emerald-400'}>
                {(player.stamina ?? 100) < 40 ? 'ALTO ⚠️' : (player.stamina ?? 100) < 60 ? 'Médio' : 'Baixo'}
              </span>
            </div>
          </div>
          {attrs.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] font-semibold text-muted-foreground uppercase">Progresso de Evolução</p>
              {attrs.map(([attr, val]) => (
                <div key={attr} className="flex items-center gap-2 text-[9px]">
                  <span className="w-20 truncate text-muted-foreground">{attr}</span>
                  <Progress value={(val.accumulated / val.threshold) * 100} className="h-1.5 flex-1" />
                  <span className="font-mono text-muted-foreground w-12 text-right">{val.accumulated}/{val.threshold}</span>
                </div>
              ))}
            </div>
          )}
          {attrs.length === 0 && (
            <p className="text-[9px] text-muted-foreground text-center">Sem progresso acumulado ainda. Inicie treinos!</p>
          )}
        </div>
      )}
    </div>
  );
}

export function TrainingTab({
  players, infrastructure, trainingFocus = {}, onSetTrainingFocus,
  tactics, onPlayersUpdate, currentWeek = 1, userId,
}: Props) {
  const [selectedType, setSelectedType] = useState('tecnico');
  const [selectedFocus, setSelectedFocus] = useState('equilibrado');
  const [selectedIntensity, setSelectedIntensity] = useState<TrainingIntensity>('moderado');
  const [selectedSlot, setSelectedSlot] = useState<1 | 2>(1);
  const [individualPlayerId, setIndividualPlayerId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [devPointsMap, setDevPointsMap] = useState<Record<string, Record<string, { accumulated: number; threshold: number }>>>({});
  const [filterPos, setFilterPos] = useState('all');
  const [historyDays, setHistoryDays] = useState<any[]>([]);

  const ctLevel = infrastructure?.trainingCenter?.level ?? 1;
  const physioLevel = infrastructure?.physiotherapy?.level ?? 1;
  const canDoAfternoon = ctLevel >= 10;
  const threshold = getTrainingThreshold(ctLevel);

  const today = new Date().toISOString().split('T')[0];

  // Load today's sessions and dev points
  const loadData = useCallback(async () => {
    if (!userId) return;
    const [sessRes, devRes, histRes] = await Promise.all([
      supabase.from('daily_training_sessions').select('*').eq('user_id', userId).eq('session_date', today),
      supabase.from('player_development_points').select('*').eq('user_id', userId),
      supabase.from('daily_training_sessions').select('*').eq('user_id', userId).gte('session_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]).order('session_date', { ascending: false }),
    ]);
    if (sessRes.data) setTodaySessions(sessRes.data);
    if (devRes.data) {
      const map: typeof devPointsMap = {};
      devRes.data.forEach((d: any) => {
        if (!map[d.player_id]) map[d.player_id] = {};
        map[d.player_id][d.attribute] = { accumulated: d.accumulated_points, threshold: d.threshold };
      });
      setDevPointsMap(map);
    }
    if (histRes.data) {
      const grouped: Record<string, any[]> = {};
      histRes.data.forEach((s: any) => {
        if (!grouped[s.session_date]) grouped[s.session_date] = [];
        grouped[s.session_date].push(s);
      });
      setHistoryDays(Object.entries(grouped).map(([date, sessions]) => ({ date, sessions, totalPoints: sessions.reduce((s: number, x: any) => s + x.dev_points_earned, 0) })).slice(0, 7));
    }
  }, [userId, today]);

  useEffect(() => { loadData(); }, [loadData]);

  const slotAlreadyDone = (slot: number) => todaySessions.some(s => s.session_slot === slot);
  const morningDone = slotAlreadyDone(1);
  const afternoonDone = slotAlreadyDone(2);

  const healthy = players.filter(p => !p.injury);
  const injured = players.filter(p => !!p.injury);
  const filtered = filterPos === 'all' ? healthy : healthy.filter(p => p.position === filterPos);

  // Process daily training session
  const handleTrain = useCallback(async () => {
    if (!userId || processing) return;
    if (slotAlreadyDone(selectedSlot)) {
      toast.error(`Sessão da ${selectedSlot === 1 ? 'manhã' : 'tarde'} já foi realizada hoje!`);
      return;
    }
    if (selectedSlot === 2 && !canDoAfternoon) {
      toast.error('CT nível 10+ necessário para sessão da tarde!');
      return;
    }

    setProcessing(true);
    const typeInfo = trainingTypes.find(t => t.key === selectedType)!;
    const updatedPlayers = [...players];
    const sessionsToInsert: any[] = [];
    let totalEvolutions = 0;

    for (const player of healthy) {
      const isIndividualTarget = selectedFocus === 'individual' && individualPlayerId === player.id;
      const pointsMult = isIndividualTarget ? 1.5 : 1.0;
      const points = Math.round(getTrainingPointsPerSession(ctLevel, selectedIntensity, player.age, player.personality) * pointsMult);
      const fatigue = getTrainingFatiguePerSession(selectedType);

      sessionsToInsert.push({
        user_id: userId,
        player_id: player.id,
        session_date: today,
        session_slot: selectedSlot,
        training_type: selectedType,
        focus: selectedFocus,
        intensity: selectedIntensity,
        dev_points_earned: points,
        fatigue_generated: fatigue,
      });

      // Apply fatigue/recovery to local state
      const playerIdx = updatedPlayers.findIndex(p => p.id === player.id);
      if (playerIdx >= 0) {
        const newStamina = Math.max(5, Math.min(100, (updatedPlayers[playerIdx].stamina ?? 100) - fatigue));
        const moraleDelta = selectedIntensity === 'pesado' ? -2 : selectedIntensity === 'leve' ? 1 : 0;
        updatedPlayers[playerIdx] = {
          ...updatedPlayers[playerIdx],
          stamina: newStamina,
          morale: Math.max(20, Math.min(100, updatedPlayers[playerIdx].morale + moraleDelta)),
        };

        // Injury check
        if (newStamina < 30 && selectedIntensity === 'pesado' && Math.random() < 0.15) {
          const weeks = Math.floor(Math.random() * 3) + 1;
          updatedPlayers[playerIdx] = {
            ...updatedPlayers[playerIdx],
            injury: { type: 'Lesão muscular', severity: 'moderada', weeksRemaining: weeks, originalWeeks: weeks },
          };
          toast.warning(`🏥 ${player.name} se lesionou no treino!`);
        }

        // Accumulate dev points per attribute
        const targetAttrs = typeInfo.attrs.length > 0 ? typeInfo.attrs : [];
        for (const attr of targetAttrs) {
          const currentDevPoints = devPointsMap[player.id]?.[attr]?.accumulated ?? 0;
          const newAccumulated = currentDevPoints + Math.round(points / Math.max(1, targetAttrs.length));

          if (newAccumulated >= threshold) {
            // Evolution!
            const currentVal = (player.attributes as any)[attr] ?? 50;
            const cap = player.age < 25 ? 99 : 95;
            if (currentVal < cap) {
              (updatedPlayers[playerIdx].attributes as any)[attr] = Math.min(cap, currentVal + 1);
              totalEvolutions++;

              // Upsert with reset
              await supabase.from('player_development_points').upsert({
                user_id: userId, player_id: player.id, attribute: attr,
                accumulated_points: newAccumulated - threshold, threshold,
              }, { onConflict: 'user_id,player_id,attribute' });
            }
          } else {
            await supabase.from('player_development_points').upsert({
              user_id: userId, player_id: player.id, attribute: attr,
              accumulated_points: newAccumulated, threshold,
            }, { onConflict: 'user_id,player_id,attribute' });
          }
        }
      }
    }

    // Insert sessions
    await supabase.from('daily_training_sessions').insert(sessionsToInsert);

    // Update last_training_processed_at
    await supabase.from('profiles').update({ last_training_processed_at: new Date().toISOString() } as any).eq('user_id', userId);

    if (onPlayersUpdate) onPlayersUpdate(updatedPlayers);

    if (totalEvolutions > 0) {
      toast.success(`📈 ${totalEvolutions} evolução(ões) de atributo!`);
    } else {
      toast.info(`✅ Sessão da ${selectedSlot === 1 ? 'manhã' : 'tarde'} concluída! Pontos acumulados.`);
    }

    await loadData();
    setProcessing(false);
  }, [userId, processing, selectedSlot, selectedType, selectedFocus, selectedIntensity, individualPlayerId, players, healthy, ctLevel, threshold, today, devPointsMap, onPlayersUpdate, loadData, canDoAfternoon]);

  const typeInfo = trainingTypes.find(t => t.key === selectedType)!;

  return (
    <div className="space-y-4">
      {/* Header CT Info */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" /> Centro de Treinamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[9px] text-muted-foreground">CT Nível</p>
              <p className="text-lg font-bold text-primary">{ctLevel}<span className="text-[9px] text-muted-foreground">/30</span></p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[9px] text-muted-foreground">Threshold</p>
              <p className="text-lg font-bold text-primary">{threshold}<span className="text-[9px] text-muted-foreground">pts</span></p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[9px] text-muted-foreground">Sessões</p>
              <p className="text-lg font-bold text-primary">{canDoAfternoon ? '2' : '1'}<span className="text-[9px] text-muted-foreground">/dia</span></p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-[9px] text-muted-foreground">Elenco</p>
              <p className="text-lg font-bold text-primary">{healthy.length}</p>
            </div>
          </div>

          {/* Today status */}
          <div className="flex items-center gap-2 text-xs">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Hoje:</span>
            <Badge variant={morningDone ? 'default' : 'outline'} className="text-[9px] h-5 gap-1">
              <Sun className="h-2.5 w-2.5" /> Manhã {morningDone ? '✅' : '⬜'}
            </Badge>
            {canDoAfternoon && (
              <Badge variant={afternoonDone ? 'default' : 'outline'} className="text-[9px] h-5 gap-1">
                <Moon className="h-2.5 w-2.5" /> Tarde {afternoonDone ? '✅' : '⬜'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session Config */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" /> Configurar Sessão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Slot selection */}
          <div className="flex gap-2">
            <Button
              variant={selectedSlot === 1 ? 'default' : 'outline'}
              size="sm" className="flex-1 gap-1 text-xs"
              onClick={() => setSelectedSlot(1)}
              disabled={morningDone}
            >
              <Sun className="h-3.5 w-3.5" /> Manhã {morningDone && '✅'}
            </Button>
            <Button
              variant={selectedSlot === 2 ? 'default' : 'outline'}
              size="sm" className="flex-1 gap-1 text-xs"
              onClick={() => setSelectedSlot(2)}
              disabled={afternoonDone || !canDoAfternoon}
            >
              <Moon className="h-3.5 w-3.5" /> Tarde {afternoonDone && '✅'} {!canDoAfternoon && '🔒'}
            </Button>
          </div>

          {/* Training type cards */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Tipo de Treino</p>
            <div className="grid grid-cols-1 gap-1.5">
              {trainingTypes.map(t => (
                <button
                  key={t.key}
                  onClick={() => setSelectedType(t.key)}
                  className={`text-left p-2.5 rounded-lg border transition-all ${selectedType === t.key ? t.color + ' ring-1 ring-primary/30' : 'border-border/30 bg-muted/10 hover:bg-muted/20'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{t.label}</span>
                    <Badge variant="outline" className="text-[8px] h-4">
                      {t.key === 'recuperacao' ? '-20 fadiga' : `+${getTrainingFatiguePerSession(t.key)} fadiga`}
                    </Badge>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Focus selection */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Foco</p>
            <div className="grid grid-cols-2 gap-1.5">
              {focusOptions.map(f => (
                <button
                  key={f.key}
                  onClick={() => setSelectedFocus(f.key)}
                  className={`text-left p-2 rounded-lg border transition-all text-xs ${selectedFocus === f.key ? 'border-primary/50 bg-primary/10' : 'border-border/30 bg-muted/10 hover:bg-muted/20'}`}
                >
                  <p className="font-semibold">{f.label}</p>
                  <p className="text-[8px] text-muted-foreground">{f.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Individual player selection */}
          {selectedFocus === 'individual' && (
            <Select value={individualPlayerId ?? ''} onValueChange={setIndividualPlayerId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Escolher jogador..." />
              </SelectTrigger>
              <SelectContent>
                {healthy.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.position} — {p.name} ({p.overall})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Intensity */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Intensidade</p>
            <div className="flex gap-1.5">
              {(['leve', 'moderado', 'pesado'] as TrainingIntensity[]).map(int => {
                const ic = intensityConfig[int];
                return (
                  <Button
                    key={int}
                    size="sm"
                    variant={selectedIntensity === int ? 'default' : 'outline'}
                    className="flex-1 h-8 text-[10px] gap-1"
                    onClick={() => setSelectedIntensity(int)}
                  >
                    {ic.emoji} {ic.label}
                  </Button>
                );
              })}
            </div>
            <p className="text-[9px] text-muted-foreground">
              🟢 Seguro, lento • 🟡 Equilibrado • 🔴 Rápido, risco de lesão
            </p>
          </div>

          {/* Execute button */}
          <Button
            className="w-full gap-2"
            onClick={handleTrain}
            disabled={processing || slotAlreadyDone(selectedSlot) || (selectedSlot === 2 && !canDoAfternoon)}
          >
            <Zap className="h-4 w-4" />
            {processing ? 'Treinando...' : `Iniciar Treino — ${selectedSlot === 1 ? 'Manhã' : 'Tarde'}`}
          </Button>
        </CardContent>
      </Card>

      {/* Player Progress */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Progresso dos Jogadores
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Position filter */}
          <div className="flex gap-1 flex-wrap">
            {['all', 'GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'].map(pos => (
              <Button key={pos} variant={filterPos === pos ? 'default' : 'outline'} size="sm" className="h-6 text-[10px] px-2" onClick={() => setFilterPos(pos)}>
                {pos === 'all' ? 'Todos' : pos}
              </Button>
            ))}
          </div>

          <div className="space-y-1.5">
            {filtered.sort((a, b) => b.overall - a.overall).map(p => (
              <PlayerProgressRow key={p.id} player={p} ctLevel={ctLevel} devPoints={devPointsMap[p.id] ?? {}} />
            ))}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum jogador encontrado.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Injured players */}
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
                <span className="text-[10px] font-mono text-red-400">{p.injury?.weeksRemaining}j</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {historyDays.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Histórico (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {historyDays.map((day, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-muted/20 rounded-lg text-xs">
                  <span className="font-mono text-muted-foreground w-20">{new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                  <Badge variant="outline" className="text-[9px]">{day.sessions.length} sessões</Badge>
                  <span className="text-primary font-semibold">+{day.totalPoints} pts</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
