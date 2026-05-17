/**
 * MatchPage — Pre-match squad selection + match simulation with floating overlay buttons.
 * No tabs during match — uses Sheet overlays for Tactics, Lineup, Stats.
 * Includes Assistant Coach panel and Match Moment indicator.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Player } from '@/types/game';
import { TacticsConfig, Formation } from '@/types/tactics';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
// Sheet components no longer used — replaced by inline accordion sections
import { ArrowLeft, Film, LogOut, BarChart3, Users, Shirt, Activity, Star, ArrowUpDown, Check, X, Shield, ChevronRight, ChevronUp, ChevronDown, Zap, Settings2, MessageSquare } from 'lucide-react';
import { useMatchSimulation, SimEvent, MatchStats, MatchState } from '@/match';
import { computeLiveStamina, staminaColorClass } from '@/match/liveStamina';
import { PostGameReportModal } from '@/components/game/PostGameReportModal';
import { GameLoadingScreen } from '@/components/game/GameLoadingScreen';
import { HighlightMiniCanvas, isHighlightEvent, getHighlightType, getHighlightOutcome } from '@/components/game/HighlightMiniCanvas';
import { MatchSidebar } from '@/components/game/MatchSidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCrest } from '@/components/game/ShieldCrest';
import { useMatchShields } from '@/hooks/useMatchShields';
import type { ShieldRenderProps } from '@/components/game/shieldHelpers';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MatchPageState {
  homeTeam: string;
  awayTeam: string;
  homePlayers: Player[];
  homeStrength: number;
  awayStrength: number;
  matchId: string;
  tactics: TacticsConfig;
  stadiumName: string;
  stadiumCapacity: number;
  isHome: boolean;
  liveMatchDbId?: string;
  competition?: string;
  tournamentMatchId?: string;
  fans?: number;
  awayFans?: number;
  liveMatchSnapshot?: any;
  tieBreaker?: 'none' | 'extra_time' | 'penalties' | 'both';
  /** V1 Stadium — passados pelo Dashboard/MatchesTab para calcular público real */
  reputation?: number;
  ticketPrice?: number;
  winStreak?: number;
  loseStreak?: number;
  vipBoxesBuilt?: { bronze?: number; prata?: number; ouro?: number; master?: number };
  stadiumOps?: import('@/match/stadiumEvents').StadiumOpsState;
}

const posOrder = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
const posLabels: Record<string, string> = { GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', VOL: 'Volante', MEI: 'Meia', ATA: 'Atacante' };

const formationsList: Formation[] = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '3-4-3', '4-5-1', '4-1-4-1', '5-3-2', '5-4-1', '4-3-2-1', '4-4-1-1', '3-4-1-2', '4-1-2-1-2'];

// Map formation to required positions
function getFormationPositions(formation: string): string[] {
  const map: Record<string, string[]> = {
    '4-4-2': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'MEI', 'VOL', 'VOL', 'MEI', 'ATA', 'ATA'],
    '4-3-3': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA'],
    '4-2-3-1': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'VOL', 'MEI', 'MEI', 'MEI', 'ATA'],
    '3-5-2': ['GOL', 'ZAG', 'ZAG', 'ZAG', 'LAT', 'VOL', 'MEI', 'MEI', 'LAT', 'ATA', 'ATA'],
    '3-4-3': ['GOL', 'ZAG', 'ZAG', 'ZAG', 'LAT', 'VOL', 'VOL', 'LAT', 'ATA', 'ATA', 'ATA'],
    '4-5-1': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'MEI', 'VOL', 'MEI', 'MEI', 'MEI', 'ATA'],
    '4-1-4-1': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'MEI', 'MEI', 'MEI', 'MEI', 'ATA'],
    '5-3-2': ['GOL', 'LAT', 'ZAG', 'ZAG', 'ZAG', 'LAT', 'VOL', 'MEI', 'MEI', 'ATA', 'ATA'],
    '5-4-1': ['GOL', 'LAT', 'ZAG', 'ZAG', 'ZAG', 'LAT', 'MEI', 'VOL', 'VOL', 'MEI', 'ATA'],
    '4-3-2-1': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA'],
    '4-4-1-1': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'MEI', 'VOL', 'VOL', 'MEI', 'ATA', 'ATA'],
    '3-4-2-1': ['GOL', 'ZAG', 'ZAG', 'ZAG', 'LAT', 'VOL', 'VOL', 'LAT', 'MEI', 'MEI', 'ATA'],
    '4-1-2-1-2': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA'],
    '4-2-2-2': ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'VOL', 'MEI', 'MEI', 'ATA', 'ATA'],
  };
  return map[formation] || map['4-4-2'];
}

function getPositionGroup(pos: string) {
  if (pos === 'GOL') return 'gk';
  if (['ZAG', 'LAT'].includes(pos)) return 'def';
  if (['VOL', 'MEI'].includes(pos)) return 'mid';
  return 'atk';
}

export default function MatchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locState = location.state as MatchPageState | null;
  const [initDone, setInitDone] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Preparando partida');
  const [preMatchDone, setPreMatchDone] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);

  const { state, startMatch, loadMatch, loadMatchSnapshot, findActiveMatch, destroy } = useMatchSimulation();

  const doStartMatch = useCallback(async (players: Player[], updatedTactics?: TacticsConfig) => {
    if (!locState) return;
    setLoadingMsg('Simulando partida no servidor');
    setPreMatchDone(true);

    // V1+V2 Stadium — calcula público esperado real e aplica danos do estádio.
    let effectiveCapacity = locState.stadiumCapacity;
    if (locState.isHome) {
      try {
        const { calculateStadiumEconomy } = await import('@/match/stadiumEconomyEngine');
        const { getEffectiveCapacity, isStadiumBlockedForBigMatch } = await import('@/match/stadiumEvents');

        const importance: 'amistoso' | 'liga' | 'classico' | 'final' =
          (locState.competition || '').toLowerCase().includes('final') ? 'final'
          : (locState.competition || '').toLowerCase().includes('clás') ? 'classico'
          : (locState.competition || '').toLowerCase().includes('amistos') ? 'amistoso'
          : 'liga';

        // V2 — danos reduzem capacidade base
        const damages = locState.stadiumOps?.damages ?? [];
        const physicalCapacity = getEffectiveCapacity(locState.stadiumCapacity, damages);

        // Bloqueio em finais/clássicos por dano severo
        if (importance === 'final' || importance === 'classico') {
          const block = isStadiumBlockedForBigMatch(damages);
          if (block.blocked) {
            toast.error(`🚫 Estádio impróprio para esta partida: ${block.reason}`);
          }
        }

        const vipUnits = Object.values(locState.vipBoxesBuilt || {}).reduce((a, b) => a + (b || 0), 0);
        
        // Attempt to get level from stadiumOps, or use a heuristic based on capacity
        const stadiumLevel = (locState.stadiumOps as any)?.level || Math.max(1, Math.min(15, Math.ceil(locState.stadiumCapacity / 8000)));

        const economy = calculateStadiumEconomy({
          fans: locState.fans || 1000,
          reputation: locState.reputation ?? 50,
          ticketPrice: locState.ticketPrice ?? 30,
          winStreak: locState.winStreak ?? 0,
          loseStreak: locState.loseStreak ?? 0,
          stadiumCapacity: physicalCapacity,
          stadiumLevel: stadiumLevel,
          importance,
          vipUnits
        });
        
        effectiveCapacity = physicalCapacity;
        (locState as any).resolvedAttendance = economy.expectedAttendance;
        (locState as any).resolvedRevenue = economy.revenue.total;
        
        console.log('[Stadium] Economy Results:', economy);
      } catch (e) {
        console.warn('[Stadium] Failed to compute attendance, using raw capacity', e);
      }


    }

    const result = await startMatch({
      homeTeam: locState.homeTeam,
      awayTeam: locState.awayTeam,
      homePlayers: players,
      homeStrength: locState.homeStrength,
      awayStrength: locState.awayStrength,
      matchId: locState.matchId,
      tactics: updatedTactics || locState.tactics,
      stadiumName: locState.stadiumName,
      stadiumCapacity: effectiveCapacity,
      isHome: locState.isHome,
      competition: locState.competition || 'Amistoso',
      tournamentMatchId: locState.tournamentMatchId,
      fans: locState.fans || 1000,
      awayFans: locState.awayFans || 500,
      tieBreaker: locState.tieBreaker || 'none',
      winStreak: locState.winStreak ?? 0,
      loseStreak: locState.loseStreak ?? 0,
      vipUnits: Object.values(locState.vipBoxesBuilt || {}).reduce((a, b) => a + (b || 0), 0),
      ticketPrice: locState.ticketPrice ?? 30,
    });

    if (!result?.success) {
      toast.error(`Erro ao iniciar partida: ${(result as any)?.error || 'tente novamente'}`);
      navigate('/', { replace: true });
      return;
    }
    setInitDone(true);
  }, [locState, startMatch, navigate]);

  // Auto-start or reconnect
  useEffect(() => {
    let cancelled = false;
    // Timeout de segurança: se nada terminar em 25s, volta ao Dashboard com aviso
    const safetyTimer = window.setTimeout(() => {
      if (cancelled) return;
      if (!initDone) {
        toast.error('Demorou demais para entrar na partida. Tente novamente.');
        navigate('/', { replace: true });
      }
    }, 25000);

    const init = async () => {
      if (locState?.liveMatchSnapshot) {
        setPreMatchDone(true);
        const ok = loadMatchSnapshot(locState.liveMatchSnapshot);
        if (!ok) {
          toast.error('Não foi possível abrir a partida ao vivo.');
          navigate('/', { replace: true });
          return;
        }
        setInitDone(true);
      } else if (locState?.liveMatchDbId) {
        setLoadingMsg('Reconectando à partida');
        setPreMatchDone(true);
        const ok = await loadMatch(locState.liveMatchDbId);
        if (cancelled) return;
        if (!ok) {
          toast.error('Não foi possível reconectar à partida.');
          navigate('/', { replace: true });
          return;
        }
        setInitDone(true);
      } else if (locState && !locState.liveMatchDbId && locState.homePlayers?.length > 0) {
        doStartMatch(locState.homePlayers, locState.tactics);
      } else if (!locState) {
        setLoadingMsg('Buscando partida ativa');
        setPreMatchDone(true);
        const found = await findActiveMatch();
        if (!found && !cancelled) {
          // Se não achou por user_id, mas veio de um redirecionamento sem ID (ex: clique no widget de outro)
          // Tenta carregar se houver algum indício, mas findActiveMatch já busca o mais recente.
          navigate('/', { replace: true });
          return;
        }
        if (!cancelled) setInitDone(true);
      }
    };
    init();
    return () => { cancelled = true; window.clearTimeout(safetyTimer); destroy(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Erro tem prioridade sobre loading para evitar travas em 99%
  if (state.phase === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-base text-destructive">{state.errorMsg || 'Erro ao carregar partida.'}</p>
            <Button onClick={() => navigate('/', { replace: true })}>Voltar ao Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!initDone || state.phase === 'loading') {
    return <GameLoadingScreen message={loadingMsg} subMessage={locState ? `${locState.homeTeam} vs ${locState.awayTeam}` : undefined} />;
  }

  // (bloco de erro duplicado removido — agora prioritário no topo)

  if (state.phase === 'idle') {
    return <GameLoadingScreen message="Preparando campo" showProgress={false} />;
  }

  const handleExit = () => {
    if (state.phase === 'finished' && state.matchDbId) {
      navigate('/', {
        replace: true,
        state: {
          serverMatchResult: {
            matchDbId: state.matchDbId,
            homeGoals: state.homeGoals,
            awayGoals: state.awayGoals,
            competition: locState?.competition || 'Amistoso',
          },
        },
      });
    } else {
      navigate('/', { replace: true });
    }
  };

  return <MatchViewer matchState={state} onExit={handleExit} homePlayers={locState?.homePlayers} tactics={locState?.tactics} awayStrength={locState?.awayStrength} />;
}

/* ── PRE-MATCH SCREEN ─────────────────────────────────────── */

function PreMatchScreen({ locState, players, onReorder, onConfirm, onCancel }: {
  locState: MatchPageState;
  players: Player[];
  onReorder: (p: Player[]) => void;
  onConfirm: (players: Player[], tactics?: TacticsConfig) => void;
  onCancel: () => void;
}) {
  const [localTactics, setLocalTactics] = useState<TacticsConfig>({ ...locState.tactics });
  const [activeTab, setActiveTab] = useState<'squad' | 'tactics'>('squad');

  // Auto-suggest best lineup for formation
  const suggestBestLineup = useCallback(() => {
    const requiredPositions = getFormationPositions(localTactics.formation || '4-4-2');
    const available = [...players];
    const selected: Player[] = [];
    const used = new Set<string>();

    // For each position slot, pick the best available player
    for (const pos of requiredPositions) {
      // Find best player for this position that hasn't been used
      let best: Player | null = null;
      let bestScore = -1;

      for (const p of available) {
        if (used.has(p.id)) continue;
        const posMatch = p.position === pos;
        const groupMatch = getPositionGroup(p.position) === getPositionGroup(pos);
        const score = (posMatch ? 1000 : groupMatch ? 500 : 0) + p.overall * 10 + (p.stamina || 100);
        if (score > bestScore) {
          bestScore = score;
          best = p;
        }
      }
      if (best) {
        selected.push(best);
        used.add(best.id);
      }
    }

    // Add remaining as bench
    const bench = available.filter(p => !used.has(p.id));
    onReorder([...selected, ...bench]);
  }, [players, localTactics.formation, onReorder]);

  const starters = players.slice(0, 11);
  const bench = players.slice(11);
  const avgOverall = starters.length > 0 ? Math.round(starters.reduce((s, p) => s + p.overall, 0) / starters.length) : 0;

  const swapPlayers = (indexA: number, indexB: number) => {
    const newPlayers = [...players];
    [newPlayers[indexA], newPlayers[indexB]] = [newPlayers[indexB], newPlayers[indexA]];
    onReorder(newPlayers);
  };

  const moveToStarter = (benchIndex: number) => {
    const benchPlayer = bench[benchIndex];
    const globalBenchIdx = 11 + benchIndex;
    let samePosSIdx = -1;
    for (let j = starters.length - 1; j >= 0; j--) {
      if (starters[j].position === benchPlayer.position) { samePosSIdx = j; break; }
    }
    const swapIdx = samePosSIdx >= 0 ? samePosSIdx : 10;
    swapPlayers(swapIdx, globalBenchIdx);
  };

  const moveToBench = (starterIdx: number) => {
    if (bench.length === 0) return;
    const starterPlayer = starters[starterIdx];
    const samePosB = bench.findIndex(p => p.position === starterPlayer.position);
    const benchSwap = samePosB >= 0 ? 11 + samePosB : 11;
    swapPlayers(starterIdx, benchSwap);
  };

  // Get required positions for current formation
  const requiredPositions = getFormationPositions(localTactics.formation || '4-4-2');

  // Find best suggestion for each starter slot
  const getSuggestionForSlot = (slotIndex: number): Player | null => {
    const requiredPos = requiredPositions[slotIndex];
    const currentPlayer = starters[slotIndex];
    if (!currentPlayer || !requiredPos) return null;
    if (currentPlayer.position === requiredPos) return null; // Already correct

    // Find a better candidate on the bench or in another starter slot
    const betterOnBench = bench
      .filter(p => p.position === requiredPos && p.overall > currentPlayer.overall - 5)
      .sort((a, b) => b.overall - a.overall)[0];
    return betterOnBench || null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-[hsl(220,20%,6%)] p-3 sm:p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="space-y-3 mb-4">
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" /> Cancelar
        </Button>

        <Card className="overflow-hidden">
          <div className="bg-primary/10 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-primary font-bold uppercase tracking-wider">Escalar Time</p>
              <p className="text-lg font-black mt-0.5">
                {locState.isHome ? locState.homeTeam : locState.awayTeam} vs {locState.isHome ? locState.awayTeam : locState.homeTeam}
              </p>
            </div>
            <Badge variant="outline" className="text-sm">{locState.competition || 'Amistoso'}</Badge>
          </div>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">🏟️</span>
                <span className="text-muted-foreground">{locState.stadiumName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-yellow-400" />
                <span className="font-bold">OVR {avgOverall}</span>
              </div>
              <Badge variant="secondary" className="text-xs">{localTactics.formation || '4-4-2'}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab switch: Squad / Tactics */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={activeTab === 'squad' ? 'default' : 'outline'}
          size="sm"
          className="flex-1 gap-1.5 text-sm"
          onClick={() => setActiveTab('squad')}
        >
          <Users className="h-4 w-4" /> Escalação
        </Button>
        <Button
          variant={activeTab === 'tactics' ? 'default' : 'outline'}
          size="sm"
          className="flex-1 gap-1.5 text-sm"
          onClick={() => setActiveTab('tactics')}
        >
          <Settings2 className="h-4 w-4" /> Táticas
        </Button>
      </div>

      {activeTab === 'squad' ? (
        <>
          {/* Starters */}
          <div className="mb-4">
            <p className="text-base font-black text-primary mb-2 flex items-center gap-2">
              <Shirt className="h-4 w-4" /> Titulares ({starters.length}/11)
            </p>
            <div className="space-y-1.5">
              {starters.map((p, i) => {
                const stamina = p.stamina || 100;
                const staminaColor = stamina >= 70 ? 'bg-emerald-500' : stamina >= 40 ? 'bg-yellow-500' : 'bg-red-500';
                const requiredPos = requiredPositions[i];
                const posMatch = p.position === requiredPos;
                const suggestion = getSuggestionForSlot(i);
                return (
                  <div key={p.id} className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 group ${posMatch ? 'bg-card/60 border-border/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
                    <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${posMatch ? 'bg-primary/10 text-primary' : 'bg-orange-500/15 text-orange-400'}`}>
                      {p.position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold truncate">{p.name}</p>
                        {!posMatch && requiredPos && (
                          <Badge variant="outline" className="text-[9px] border-orange-400/30 text-orange-400 shrink-0">
                            Ideal: {requiredPos}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">OVR <span className="font-bold text-foreground">{p.overall}</span></span>
                        <div className="flex items-center gap-1 flex-1">
                          <div className="h-1.5 w-12 rounded-full bg-muted/20 overflow-hidden">
                            <div className={`h-full rounded-full ${staminaColor}`} style={{ width: `${stamina}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{stamina}%</span>
                        </div>
                      </div>
                      {suggestion && (
                        <button
                          onClick={() => {
                            const benchIdx = bench.findIndex(bp => bp.id === suggestion.id);
                            if (benchIdx >= 0) swapPlayers(i, 11 + benchIdx);
                          }}
                          className="text-[10px] text-emerald-400 hover:underline mt-0.5"
                        >
                          💡 Sugestão: {suggestion.name} ({suggestion.position} OVR {suggestion.overall})
                        </button>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => moveToBench(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bench */}
          {bench.length > 0 && (
            <div className="mb-4">
              <p className="text-base font-black text-muted-foreground mb-2">🪑 Reservas ({bench.length})</p>
              <div className="space-y-1.5">
                {bench.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => moveToStarter(i)}
                    className="w-full flex items-center gap-2 bg-muted/10 border border-border/15 rounded-xl px-3 py-2.5 hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all text-left group"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                      {p.position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <span className="text-xs text-muted-foreground">OVR {p.overall} · ⚡{p.stamina || 100}%</span>
                    </div>
                    <span className="text-xs text-emerald-400 opacity-0 group-hover:opacity-100 font-bold shrink-0">↑ Escalar</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Tactics tab */
        <div className="space-y-4 mb-4">
          <Card className="border-border/20">
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-sm font-bold text-muted-foreground mb-1.5 block">Formação</label>
                <Select value={localTactics.formation || '4-4-2'} onValueChange={(v) => setLocalTactics(prev => ({ ...prev, formation: v as Formation }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {formationsList.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-bold text-muted-foreground mb-1.5 block">Estilo de Jogo</label>
                <Select value={localTactics.playStyle || 'equilibrado'} onValueChange={(v) => setLocalTactics(prev => ({ ...prev, playStyle: v as any }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="defensivo">Defensivo</SelectItem>
                    <SelectItem value="equilibrado">Equilibrado</SelectItem>
                    <SelectItem value="ofensivo">Ofensivo</SelectItem>
                    <SelectItem value="contra-ataque">Contra-Ataque</SelectItem>
                    <SelectItem value="posse">Posse de Bola</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-bold text-muted-foreground mb-1.5 block">Pressão</label>
                <Select value={localTactics.pressing || 'medio'} onValueChange={(v) => setLocalTactics(prev => ({ ...prev, pressing: v as any }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixo">Baixa</SelectItem>
                    <SelectItem value="medio">Média</SelectItem>
                    <SelectItem value="alto">Alta</SelectItem>
                    <SelectItem value="ultra-alto">Ultra-Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-bold text-muted-foreground mb-1.5 block">Ritmo</label>
                <Select value={localTactics.tempo || 'normal'} onValueChange={(v) => setLocalTactics(prev => ({ ...prev, tempo: v as any }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lento">Lento</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="rapido">Rápido</SelectItem>
                    <SelectItem value="muito-rapido">Muito Rápido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-bold text-muted-foreground mb-1.5 block">Estilo de Passe</label>
                <Select value={localTactics.passingStyle || 'misto'} onValueChange={(v) => setLocalTactics(prev => ({ ...prev, passingStyle: v as any }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="curto">Curto</SelectItem>
                    <SelectItem value="misto">Misto</SelectItem>
                    <SelectItem value="longo">Longo</SelectItem>
                    <SelectItem value="direto">Direto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted/10 border border-border/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground text-center">
                  ⚙️ As táticas influenciam diretamente o comportamento do time na simulação
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm */}
      <Button
        className="w-full h-14 text-lg font-black gap-2 shadow-lg"
        onClick={() => onConfirm(players, localTactics)}
      >
        <Zap className="h-5 w-5" /> Iniciar Partida
      </Button>
    </div>
  );
}

/* ── SUBSTITUTION BANNER (TV-STYLE) ──────────────────────────── */

interface SubBannerData {
  minute: number;
  playerOut: string;
  playerIn: string;
  teamName: string;
  isHalftime: boolean;
  shield?: ShieldRenderProps;
}

function SubstitutionBanner({ data, onDone }: { data: SubBannerData; onDone: () => void }) {
  // Use ref para manter onDone estável e garantir que o timer rode 1x e feche em 5s
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="animate-fade-in fixed top-2 left-2 right-2 sm:top-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 sm:w-[90vw] sm:max-w-md">
      <div className="bg-gradient-to-r from-[hsl(220,25%,12%)] via-[hsl(220,25%,15%)] to-[hsl(220,25%,12%)] border border-primary/30 rounded-xl shadow-2xl shadow-primary/20 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-primary to-red-500" />
        <div className="px-2.5 py-2 sm:px-4 sm:py-3 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              {data.shield ? <ShieldCrest size={20} {...data.shield} /> : <span className="text-base sm:text-xl">🔁</span>}
              <span className="text-[10px] sm:text-sm font-black uppercase tracking-wider text-primary truncate">Substituição</span>
              <span className="text-[10px] sm:text-xs font-bold text-foreground truncate hidden sm:inline">{data.teamName}</span>
            </div>
            <Badge variant="outline" className="text-[10px] sm:text-sm font-mono px-1.5 sm:px-2.5 shrink-0">
              {data.isHalftime ? 'INT' : `${data.minute}'`}
            </Badge>
          </div>
          <div className="flex items-stretch gap-1.5 sm:gap-3">
            <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2.5">
              <span className="text-red-400 text-sm sm:text-base shrink-0">⬅️</span>
              <div className="min-w-0">
                <p className="text-[8px] sm:text-xs text-red-400 font-bold uppercase leading-tight">Sai</p>
                <p className="text-xs sm:text-base font-black truncate text-foreground leading-tight">{data.playerOut}</p>
              </div>
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2.5">
              <span className="text-emerald-400 text-sm sm:text-base shrink-0">➡️</span>
              <div className="min-w-0">
                <p className="text-[8px] sm:text-xs text-emerald-400 font-bold uppercase leading-tight">Entra</p>
                <p className="text-xs sm:text-base font-black truncate text-foreground leading-tight">{data.playerIn}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── MATCH VIEWER ─────────────────────────────────────────── */

export function MatchViewer({ matchState, onExit, homePlayers, tactics, awayStrength = 60 }: {
  matchState: MatchState; onExit: () => void;
  homePlayers?: Player[]; tactics?: TacticsConfig;
  awayStrength?: number;
}) {
  const {
    phase, currentMinute, progress, homeTeam, awayTeam,
    homeGoals, awayGoals, visibleEvents, latestEvent, stats, stadiumName, matchDbId, competition,
  } = matchState;

  const isFinished = phase === 'finished';
  const isHalftime = phase === 'halftime';

  // Resolve team shields for narration rows
  const { homeShield, awayShield } = useMatchShields(homeTeam, awayTeam);

  // In-match tactics
  const [liveTactics, setLiveTactics] = useState<TacticsConfig>(tactics || { formation: '4-4-2' } as TacticsConfig);

  // Goal flash
  const [goalFlash, setGoalFlash] = useState(false);
  const lastGoalCount = useRef(0);
  useEffect(() => {
    const total = homeGoals + awayGoals;
    if (total > lastGoalCount.current) {
      setGoalFlash(true);
      setTimeout(() => setGoalFlash(false), 2500);
    }
    lastGoalCount.current = total;
  }, [homeGoals, awayGoals]);

  // Active highlight (with cooldown + corner probability filter)
  const [activeHighlight, setActiveHighlight] = useState<SimEvent | null>(null);
  const lastHighlightId = useRef('');
  const lastHighlightShownAt = useRef<number>(0);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!latestEvent) return;
    const eventId = `${latestEvent.minute}-${latestEvent.type}-${latestEvent.team}`;
    if (!isHighlightEvent(latestEvent.type) || eventId === lastHighlightId.current) return;

    const isPenalty = ['penalty_goal', 'penalty_miss'].includes(latestEvent.type);
    const isCorner = latestEvent.type === 'corner_danger';
    const now = Date.now();
    const sinceLast = now - lastHighlightShownAt.current;

    // Cooldown 6s, except for penalties
    if (!isPenalty && sinceLast < 6000) return;
    // Corners only show 40% of the time
    if (isCorner && Math.random() > 0.4) return;
    // Already running? Skip (penalties override)
    if (activeHighlight && !isPenalty) return;

    lastHighlightId.current = eventId;
    lastHighlightShownAt.current = now;
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    setActiveHighlight(latestEvent);
  }, [latestEvent, activeHighlight]);

  // QA fix: ensure no orphan highlight timeout on unmount or when match finishes
  useEffect(() => {
    if (isFinished && highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
      setActiveHighlight(null);
    }
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
    };
  }, [isFinished]);

  // ── POST-MATCH: send report notification + update global ranking (idempotent) ──
  const postMatchSentRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isFinished || !matchDbId) return;
    if (postMatchSentRef.current === matchDbId) return;
    postMatchSentRef.current = matchDbId;

    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const userId = sess.session?.user?.id;
        if (!userId) return;

        // Determine my side / outcome
        const isHome = matchState.isHome ?? true;
        const myGoals = isHome ? homeGoals : awayGoals;
        const oppGoals = isHome ? awayGoals : homeGoals;
        const myClub = isHome ? homeTeam : awayTeam;
        const oppClub = isHome ? awayTeam : homeTeam;
        const outcome: 'win' | 'draw' | 'loss' =
          myGoals > oppGoals ? 'win' : myGoals === oppGoals ? 'draw' : 'loss';
        const resultIcon = outcome === 'win' ? '🟢' : outcome === 'draw' ? '🟡' : '🔴';
        const compLabel = competition || 'Amistoso';
        const compKey: 'friendly' | 'league' | 'continental' | 'world' =
          /mundial/i.test(compLabel) ? 'world'
          : /continental|libertadores|champions|sul-american|europa/i.test(compLabel) ? 'continental'
          : /liga|league|série|serie|brasileir/i.test(compLabel) ? 'league'
          : 'friendly';

        // 1) Insert notification (uses created_at + matchDbId in data for dedup on bell side)
        await supabase.from('user_notifications').insert({
          user_id: userId,
          type: 'match_report',
          icon: '📊',
          title: `${resultIcon} Relatório: ${myClub} ${myGoals}x${oppGoals} ${oppClub}`,
          message: `${compLabel} • Toque para ver os detalhes da partida.`,
          data: { match_db_id: matchDbId, competition: compLabel, my_goals: myGoals, opp_goals: oppGoals },
        });

        // 2) Update global ranking
        const { updateGlobalRanking } = await import('@/match/rankingUpdater');
        await updateGlobalRanking({
          userId,
          clubName: myClub,
          outcome,
          competition: compKey,
          competitionLabel: compLabel,
        });
      } catch { /* silencioso */ }
    })();
  }, [isFinished, matchDbId, homeGoals, awayGoals, homeTeam, awayTeam, competition, matchState.isHome]);

  // Auto-scroll events
  const eventsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (eventsRef.current) eventsRef.current.scrollTop = 0;
  }, [visibleEvents.length]);

  // Assistant tips expanded
  const [showAssistantPanel, setShowAssistantPanel] = useState(false);
  const hasAssistant = matchState.assistantTips.length > 0;
  const latestTip = hasAssistant ? matchState.assistantTips[matchState.assistantTips.length - 1] : null;

  // Expanded widget state
  const [expandedWidget, setExpandedWidget] = useState<string | null>('stats');

  // ── Substitution system state ──
  // SINGLE SOURCE OF TRUTH for player on-field state:
  //   - substitutedPlayerIds: Set of starter IDs that LEFT the field (isSubstituted=true → cannot return)
  //   - enteredInIds: Set of bench IDs that came IN (isOnField=true → cannot be brought in again)
  //   - A starter not in substitutedPlayerIds is still on the field (isOnField=true)
  //   - A bench player not in enteredInIds is still on the bench (isOnField=false)
  const [subsUsed, setSubsUsed] = useState(0);
  const [selectedSubOut, setSelectedSubOut] = useState<string | null>(null);
  const [substitutedPlayerIds, setSubstitutedPlayerIds] = useState<Set<string>>(new Set());
  const [enteredInIds, setEnteredInIds] = useState<Set<string>>(new Set());
  const [activeBanner, setActiveBanner] = useState<SubBannerData | null>(null);
  const [subQueue, setSubQueue] = useState<{ outId: string; inId: string; scheduledMinute?: number }[]>([]);
  const [injectedSubEvents, setInjectedSubEvents] = useState<SimEvent[]>([]);
  // shared_match_id resolvido a partir do live_matches.id — chave compartilhada
  // entre os dois clientes (cada um tem seu próprio live_matches.id, mas ambos têm o mesmo shared_match_id).
  const [sharedMatchId, setSharedMatchId] = useState<string | null>(null);

  // Resolve shared_match_id assim que matchDbId estiver disponível
  useEffect(() => {
    if (!matchDbId || matchDbId.startsWith('offline-')) {
      setSharedMatchId(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('live_matches')
      .select('shared_match_id, match_id')
      .eq('id', matchDbId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setSharedMatchId(data.shared_match_id || data.match_id || null);
      });
    return () => { cancelled = true; };
  }, [matchDbId]);
  // Local version counter — bumps on every substitution to force re-render of all consumers
  const [subStateVersion, setSubStateVersion] = useState(0);
  // Tracks when each player entered the field (minute). Starters default to 0.
  const [enteredAtMap, setEnteredAtMap] = useState<Record<string, number>>({});
  const maxSubs = 5;
  // Janelas removidas — substituições são rápidas e ilimitadas em janela.
  const windowsUsed = 0;
  const maxWindows = 99;

  // ── DERIVED on-field state (SINGLE SOURCE OF TRUTH for lineup/bench UI) ──
  // currentStarters: 11 players currently on the field (initial 11, minus subbed-out, plus subbed-in)
  // currentBench: bench players that have NOT entered the field yet (still available)
  const { currentStarters, currentBench } = useMemo(() => {
    if (!homePlayers || homePlayers.length === 0) {
      return { currentStarters: [] as Player[], currentBench: [] as Player[] };
    }
    const initialStarters = homePlayers.slice(0, 11);
    const initialBench = homePlayers.slice(11);
    const remainingStarters = initialStarters.filter(p => !substitutedPlayerIds.has(p.id));
    const subbedInPlayers = initialBench.filter(p => enteredInIds.has(p.id));
    const remainingBench = initialBench.filter(p => !enteredInIds.has(p.id));
    return {
      currentStarters: [...remainingStarters, ...subbedInPlayers],
      currentBench: remainingBench,
    };
    // subStateVersion forces re-derivation on every sub change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homePlayers, substitutedPlayerIds, enteredInIds, subStateVersion]);

  // ── Live stamina map (continuous fatigue during the match) ──
  const liveStaminaMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!homePlayers) return map;
    homePlayers.forEach(p => {
      const enteredAt = enteredAtMap[p.id] ?? 0;
      // Subbed-off players: freeze at the minute they left
      const wasSubbed = substitutedPlayerIds.has(p.id);
      const refMinute = wasSubbed ? (enteredAtMap[`__out_${p.id}`] ?? currentMinute) : currentMinute;
      map[p.id] = computeLiveStamina({
        player: p,
        minute: refMinute,
        enteredAt,
        tactics: liveTactics,
        isHalftime,
        serverStamina: matchState.playerStamina?.[p.id],
      });
    });
    return map;
  }, [homePlayers, currentMinute, liveTactics, isHalftime, enteredAtMap, substitutedPlayerIds, matchState.playerStamina]);

  // Process queued substitutions — rápido: aplica imediatamente após qualquer evento
  // Substituição agendada para minuto X aguarda o minuto chegar.
  // No intervalo, queue espera; assim que voltar (currentMinute >= 46) é processada.
  useEffect(() => {
    if (subQueue.length === 0 || !homePlayers) return;
    const next = subQueue[0];

    // Sub agendada: aguarda o minuto programado
    if (next.scheduledMinute && currentMinute < next.scheduledMinute && !isHalftime) return;

    // Se está no intervalo, marca como halftime sub (entra no 2T)
    // Caso contrário, aplica RÁPIDO assim que houver qualquer novo evento (próximo lance)
    if (!latestEvent && !isHalftime) return;

    const playerOut = homePlayers.find(p => p.id === next.outId);
    const playerIn = homePlayers.find(p => p.id === next.inId);

    // GUARDS — single source of truth checks (atomic before mutation)
    if (!playerOut || !playerIn) {
      console.warn('[SUB] Player not found, dropping queued sub', next);
      setSubQueue(q => q.slice(1));
      return;
    }
    if (substitutedPlayerIds.has(playerOut.id)) {
      console.warn('[SUB] playerOut already substituted, dropping', playerOut.id);
      setSubQueue(q => q.slice(1));
      return;
    }
    if (enteredInIds.has(playerIn.id)) {
      console.warn('[SUB] playerIn already on field, dropping', playerIn.id);
      setSubQueue(q => q.slice(1));
      return;
    }

    const subMinute = isHalftime ? 46 : currentMinute;
    setSubsUsed(prev => prev + 1);
    setSubstitutedPlayerIds(prev => {
      const n = new Set(prev); n.add(playerOut.id); return n;
    });
    setEnteredInIds(prev => {
      const n = new Set(prev); n.add(playerIn.id); return n;
    });
    setEnteredAtMap(prev => ({
      ...prev,
      [next.inId]: subMinute,
      [`__out_${next.outId}`]: subMinute,
    }));
    setSubStateVersion(v => v + 1);
    setActiveBanner({
      minute: currentMinute,
      playerOut: playerOut.name,
      playerIn: playerIn.name,
      teamName: homeTeam,
      isHalftime,
      shield: homeShield,
    });
    setInjectedSubEvents(prev => [...prev, {
      minute: isHalftime ? 45 : currentMinute,
      type: 'substitution',
      team: 'home',
      description: `🔁 Substituição (${homeTeam}): ⬅️ ${playerOut.name} sai • ➡️ ${playerIn.name} entra`,
    } as SimEvent]);
    setSubQueue(q => q.slice(1));

    // ── Cross-client sync: persiste a substituição no servidor para o oponente ver ──
    // O INSERT é fire-and-forget — UI local já foi atualizada. Realtime entrega ao oponente.
    // IMPORTANTE: cada lado tem seu próprio live_matches.id — usamos shared_match_id como chave compartilhada.
    if (matchDbId && !matchDbId.startsWith('offline-')) {
      const mySide: 'home' | 'away' = matchState.isHome ? 'home' : 'away';
      supabase.from('live_match_substitutions').insert({
        live_match_id: matchDbId,
        shared_match_id: sharedMatchId, // chave compartilhada para sincronização cross-client
        team_side: mySide,
        minute: subMinute,
        is_halftime: isHalftime,
        player_out_id: String(playerOut.id),
        player_in_id: String(playerIn.id),
        player_out_name: playerOut.name,
        player_in_name: playerIn.name,
        team_name: homeTeam,
      } as any).then(({ error }) => {
        if (error && error.code !== '23505') {
          // 23505 = duplicate (já sincronizado por outra aba/dispositivo) — ignorar
          console.warn('[SUB sync] Failed to publish sub:', error.message);
        }
      });
    }
  }, [subQueue, latestEvent, isHalftime, currentMinute, homePlayers, homeTeam, homeShield, substitutedPlayerIds, enteredInIds, matchDbId, matchState.isHome]);

  // ── REALTIME + POLLING FALLBACK: substituições do oponente ──
  // Filtra por shared_match_id (chave compartilhada entre os dois clientes).
  // Cada cliente tem seu próprio live_matches.id, então filtrar por live_match_id NÃO funcionaria.
  const seenRemoteSubsRef = useRef<Set<string>>(new Set());
  // Refs para deps "voláteis" (shields/team names) — evita recriar canal a cada render
  const oppContextRef = useRef({ homeTeam, awayTeam, homeShield, awayShield, isHome: matchState.isHome });
  useEffect(() => {
    oppContextRef.current = { homeTeam, awayTeam, homeShield, awayShield, isHome: matchState.isHome };
  }, [homeTeam, awayTeam, homeShield, awayShield, matchState.isHome]);

  useEffect(() => {
    if (!sharedMatchId) return;

    const ingest = (row: any) => {
      if (!row) return;
      if (row.shared_match_id !== sharedMatchId) return;
      if (seenRemoteSubsRef.current.has(row.id)) return;
      const ctx = oppContextRef.current;
      const mySide: 'home' | 'away' = ctx.isHome ? 'home' : 'away';
      const oppSide: 'home' | 'away' = mySide === 'home' ? 'away' : 'home';
      // Apenas eventos do lado OPOSTO geram feed/banner.
      if (row.team_side !== oppSide) return;
      seenRemoteSubsRef.current.add(row.id);

      const oppTeam = mySide === 'home' ? ctx.awayTeam : ctx.homeTeam;
      const oppShield = mySide === 'home' ? ctx.awayShield : ctx.homeShield;
      const minute = Number(row.minute) || 0;
      const isHalf = !!row.is_halftime;
      setInjectedSubEvents(prev => [...prev, {
        minute: isHalf ? 45 : minute,
        type: 'substitution',
        team: oppSide,
        description: `🔁 Substituição (${row.team_name || oppTeam}): ⬅️ ${row.player_out_name} sai • ➡️ ${row.player_in_name} entra`,
      } as SimEvent]);
      setActiveBanner({
        minute,
        playerOut: row.player_out_name,
        playerIn: row.player_in_name,
        teamName: row.team_name || oppTeam,
        isHalftime: isHalf,
        shield: oppShield,
      });
    };

    let cancelled = false;
    const fetchAll = async () => {
      const { data, error } = await supabase
        .from('live_match_substitutions')
        .select('*')
        .eq('shared_match_id', sharedMatchId)
        .order('created_at', { ascending: true });
      if (cancelled) return;
      if (error) {
        console.warn('[SUB sync] Fetch failed:', error.message);
        return;
      }
      (data || []).forEach(ingest);
    };

    // 1) Backfill imediato (subs já existentes — entrou depois ou recarregou)
    fetchAll();

    // 2) Realtime — escuta novos INSERTs filtrando pela chave compartilhada
    const channel = supabase
      .channel(`live-subs-${sharedMatchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_match_substitutions',
          filter: `shared_match_id=eq.${sharedMatchId}`,
        },
        (payload) => ingest(payload.new),
      )
      .subscribe();

    // 3) Polling fallback a cada 4s — garante sync mesmo se Realtime falhar
    const pollId = setInterval(fetchAll, 4000);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [sharedMatchId]);

  // Validation helper for substitutions — used by widget click + queue

  const validateSubAllowed = useCallback((): { ok: boolean; reason?: string } => {
    if (isFinished) return { ok: false, reason: '🚫 Partida finalizada — substituições encerradas.' };
    if (currentMinute > 90)
      return { ok: false, reason: "🚫 Não é permitido substituir após o 90' minuto." };
    if (subsUsed >= maxSubs)
      return { ok: false, reason: `🚫 Limite de ${maxSubs} substituições já utilizado.` };
    if (subsUsed + subQueue.length >= maxSubs)
      return { ok: false, reason: `🚫 Fila cheia: já há ${subQueue.length} substituições aguardando.` };
    return { ok: true };
  }, [currentMinute, isFinished, subsUsed, subQueue.length]);

  const handleQueueSubstitution = useCallback((playerOutId: string, playerInId: string, scheduledMinute?: number) => {
    const check = validateSubAllowed();
    if (!check.ok) {
      toast.error(check.reason || 'Substituição não permitida');
      return;
    }
    if (subQueue.some(s => s.outId === playerOutId)) {
      toast.error('Esse titular já está na fila de saída');
      return;
    }
    if (subQueue.some(s => s.inId === playerInId)) {
      toast.error('Esse reserva já está na fila de entrada');
      return;
    }
    if (substitutedPlayerIds.has(playerOutId)) {
      toast.error('🚫 Esse jogador já foi substituído e não pode voltar');
      return;
    }
    if (enteredInIds.has(playerInId)) {
      toast.error('🚫 Esse jogador já está em campo');
      return;
    }
    if (playerOutId === playerInId) {
      toast.error('🚫 Não é possível substituir um jogador por ele mesmo');
      return;
    }
    // Confirm playerOut is currently on field (initial starter or subbed-in)
    const isOnField = currentStarters.some(p => p.id === playerOutId);
    if (!isOnField) {
      toast.error('🚫 Esse jogador não está em campo');
      return;
    }
    // Confirm playerIn is on bench
    const isOnBench = currentBench.some(p => p.id === playerInId);
    if (!isOnBench) {
      toast.error('🚫 Esse jogador não está disponível no banco');
      return;
    }
    setSubQueue(q => [...q, { outId: playerOutId, inId: playerInId, scheduledMinute }]);
    setSelectedSubOut(null);
    if (scheduledMinute) {
      toast.success(`⏱️ Substituição programada para o minuto ${scheduledMinute}'`);
    } else if (isHalftime) {
      toast.success('✅ Substituição confirmada — jogador entra no 2º tempo');
    } else {
      toast.success('✅ Substituição enviada — aplicada no próximo lance');
    }
  }, [validateSubAllowed, isHalftime, subQueue, substitutedPlayerIds, enteredInIds, currentStarters, currentBench]);

  // Cancel a queued substitution before it's applied (only allowed if not yet executed)
  const handleCancelQueuedSub = useCallback((outId: string) => {
    setSubQueue(q => q.filter(s => s.outId !== outId));
    toast.info('🚫 Substituição cancelada');
  }, []);

  const subValidation = validateSubAllowed();
  const subBlocked = !subValidation.ok;
  const subBlockedReason = subValidation.reason;

  const phaseLabel = () => {
    if (isFinished) return '🏁 FIM DE JOGO';
    if (isHalftime) return '⏸️ INTERVALO';
    if (currentMinute <= 45) return `⚽ 1º TEMPO • ${currentMinute}'`;
    return `⚽ 2º TEMPO • ${currentMinute}'`;
  };

  const possession = computePossession(visibleEvents, stats);
  const goalEvents = visibleEvents.filter(e => e.isGoal);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(220,20%,6%)] max-w-6xl mx-auto">
      {/* Substitution TV Banner */}
      {activeBanner && (
        <SubstitutionBanner
          key={`${activeBanner.minute}-${activeBanner.playerOut}-${activeBanner.playerIn}`}
          data={activeBanner}
          onDone={() => setActiveBanner(null)}
        />
      )}

      {/* ═══ FIXED TOP BAR with action buttons ═══ */}
      <div className="sticky top-0 z-40 bg-[hsl(var(--background))]/95 backdrop-blur-md border-b border-border/20 px-3 py-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5" onClick={onExit}>
            <LogOut className="h-3.5 w-3.5" /> Sair
          </Button>
          
          <div className="flex flex-col items-end">
            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-primary border-primary/20 bg-primary/5 mb-0.5">
              {competition || 'Amistoso'}
            </Badge>
            <span className="text-[9px] text-muted-foreground truncate max-w-[150px] sm:max-w-none">
              🏟️ {stadiumName}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ MATCH CONTENT ═══ */}
      <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
        <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-3 space-y-2 sm:space-y-3 lg:space-y-0">
          {/* ═══ MAIN COLUMN ═══ */}
          <div className="space-y-2 sm:space-y-3 min-w-0">
            {/* Professional Scoreboard — TV Broadcast Style */}
            <Card className={`overflow-hidden transition-all duration-500 relative ${goalFlash ? 'ring-2 ring-yellow-400/60 animate-goal-glow shadow-2xl shadow-yellow-400/20' : 'shadow-lg'}`}>
              <div className="bg-muted/10 px-3 py-1 flex items-center justify-between border-b border-border/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{phaseLabel()}</span>
                <div className="flex items-center gap-1.5">
                  {!isFinished && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                  <span className="text-xs font-mono font-bold">{currentMinute}'</span>
                </div>
              </div>

              <CardContent className="p-4 sm:p-6 space-y-4">
                {isHalftime ? (
                  <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-2xl p-6 text-center space-y-2 animate-fade-in">
                    <p className="text-3xl">⏸️</p>
                    <p className="text-xl font-black text-primary uppercase tracking-tighter">Intervalo</p>
                    <div className="flex items-center justify-center gap-6">
                       <div className="text-center">
                         <div className="mb-1 flex justify-center">{homeShield ? <ShieldCrest size={32} {...homeShield} /> : <div className="w-8 h-8 bg-muted rounded-full" />}</div>
                         <p className="text-[10px] font-bold uppercase truncate max-w-[80px]">{homeTeam}</p>
                       </div>
                       <div className="text-4xl font-black font-mono flex items-center gap-3">
                         <span>{homeGoals}</span>
                         <span className="text-muted-foreground/30">-</span>
                         <span>{awayGoals}</span>
                       </div>
                       <div className="text-center">
                         <div className="mb-1 flex justify-center">{awayShield ? <ShieldCrest size={32} {...awayShield} /> : <div className="w-8 h-8 bg-muted rounded-full" />}</div>
                         <p className="text-[10px] font-bold uppercase truncate max-w-[80px]">{awayTeam}</p>
                       </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 sm:gap-4">
                      {/* Home Team */}
                      <div className="flex-1 flex flex-col items-center sm:items-end text-center sm:text-right min-w-0">
                        <div className="mb-2 hidden sm:block">
                          {homeShield ? <ShieldCrest size={48} {...homeShield} /> : <div className="w-12 h-12 bg-muted rounded-full" />}
                        </div>
                        <div className="sm:hidden mb-1">
                          {homeShield ? <ShieldCrest size={32} {...homeShield} /> : <div className="w-8 h-8 bg-muted rounded-full" />}
                        </div>
                        <p className="text-sm sm:text-xl font-black truncate w-full uppercase tracking-tight">{homeTeam}</p>
                        <div className="mt-1 flex flex-wrap justify-center sm:justify-end gap-x-2 gap-y-0.5 max-h-12 overflow-y-auto">
                          {goalEvents.filter(e => e.team === 'home').map((g, i) => (
                            <span key={i} className="text-[9px] text-muted-foreground whitespace-nowrap">⚽ {g.playerName.split(' ').pop()} {g.minute}'</span>
                          ))}
                        </div>
                      </div>

                      {/* Score Display */}
                      <div className="flex flex-col items-center justify-center px-4">
                        <div className={`text-4xl sm:text-6xl font-black font-mono tracking-tighter transition-all duration-300 ${goalFlash ? 'text-yellow-400 scale-110' : 'text-foreground'}`}>
                          {homeGoals}<span className="text-muted-foreground/20 mx-1 sm:mx-2">:</span>{awayGoals}
                        </div>
                        {!isFinished && (
                           <div className="w-full mt-2 h-1 bg-muted/20 rounded-full overflow-hidden">
                             <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${(progress || 0) * 100}%` }} />
                           </div>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left min-w-0">
                        <div className="mb-2 hidden sm:block">
                          {awayShield ? <ShieldCrest size={48} {...awayShield} /> : <div className="w-12 h-12 bg-muted rounded-full" />}
                        </div>
                        <div className="sm:hidden mb-1">
                          {awayShield ? <ShieldCrest size={32} {...awayShield} /> : <div className="w-8 h-8 bg-muted rounded-full" />}
                        </div>
                        <p className="text-sm sm:text-xl font-black truncate w-full uppercase tracking-tight">{awayTeam}</p>
                        <div className="mt-1 flex flex-wrap justify-center sm:justify-start gap-x-2 gap-y-0.5 max-h-12 overflow-y-auto">
                          {goalEvents.filter(e => e.team === 'away').map((g, i) => (
                            <span key={i} className="text-[9px] text-muted-foreground whitespace-nowrap">⚽ {g.playerName.split(' ').pop()} {g.minute}'</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Possession bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <span>Posse: {possession[0]}%</span>
                        <span>{possession[1]}%</span>
                      </div>
                      <div className="flex h-1.5 rounded-full overflow-hidden bg-muted/10">
                        <div className="bg-blue-500 transition-all duration-700" style={{ width: `${possession[0]}%` }} />
                        <div className="bg-red-500 flex-1" />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              
              {/* Goal Flash Overlay */}
              {goalFlash && latestEvent?.isGoal && (
                <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[2px] flex flex-col items-center justify-center animate-fade-in z-10">
                  <div className="bg-background/80 border border-emerald-500/30 rounded-2xl px-8 py-4 shadow-2xl text-center transform scale-110">
                    <p className="text-3xl sm:text-5xl font-black text-emerald-500 animate-bounce">GOOOL!</p>
                    <p className="text-lg sm:text-2xl font-black text-foreground mt-1">{latestEvent.playerName}</p>
                    {latestEvent.assistName && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">Assistência: {latestEvent.assistName}</p>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* Substitution queue indicator */}
            {subQueue.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2 flex items-center justify-center gap-2 animate-pulse">
                <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs text-primary font-bold">
                  {subQueue.length} substituição(ões) programada(s)
                </p>
              </div>
            )}


            {/* 2D Canvas — highlights (fixed aspect ratio, capped width) */}
            {!isFinished && activeHighlight && (
              <Card className="p-1.5 sm:p-2 border-yellow-400/40 bg-yellow-400/5 transition-all duration-300 animate-highlight-in shadow-lg shadow-yellow-400/10">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <ShieldCrest size={18} {...(activeHighlight.team === 'away' ? awayShield : homeShield)} />
                  <Badge variant="outline" className="text-[10px] sm:text-xs font-mono">{activeHighlight.minute}' — {getHighlightLabel(activeHighlight.type)}</Badge>
                </div>
                <div className="w-full max-w-[480px] mx-auto aspect-[12/7] overflow-hidden rounded-md">
                  <HighlightMiniCanvas
                    type={getHighlightType(activeHighlight.type)}
                    outcome={getHighlightOutcome(activeHighlight.type)}
                    team={activeHighlight.team === 'neutral' ? 'home' : activeHighlight.team}
                    playerName={activeHighlight?.playerName}
                    currentMinute={currentMinute}
                    onComplete={() => {
                      // Call hook handler to resume simulation clock
                      if (matchState.onAnimationComplete) {
                        matchState.onAnimationComplete();
                      }
                      
                      if (highlightTimeoutRef.current) {
                        clearTimeout(highlightTimeoutRef.current);
                      }
                      highlightTimeoutRef.current = setTimeout(() => {
                        setActiveHighlight(null);
                        highlightTimeoutRef.current = null;
                      }, 1000);
                    }}
                  />
                </div>
                <p className="text-[11px] sm:text-sm text-center text-foreground/90 mt-1.5 font-medium leading-snug px-1">{activeHighlight.description}</p>
                {/* Mini-feed under 2D — context for last 2 events */}
                {visibleEvents.length > 1 && (
                  <div className="mt-1.5 pt-1.5 border-t border-yellow-400/20 space-y-0.5 opacity-70">
                    {[...visibleEvents].slice(-3, -1).reverse().map((ev, i) => (
                      <p key={i} className="text-[10px] text-center text-muted-foreground line-clamp-1 px-1">
                        <span className="font-mono mr-1">{ev.minute}'</span>{ev.description}
                      </p>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Live commentary — compact (hidden during 2D highlight, returns updated after) */}
            {latestEvent && !goalFlash && !activeHighlight && (
              <Card className="py-2 px-3 border-border/30">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-[10px] sm:text-xs font-mono shrink-0 mt-0.5">{latestEvent.minute}'</Badge>
                  <p className={`text-xs sm:text-sm font-bold leading-snug ${getEventColor(latestEvent.type)}`}>
                    {getEventIcon(latestEvent.type)} {latestEvent.description}
                  </p>
                </div>
              </Card>
            )}

            {/* Match content */}
            {!isFinished ? (
              /* Chat-style narration feed — compact */
              <Card className="p-1.5 sm:p-2 border-border/20 bg-gradient-to-br from-card to-card/60">
                <div ref={eventsRef} className="match-feed-scroll max-h-[280px] sm:max-h-[320px] overflow-y-auto">
                  {visibleEvents.length === 0 && (
                    <p className="text-xs sm:text-sm text-muted-foreground text-center py-6">⏳ Aguardando início...</p>
                  )}
                  <EventFeed
                    events={[...visibleEvents, ...injectedSubEvents].sort((a, b) => {
                      if (a.minute !== b.minute) return b.minute - a.minute;
                      return 0;
                    }).slice(0, 100)}
                    homeTeam={homeTeam} awayTeam={awayTeam}
                    homeShield={homeShield} awayShield={awayShield}
                  />
                </div>
              </Card>
            ) : (
              <FinishedSection
                stats={stats}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                finalHomeGoals={homeGoals}
                finalAwayGoals={awayGoals}
                visibleEvents={visibleEvents}
                matchDbId={matchDbId}
                onExit={onExit}
                homePlayers={homePlayers}
                homeShield={homeShield}
                awayShield={awayShield}
              />
            )}
          </div>

          {/* ═══ DESKTOP SIDEBAR ═══ */}
          {!isFinished && (
            <div className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
              <MatchSidebar
                stats={stats}
                matchState={matchState}
                subsUsed={subsUsed}
                maxSubs={maxSubs}
                windowsUsed={windowsUsed}
                maxWindows={maxWindows}
                isFinished={isFinished}
              />
            </div>
          )}
        </div>

        {/* ═══ COMPACT WIDGETS WITH EXPANDABLE MENU ═══ */}
        {!isFinished && (
          <div className="space-y-2">
            {/* Menu Toggle Bar — Professional Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-2">
              <button 
                onClick={() => setExpandedWidget(expandedWidget === 'stats' ? null : 'stats')}
                className={`flex-1 min-w-[70px] flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all ${expandedWidget === 'stats' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' : 'bg-card/40 border border-border/20 text-muted-foreground hover:bg-card'}`}
              >
                <BarChart3 className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-tight">Estat.</span>
              </button>
              <button 
                onClick={() => setExpandedWidget(expandedWidget === 'lineup' ? null : 'lineup')}
                className={`flex-1 min-w-[70px] flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all ${expandedWidget === 'lineup' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' : 'bg-card/40 border border-border/20 text-muted-foreground hover:bg-card'}`}
              >
                <Users className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-tight">Time</span>
              </button>
              <button 
                onClick={() => setExpandedWidget(expandedWidget === 'tactics' ? null : 'tactics')}
                className={`flex-1 min-w-[70px] flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all ${expandedWidget === 'tactics' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' : 'bg-card/40 border border-border/20 text-muted-foreground hover:bg-card'}`}
              >
                <Settings2 className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-tight">Tática</span>
              </button>
              <button 
                onClick={() => setExpandedWidget(expandedWidget === 'subs' ? null : 'subs')}
                className={`flex-1 min-w-[70px] flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all ${expandedWidget === 'subs' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' : 'bg-card/40 border border-border/20 text-muted-foreground hover:bg-card'}`}
              >
                <ArrowUpDown className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-tight">Subs</span>
              </button>
              {hasAssistant && (
                <button 
                  onClick={() => setExpandedWidget(expandedWidget === 'assistant' ? null : 'assistant')}
                  className={`flex-1 min-w-[70px] flex flex-col items-center gap-1.5 p-2.5 rounded-2xl transition-all ${expandedWidget === 'assistant' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 scale-105' : 'bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20'}`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-tight">Dicas</span>
                </button>
              )}
            </div>

            {/* Expanded Widget */}
            {expandedWidget === 'stats' && (
              <Card className="border-border/20 shadow-xl animate-in slide-in-from-bottom-2 duration-300">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" /> Estatísticas Detalhadas
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <StatsView stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} />
                </CardContent>
              </Card>
            )}

            {expandedWidget === 'lineup' && (
              <Card className="border-border/20 shadow-xl animate-in slide-in-from-bottom-2 duration-300">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" /> Escalação Atual
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <LineupView starters={currentStarters} bench={currentBench} tactics={liveTactics} homeTeam={homeTeam} liveStaminaMap={liveStaminaMap} substitutedPlayerIds={substitutedPlayerIds} enteredInIds={enteredInIds} />
                </CardContent>
              </Card>
            )}

            {expandedWidget === 'tactics' && (
              <Card className="border-border/20 shadow-xl animate-in slide-in-from-bottom-2 duration-300">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5">
                    <Settings2 className="h-3.5 w-3.5 text-primary" /> Estilo de Jogo
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <LiveTacticsView tactics={liveTactics} onUpdate={setLiveTactics} />
                </CardContent>
              </Card>
            )}

            {expandedWidget === 'subs' && (
              <Card className="border-border/20 shadow-xl animate-in slide-in-from-bottom-2 duration-300">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5">
                    <ArrowUpDown className="h-3.5 w-3.5 text-primary" /> Substituições
                    <Badge variant="outline" className="ml-auto text-[10px] h-5">{maxSubs-subsUsed}/{maxSubs}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  {subBlocked && subBlockedReason && (
                    <div className="bg-muted/30 border border-border/30 rounded-lg px-3 py-2 flex items-start gap-2 mb-3">
                      <span className="text-xs">⛔</span>
                      <p className="text-[11px] text-muted-foreground flex-1">{subBlockedReason}</p>
                    </div>
                  )}
                  <ManagerSubstitutionView
                    currentStarters={currentStarters}
                    currentBench={currentBench}
                    hasAnyPlayers={!!homePlayers && homePlayers.length > 11}
                    subsUsed={subsUsed}
                    maxSubs={maxSubs}
                    windowsUsed={windowsUsed}
                    maxWindows={maxWindows}
                    selectedSubOut={selectedSubOut}
                    onSelectSubOut={setSelectedSubOut}
                    onConfirmSub={handleQueueSubstitution}
                    onCancelSub={handleCancelQueuedSub}
                    isHalftime={isHalftime}
                    isFinished={isFinished}
                    subQueue={subQueue}
                    blocked={subBlocked}
                    blockedReason={subBlockedReason}
                    liveStaminaMap={liveStaminaMap}
                  />
                </CardContent>
              </Card>
            )}

            {expandedWidget === 'assistant' && hasAssistant && (
              <Card className="border-border/20 shadow-xl animate-in slide-in-from-bottom-2 duration-300">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-amber-500" /> Auxiliar Técnico
                    <Badge variant="outline" className="ml-auto text-[10px] h-5">{matchState.assistantTips.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {[...matchState.assistantTips].reverse().slice(0, 5).map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 bg-card/60 border border-border/20 rounded-xl px-2.5 py-2">
                        <Badge variant="outline" className="text-[9px] font-mono shrink-0 h-5">{tip.minute}'</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] leading-snug">{tip.description}</p>
                          {tip.priority === 'high' && (
                            <Badge variant="destructive" className="text-[9px] mt-1 h-4 px-1.5">Urgente</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══ PERMANENT MINI-WIDGETS (Adversário + Pulso) ═══ */}
        {!isFinished && (
          <MatchMiniWidgets
            awayTeam={awayTeam}
            awayStrength={awayStrength}
            stats={stats}
            currentMoment={matchState.currentMoment}
            homeGoals={homeGoals}
            awayGoals={awayGoals}
            homeShield={homeShield}
            awayShield={awayShield}
          />
        )}
      </div>
    </div>
  );
}

/* ── PERMANENT MINI-WIDGETS ──────────────────────────────── */

function MatchMiniWidgets({
  awayTeam, awayStrength, stats, currentMoment, homeGoals, awayGoals, homeShield, awayShield,
}: {
  awayTeam: string; awayStrength: number; stats: MatchStats;
  currentMoment: string; homeGoals: number; awayGoals: number;
  homeShield?: ShieldRenderProps; awayShield?: ShieldRenderProps;
}) {
  const xgHome = (stats.shotsOnTarget[0] * 0.35 + stats.shots[0] * 0.08).toFixed(1);
  const xgAway = (stats.shotsOnTarget[1] * 0.35 + stats.shots[1] * 0.08).toFixed(1);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {/* Adversário Info */}
      <Card className="border-border/30 bg-card/40 backdrop-blur-sm overflow-hidden">
        <div className="bg-muted/10 px-2 py-1 border-b border-border/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {awayShield ? <ShieldCrest size={14} {...awayShield} /> : <div className="w-3.5 h-3.5 bg-muted rounded-full" />}
            <span className="text-[10px] font-black uppercase tracking-tight truncate max-w-[100px]">{awayTeam}</span>
          </div>
          <Badge variant="outline" className="text-[9px] font-mono h-4 px-1.5 border-primary/20 text-primary">OVR {awayStrength}</Badge>
        </div>
        <div className="p-2 grid grid-cols-3 gap-1 text-center">
          <div className="bg-red-500/5 rounded p-1">
            <p className="text-[8px] text-red-400 font-bold uppercase">ATA</p>
            <p className="text-xs font-black">{Math.min(99, awayStrength + 3)}</p>
          </div>
          <div className="bg-yellow-500/5 rounded p-1">
            <p className="text-[8px] text-yellow-400 font-bold uppercase">MEI</p>
            <p className="text-xs font-black">{awayStrength}</p>
          </div>
          <div className="bg-blue-500/5 rounded p-1">
            <p className="text-[8px] text-blue-400 font-bold uppercase">DEF</p>
            <p className="text-xs font-black">{Math.max(30, awayStrength - 3)}</p>
          </div>
        </div>
      </Card>

      {/* Match Stats Pulse */}
      <Card className="border-border/30 bg-card/40 backdrop-blur-sm overflow-hidden">
        <div className="bg-muted/10 px-2 py-1 border-b border-border/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-primary">
            <Activity className="h-3 w-3" />
            <span className="text-[10px] font-black uppercase tracking-tight">Pulso da Partida</span>
          </div>
          <Badge variant="secondary" className="text-[9px] font-bold h-4 px-1.5 capitalize">{currentMoment.replace('_', ' ')}</Badge>
        </div>
        <div className="p-2 flex flex-col justify-center h-full gap-2">
          <div className="flex items-center justify-between gap-4">
             <div className="flex-1 space-y-0.5">
               <div className="flex justify-between text-[8px] font-bold text-muted-foreground uppercase">
                 <span>Shots</span>
                 <span>{stats.shots[0]} - {stats.shots[1]}</span>
               </div>
               <div className="h-1 bg-muted/20 rounded-full overflow-hidden flex">
                 <div className="h-full bg-blue-500" style={{ width: `${(stats.shots[0] / (stats.shots[0] + stats.shots[1] || 1)) * 100}%` }} />
               </div>
             </div>
             <div className="flex-1 space-y-0.5">
               <div className="flex justify-between text-[8px] font-bold text-muted-foreground uppercase">
                 <span>xG</span>
                 <span>{xgHome} - {xgAway}</span>
               </div>
               <div className="h-1 bg-muted/20 rounded-full overflow-hidden flex">
                 <div className="h-full bg-emerald-500" style={{ width: `${(Number(xgHome) / (Number(xgHome) + Number(xgAway) || 1)) * 100}%` }} />
               </div>
             </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── LIVE TACTICS VIEW ──────────────────────────────────────── */

function LiveTacticsView({ tactics, onUpdate }: { tactics: TacticsConfig; onUpdate: (t: TacticsConfig) => void }) {
  const [applying, setApplying] = useState(false);

  const applyLive = async () => {
    try {
      setApplying(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Sessão expirada'); return; }
      // Find current live match for this user
      const { data: live } = await supabase
        .from('live_matches')
        .select('id, current_minute, status')
        .eq('user_id', session.user.id)
        .eq('status', 'live')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!live) { toast.error('Nenhuma partida ao vivo encontrada'); return; }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/re-simulate-from-minute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          live_match_id: live.id,
          from_minute: live.current_minute || 0,
          new_tactics: tactics,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erro ao aplicar tática');
        return;
      }
      toast.success(`🔄 Tática aplicada — efeito a partir do minuto ${data.from_minute}'`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro de conexão');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-base font-black text-primary flex items-center gap-1.5">
        <Settings2 className="h-5 w-5" /> Ajustes Táticos
      </p>

      <div>
        <label className="text-sm font-bold text-muted-foreground mb-1 block">Formação</label>
        <Select value={tactics.formation || '4-4-2'} onValueChange={(v) => onUpdate({ ...tactics, formation: v as Formation })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {formationsList.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-bold text-muted-foreground mb-1 block">Estilo de Jogo</label>
        <Select value={tactics.playStyle || 'equilibrado'} onValueChange={(v) => onUpdate({ ...tactics, playStyle: v as any })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="retranca-total">🛡️ Retranca Total</SelectItem>
            <SelectItem value="defensivo">Defesa Total</SelectItem>
            <SelectItem value="equilibrado">Equilibrado</SelectItem>
            <SelectItem value="ofensivo">⚔️ Ataque Total</SelectItem>
            <SelectItem value="contra-ataque">Contra-Ataque</SelectItem>
            <SelectItem value="pressao-alta">🔥 Pressão Alta</SelectItem>
            <SelectItem value="posse">Posse de Bola</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-bold text-muted-foreground mb-1 block">Pressão</label>
        <Select value={tactics.pressing || 'medio'} onValueChange={(v) => onUpdate({ ...tactics, pressing: v as any })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="baixo">Baixa</SelectItem>
            <SelectItem value="medio">Média</SelectItem>
            <SelectItem value="alto">Alta</SelectItem>
            <SelectItem value="ultra-alto">Ultra-Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-bold text-muted-foreground mb-1 block">Ritmo</label>
        <Select value={tactics.tempo || 'normal'} onValueChange={(v) => onUpdate({ ...tactics, tempo: v as any })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="lento">Lento</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="rapido">Rápido</SelectItem>
            <SelectItem value="muito-rapido">Muito Rápido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={applyLive} disabled={applying} className="w-full h-10 gap-2 bg-gradient-to-r from-primary to-primary/80">
        {applying ? '⏳ Aplicando...' : '⚡ Aplicar Tática AGORA'}
      </Button>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
        <p className="text-xs text-muted-foreground">
          ⚡ Mudanças geram nova simulação dos minutos restantes • Cooldown 15min
        </p>
      </div>
    </div>
  );
}

/* ── MANAGER SUBSTITUTION VIEW ──────────────────────────────── */

function ManagerSubstitutionView({ currentStarters, currentBench, hasAnyPlayers, subsUsed, maxSubs, windowsUsed, maxWindows, selectedSubOut, onSelectSubOut, onConfirmSub, onCancelSub, isHalftime, isFinished, subQueue, blocked, blockedReason, liveStaminaMap }: {
  currentStarters: Player[];
  currentBench: Player[];
  hasAnyPlayers: boolean;
  subsUsed: number;
  maxSubs: number;
  windowsUsed: number;
  maxWindows: number;
  selectedSubOut: string | null;
  onSelectSubOut: (id: string | null) => void;
  onConfirmSub: (outId: string, inId: string, scheduledMinute?: number) => void;
  onCancelSub: (outId: string) => void;
  isHalftime: boolean;
  isFinished: boolean;
  subQueue: { outId: string; inId: string; scheduledMinute?: number }[];
  blocked?: boolean;
  blockedReason?: string;
  liveStaminaMap?: Record<string, number>;
}) {
  if (!hasAnyPlayers) {
    return (
      <div className="text-center py-6">
        <ArrowUpDown className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Banco insuficiente para substituições</p>
      </div>
    );
  }

  const allSubsUsed = subsUsed >= maxSubs;
  const allWindowsUsed = windowsUsed >= maxWindows && !isHalftime;

  if (allSubsUsed) {
    return (
      <div className="text-center py-6">
        <ArrowUpDown className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-base font-bold text-muted-foreground">Todas as {maxSubs} substituições usadas</p>
      </div>
    );
  }

  if (allWindowsUsed && subQueue.length === 0) {
    return (
      <div className="text-center py-6">
        <ArrowUpDown className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-base font-bold text-muted-foreground">Janelas esgotadas</p>
        <p className="text-xs text-muted-foreground mt-1">Restam {maxSubs - subsUsed} subs para o intervalo.</p>
      </div>
    );
  }

  if (currentBench.length === 0) {
    return (
      <div className="text-center py-6">
        <ArrowUpDown className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-base font-bold text-muted-foreground">Banco vazio</p>
        <p className="text-xs text-muted-foreground mt-1">Todos os reservas já entraram.</p>
      </div>
    );
  }

  return <ImprovedSubsView
    starters={currentStarters}
    bench={currentBench}
    subQueue={subQueue}
    selectedSubOut={selectedSubOut}
    onSelectSubOut={onSelectSubOut}
    onConfirmSub={onConfirmSub}
    onCancelSub={onCancelSub}
    subsUsed={subsUsed}
    maxSubs={maxSubs}
    windowsUsed={windowsUsed}
    maxWindows={maxWindows}
    isHalftime={isHalftime}
    blocked={blocked}
    blockedReason={blockedReason}
    liveStaminaMap={liveStaminaMap}
  />;
}

function ImprovedSubsView({
  starters, bench, subQueue, selectedSubOut, onSelectSubOut, onConfirmSub, onCancelSub,
  subsUsed, maxSubs, windowsUsed, maxWindows, isHalftime, blocked, blockedReason, liveStaminaMap,
}: {
  starters: Player[]; bench: Player[];
  subQueue: { outId: string; inId: string; scheduledMinute?: number }[];
  selectedSubOut: string | null;
  onSelectSubOut: (id: string | null) => void;
  onConfirmSub: (outId: string, inId: string, scheduledMinute?: number) => void;
  onCancelSub: (outId: string) => void;
  subsUsed: number; maxSubs: number; windowsUsed: number; maxWindows: number;
  isHalftime: boolean;
  blocked?: boolean; blockedReason?: string;
  liveStaminaMap?: Record<string, number>;
}) {
  const [posFilter, setPosFilter] = useState<'all' | 'gk' | 'def' | 'mid' | 'atk'>('all');

  const queuedOutIds = new Set(subQueue.map(s => s.outId));
  const queuedInIds = new Set(subQueue.map(s => s.inId));
  const selectedPlayer = starters.find(p => p.id === selectedSubOut);

  // Find best suggested replacement: same position group + highest OVR + good stamina
  const suggestedId = useMemo(() => {
    if (!selectedPlayer) return null;
    const eligible = bench
      .filter(p => !queuedInIds.has(p.id))
      .filter(p => getPositionGroup(p.position) === getPositionGroup(selectedPlayer.position));
    if (eligible.length === 0) return null;
    const sorted = [...eligible].sort((a, b) => {
      const samePos = (p: Player) => p.position === selectedPlayer.position ? 1000 : 0;
      const score = (p: Player) => samePos(p) + p.overall * 10 + (p.stamina || 100) * 0.3;
      return score(b) - score(a);
    });
    return sorted[0].id;
  }, [selectedPlayer, bench, queuedInIds]);

  // Filter bench by position group
  const filteredBench = bench.filter(p => !queuedInIds.has(p.id)).filter(p => {
    if (posFilter === 'all') return true;
    return getPositionGroup(p.position) === posFilter;
  });

  const [scheduleMinute, setScheduleMinute] = useState<string>('');

  return (
    <div className="space-y-2">
      {/* Compact indicator: subs only (windows removed) */}
      <div className="flex items-center gap-2 flex-wrap text-[10px]">
        <span className="flex items-center gap-1 bg-card/60 border border-border/30 rounded px-1.5 py-0.5">
          <span>⚡</span>
          <span className="font-mono font-bold">{subsUsed}/{maxSubs}</span>
          <span className="text-muted-foreground">subs</span>
        </span>
        {isHalftime && <Badge variant="secondary" className="text-[9px] h-4 px-1">Intervalo · entra no 2T</Badge>}
        {subQueue.length > 0 && (
          <Badge variant="outline" className="text-[9px] h-4 px-1 border-orange-400/50 text-orange-400 animate-pulse">
            ⏳ {subQueue.length} na fila
          </Badge>
        )}
      </div>

      {blocked && blockedReason && (
        <div className="bg-red-500/10 border border-red-500/30 rounded px-2 py-1 text-[10px] text-red-400 font-medium">
          ⛔ {blockedReason}
        </div>
      )}

      {/* QUEUED SUBS LIST — programadas com cancelar */}
      {subQueue.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/30 rounded px-1.5 py-1 space-y-1">
          <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">
            ⏱️ Substituições programadas
          </p>
          {subQueue.map((q, idx) => {
            const out = starters.find(p => p.id === q.outId) || bench.find(p => p.id === q.outId);
            const inP = bench.find(p => p.id === q.inId) || starters.find(p => p.id === q.inId);
            const minLabel = q.scheduledMinute ? `${q.scheduledMinute}'` : isHalftime ? '46\' (2T)' : 'próximo lance';
            return (
              <div key={`${q.outId}-${idx}`} className="flex items-center gap-1.5 bg-card/60 border border-border/20 rounded px-1.5 py-1">
                <span className="text-[9px] font-mono font-bold text-amber-400 shrink-0">{minLabel}</span>
                <span className="text-[10px] truncate flex-1">
                  ⬅ <span className="text-red-400">{out?.name || '?'}</span> • ➡ <span className="text-emerald-400">{inP?.name || '?'}</span>
                </span>
                <button
                  onClick={() => onCancelSub(q.outId)}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors shrink-0"
                  title="Cancelar substituição"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 2-column layout: SAI | ENTRA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* COL 1: SAI */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">⬅ Quem SAI</p>
          <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1">
            {starters.map((p) => {
              const stamina = liveStaminaMap?.[p.id] ?? p.stamina ?? 100;
              const staminaColor = staminaColorClass(stamina);
              const isQueued = queuedOutIds.has(p.id);
              const isSelected = p.id === selectedSubOut;
              return (
                <button
                  key={p.id}
                  onClick={() => !isQueued && !blocked && onSelectSubOut(isSelected ? null : p.id)}
                  disabled={isQueued || blocked}
                  className={`w-full flex items-center gap-1.5 border rounded-md px-1.5 py-1 transition-all text-left ${
                    isSelected ? 'bg-red-500/15 border-red-500/50 ring-1 ring-red-400/50'
                    : isQueued ? 'border-orange-400/30 bg-orange-500/5 opacity-60'
                    : blocked ? 'border-border/20 opacity-40 cursor-not-allowed'
                    : 'bg-card/60 border-border/30 hover:border-red-400/40 hover:bg-red-500/5'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-black text-primary shrink-0">
                    {p.position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold truncate">{p.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[9px] text-muted-foreground">OVR {p.overall}</span>
                      <div className="h-1 flex-1 max-w-[40px] rounded-full bg-muted/20 overflow-hidden">
                        <div className={`h-full ${staminaColor}`} style={{ width: `${stamina}%` }} />
                      </div>
                      <span className="text-[8px] font-mono text-muted-foreground">{stamina}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* COL 2: ENTRA */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Quem ENTRA →</p>
            {selectedPlayer && (
              <button onClick={() => onSelectSubOut(null)} className="text-[9px] text-muted-foreground hover:text-foreground">
                ✕ limpar
              </button>
            )}
          </div>

          {/* Position filter chips */}
          <div className="flex gap-0.5 overflow-x-auto pb-0.5">
            {([
              { k: 'all', l: 'Todos' },
              { k: 'gk', l: '🥅' },
              { k: 'def', l: '🛡️' },
              { k: 'mid', l: '⚙️' },
              { k: 'atk', l: '⚔️' },
            ] as const).map(f => (
              <button
                key={f.k}
                onClick={() => setPosFilter(f.k)}
                className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded transition-colors ${
                  posFilter === f.k ? 'bg-primary text-primary-foreground' : 'bg-card/60 border border-border/30 text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.l}
              </button>
            ))}
          </div>

          {/* Programar minuto */}
          {selectedPlayer && !isHalftime && (
            <div className="flex items-center gap-1 bg-amber-500/5 border border-amber-500/20 rounded px-1.5 py-1">
              <span className="text-[9px] text-amber-400 font-bold">⏱️ Min:</span>
              <input
                type="number"
                min={1}
                max={89}
                placeholder="já"
                value={scheduleMinute}
                onChange={(e) => setScheduleMinute(e.target.value)}
                className="w-12 h-5 bg-card/80 border border-border/30 rounded text-[10px] text-center font-mono"
              />
              <span className="text-[8px] text-muted-foreground flex-1">vazio = próximo lance</span>
            </div>
          )}

          <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
            {!selectedPlayer && (
              <p className="text-[10px] text-muted-foreground text-center py-3">
                ← Selecione um titular primeiro
              </p>
            )}
            {selectedPlayer && filteredBench.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-3">Nenhum reserva nesta posição</p>
            )}
            {selectedPlayer && filteredBench.map((p) => {
              const stamina = liveStaminaMap?.[p.id] ?? p.stamina ?? 100;
              const sameGroup = getPositionGroup(p.position) === getPositionGroup(selectedPlayer.position);
              const isSuggested = p.id === suggestedId;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    const min = scheduleMinute ? parseInt(scheduleMinute) : undefined;
                    onConfirmSub(selectedSubOut!, p.id, min && min > 0 ? min : undefined);
                    setScheduleMinute('');
                  }}
                  className={`w-full flex items-center gap-1.5 border rounded-md px-1.5 py-1 transition-all text-left ${
                    isSuggested ? 'bg-emerald-500/15 border-emerald-500/50 ring-1 ring-emerald-400/40'
                    : sameGroup ? 'bg-emerald-500/[0.05] border-emerald-500/30 hover:bg-emerald-500/10'
                    : 'bg-card/60 border-border/30 hover:border-emerald-400/40'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                    isSuggested ? 'bg-emerald-500/25 text-emerald-300' : sameGroup ? 'bg-emerald-500/15 text-emerald-400' : 'bg-primary/10 text-primary'
                  }`}>
                    {p.position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-[11px] font-bold truncate">{p.name}</p>
                      {isSuggested && <span className="text-[8px] text-emerald-400 font-bold shrink-0">🟢</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-bold text-emerald-400">OVR {p.overall}</span>
                      <span className="text-[8px] text-muted-foreground">⚡{stamina}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedPlayer && (
        <p className="text-[9px] text-muted-foreground text-center">
          📡 Clique no reserva para confirmar
          {isHalftime ? ' — entra no 2º tempo' : scheduleMinute ? ` — programada para ${scheduleMinute}'` : ' — aplicada no próximo lance'}
        </p>
      )}
    </div>
  );
}

/* ── CHAT-STYLE EVENT FEED with minute separators ────────── */

function MinuteSeparator({ minute }: { minute: number }) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-1 bg-gradient-to-r from-transparent via-primary/[0.06] to-transparent">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/40" />
      <span className="text-[10px] font-mono font-bold text-primary/70 px-2 py-0.5 rounded-full bg-card/80 border border-primary/20 shadow-sm">
        {minute}'
      </span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/40" />
    </div>
  );
}

/**
 * EventFeed renders events with a per-minute separator above the first event of each minute group.
 * `events` should already be in display order (newest first or oldest first — separator added when minute changes).
 */
function EventFeed({ events, homeTeam, awayTeam, homeShield, awayShield }: {
  events: SimEvent[]; homeTeam: string; awayTeam: string;
  homeShield?: ShieldRenderProps; awayShield?: ShieldRenderProps;
}) {
  const items: React.ReactNode[] = [];
  // Agrupamos eventos por minuto para colocar o separador corretamente na ordem inversa
  const groups: Record<number, SimEvent[]> = {};
  const minutes: number[] = [];

  events.forEach(ev => {
    if (!groups[ev.minute]) {
      groups[ev.minute] = [];
      minutes.push(ev.minute);
    }
    groups[ev.minute].push(ev);
  });

  // Ordenamos os minutos (já deve vir decrescente do sort anterior, mas garantimos)
  minutes.sort((a, b) => b - a).forEach(min => {
    items.push(<MinuteSeparator key={`sep-${min}`} minute={min} />);
    groups[min].forEach((ev, i) => {
      items.push(
        <ChatEventRow key={`${ev.minute}-${i}-${ev.type}`} ev={ev} homeTeam={homeTeam} awayTeam={awayTeam} homeShield={homeShield} awayShield={awayShield} />
      );
    });
  });

  return <>{items}</>;
}

function ChatEventRow({ ev, homeTeam, awayTeam, homeShield, awayShield }: { ev: SimEvent; homeTeam: string; awayTeam: string; homeShield?: ShieldRenderProps; awayShield?: ShieldRenderProps }) {
  const teamName = ev.team === 'home' ? homeTeam : ev.team === 'away' ? awayTeam : null;
  const shield = ev.team === 'home' ? homeShield : ev.team === 'away' ? awayShield : null;
  const isGoal = ev.isGoal;
  const rowRef = useRef<HTMLDivElement>(null);

  // Auto-scroll new goals into view
  useEffect(() => {
    if (isGoal && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isGoal]);

  // Team-tinted background + side border (subtle, opacity ≤ 6%)
  const teamBg =
    isGoal
      ? 'bg-emerald-500/15 border-l-4 border-l-emerald-400 animate-goal-flash'
      : ev.team === 'home'
        ? 'bg-gradient-to-r from-primary/[0.05] to-transparent border-l-2 border-l-primary/30'
        : ev.team === 'away'
          ? 'bg-gradient-to-l from-destructive/[0.05] to-transparent border-r-2 border-r-destructive/30'
          : '';

  return (
    <div
      ref={rowRef}
      className={`flex items-start gap-2.5 px-2 sm:px-3 py-2.5 sm:py-3 transition-all border-b border-border/10 ${teamBg}`}
    >
      {/* Team shield (or neutral icon for kickoff/halftime/final) */}
      {shield ? (
        <div className={`shrink-0 mt-0.5 ${isGoal ? 'animate-bounce' : ''}`} style={isGoal ? { animationDuration: '1s', animationIterationCount: 1 } : undefined}>
          <ShieldCrest size={isGoal ? 32 : 28} {...shield} />
        </div>
      ) : (
        <div className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-md flex items-center justify-center text-base bg-muted/20 border border-border/30">
          {getEventIcon(ev.type)}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[11px] font-mono font-bold text-muted-foreground">{ev.minute}'</span>
          {teamName && (
            <span className="text-[11px] text-muted-foreground/80 truncate font-medium">{teamName}</span>
          )}
          {isGoal && <span className="text-[12px] font-black text-emerald-400 uppercase tracking-wider animate-pulse">⚽ GOL</span>}
        </div>
        <p className={`leading-relaxed font-medium ${isGoal ? 'text-base sm:text-lg font-bold' : 'text-sm sm:text-base'} ${getEventColor(ev.type)}`}>
          {teamName && <span className="mr-1">{getEventIcon(ev.type)}</span>}
          {ev.description}
        </p>
      </div>
    </div>
  );
}

/* ── STATS VIEW ────────────────────────────────────────────── */

function StatsView({ stats, homeTeam, awayTeam }: { stats: MatchStats; homeTeam: string; awayTeam: string }) {
  const rows: { label: string; vals: [number, number]; suffix: string; icon: string }[] = [
    { label: 'Posse de Bola', vals: stats.possession, suffix: '%', icon: '⚽' },
    { label: 'Finalizações', vals: stats.shots, suffix: '', icon: '🎯' },
    { label: 'No Gol', vals: stats.shotsOnTarget, suffix: '', icon: '🥅' },
    { label: 'Escanteios', vals: stats.corners, suffix: '', icon: '🚩' },
    { label: 'Faltas', vals: stats.fouls, suffix: '', icon: '⚠️' },
    { label: 'Amarelos', vals: stats.yellowCards, suffix: '', icon: '🟨' },
    { label: 'Vermelhos', vals: stats.redCards, suffix: '', icon: '🟥' },
    { label: 'Passes', vals: stats.passes, suffix: '', icon: '↔️' },
    { label: 'Desarmes', vals: stats.tackles, suffix: '', icon: '💪' },
    { label: 'Defesas', vals: stats.saves, suffix: '', icon: '🧤' },
    { label: 'Impedimentos', vals: stats.offsides, suffix: '', icon: '⛳' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs sm:text-sm font-semibold">
        <span className="text-foreground truncate max-w-[120px] sm:max-w-[140px]">{homeTeam}</span>
        <span className="text-muted-foreground truncate max-w-[120px] sm:max-w-[140px] text-right">{awayTeam}</span>
      </div>
      {rows.map(({ label, vals, suffix, icon }) => {
        const total = vals[0] + vals[1];
        const homePercent = total > 0 ? (vals[0] / total) * 100 : 50;
        return (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-mono font-semibold w-10 sm:w-12 text-right text-foreground">{vals[0]}{suffix}</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium flex items-center gap-1">
                <span className="text-sm">{icon}</span>{label}
              </span>
              <span className="font-mono font-semibold w-10 sm:w-12 text-left text-muted-foreground">{vals[1]}{suffix}</span>
            </div>
            <div className="flex h-1.5 sm:h-2 rounded-full overflow-hidden bg-muted/15">
              <div className="bg-primary transition-all duration-500" style={{ width: `${homePercent}%` }} />
              <div className="bg-foreground/30 flex-1" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── LINEUP VIEW ───────────────────────────────────────────── */

function LineupView({
  starters,
  bench,
  tactics,
  homeTeam,
  liveStaminaMap,
  substitutedPlayerIds,
  enteredInIds,
}: {
  starters: Player[];
  bench: Player[];
  tactics?: TacticsConfig;
  homeTeam: string;
  liveStaminaMap?: Record<string, number>;
  substitutedPlayerIds?: Set<string>;
  enteredInIds?: Set<string>;
}) {
  if (!starters || starters.length === 0) {
    return (
      <div className="text-center py-6">
        <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Escalação não disponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {tactics && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs sm:text-sm">📋 {tactics.formation}</Badge>
          {tactics.playStyle && <Badge variant="outline" className="text-[10px] sm:text-xs">{tactics.playStyle}</Badge>}
          {tactics.pressing && <Badge variant="outline" className="text-[10px] sm:text-xs">Pressão: {tactics.pressing}</Badge>}
        </div>
      )}

      <div>
        <p className="text-sm sm:text-base font-semibold mb-2 text-foreground flex items-center gap-1.5">
          <Shirt className="h-4 w-4 text-primary" /> Titulares
        </p>
        <div className="space-y-2.5">
          {starters.map((p, i) => {
            const stamina = liveStaminaMap?.[p.id] ?? p.stamina ?? 100;
            const staminaColor = staminaColorClass(stamina);
            const cameInAsSub = enteredInIds?.has(p.id);
            return (
              <div key={p.id || i} className="flex items-center gap-2 sm:gap-3 bg-card/40 border border-border/20 rounded-lg px-2.5 sm:px-3 py-2.5">
                <span className="text-[10px] sm:text-xs font-mono text-muted-foreground w-4 sm:w-5">{i + 1}</span>
                <Badge variant="outline" className="text-[10px] sm:text-xs font-bold w-9 justify-center">{p.position}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold truncate flex items-center gap-1">
                    {p.name}
                    {cameInAsSub && <span title="Entrou via substituição" className="text-[9px] px-1 py-0 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">SUB</span>}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="h-1.5 flex-1 rounded-full bg-muted/15 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${staminaColor}`} style={{ width: `${stamina}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground tabular-nums w-8 text-right">{stamina}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-center min-w-[36px] h-7 px-2 rounded-md bg-primary/10 border border-primary/20 text-primary text-sm font-bold font-mono">
                  {p.overall}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {bench.length > 0 && (
        <div>
          <p className="text-sm sm:text-base font-semibold mb-2 text-muted-foreground">🪑 Banco ({bench.length})</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {bench.map((p, i) => (
              <div key={p.id || i} className="flex items-center gap-2 bg-muted/10 border border-border/15 rounded-lg px-2.5 py-2">
                <Badge variant="outline" className="text-[10px] sm:text-xs w-9 justify-center">{p.position}</Badge>
                <span className="text-xs sm:text-sm truncate flex-1 text-foreground/80">{p.name}</span>
                <span className="text-xs sm:text-sm font-bold font-mono text-foreground">{p.overall}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── FINISHED SECTION ──────────────────────────────────────── */

function FinishedSection({ stats, homeTeam, awayTeam, finalHomeGoals, finalAwayGoals, visibleEvents, matchDbId, onExit, homePlayers, homeShield, awayShield }: {
  stats: MatchStats; homeTeam: string; awayTeam: string;
  finalHomeGoals: number; finalAwayGoals: number;
  visibleEvents: SimEvent[]; matchDbId: string | null; onExit: () => void;
  homePlayers?: Player[];
  homeShield?: ShieldRenderProps;
  awayShield?: ShieldRenderProps;
}) {
  const [showReplay, setShowReplay] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const goalEvents = visibleEvents.filter(e => e.isGoal);
  const substitutions = visibleEvents.filter(e => e.type === 'substitution');

  const playerRatings = homePlayers?.slice(0, 11).map(p => {
    let rating = 6.5;
    for (const ev of visibleEvents) {
      if (ev.playerName === p.name && ev.team === 'home') {
        if (ev.isGoal) rating += 1.0;
        if (ev.type === 'great_save') rating += 0.5;
        if (ev.type === 'yellow_card') rating -= 0.3;
        if (ev.type === 'red_card') rating -= 1.5;
        if (['dribble_ok', 'through_ball', 'tackle'].includes(ev.type)) rating += 0.1;
      }
      if (ev.assistName === p.name) rating += 0.5;
    }
    return { ...p, rating: Math.min(10, Math.max(3, parseFloat(rating.toFixed(1)))) };
  }) || [];

  const motm = playerRatings.length > 0 ? playerRatings.reduce((a, b) => a.rating > b.rating ? a : b) : null;

  return (
    <div className="space-y-3 sm:space-y-4 pt-2 animate-fade-in">
      {/* Elegant final scoreboard */}
      <Card className="border-emerald-500/20 bg-card/80 overflow-hidden animate-scale-in">
        <CardContent className="p-5 sm:p-7 text-center space-y-4">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-emerald-400/80">🏁 Fim de Jogo</p>

          <div className="flex items-center justify-center gap-4 sm:gap-6">
            <div className="flex-1 text-right min-w-0">
              <p className="text-sm sm:text-lg font-semibold truncate text-foreground">{homeTeam}</p>
            </div>
            <div className="text-5xl sm:text-7xl font-black font-mono tracking-tight text-foreground">
              {finalHomeGoals}<span className="text-muted-foreground/40 mx-2 sm:mx-3">:</span>{finalAwayGoals}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm sm:text-lg font-semibold truncate text-muted-foreground">{awayTeam}</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 text-[11px] sm:text-xs text-muted-foreground pt-1">
            <span>⏱️ 90'</span>
            <span className="text-muted-foreground/40">·</span>
            <span>⚽ {finalHomeGoals + finalAwayGoals} gols</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{visibleEvents.length} lances</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/20 overflow-hidden">
        <CardContent className="p-3 sm:p-5 space-y-3 sm:space-y-4">
          {motm && (
            <div className="bg-amber-400/8 border border-amber-400/20 rounded-lg p-3 sm:p-4 flex items-center gap-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-400/15 flex items-center justify-center">
                <Star className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-amber-400 font-semibold uppercase tracking-wider">⭐ Craque do Jogo</p>
                <p className="text-base sm:text-lg font-bold text-foreground">{motm.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{motm.position} · Nota {motm.rating}</p>
              </div>
            </div>
          )}

          {playerRatings.length > 0 && (
            <div>
              <p className="text-sm sm:text-base font-semibold mb-2 flex items-center gap-1.5"><Star className="h-4 w-4 text-amber-400" /> Notas</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {playerRatings.sort((a, b) => b.rating - a.rating).map((p, i) => (
                  <div key={i} className="flex items-center gap-2 bg-card/50 border border-border/20 rounded-lg px-2.5 py-2">
                    <Badge variant="outline" className="text-[10px] sm:text-xs w-9 justify-center">{p.position}</Badge>
                    <span className="text-xs sm:text-sm truncate flex-1">{p.name}</span>
                    <span className={`text-sm sm:text-base font-bold font-mono ${p.rating >= 8 ? 'text-emerald-400' : p.rating >= 7 ? 'text-foreground' : p.rating >= 6 ? 'text-foreground/70' : 'text-foreground/50'}`}>
                      {p.rating}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <StatsView stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} />

          {substitutions.length > 0 && (
            <div>
              <p className="text-sm sm:text-base font-semibold mb-2">🔄 Substituições ({substitutions.length})</p>
              <div className="space-y-1">
                {substitutions.map((sub, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs sm:text-sm bg-card/40 border border-border/20 rounded-lg px-2.5 py-2">
                    <Badge variant="outline" className="text-[10px] sm:text-xs font-mono">{sub.minute}'</Badge>
                    <span className="flex-1 text-foreground/85">{sub.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm sm:text-base font-semibold mb-2">📝 Narração Completa</p>
            <div className="match-feed-scroll max-h-[260px] sm:max-h-[320px] overflow-y-auto border border-border/20 rounded-lg bg-gradient-to-br from-card to-card/60">
              <EventFeed
                events={[...visibleEvents].reverse()}
                homeTeam={homeTeam} awayTeam={awayTeam}
                homeShield={homeShield} awayShield={awayShield}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {goalEvents.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2 pt-3 sm:pt-4 px-3 sm:px-4">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Film className="h-4 w-4 text-primary" /> Gols ({goalEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2">
            {!showReplay ? (
              <Button variant="outline" className="w-full gap-2 text-sm sm:text-base" onClick={() => { setShowReplay(true); setReplayIndex(0); }}>
                <Film className="h-4 w-4" /> Ver Replay dos Gols
              </Button>
            ) : goalEvents[replayIndex] ? (
              <div className="space-y-2">
                <div className="w-full max-w-[480px] mx-auto aspect-[12/7] overflow-hidden">
                  <HighlightMiniCanvas
                    type={getHighlightType(goalEvents[replayIndex].type)}
                    team={goalEvents[replayIndex].team === 'neutral' ? 'home' : goalEvents[replayIndex].team}
                    playerName={goalEvents[replayIndex].playerName}
                  />
                </div>
                <div className="text-center space-y-1">
                  <Badge variant="outline" className="font-mono text-sm sm:text-base">{goalEvents[replayIndex].minute}'</Badge>
                  <p className="text-base sm:text-lg font-bold">{goalEvents[replayIndex].playerName || 'Jogador'}</p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {goalEvents[replayIndex].goalType && <Badge variant="secondary" className="text-xs sm:text-sm">{goalEvents[replayIndex].goalType}</Badge>}
                    <Badge variant="outline" className="text-xs sm:text-sm">{goalEvents[replayIndex].team === 'home' ? homeTeam : awayTeam}</Badge>
                  </div>
                  {goalEvents[replayIndex].assistName && (
                    <p className="text-xs sm:text-sm text-muted-foreground">🅰️ {goalEvents[replayIndex].assistName}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs sm:text-sm" disabled={replayIndex <= 0} onClick={() => setReplayIndex(i => i - 1)}>← Ant.</Button>
                  <Badge variant="secondary" className="flex items-center text-xs sm:text-sm px-3">{replayIndex + 1}/{goalEvents.length}</Badge>
                  <Button variant="outline" size="sm" className="flex-1 text-xs sm:text-sm" disabled={replayIndex >= goalEvents.length - 1} onClick={() => setReplayIndex(i => i + 1)}>Próx. →</Button>
                </div>
                <Button variant="ghost" size="sm" className="w-full text-xs sm:text-sm" onClick={() => setShowReplay(false)}>Fechar</Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {matchDbId && (
        <>
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-center text-xs sm:text-sm">
            🔔 Relatório completo enviado para o sino de notificações.
          </div>
          {showReport && <PostGameReportModal matchDbId={matchDbId} onClose={() => setShowReport(false)} />}
        </>
      )}

      <Button className="w-full h-11 sm:h-12 gap-2 text-sm sm:text-base font-bold" onClick={onExit}>
        <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" /> Voltar ao Dashboard
      </Button>
    </div>
  );
}

/* ── HELPERS ───────────────────────────────────────────────── */

function computePossession(events: SimEvent[], stats: MatchStats): [number, number] {
  if (stats.possession[0] !== 50 || stats.possession[1] !== 50) return stats.possession;
  let home = 0, away = 0;
  for (const ev of events) {
    if (ev.team === 'home') home++;
    else if (ev.team === 'away') away++;
  }
  const total = home + away;
  if (total === 0) return [50, 50];
  return [Math.round((home / total) * 100), Math.round((away / total) * 100)];
}

function getEventIcon(type: string): string {
  if (['foot_goal', 'header_goal', 'penalty_goal', 'counter_attack_goal', 'crossing_goal', 'free_kick_goal'].includes(type)) return '⚽';
  if (type === 'great_save') return '🧤';
  if (type === 'woodwork') return '🥅';
  if (type === 'yellow_card') return '🟨';
  if (type === 'red_card') return '🟥';
  if (type === 'corner_danger') return '🚩';
  if (type === 'penalty_miss') return '❌';
  if (['dangerous_foul', 'foul', 'midfield_foul'].includes(type)) return '⚠️';
  if (type === 'dribble_ok') return '✨';
  if (['tackle', 'interception'].includes(type)) return '💪';
  if (type === 'substitution') return '🔁';
  if (type === 'halftime') return '⏸️';
  if (type === 'final_whistle') return '🏁';
  if (type === 'kickoff') return '📢';
  if (['long_shot_miss', 'header_miss'].includes(type)) return '💨';
  if (type === 'crossing') return '↗️';
  if (type === 'through_ball') return '🏃';
  if (type === 'pressing') return '🔥';
  if (type === 'counter_attack') return '⚡';
  if (type === 'buildup_play') return '⚙️';
  if (type === 'free_kick_near') return '🎯';
  if (type === 'gk_distribution') return '🧤';
  if (type === 'throw_in') return '📏';
  if (type === 'long_pass') return '🎯';
  if (type === 'pressing_recovery') return '🔄';
  if (type === 'offside_trap') return '⛳';
  if (type === 'injury') return '🏥';
  if (type === 'added_time') return '⏱️';
  if (type === 'assistant_tip') return '💬';
  return '•';
}

function getEventColor(type: string): string {
  // Goals — único destaque vivo
  if (['foot_goal', 'header_goal', 'penalty_goal', 'counter_attack_goal', 'crossing_goal', 'free_kick_goal'].includes(type)) {
    return 'text-emerald-400 font-semibold';
  }
  // Apito final / fim de tempo
  if (['final_whistle', 'halftime', 'kickoff', 'added_time'].includes(type)) {
    return 'text-emerald-400/90 font-medium';
  }
  // Lances importantes mas sutis (cards, faltas perigosas, lesão)
  if (['red_card', 'yellow_card', 'penalty_miss', 'injury', 'dangerous_foul'].includes(type)) {
    return 'text-foreground/70';
  }
  // Padrão: neutro
  return 'text-foreground/85';
}

function getEventBg(_ev: SimEvent): string {
  // Visual minimalista — sem fundos coloridos por tipo. Apenas separador sutil.
  return '';
}

function getHighlightLabel(type: string): string {
  if (['foot_goal', 'header_goal', 'goal'].includes(type)) return '⚽ GOL!';
  if (type === 'penalty_goal') return '⚽ GOL DE PÊNALTI!';
  if (type === 'penalty_miss') return '❌ PÊNALTI PERDIDO!';
  if (type === 'great_save') return '🧤 GRANDE DEFESA!';
  if (type === 'woodwork') return '🥅 NA TRAVE!';
  if (type === 'counter_attack_goal') return '⚽ GOL DE CONTRA-ATAQUE!';
  if (type === 'crossing_goal') return '⚽ GOL DE CRUZAMENTO!';
  if (type === 'free_kick_goal') return '⚽ GOL DE FALTA!';
  if (type === 'counter_attack') return '⚡ CONTRA-ATAQUE!';
  if (type === 'free_kick_near') return '🎯 FALTA PERIGOSA!';
  if (type === 'red_card') return '🟥 CARTÃO VERMELHO!';
  if (type === 'yellow_card') return '🟨 CARTÃO AMARELO';
  return '⚡ LANCE IMPORTANTE';
}

function getMomentIcon(moment: string): string {
  if (moment.includes('pressão') || moment.includes('pressao')) return '🔥';
  if (moment.includes('domínio') || moment.includes('dominio')) return '💪';
  if (moment.includes('equilíbrio') || moment.includes('equilibrio')) return '⚖️';
  return '⚽';
}

function getMomentLabel(moment: string): string {
  const labels: Record<string, string> = {
    'pressão_home': 'Pressão do Mandante',
    'pressao_home': 'Pressão do Mandante',
    'pressão_away': 'Pressão do Visitante',
    'pressao_away': 'Pressão do Visitante',
    'domínio_home': 'Domínio do Mandante',
    'dominio_home': 'Domínio do Mandante',
    'domínio_away': 'Domínio do Visitante',
    'dominio_away': 'Domínio do Visitante',
    'equilíbrio': 'Equilíbrio',
    'equilibrio': 'Equilíbrio',
  };
  return labels[moment] || moment;
}
