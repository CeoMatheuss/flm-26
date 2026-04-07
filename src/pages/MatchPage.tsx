/**
 * MatchPage — Match simulation with manager-controlled substitutions.
 * Reports only appear after the match ends.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Player } from '@/types/game';
import { TacticsConfig } from '@/types/tactics';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Film, LogOut, BarChart3, Users, Shirt, Activity, Star, ArrowUpDown } from 'lucide-react';
import { useMatchSimulation, SimEvent, MatchStats, MatchState } from '@/match';
import { PostGameReportModal } from '@/components/game/PostGameReportModal';
import { GameLoadingScreen } from '@/components/game/GameLoadingScreen';
import { HighlightMiniCanvas, isHighlightEvent, getHighlightType } from '@/components/game/HighlightMiniCanvas';

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
}

export default function MatchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locState = location.state as MatchPageState | null;
  const [initDone, setInitDone] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Preparando partida');

  const { state, startMatch, loadMatch, findActiveMatch, destroy } = useMatchSimulation();

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (locState?.liveMatchDbId) {
        setLoadingMsg('Reconectando à partida');
        await loadMatch(locState.liveMatchDbId);
      } else if (locState) {
        setLoadingMsg('Simulando partida no servidor');
        await startMatch({
          homeTeam: locState.homeTeam,
          awayTeam: locState.awayTeam,
          homePlayers: locState.homePlayers,
          homeStrength: locState.homeStrength,
          awayStrength: locState.awayStrength,
          matchId: locState.matchId,
          tactics: locState.tactics,
          stadiumName: locState.stadiumName,
          stadiumCapacity: locState.stadiumCapacity,
          isHome: locState.isHome,
          competition: locState.competition || 'Amistoso',
          tournamentMatchId: locState.tournamentMatchId,
        });
      } else {
        setLoadingMsg('Buscando partida ativa');
        const found = await findActiveMatch();
        if (!found && !cancelled) {
          navigate('/', { replace: true });
          return;
        }
      }
      if (!cancelled) setInitDone(true);
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
            <p className="text-sm text-destructive">{state.errorMsg || 'Erro ao carregar partida.'}</p>
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
      // Clear any pending cleanup timeout from previous highlight
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

  // Manager substitution state
  const [subsUsed, setSubsUsed] = useState(0);
  const [selectedSubOut, setSelectedSubOut] = useState<string | null>(null);
  const maxSubs = 5;

  const handleSubstitution = useCallback((playerOutId: string, playerInId: string) => {
    if (subsUsed >= maxSubs || isFinished) return;
    setSubsUsed(prev => prev + 1);
    setSelectedSubOut(null);
    // The substitution is visual/local — we just track it
  }, [subsUsed, isFinished]);

  const phaseLabel = () => {
    if (isFinished) return 'FIM DE JOGO';
    if (isHalftime) return 'INTERVALO';
    if (currentMinute <= 45) return '1º TEMPO';
    return '2º TEMPO';
  };

  const possession = computePossession(visibleEvents, stats);
  const substitutions = visibleEvents.filter(e => e.type === 'substitution');
  const goalEvents = visibleEvents.filter(e => e.isGoal);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(220,20%,6%)] p-2 sm:p-4 max-w-3xl mx-auto space-y-2 sm:space-y-3">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1" onClick={onExit}>
          <LogOut className="h-3.5 w-3.5" /> Sair
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-medium">
            {competition || 'Amistoso'}
          </Badge>
          <span className="text-[10px] text-muted-foreground truncate max-w-[100px] sm:max-w-[120px]">🏟️ {stadiumName}</span>
        </div>
      </div>

      {/* Professional Scoreboard */}
      <Card className={`overflow-hidden transition-all duration-500 ${goalFlash ? 'ring-2 ring-yellow-400/60 shadow-xl shadow-yellow-400/20' : 'shadow-lg'}`}>
        <div className="bg-primary/10 px-3 py-1.5 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{phaseLabel()}</span>
          <Badge variant={isFinished ? 'default' : 'secondary'} className="text-xs font-mono h-6">
            {currentMinute}'
          </Badge>
        </div>

        <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
          {/* Teams + Score */}
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex-1 text-right space-y-0.5 min-w-0">
              <p className="text-xs sm:text-base font-black truncate">{homeTeam}</p>
              <div className="flex items-center gap-1 justify-end flex-wrap">
                {goalEvents.filter(e => e.team === 'home').map((g, i) => (
                  <span key={i} className="text-[8px] sm:text-[9px] text-muted-foreground">⚽ {g.playerName} {g.minute}'</span>
                ))}
              </div>
            </div>

            <div className={`text-3xl sm:text-5xl font-black font-mono px-3 sm:px-6 py-1.5 sm:py-2 rounded-xl min-w-[80px] sm:min-w-[120px] text-center transition-all duration-300 ${goalFlash ? 'bg-yellow-400/20 scale-110' : 'bg-muted/20'}`}>
              <span className="text-primary">{homeGoals}</span>
              <span className="text-muted-foreground/50 text-xl sm:text-2xl mx-0.5 sm:mx-1">:</span>
              <span className="text-primary">{awayGoals}</span>
            </div>

            <div className="flex-1 text-left space-y-0.5 min-w-0">
              <p className="text-xs sm:text-base font-black truncate">{awayTeam}</p>
              <div className="flex items-center gap-1 flex-wrap">
                {goalEvents.filter(e => e.team === 'away').map((g, i) => (
                  <span key={i} className="text-[8px] sm:text-[9px] text-muted-foreground">⚽ {g.playerName} {g.minute}'</span>
                ))}
              </div>
            </div>
          </div>

          {/* Goal flash banner */}
          {goalFlash && latestEvent?.isGoal && (
            <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-lg p-2 text-center animate-fade-in">
              <p className="text-sm font-black text-emerald-400">⚽ GOOOL! {latestEvent.playerName || 'Jogador'}</p>
              {latestEvent.assistName && (
                <p className="text-[10px] text-emerald-400/70">Assistência: {latestEvent.assistName}</p>
              )}
            </div>
          )}

          {/* Possession bar */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-blue-400 w-8 text-right">{possession[0]}%</span>
            <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-muted/10">
              <div className="bg-blue-500 transition-all duration-700 rounded-l-full" style={{ width: `${possession[0]}%` }} />
              <div className="bg-red-500 flex-1 rounded-r-full" />
            </div>
            <span className="text-[10px] font-bold text-red-400 w-8">{possession[1]}%</span>
          </div>

          {!isFinished && <Progress value={(progress || 0) * 100} className="h-1" />}
        </CardContent>
      </Card>

      {/* Halftime banner */}
      {isHalftime && (
        <Card className="border-primary/30 bg-primary/5 p-3 sm:p-4 text-center animate-fade-in">
          <p className="text-sm sm:text-base font-black text-primary">⏸ INTERVALO</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Os jogadores descansam. O 2º tempo começa em instantes.</p>
        </Card>
      )}

      {/* 2D Canvas — highlights */}
      {!isFinished && activeHighlight && (
        <Card className="p-2 border-yellow-400/30 bg-yellow-400/5 transition-all duration-300">
          <div className="text-center mb-1">
            <Badge variant="outline" className="text-[9px] font-mono">{activeHighlight.minute}' — {getHighlightLabel(activeHighlight.type)}</Badge>
          </div>
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
          <p className="text-[10px] text-center text-muted-foreground mt-1">{activeHighlight.description}</p>
        </Card>
      )}

      {/* Live commentary */}
      {latestEvent && !goalFlash && (
        <Card className="p-2 sm:p-3 border-border/30">
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="text-[9px] font-mono shrink-0 mt-0.5">{latestEvent.minute}'</Badge>
            <p className={`text-xs sm:text-sm font-semibold leading-snug ${getEventColor(latestEvent.type)}`}>
              {getEventIcon(latestEvent.type)} {latestEvent.description}
            </p>
          </div>
        </Card>
      )}

      {/* Quick Stats Row — during match */}
      {!isFinished && (
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
          {[
            ['⚡', 'Chutes', stats.shots[0], stats.shots[1]],
            ['🎯', 'No Gol', stats.shotsOnTarget[0], stats.shotsOnTarget[1]],
            ['🏳️', 'Escanteios', stats.corners[0], stats.corners[1]],
            ['⚠️', 'Faltas', stats.fouls[0], stats.fouls[1]],
          ].map(([icon, label, h, a]) => (
            <div key={label as string} className="text-center bg-card/50 border border-border/20 rounded-lg p-1.5 sm:p-2">
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">{icon} {label}</p>
              <p className="text-xs sm:text-sm font-black font-mono">{h as number} - {a as number}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs: only Narração + Subs (manager) during match. Full tabs at end. */}
      {!isFinished ? (
        <Tabs defaultValue="events" className="space-y-2">
          <TabsList className="w-full h-9 grid grid-cols-3">
            <TabsTrigger value="events" className="text-[10px] gap-1">📝 Narração</TabsTrigger>
            <TabsTrigger value="lineup" className="text-[10px] gap-1"><Shirt className="h-3 w-3" /> Time</TabsTrigger>
            <TabsTrigger value="subs" className="text-[10px] gap-1"><ArrowUpDown className="h-3 w-3" /> Subs ({subsUsed}/{maxSubs})</TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <Card className="p-2">
              <div ref={eventsRef} className="max-h-[280px] sm:max-h-[350px] overflow-y-auto space-y-0.5">
                {visibleEvents.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">⏳ Aguardando início...</p>
                )}
                {[...visibleEvents].reverse().slice(0, 60).map((ev, i) => (
                  <div key={`${ev.minute}-${i}`} className={`flex items-start gap-2 text-xs px-2 py-1 sm:py-1.5 rounded transition-colors ${getEventBg(ev)}`}>
                    <Badge variant="outline" className="text-[8px] w-8 justify-center shrink-0 font-mono mt-0.5">{ev.minute}'</Badge>
                    <span className="text-[10px] sm:text-[11px] shrink-0">{getEventIcon(ev.type)}</span>
                    <span className={`text-[10px] sm:text-[11px] ${getEventColor(ev.type)} leading-snug`}>{ev.description}</span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="lineup">
            <Card className="p-3 sm:p-4">
              <LineupView homePlayers={homePlayers} tactics={tactics} homeTeam={homeTeam} />
            </Card>
          </TabsContent>

          <TabsContent value="subs">
            <Card className="p-3 sm:p-4">
              <ManagerSubstitutionView
                homePlayers={homePlayers}
                subsUsed={subsUsed}
                maxSubs={maxSubs}
                selectedSubOut={selectedSubOut}
                onSelectSubOut={setSelectedSubOut}
                onConfirmSub={handleSubstitution}
                isHalftime={isHalftime}
                isFinished={isFinished}
              />
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        /* ── FINISHED: Full report ── */
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
        />
      )}
    </div>
  );
}

/* ── MANAGER SUBSTITUTION VIEW ──────────────────────────────── */

function ManagerSubstitutionView({ homePlayers, subsUsed, maxSubs, selectedSubOut, onSelectSubOut, onConfirmSub, isHalftime, isFinished }: {
  homePlayers?: Player[];
  subsUsed: number;
  maxSubs: number;
  selectedSubOut: string | null;
  onSelectSubOut: (id: string | null) => void;
  onConfirmSub: (outId: string, inId: string) => void;
  isHalftime: boolean;
  isFinished: boolean;
}) {
  if (!homePlayers || homePlayers.length <= 11) {
    return (
      <div className="text-center py-6">
        <ArrowUpDown className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Banco insuficiente para substituições</p>
      </div>
    );
  }

  if (subsUsed >= maxSubs) {
    return (
      <div className="text-center py-6">
        <ArrowUpDown className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Todas as {maxSubs} substituições foram usadas</p>
      </div>
    );
  }

  const starters = homePlayers.slice(0, 11);
  const bench = homePlayers.slice(11);

  const getPositionGroup = (pos: string) => {
    if (['GOL'].includes(pos)) return 'gk';
    if (['ZAG', 'LAT'].includes(pos)) return 'def';
    if (['VOL', 'MEI'].includes(pos)) return 'mid';
    if (['ATA'].includes(pos)) return 'atk';
    return 'atk';
  };

  const selectedPlayer = starters.find(p => p.id === selectedSubOut);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-primary flex items-center gap-1.5">
          <ArrowUpDown className="h-4 w-4" /> Substituições
        </p>
        <div className="flex items-center gap-1">
          {Array.from({ length: maxSubs }).map((_, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < subsUsed ? 'bg-primary' : 'bg-muted/30 border border-border/30'}`} />
          ))}
        </div>
      </div>

      {!selectedSubOut ? (
        <>
          <p className="text-xs text-muted-foreground">Selecione quem SAI do campo:</p>
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
            {starters.map((p, i) => {
              const stamina = p.stamina || 100;
              const staminaColor = stamina >= 70 ? 'bg-emerald-500' : stamina >= 40 ? 'bg-yellow-500' : 'bg-red-500';
              return (
                <button
                  key={p.id || i}
                  onClick={() => onSelectSubOut(p.id)}
                  className="w-full flex items-center gap-2.5 bg-card/60 border border-border/20 rounded-xl px-3 py-2.5 hover:border-red-400/40 hover:bg-red-500/5 transition-all text-left group"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary shrink-0">
                    {p.position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">OVR {p.overall}</span>
                      <div className="flex items-center gap-1 flex-1">
                        <div className="h-1.5 flex-1 max-w-[60px] rounded-full bg-muted/20 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${staminaColor}`} style={{ width: `${stamina}%` }} />
                        </div>
                        <span className="text-[9px] text-muted-foreground">{stamina}%</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-red-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">SAIR →</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center text-sm font-black text-red-400 shrink-0">
              {selectedPlayer?.position}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-red-400 font-bold uppercase">Sai do campo</p>
              <p className="text-sm font-black truncate">{selectedPlayer?.name}</p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] shrink-0" onClick={() => onSelectSubOut(null)}>Cancelar</Button>
          </div>

          <p className="text-xs text-muted-foreground">Selecione quem ENTRA:</p>
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
            {bench.map((p, i) => {
              const sameGroup = selectedPlayer && getPositionGroup(p.position) === getPositionGroup(selectedPlayer.position);
              const stamina = p.stamina || 100;
              return (
                <button
                  key={p.id || i}
                  onClick={() => onConfirmSub(selectedSubOut, p.id)}
                  className={`w-full flex items-center gap-2.5 bg-card/60 border rounded-xl px-3 py-2.5 hover:bg-emerald-500/5 transition-all text-left group ${
                    sameGroup ? 'border-emerald-500/30' : 'border-border/20 hover:border-emerald-400/40'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    sameGroup ? 'bg-emerald-500/15 text-emerald-400' : 'bg-primary/10 text-primary'
                  }`}>
                    {p.position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-emerald-400">OVR {p.overall}</span>
                      <span className="text-[9px] text-muted-foreground">⚡ {stamina}%</span>
                      {sameGroup && <Badge variant="outline" className="text-[7px] h-4 border-emerald-500/30 text-emerald-400">Mesma posição</Badge>}
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">← ENTRA</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ── STATS VIEW ────────────────────────────────────────────── */

function StatsView({ stats, homeTeam, awayTeam }: { stats: MatchStats; homeTeam: string; awayTeam: string }) {
  const rows: [string, [number, number], string][] = [
    ['Posse de Bola', stats.possession, '%'],
    ['Finalizações', stats.shots, ''],
    ['Chutes no Gol', stats.shotsOnTarget, ''],
    ['Escanteios', stats.corners, ''],
    ['Faltas', stats.fouls, ''],
    ['Cartões Amarelos', stats.yellowCards, ''],
    ['Cartões Vermelhos', stats.redCards, ''],
    ['Passes', stats.passes, ''],
    ['Desarmes', stats.tackles, ''],
    ['Defesas', stats.saves, ''],
    ['Impedimentos', stats.offsides, ''],
  ];

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-blue-400 truncate max-w-[120px]">{homeTeam}</span>
        <span className="text-red-400 truncate max-w-[120px]">{awayTeam}</span>
      </div>
      {rows.map(([label, vals, suffix]) => {
        const total = vals[0] + vals[1];
        const homePercent = total > 0 ? (vals[0] / total) * 100 : 50;
        return (
          <div key={label} className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center justify-between text-[10px] sm:text-xs">
              <span className="font-bold w-8 sm:w-10 text-right">{vals[0]}{suffix}</span>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">{label}</span>
              <span className="font-bold w-8 sm:w-10 text-left">{vals[1]}{suffix}</span>
            </div>
            <div className="flex h-1.5 sm:h-2 rounded-full overflow-hidden bg-muted/10">
              <div className="bg-blue-500 transition-all duration-500 rounded-l-full" style={{ width: `${homePercent}%` }} />
              <div className="bg-red-500 flex-1 rounded-r-full" />
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
        <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">Escalação não disponível</p>
      </div>
    );
  }

  const starters = homePlayers.slice(0, 11);
  const bench = homePlayers.slice(11);

  return (
    <div className="space-y-3 sm:space-y-4">
      {tactics && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-[10px] sm:text-xs">📋 {tactics.formation}</Badge>
          {tactics.playStyle && <Badge variant="outline" className="text-[9px] sm:text-[10px]">{tactics.playStyle}</Badge>}
          {tactics.pressing && <Badge variant="outline" className="text-[9px] sm:text-[10px]">Pressão: {tactics.pressing}</Badge>}
        </div>
      )}

      <div>
        <p className="text-xs font-bold mb-2 text-primary flex items-center gap-1"><Shirt className="h-3 w-3" /> Titulares — {homeTeam}</p>
        <div className="space-y-1">
          {starters.map((p, i) => (
            <div key={p.id || i} className="flex items-center gap-1.5 sm:gap-2 bg-card/50 border border-border/20 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
              <span className="text-[9px] sm:text-[10px] font-mono text-muted-foreground w-4 sm:w-5">{i + 1}</span>
              <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold w-7 sm:w-8 justify-center">{p.position}</Badge>
              <span className="text-[10px] sm:text-xs font-semibold flex-1 truncate">{p.name}</span>
              <div className="flex items-center gap-0.5 sm:gap-1">
                <Star className="h-3 w-3 text-yellow-400" />
                <span className="text-[10px] sm:text-xs font-bold">{p.overall}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <Activity className="h-3 w-3 text-emerald-400" />
                <span className="text-[9px] sm:text-[10px] text-muted-foreground">{p.stamina || 100}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {bench.length > 0 && (
        <div>
          <p className="text-xs font-bold mb-2 text-muted-foreground">🪑 Banco ({bench.length})</p>
          <div className="grid grid-cols-2 gap-1">
            {bench.map((p, i) => (
              <div key={p.id || i} className="flex items-center gap-1.5 bg-muted/10 rounded px-2 py-1.5">
                <Badge variant="outline" className="text-[8px] w-7 justify-center">{p.position}</Badge>
                <span className="text-[10px] truncate flex-1">{p.name}</span>
                <span className="text-[10px] font-bold">{p.overall}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── FINISHED SECTION ──────────────────────────────────────── */

function FinishedSection({ stats, homeTeam, awayTeam, finalHomeGoals, finalAwayGoals, visibleEvents, matchDbId, onExit, homePlayers }: {
  stats: MatchStats; homeTeam: string; awayTeam: string;
  finalHomeGoals: number; finalAwayGoals: number;
  visibleEvents: SimEvent[]; matchDbId: string | null; onExit: () => void;
  homePlayers?: Player[];
}) {
  const [showReplay, setShowReplay] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const goalEvents = visibleEvents.filter(e => e.isGoal);
  const substitutions = visibleEvents.filter(e => e.type === 'substitution');

  // Calculate player ratings from events
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
    <div className="space-y-3 pt-2 animate-fade-in">
      {/* Result Summary */}
      <Card className="border-primary/30 overflow-hidden">
        <div className="bg-primary/10 px-3 py-2 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Resultado Final</p>
        </div>
        <CardContent className="p-3 sm:p-4 space-y-4">
          {/* MOTM */}
          {motm && (
            <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center">
                <Star className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-[10px] text-yellow-400 font-bold uppercase">Craque do Jogo</p>
                <p className="text-sm font-black">{motm.name}</p>
                <p className="text-[10px] text-muted-foreground">{motm.position} · Nota: {motm.rating}</p>
              </div>
            </div>
          )}

          {/* Player Ratings */}
          {playerRatings.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-2 flex items-center gap-1"><Star className="h-3 w-3 text-yellow-400" /> Notas dos Jogadores</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {playerRatings.sort((a, b) => b.rating - a.rating).map((p, i) => (
                  <div key={i} className="flex items-center gap-2 bg-card/50 border border-border/20 rounded px-2 py-1.5">
                    <Badge variant="outline" className="text-[8px] w-7 justify-center">{p.position}</Badge>
                    <span className="text-[10px] truncate flex-1">{p.name}</span>
                    <span className={`text-xs font-black ${p.rating >= 8 ? 'text-emerald-400' : p.rating >= 7 ? 'text-blue-400' : p.rating >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {p.rating}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Stats */}
          <StatsView stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} />

          {/* Substitutions summary */}
          {substitutions.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-2">🔄 Substituições ({substitutions.length})</p>
              {substitutions.map((sub, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] bg-sky-500/5 border border-sky-500/15 rounded px-2 py-1.5 mb-1">
                  <Badge variant="outline" className="text-[8px] font-mono">{sub.minute}'</Badge>
                  <span className="flex-1">{sub.description}</span>
                  <span className="text-muted-foreground capitalize">{sub.team === 'home' ? '🔵' : '🔴'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Narration log */}
          <div>
            <p className="text-xs font-bold mb-2">📝 Narração Completa</p>
            <div className="max-h-[200px] overflow-y-auto space-y-0.5 border border-border/20 rounded-lg p-2">
              {[...visibleEvents].reverse().map((ev, i) => (
                <div key={`${ev.minute}-${i}`} className={`flex items-start gap-2 text-xs px-1 py-1 rounded ${getEventBg(ev)}`}>
                  <Badge variant="outline" className="text-[7px] w-7 justify-center shrink-0 font-mono">{ev.minute}'</Badge>
                  <span className={`text-[10px] ${getEventColor(ev.type)} leading-snug`}>
                    {getEventIcon(ev.type)} {ev.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[9px] text-muted-foreground text-center border-t border-border/20 pt-2">
            {visibleEvents.length} lances · ⚽ {finalHomeGoals + finalAwayGoals} gols
          </p>
        </CardContent>
      </Card>

      {/* Goal replay */}
      {goalEvents.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Film className="h-4 w-4 text-primary" /> Gols ({goalEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            {!showReplay ? (
              <Button variant="outline" className="w-full gap-2 text-xs" onClick={() => { setShowReplay(true); setReplayIndex(0); }}>
                <Film className="h-3.5 w-3.5" /> Ver Replay dos Gols
              </Button>
            ) : goalEvents[replayIndex] ? (
              <div className="space-y-2">
                <HighlightMiniCanvas
                  type={getHighlightType(goalEvents[replayIndex].type)}
                  team={goalEvents[replayIndex].team === 'neutral' ? 'home' : goalEvents[replayIndex].team}
                  playerName={goalEvents[replayIndex].playerName}
                />
                <div className="text-center space-y-1">
                  <Badge variant="outline" className="font-mono text-xs">{goalEvents[replayIndex].minute}'</Badge>
                  <p className="text-sm font-bold">{goalEvents[replayIndex].playerName || 'Jogador'}</p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {goalEvents[replayIndex].goalType && <Badge variant="secondary" className="text-[9px]">{goalEvents[replayIndex].goalType}</Badge>}
                    <Badge variant="outline" className="text-[9px]">{goalEvents[replayIndex].team === 'home' ? homeTeam : awayTeam}</Badge>
                  </div>
                  {goalEvents[replayIndex].assistName && (
                    <p className="text-[10px] text-muted-foreground">🅰️ {goalEvents[replayIndex].assistName}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs" disabled={replayIndex <= 0} onClick={() => setReplayIndex(i => i - 1)}>← Ant.</Button>
                  <Badge variant="secondary" className="flex items-center text-[10px] px-2">{replayIndex + 1}/{goalEvents.length}</Badge>
                  <Button variant="outline" size="sm" className="flex-1 text-xs" disabled={replayIndex >= goalEvents.length - 1} onClick={() => setReplayIndex(i => i + 1)}>Próx. →</Button>
                </div>
                <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowReplay(false)}>Fechar</Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {matchDbId && (
        <>
          <Button variant="outline" className="w-full gap-2 text-xs" onClick={() => setShowReport(true)}>
            📊 Ver Relatório Pós-Jogo
          </Button>
          {showReport && <PostGameReportModal matchDbId={matchDbId} onClose={() => setShowReport(false)} />}
        </>
      )}

      <Button className="w-full gap-2" onClick={onExit}>
        <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
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
  if (['foot_goal', 'header_goal', 'penalty_goal'].includes(type)) return '⚽';
  if (type === 'great_save') return '🧤';
  if (type === 'woodwork') return '🥅';
  if (type === 'yellow_card') return '🟡';
  if (type === 'red_card') return '🔴';
  if (type === 'corner_danger') return '🏳️';
  if (type === 'penalty_miss') return '❌';
  if (['dangerous_foul', 'foul', 'midfield_foul'].includes(type)) return '⚠️';
  if (type === 'dribble_ok') return '💨';
  if (['tackle', 'interception'].includes(type)) return '🦶';
  if (type === 'substitution') return '🔄';
  if (type === 'halftime') return '⏸';
  if (type === 'final_whistle') return '🏁';
  if (type === 'kickoff') return '📢';
  if (['long_shot_miss', 'header_miss'].includes(type)) return '🎯';
  if (type === 'crossing') return '↗️';
  if (type === 'through_ball') return '⚡';
  return '•';
}

function getEventColor(type: string): string {
  if (['foot_goal', 'header_goal', 'penalty_goal'].includes(type)) return 'text-emerald-400 font-bold';
  if (['great_save', 'woodwork', 'corner_danger', 'long_shot_miss', 'header_miss'].includes(type)) return 'text-yellow-400';
  if (type === 'yellow_card') return 'text-yellow-300';
  if (type === 'red_card') return 'text-red-400';
  if (type === 'penalty_miss') return 'text-red-400 font-bold';
  if (type === 'dangerous_foul') return 'text-orange-500 font-semibold';
  if (['midfield_foul', 'foul'].includes(type)) return 'text-orange-400';
  if (type === 'halftime') return 'text-primary font-semibold';
  if (type === 'final_whistle') return 'text-primary font-bold';
  if (type === 'kickoff') return 'text-blue-400 font-medium';
  if (type === 'substitution') return 'text-sky-400';
  return 'text-muted-foreground';
}

function getEventBg(ev: SimEvent): string {
  if (ev.isGoal) return 'bg-emerald-500/10 border border-emerald-500/20';
  if (['halftime', 'kickoff', 'final_whistle'].includes(ev.type)) return 'bg-primary/5 border border-primary/10';
  if (['yellow_card', 'red_card'].includes(ev.type)) return 'bg-yellow-500/5 border border-yellow-500/10';
  if (isHighlightEvent(ev.type)) return 'bg-yellow-400/5';
  if (ev.team === 'home') return 'bg-blue-500/[0.03]';
  if (ev.team === 'away') return 'bg-red-500/[0.03]';
  return 'bg-muted/5';
}

function getHighlightLabel(type: string): string {
  if (['foot_goal', 'header_goal'].includes(type)) return '⚽ GOL!';
  if (type === 'penalty_goal') return '⚽ GOL DE PÊNALTI!';
  if (type === 'penalty_miss') return '❌ PÊNALTI PERDIDO!';
  if (type === 'great_save') return '🧤 GRANDE DEFESA!';
  if (type === 'woodwork') return '🥅 BOLA NA TRAVE!';
  if (type === 'corner_danger') return '🏳️ ESCANTEIO PERIGOSO!';
  if (type === 'long_shot_miss') return '🎯 CHUTE DE FORA!';
  if (type === 'header_miss') return '🎯 CABEÇADA!';
  if (type === 'dangerous_foul') return '⚠️ FALTA PERIGOSA!';
  return '🎬 LANCE IMPORTANTE';
}
