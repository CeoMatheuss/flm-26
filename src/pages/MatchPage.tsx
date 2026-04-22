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
import { PostGameReportModal } from '@/components/game/PostGameReportModal';
import { GameLoadingScreen } from '@/components/game/GameLoadingScreen';
import { HighlightMiniCanvas, isHighlightEvent, getHighlightType } from '@/components/game/HighlightMiniCanvas';
import { MatchSidebar } from '@/components/game/MatchSidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCrest } from '@/components/game/ShieldCrest';
import { useMatchShields } from '@/hooks/useMatchShields';
import type { ShieldRenderProps } from '@/components/game/shieldHelpers';
import { toast } from 'sonner';

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

  const { state, startMatch, loadMatch, findActiveMatch, destroy } = useMatchSimulation();

  const doStartMatch = useCallback(async (players: Player[], updatedTactics?: TacticsConfig) => {
    if (!locState) return;
    setLoadingMsg('Simulando partida no servidor');
    setPreMatchDone(true);
    await startMatch({
      homeTeam: locState.homeTeam,
      awayTeam: locState.awayTeam,
      homePlayers: players,
      homeStrength: locState.homeStrength,
      awayStrength: locState.awayStrength,
      matchId: locState.matchId,
      tactics: updatedTactics || locState.tactics,
      stadiumName: locState.stadiumName,
      stadiumCapacity: locState.stadiumCapacity,
      isHome: locState.isHome,
      competition: locState.competition || 'Amistoso',
      tournamentMatchId: locState.tournamentMatchId,
      fans: locState.fans || 500,
      awayFans: locState.awayFans || 500,
    });
    setInitDone(true);
  }, [locState, startMatch]);

  // Auto-start or reconnect
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (locState?.liveMatchDbId) {
        setLoadingMsg('Reconectando à partida');
        setPreMatchDone(true);
        await loadMatch(locState.liveMatchDbId);
        if (!cancelled) setInitDone(true);
      } else if (locState && !locState.liveMatchDbId && locState.homePlayers?.length > 0) {
        doStartMatch(locState.homePlayers, locState.tactics);
      } else if (!locState) {
        setLoadingMsg('Buscando partida ativa');
        setPreMatchDone(true);
        const found = await findActiveMatch();
        if (!found && !cancelled) {
          navigate('/', { replace: true });
          return;
        }
        if (!cancelled) setInitDone(true);
      }
    };
    init();
    return () => { cancelled = true; destroy(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!initDone || state.phase === 'loading') {
    return <GameLoadingScreen message={loadingMsg} subMessage={locState ? `${locState.homeTeam} vs ${locState.awayTeam}` : undefined} />;
  }

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
          },
        },
      });
    } else {
      navigate('/', { replace: true });
    }
  };

  return <MatchViewer matchState={state} onExit={handleExit} homePlayers={locState?.homePlayers} tactics={locState?.tactics} />;
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
          {/* Auto-suggest button */}
          <Button variant="outline" size="sm" className="w-full mb-3 gap-1.5 text-sm" onClick={suggestBestLineup}>
            <Zap className="h-4 w-4 text-yellow-400" /> Sugerir Melhor Escalação
          </Button>

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
}

function SubstitutionBanner({ data, onDone }: { data: SubBannerData; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="animate-fade-in fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-md">
      <div className="bg-gradient-to-r from-[hsl(220,25%,12%)] via-[hsl(220,25%,15%)] to-[hsl(220,25%,12%)] border border-primary/30 rounded-xl shadow-2xl shadow-primary/20 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-primary to-red-500" />
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔁</span>
              <span className="text-sm font-black uppercase tracking-wider text-primary">Substituição</span>
            </div>
            {!data.isHalftime && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm font-mono">{data.minute}'</Badge>
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">{data.teamName}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
              <span className="text-red-400 text-base">⬅️</span>
              <div className="min-w-0">
                <p className="text-xs text-red-400 font-bold uppercase">Sai</p>
                <p className="text-base font-black truncate text-foreground">{data.playerOut}</p>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5">
              <span className="text-emerald-400 text-base">➡️</span>
              <div className="min-w-0">
                <p className="text-xs text-emerald-400 font-bold uppercase">Entra</p>
                <p className="text-base font-black truncate text-foreground">{data.playerIn}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── MATCH VIEWER ─────────────────────────────────────────── */

function MatchViewer({ matchState, onExit, homePlayers, tactics }: {
  matchState: MatchState; onExit: () => void;
  homePlayers?: Player[]; tactics?: TacticsConfig;
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

  // Active highlight
  const [activeHighlight, setActiveHighlight] = useState<SimEvent | null>(null);
  const lastHighlightId = useRef('');
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!latestEvent) return;
    const eventId = `${latestEvent.minute}-${latestEvent.type}-${latestEvent.team}`;
    if (isHighlightEvent(latestEvent.type) && eventId !== lastHighlightId.current) {
      lastHighlightId.current = eventId;
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
      setActiveHighlight(latestEvent);
    }
  }, [latestEvent]);

  // Auto-scroll events
  const eventsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (eventsRef.current) eventsRef.current.scrollTop = 0;
  }, [visibleEvents.length]);

  // Assistant tips expanded
  const [showAssistantPanel, setShowAssistantPanel] = useState(false);
  const hasAssistant = matchState.assistantTips.length > 0;
  const latestTip = hasAssistant ? matchState.assistantTips[matchState.assistantTips.length - 1] : null;

  // ── Substitution system state ──
  const [subsUsed, setSubsUsed] = useState(0);
  const [windowsUsed, setWindowsUsed] = useState(0);
  const [selectedSubOut, setSelectedSubOut] = useState<string | null>(null);
  const [substitutedPlayerIds, setSubstitutedPlayerIds] = useState<Set<string>>(new Set());
  const [activeBanner, setActiveBanner] = useState<SubBannerData | null>(null);
  const [subQueue, setSubQueue] = useState<{ outId: string; inId: string }[]>([]);
  const [lastSubMinute, setLastSubMinute] = useState(-1);
  const maxSubs = 5;
  const maxWindows = 3;

  // ── Inline section refs (for scroll-to-section navigation) ──
  const tacticsSectionRef = useRef<HTMLDivElement>(null);
  const lineupSectionRef = useRef<HTMLDivElement>(null);
  const statsSectionRef = useRef<HTMLDivElement>(null);
  const assistantSectionRef = useRef<HTMLDivElement>(null);
  const scrollToSection = useCallback((ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Process queued substitutions
  useEffect(() => {
    if (subQueue.length === 0 || !homePlayers) return;
    const isDeadBall = latestEvent && ['foul', 'midfield_foul', 'dangerous_foul', 'corner_danger', 'halftime', 'kickoff'].includes(latestEvent.type);
    if (isHalftime || isDeadBall) {
      const sub = subQueue[0];
      const playerOut = homePlayers.find(p => p.id === sub.outId);
      const playerIn = homePlayers.find(p => p.id === sub.inId);
      if (playerOut && playerIn) {
        if (!isHalftime && currentMinute !== lastSubMinute && windowsUsed < maxWindows) {
          setWindowsUsed(w => w + 1);
        } else if (!isHalftime && currentMinute !== lastSubMinute && windowsUsed >= maxWindows) {
          setSubQueue(q => q.slice(1));
          return;
        }
        setLastSubMinute(currentMinute);
        setSubsUsed(prev => prev + 1);
        setSubstitutedPlayerIds(prev => new Set(prev).add(sub.outId));
        setActiveBanner({ minute: currentMinute, playerOut: playerOut.name, playerIn: playerIn.name, teamName: homeTeam, isHalftime });
      }
      setSubQueue(q => q.slice(1));
    }
  }, [subQueue, latestEvent, isHalftime, currentMinute, homePlayers, homeTeam, lastSubMinute, windowsUsed]);

  // Validation helper for substitutions — used by widget click + queue
  const validateSubAllowed = useCallback((): { ok: boolean; reason?: string } => {
    if (isFinished) return { ok: false, reason: '🚫 Partida finalizada — substituições encerradas.' };
    if (currentMinute >= 45 && currentMinute < 60)
      return { ok: false, reason: "🚫 Substituições bloqueadas no intervalo (45'-60'). Aguarde o reinício do 2º tempo." };
    if (currentMinute > 90)
      return { ok: false, reason: "🚫 Não é permitido substituir após o 90' minuto." };
    if (subsUsed >= maxSubs)
      return { ok: false, reason: `🚫 Limite de ${maxSubs} substituições já utilizado.` };
    if (windowsUsed >= maxWindows && !isHalftime)
      return { ok: false, reason: `⚠️ Você já usou as ${maxWindows} janelas de substituição permitidas no jogo corrido.` };
    return { ok: true };
  }, [currentMinute, isFinished, isHalftime, subsUsed, windowsUsed]);

  const handleQueueSubstitution = useCallback((playerOutId: string, playerInId: string) => {
    const check = validateSubAllowed();
    if (!check.ok) {
      toast.error(check.reason || 'Substituição não permitida');
      return;
    }
    setSubQueue(q => [...q, { outId: playerOutId, inId: playerInId }]);
    setSelectedSubOut(null);
    toast.success('✅ Substituição enviada à fila — será aplicada na próxima bola parada.');
  }, [validateSubAllowed]);

  const subBlocked = !validateSubAllowed().ok;
  const subBlockedReason = validateSubAllowed().reason;

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
      {activeBanner && <SubstitutionBanner data={activeBanner} onDone={() => setActiveBanner(null)} />}

      {/* ═══ FIXED TOP BAR with action buttons ═══ */}
      <div className="sticky top-0 z-40 bg-[hsl(var(--background))]/95 backdrop-blur-md border-b border-border/20 px-2 sm:px-3 py-2 space-y-2">
        {/* Row 1: Exit + Competition + Stadium */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1" onClick={onExit}>
            <LogOut className="h-3.5 w-3.5" /> {isFinished ? 'Sair' : 'Sair'}
          </Button>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] sm:text-xs font-medium h-6">{competition || 'Amistoso'}</Badge>
            <span className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-[160px]">🏟️ {stadiumName}</span>
          </div>
        </div>

        {/* Row 2: Compact stats nav (clean neutral chips) */}
        {!isFinished && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => scrollToSection(statsSectionRef)} className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/30 bg-card/40 hover:bg-card/70 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              <BarChart3 className="h-3.5 w-3.5" /> Stats
            </button>
            <button onClick={() => scrollToSection(lineupSectionRef)} className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/30 bg-card/40 hover:bg-card/70 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              <Users className="h-3.5 w-3.5" /> Escalação
            </button>
            <button onClick={() => scrollToSection(tacticsSectionRef)} className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/30 bg-card/40 hover:bg-card/70 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              <Settings2 className="h-3.5 w-3.5" /> Tática
            </button>
            {hasAssistant && (
              <button onClick={() => scrollToSection(assistantSectionRef)} className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/30 bg-card/40 hover:bg-card/70 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                <MessageSquare className="h-3.5 w-3.5" /> Técnico ({matchState.assistantTips.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* ═══ MATCH CONTENT ═══ */}
      <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
        <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-3 space-y-2 sm:space-y-3 lg:space-y-0">
          {/* ═══ MAIN COLUMN ═══ */}
          <div className="space-y-2 sm:space-y-3 min-w-0">
            {/* Professional Scoreboard — compact */}
            <Card className={`overflow-hidden transition-all duration-500 ${goalFlash ? 'ring-2 ring-yellow-400/60 shadow-xl shadow-yellow-400/20' : 'shadow-lg'}`}>
              <div className="bg-primary/10 px-2.5 sm:px-3 py-1.5 flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-primary">{phaseLabel()}</span>
                <Badge variant={isFinished ? 'default' : 'secondary'} className="text-xs sm:text-sm font-mono h-6 sm:h-7 px-2.5 sm:px-3">
                  {currentMinute}'
                </Badge>
              </div>

              <CardContent className="p-2 sm:p-3 space-y-2">
                {isHalftime ? (
                  /* Halftime focus banner — compact */
                  <div className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 rounded-xl p-3 sm:p-4 text-center space-y-1.5 animate-fade-in">
                    <p className="text-2xl sm:text-3xl">⏸️</p>
                    <p className="text-base sm:text-xl font-black text-primary tracking-wide">INTERVALO</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Descanso · Use o tempo para ajustes</p>
                    <div className={`inline-block text-xl sm:text-2xl font-black font-mono px-3 sm:px-4 py-1.5 rounded-lg mt-1 ${goalFlash ? 'bg-yellow-400/20 scale-110' : 'bg-muted/20'}`}>
                      <span className="text-foreground">{homeGoals}</span>
                      <span className="text-muted-foreground/60 mx-2">x</span>
                      <span className="text-foreground">{awayGoals}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Teams + Score — compact */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="flex-1 text-right space-y-0.5 min-w-0">
                        <p className="text-xs sm:text-base font-black truncate">{homeTeam}</p>
                        <div className="flex items-center gap-1 justify-end flex-wrap">
                          {goalEvents.filter(e => e.team === 'home').slice(0, 3).map((g, i) => (
                            <span key={i} className="text-[8px] sm:text-[10px] text-muted-foreground">⚽ {g.playerName} {g.minute}'</span>
                          ))}
                        </div>
                      </div>

                      <div className={`text-2xl sm:text-4xl font-black font-mono px-2 sm:px-5 py-1 sm:py-1.5 rounded-lg min-w-[70px] sm:min-w-[110px] text-center transition-all duration-300 ${goalFlash ? 'bg-yellow-400/20 scale-110' : 'bg-muted/20'}`}>
                        <span className="text-primary">{homeGoals}</span>
                        <span className="text-muted-foreground/50 text-lg sm:text-2xl mx-0.5">:</span>
                        <span className="text-primary">{awayGoals}</span>
                      </div>

                      <div className="flex-1 text-left space-y-0.5 min-w-0">
                        <p className="text-xs sm:text-base font-black truncate">{awayTeam}</p>
                        <div className="flex items-center gap-1 flex-wrap">
                          {goalEvents.filter(e => e.team === 'away').slice(0, 3).map((g, i) => (
                            <span key={i} className="text-[8px] sm:text-[10px] text-muted-foreground">⚽ {g.playerName} {g.minute}'</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Goal flash banner — compact */}
                    {goalFlash && latestEvent?.isGoal && (
                      <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-lg p-1.5 sm:p-2 text-center animate-fade-in">
                        <p className="text-sm sm:text-base font-black text-emerald-400">⚽ GOOOL! {latestEvent.playerName || 'Jogador'}</p>
                        {latestEvent.assistName && (
                          <p className="text-[10px] sm:text-xs text-emerald-400/70">Assistência: {latestEvent.assistName}</p>
                        )}
                      </div>
                    )}

                    {/* Possession bar — thinner */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-xs font-bold text-blue-400 w-8 sm:w-10 text-right">{possession[0]}%</span>
                      <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-muted/10">
                        <div className="bg-blue-500 transition-all duration-700 rounded-l-full" style={{ width: `${possession[0]}%` }} />
                        <div className="bg-red-500 flex-1 rounded-r-full" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-red-400 w-8 sm:w-10">{possession[1]}%</span>
                    </div>
                  </>
                )}

                {!isFinished && <Progress value={(progress || 0) * 100} className="h-1 sm:h-1.5" />}
              </CardContent>
            </Card>

            {/* Match Moment + Assistant Tip — only show inline on mobile (sidebar covers desktop) */}
            {!isFinished && matchState.currentMoment && (
              <div className="lg:hidden flex items-center justify-center">
                <Badge variant="outline" className="text-[10px] sm:text-xs px-2.5 py-0.5 gap-1.5">
                  {getMomentIcon(matchState.currentMoment)} {getMomentLabel(matchState.currentMoment)}
                </Badge>
              </div>
            )}

            {!isFinished && hasAssistant && latestTip && (
              <div className="lg:hidden bg-amber-500/8 border border-amber-500/25 rounded-lg p-2 animate-fade-in">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-3 w-3 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">Assistente • {latestTip.minute}'</p>
                    <p className="text-[11px] sm:text-xs text-foreground mt-0.5">{latestTip.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Halftime sub queue indicator */}
            {isHalftime && subQueue.length > 0 && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5 text-center animate-pulse">
                <p className="text-[11px] sm:text-xs text-primary font-bold">
                  🔄 {subQueue.length} substituição(ões) na fila
                </p>
              </div>
            )}

            {/* 2D Canvas — highlights (fixed aspect ratio, capped width) */}
            {!isFinished && activeHighlight && (
              <Card className="p-1.5 sm:p-2 border-yellow-400/30 bg-yellow-400/5 transition-all duration-300">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <ShieldCrest size={18} {...(activeHighlight.team === 'away' ? awayShield : homeShield)} />
                  <Badge variant="outline" className="text-[10px] sm:text-xs font-mono">{activeHighlight.minute}' — {getHighlightLabel(activeHighlight.type)}</Badge>
                </div>
                <div className="w-full max-w-[480px] mx-auto aspect-[12/7] overflow-hidden">
                  <HighlightMiniCanvas
                    type={getHighlightType(activeHighlight.type)}
                    team={activeHighlight.team === 'neutral' ? 'home' : activeHighlight.team}
                    playerName={activeHighlight?.playerName}
                    currentMinute={currentMinute}
                    onComplete={() => {
                      highlightTimeoutRef.current = setTimeout(() => {
                        setActiveHighlight(null);
                        highlightTimeoutRef.current = null;
                      }, 1500);
                    }}
                  />
                </div>
                <p className="text-[10px] sm:text-xs text-center text-muted-foreground mt-1 line-clamp-2">{activeHighlight.description}</p>
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

            {/* Quick Stats Row — only mobile (sidebar shows on desktop) */}
            {!isFinished && (
              <div className="lg:hidden grid grid-cols-4 gap-1">
                {[
                  ['⚡', 'Chutes', stats.shots[0], stats.shots[1]],
                  ['🎯', 'No Gol', stats.shotsOnTarget[0], stats.shotsOnTarget[1]],
                  ['🏳️', 'Escan.', stats.corners[0], stats.corners[1]],
                  ['⚠️', 'Faltas', stats.fouls[0], stats.fouls[1]],
                ].map(([icon, label, h, a]) => (
                  <div key={label as string} className="text-center bg-card/50 border border-border/20 rounded-lg p-1.5">
                    <p className="text-[9px] text-muted-foreground">{icon} {label}</p>
                    <p className="text-xs font-black font-mono">{h as number} - {a as number}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Match content */}
            {!isFinished ? (
              /* Chat-style narration feed — compact */
              <Card className="p-1.5 sm:p-2 border-border/20">
                <div ref={eventsRef} className="max-h-[280px] sm:max-h-[320px] overflow-y-auto divide-y divide-border/10">
                  {visibleEvents.length === 0 && (
                    <p className="text-xs sm:text-sm text-muted-foreground text-center py-6">⏳ Aguardando início...</p>
                  )}
                  {[...visibleEvents].reverse().slice(0, 40).map((ev, i) => (
                    <ChatEventRow key={`${ev.minute}-${i}`} ev={ev} homeTeam={homeTeam} awayTeam={awayTeam} homeShield={homeShield} awayShield={awayShield} />
                  ))}
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

        {/* ═══ ALWAYS-OPEN COMPACT WIDGETS (Stats / Lineup / Tactics / Subs) ═══ */}
        {!isFinished && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {/* 📊 Estatísticas */}
            <Card className="border-border/20" ref={statsSectionRef}>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-yellow-400" /> Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0">
                <StatsView stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} />
              </CardContent>
            </Card>

            {/* 👥 Escalações */}
            <Card className="border-border/20" ref={lineupSectionRef}>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-400" /> Escalações
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0">
                <LineupView homePlayers={homePlayers} tactics={liveTactics} homeTeam={homeTeam} />
              </CardContent>
            </Card>

            {/* ⚙️ Estilo de Jogo */}
            <Card className="border-border/20" ref={tacticsSectionRef}>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <Settings2 className="h-3.5 w-3.5 text-emerald-400" /> Estilo de Jogo
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0">
                <LiveTacticsView tactics={liveTactics} onUpdate={setLiveTactics} />
              </CardContent>
            </Card>

            {/* 🔄 Substituições */}
            <Card className="border-border/20">
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <ArrowUpDown className="h-3.5 w-3.5 text-orange-400" /> Substituições
                  <Badge variant="outline" className="ml-auto text-[10px]">{maxSubs - subsUsed}/{maxSubs}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0">
                {subBlocked && subBlockedReason && (
                  <div className="bg-muted/30 border border-border/30 rounded-lg px-2 py-1.5 flex items-start gap-2 mb-2">
                    <span className="text-sm">⛔</span>
                    <p className="text-[11px] text-muted-foreground flex-1">{subBlockedReason}</p>
                  </div>
                )}
                <ManagerSubstitutionView
                  homePlayers={homePlayers}
                  subsUsed={subsUsed}
                  maxSubs={maxSubs}
                  windowsUsed={windowsUsed}
                  maxWindows={maxWindows}
                  selectedSubOut={selectedSubOut}
                  onSelectSubOut={setSelectedSubOut}
                  onConfirmSub={handleQueueSubstitution}
                  isHalftime={isHalftime}
                  isFinished={isFinished}
                  substitutedPlayerIds={substitutedPlayerIds}
                  subQueue={subQueue}
                  blocked={subBlocked}
                  blockedReason={subBlockedReason}
                />
              </CardContent>
            </Card>

            {/* 🎙️ Auxiliar Técnico */}
            {hasAssistant && (
              <Card className="border-border/20 lg:col-span-2" ref={assistantSectionRef}>
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-amber-400" /> Auxiliar Técnico
                    <Badge variant="outline" className="ml-auto text-[10px]">{matchState.assistantTips.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <div className="space-y-1 max-h-[180px] overflow-y-auto">
                    {[...matchState.assistantTips].reverse().map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 bg-card/60 border border-border/20 rounded-lg px-2 py-1.5">
                        <Badge variant="outline" className="text-[9px] font-mono shrink-0 mt-0.5">{tip.minute}'</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] leading-snug">{tip.description}</p>
                          {tip.priority === 'high' && (
                            <Badge variant="destructive" className="text-[9px] mt-1 h-4">Urgente</Badge>
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
      </div>
    </div>
  );
}

/* ── LIVE TACTICS VIEW ──────────────────────────────────────── */

function LiveTacticsView({ tactics, onUpdate }: { tactics: TacticsConfig; onUpdate: (t: TacticsConfig) => void }) {
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
            <SelectItem value="defensivo">Defensivo</SelectItem>
            <SelectItem value="equilibrado">Equilibrado</SelectItem>
            <SelectItem value="ofensivo">Ofensivo</SelectItem>
            <SelectItem value="contra-ataque">Contra-Ataque</SelectItem>
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

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
        <p className="text-xs text-muted-foreground">
          ⚡ Mudanças táticas terão efeito imediato na dinâmica da partida
        </p>
      </div>
    </div>
  );
}

/* ── MANAGER SUBSTITUTION VIEW ──────────────────────────────── */

function ManagerSubstitutionView({ homePlayers, subsUsed, maxSubs, windowsUsed, maxWindows, selectedSubOut, onSelectSubOut, onConfirmSub, isHalftime, isFinished, substitutedPlayerIds, subQueue, blocked, blockedReason }: {
  homePlayers?: Player[];
  subsUsed: number;
  maxSubs: number;
  windowsUsed: number;
  maxWindows: number;
  selectedSubOut: string | null;
  onSelectSubOut: (id: string | null) => void;
  onConfirmSub: (outId: string, inId: string) => void;
  isHalftime: boolean;
  isFinished: boolean;
  substitutedPlayerIds: Set<string>;
  subQueue: { outId: string; inId: string }[];
  blocked?: boolean;
  blockedReason?: string;
}) {
  if (!homePlayers || homePlayers.length <= 11) {
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

  const starters = homePlayers.slice(0, 11).filter(p => !substitutedPlayerIds.has(p.id));
  const bench = homePlayers.slice(11);
  const queuedOutIds = new Set(subQueue.map(s => s.outId));
  const queuedInIds = new Set(subQueue.map(s => s.inId));

  const selectedPlayer = starters.find(p => p.id === selectedSubOut);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm sm:text-base font-black text-primary flex items-center gap-1.5">
            <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5" /> Substituições
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-xs text-muted-foreground">Subs:</span>
            {Array.from({ length: maxSubs }).map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full transition-all ${i < subsUsed ? 'bg-primary shadow-sm shadow-primary/30' : 'bg-muted/20 border border-border/30'}`} />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 bg-card/50 border border-border/20 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
          <span className="text-[10px] sm:text-sm text-muted-foreground">Janelas:</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: maxWindows }).map((_, i) => (
              <div key={i} className={`w-5 sm:w-6 h-1.5 sm:h-2 rounded-full transition-all ${i < windowsUsed ? 'bg-orange-400' : 'bg-muted/20'}`} />
            ))}
          </div>
          <span className="text-[10px] sm:text-xs text-muted-foreground">({windowsUsed}/{maxWindows})</span>
          {isHalftime && <Badge variant="secondary" className="text-[9px] ml-auto">Intervalo</Badge>}
        </div>

        {subQueue.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 animate-pulse">
            <p className="text-xs sm:text-sm font-bold text-primary">
              ⏳ {subQueue.length} na fila — aguardando bola parada
            </p>
          </div>
        )}
      </div>

      {blocked && blockedReason && (
        <div className="bg-red-500/15 border-2 border-red-500/40 rounded-xl px-3 py-2.5 flex items-start gap-2">
          <span className="text-lg">⛔</span>
          <p className="text-xs sm:text-sm font-bold text-red-400 flex-1">{blockedReason}</p>
        </div>
      )}

      {!selectedSubOut ? (
        <>
          <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">📋 Quem SAI:</p>
          <div className="space-y-1.5 max-h-[280px] sm:max-h-[320px] overflow-y-auto">
            {starters.map((p, i) => {
              const stamina = p.stamina || 100;
              const staminaColor = stamina >= 70 ? 'bg-emerald-500' : stamina >= 40 ? 'bg-yellow-500' : 'bg-red-500';
              const isQueued = queuedOutIds.has(p.id);
              return (
                <button
                  key={p.id || i}
                  onClick={() => !isQueued && !blocked && onSelectSubOut(p.id)}
                  disabled={isQueued || blocked}
                  className={`w-full flex items-center gap-2 sm:gap-3 bg-card/60 border rounded-xl px-2 sm:px-3 py-2 sm:py-3 transition-all text-left group ${
                    isQueued ? 'border-orange-400/30 bg-orange-500/5 opacity-60' : blocked ? 'border-border/20 opacity-40 cursor-not-allowed' : 'border-border/20 hover:border-red-400/40 hover:bg-red-500/5'
                  }`}
                >
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-primary/10 flex items-center justify-center text-xs sm:text-sm font-black text-primary shrink-0">
                    {p.position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-bold truncate">{p.name}</p>
                    <div className="flex items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1">
                      <span className="text-xs sm:text-sm text-muted-foreground">OVR <span className="font-bold text-foreground">{p.overall}</span></span>
                      <div className="flex items-center gap-1 flex-1">
                        <div className="h-2 sm:h-2.5 flex-1 max-w-[70px] sm:max-w-[90px] rounded-full bg-muted/20 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${staminaColor}`} style={{ width: `${stamina}%` }} />
                        </div>
                        <span className="text-[10px] sm:text-sm text-muted-foreground font-mono">{stamina}%</span>
                      </div>
                    </div>
                  </div>
                  {isQueued ? (
                    <Badge variant="outline" className="text-[9px] border-orange-400/30 text-orange-400 shrink-0">Fila</Badge>
                  ) : (
                    <span className="text-xs sm:text-sm text-red-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold shrink-0">SAIR →</span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-500/15 flex items-center justify-center text-sm sm:text-lg font-black text-red-400 shrink-0">
              {selectedPlayer?.position}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-red-400 font-bold uppercase tracking-wider">⬅️ Sai</p>
              <p className="text-base sm:text-lg font-black truncate">{selectedPlayer?.name}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">OVR {selectedPlayer?.overall} · ⚡ {selectedPlayer?.stamina || 100}%</p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 sm:h-9 px-3 text-xs sm:text-sm shrink-0 gap-1" onClick={() => onSelectSubOut(null)}>
              <X className="h-3.5 w-3.5" /> Cancelar
            </Button>
          </div>

          <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider">🪑 Quem ENTRA:</p>
          <div className="space-y-1.5 max-h-[250px] sm:max-h-[280px] overflow-y-auto">
            {bench.filter(p => !queuedInIds.has(p.id)).map((p, i) => {
              const sameGroup = selectedPlayer && getPositionGroup(p.position) === getPositionGroup(selectedPlayer.position);
              const stamina = p.stamina || 100;
              return (
                <button
                  key={p.id || i}
                  onClick={() => onConfirmSub(selectedSubOut, p.id)}
                  className={`w-full flex items-center gap-2 sm:gap-3 bg-card/60 border rounded-xl px-2 sm:px-3 py-2 sm:py-3 hover:bg-emerald-500/5 transition-all text-left group ${
                    sameGroup ? 'border-emerald-500/30 bg-emerald-500/[0.03]' : 'border-border/20 hover:border-emerald-400/40'
                  }`}
                >
                  <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-xs sm:text-sm font-black shrink-0 ${
                    sameGroup ? 'bg-emerald-500/15 text-emerald-400' : 'bg-primary/10 text-primary'
                  }`}>
                    {p.position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-bold truncate">{p.name}</p>
                    <div className="flex items-center gap-2 sm:gap-3 mt-0.5">
                      <span className="text-xs sm:text-sm font-bold text-emerald-400">OVR {p.overall}</span>
                      <span className="text-xs sm:text-sm text-muted-foreground">⚡ {stamina}%</span>
                      {sameGroup && (
                        <Badge variant="outline" className="text-[9px] sm:text-xs h-4 sm:h-5 border-emerald-500/30 text-emerald-400">
                          <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" /> Mesma pos.
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold shrink-0">← ENTRA</span>
                </button>
              );
            })}
          </div>

          <div className="bg-muted/10 border border-border/20 rounded-lg p-2 sm:p-3 text-center">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              📡 Substituição será executada na próxima bola parada
              {isHalftime && ' (intervalo — execução imediata)'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/* ── CHAT-STYLE EVENT ROW ──────────────────────────────────── */

function ChatEventRow({ ev, homeTeam, awayTeam, homeShield, awayShield }: { ev: SimEvent; homeTeam: string; awayTeam: string; homeShield?: ShieldRenderProps; awayShield?: ShieldRenderProps }) {
  const teamName = ev.team === 'home' ? homeTeam : ev.team === 'away' ? awayTeam : null;
  const shield = ev.team === 'home' ? homeShield : ev.team === 'away' ? awayShield : null;
  const isGoal = ev.isGoal;

  return (
    <div className="flex items-start gap-2 px-1.5 sm:px-2 py-1.5 sm:py-2">
      {/* Team shield (or neutral icon for kickoff/halftime/final) */}
      {shield ? (
        <div className="shrink-0 mt-0.5">
          <ShieldCrest size={20} {...shield} />
        </div>
      ) : (
        <div className="shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-sm bg-muted/20 border border-border/30">
          {getEventIcon(ev.type)}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-mono text-muted-foreground/80">{ev.minute}'</span>
          {teamName && (
            <span className="text-[10px] text-muted-foreground/60 truncate">{teamName}</span>
          )}
          {isGoal && <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Gol</span>}
        </div>
        <p className={`text-[11px] sm:text-xs leading-snug ${getEventColor(ev.type)}`}>
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

function LineupView({ homePlayers, tactics, homeTeam }: { homePlayers?: Player[]; tactics?: TacticsConfig; homeTeam: string }) {
  if (!homePlayers || homePlayers.length === 0) {
    return (
      <div className="text-center py-6">
        <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Escalação não disponível</p>
      </div>
    );
  }

  const starters = homePlayers.slice(0, 11);
  const bench = homePlayers.slice(11);

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
            const stamina = p.stamina ?? 100;
            const staminaColor = stamina >= 70 ? 'bg-emerald-500' : stamina >= 40 ? 'bg-amber-500' : 'bg-red-500';
            return (
              <div key={p.id || i} className="flex items-center gap-2 sm:gap-3 bg-card/40 border border-border/20 rounded-lg px-2.5 sm:px-3 py-2.5">
                <span className="text-[10px] sm:text-xs font-mono text-muted-foreground w-4 sm:w-5">{i + 1}</span>
                <Badge variant="outline" className="text-[10px] sm:text-xs font-bold w-9 justify-center">{p.position}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold truncate">{p.name}</p>
                  <div className="h-1.5 w-full rounded-full bg-muted/15 overflow-hidden mt-1">
                    <div className={`h-full rounded-full transition-all ${staminaColor}`} style={{ width: `${stamina}%` }} />
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
            <div className="max-h-[260px] sm:max-h-[320px] overflow-y-auto border border-border/20 rounded-lg divide-y divide-border/10">
              {[...visibleEvents].reverse().map((ev, i) => (
                <ChatEventRow key={`${ev.minute}-${i}`} ev={ev} homeTeam={homeTeam} awayTeam={awayTeam} homeShield={homeShield} awayShield={awayShield} />
              ))}
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
          <Button variant="outline" className="w-full gap-2 text-sm sm:text-base" onClick={() => setShowReport(true)}>
            📊 Ver Relatório Pós-Jogo
          </Button>
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
  if (['foot_goal', 'header_goal'].includes(type)) return '⚽ GOL!';
  if (type === 'penalty_goal') return '⚽ GOL DE PÊNALTI!';
  if (type === 'penalty_miss') return '❌ PÊNALTI PERDIDO!';
  if (type === 'great_save') return '🧤 GRANDE DEFESA!';
  if (type === 'woodwork') return '🥅 NA TRAVE!';
  if (type === 'counter_attack_goal') return '⚽ GOL DE CONTRA-ATAQUE!';
  if (type === 'crossing_goal') return '⚽ GOL DE CRUZAMENTO!';
  if (type === 'free_kick_goal') return '⚽ GOL DE FALTA!';
  if (type === 'counter_attack') return '⚡ CONTRA-ATAQUE!';
  if (type === 'free_kick_near') return '🎯 FALTA PERIGOSA!';
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
