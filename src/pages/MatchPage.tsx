/**
 * MatchPage — Text-based match simulation with 2D highlight clips.
 * Uses the new simple useMatchSimulation hook.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Player } from '@/types/game';
import { TacticsConfig } from '@/types/tactics';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Film, LogOut, BarChart3 } from 'lucide-react';
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
          competition: 'Amistoso',
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
    return (
      <GameLoadingScreen
        message={loadingMsg}
        subMessage={locState ? `${locState.homeTeam} vs ${locState.awayTeam}` : undefined}
      />
    );
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

  return <MatchViewer matchState={state} onExit={() => navigate('/', { replace: true })} />;
}

/* ── MATCH VIEWER ─────────────────────────────────────────── */

function MatchViewer({ matchState, onExit }: { matchState: MatchState; onExit: () => void }) {
  const {
    phase, currentMinute, progress, homeTeam, awayTeam,
    homeGoals, awayGoals, visibleEvents, latestEvent, stats, stadiumName, matchDbId,
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
      setTimeout(() => setGoalFlash(false), 2000);
    }
    lastGoalCount.current = total;
  }, [homeGoals, awayGoals]);

  // Active highlight
  const [activeHighlight, setActiveHighlight] = useState<SimEvent | null>(null);
  const lastHighlightMinute = useRef(-1);
  useEffect(() => {
    if (!latestEvent) return;
    if (isHighlightEvent(latestEvent.type) && latestEvent.minute !== lastHighlightMinute.current) {
      lastHighlightMinute.current = latestEvent.minute;
      setActiveHighlight(latestEvent);
    }
  }, [latestEvent]);

  // Auto-scroll events
  const eventsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (eventsRef.current) eventsRef.current.scrollTop = 0;
  }, [visibleEvents.length]);

  const phaseLabel = () => {
    if (isFinished) return 'FIM';
    if (isHalftime) return 'INT';
    if (currentMinute <= 45) return '1ºT';
    return '2ºT';
  };

  const possession = computePossession(visibleEvents, stats);

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 max-w-2xl mx-auto space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1" onClick={onExit}>
            <LogOut className="h-3 w-3" /> Sair
          </Button>
          <Badge variant={isHalftime ? 'secondary' : isFinished ? 'outline' : 'default'} className="text-xs font-mono px-2">
            {currentMinute}' {phaseLabel()}
          </Badge>
        </div>
        <span className="text-[9px] text-muted-foreground truncate max-w-[140px]">🏟️ {stadiumName}</span>
      </div>

      {/* Scoreboard */}
      <Card className={`p-3 transition-all duration-500 ${goalFlash ? 'ring-2 ring-yellow-400/50 shadow-lg shadow-yellow-400/10' : ''}`}>
        <div className="flex items-center gap-3 justify-center">
          <p className="text-xs sm:text-sm font-bold truncate text-right flex-1">{homeTeam}</p>
          <div className={`text-3xl sm:text-4xl font-black font-mono px-4 py-1.5 rounded-lg min-w-[90px] text-center transition-all duration-300 ${goalFlash ? 'bg-yellow-400/20 scale-105' : 'bg-muted/30'}`}>
            {homeGoals}
            <span className="text-muted-foreground text-base mx-1">×</span>
            {awayGoals}
          </div>
          <p className="text-xs sm:text-sm font-bold truncate text-left flex-1">{awayTeam}</p>
        </div>
        {goalFlash && latestEvent?.isGoal && (
          <p className="text-center text-xs font-bold text-yellow-400 animate-fade-in mt-1">
            ⚽ GOL! {latestEvent.playerName || 'Jogador'}{latestEvent.assistName ? ` (🅰 ${latestEvent.assistName})` : ''}
          </p>
        )}
        {/* Mini possession bar */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[9px] font-mono text-blue-400">{possession[0]}%</span>
          <div className="flex-1 flex h-1 rounded-full overflow-hidden bg-muted/20">
            <div className="bg-blue-500 transition-all duration-500" style={{ width: `${possession[0]}%` }} />
            <div className="bg-red-500 flex-1" />
          </div>
          <span className="text-[9px] font-mono text-red-400">{possession[1]}%</span>
        </div>
      </Card>

      {/* Progress bar */}
      {!isFinished && (
        <div className="px-1">
          <div className="h-1 bg-muted/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary/60 transition-all duration-500 rounded-full" style={{ width: `${(progress || 0) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Halftime banner */}
      {isHalftime && (
        <Card className="border-primary/30 bg-primary/5 p-3 text-center animate-fade-in">
          <p className="text-sm font-bold text-primary">⏸ INTERVALO</p>
          <p className="text-xs text-muted-foreground mt-0.5">Os jogadores descansam. O 2º tempo começa em instantes.</p>
        </Card>
      )}

      {/* 2D Highlight clip — only for key moments */}
      {activeHighlight && (
        <div className="animate-fade-in">
          <Card className="p-2 border-yellow-400/30 bg-yellow-400/5">
            <div className="text-center mb-1">
              <Badge variant="outline" className="text-[9px] font-mono">{activeHighlight.minute}' — {getHighlightLabel(activeHighlight.type)}</Badge>
            </div>
            <HighlightMiniCanvas
              type={getHighlightType(activeHighlight.type)}
              team={activeHighlight.team === 'neutral' ? 'home' : activeHighlight.team}
              playerName={activeHighlight.playerName}
              onComplete={() => setTimeout(() => setActiveHighlight(null), 2000)}
            />
            <p className="text-[10px] text-center text-muted-foreground mt-1">{activeHighlight.description}</p>
          </Card>
        </div>
      )}

      {/* Commentary — latest event */}
      {latestEvent && (
        <Card className="p-2.5">
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="text-[9px] font-mono shrink-0 mt-0.5">{latestEvent.minute}'</Badge>
            <p className={`text-sm font-semibold leading-snug ${getEventColor(latestEvent.type)}`}>
              {getEventIcon(latestEvent.type)} {latestEvent.description}
            </p>
          </div>
        </Card>
      )}

      {/* Quick stats bar */}
      {!isFinished && (
        <div className="grid grid-cols-4 gap-1">
          {[
            ['⚡', 'Finalizações', stats.shots[0], stats.shots[1]],
            ['🎯', 'No Gol', stats.shotsOnTarget[0], stats.shotsOnTarget[1]],
            ['🏳️', 'Escanteios', stats.corners[0], stats.corners[1]],
            ['⚠️', 'Faltas', stats.fouls[0], stats.fouls[1]],
          ].map(([icon, label, h, a]) => (
            <div key={label as string} className="text-center bg-muted/10 rounded p-1.5">
              <p className="text-[9px] text-muted-foreground">{icon} {label}</p>
              <p className="text-xs font-bold font-mono">{h as number} - {a as number}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs: Events + Stats */}
      <Tabs defaultValue="events" className="space-y-1">
        <TabsList className="w-full h-8">
          <TabsTrigger value="events" className="flex-1 text-[10px] gap-1">📝 Narração</TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 text-[10px] gap-1">
            <BarChart3 className="h-3 w-3" /> Estatísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card className="p-1.5">
            <div ref={eventsRef} className="max-h-[300px] overflow-y-auto space-y-0.5">
              {visibleEvents.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">⏳ Aguardando início da partida...</p>
              )}
              {[...visibleEvents].reverse().slice(0, 50).map((ev, i) => (
                <div
                  key={`${ev.minute}-${i}`}
                  className={`flex items-start gap-2 text-xs px-2 py-1.5 rounded transition-colors ${getEventBg(ev)}`}
                >
                  <Badge variant="outline" className="text-[8px] w-7 justify-center shrink-0 font-mono mt-0.5">
                    {ev.minute}'
                  </Badge>
                  <span className="text-[10px] shrink-0">{getEventIcon(ev.type)}</span>
                  <span className={`${getEventColor(ev.type)} leading-snug`}>{ev.description}</span>
                  {isHighlightEvent(ev.type) && (
                    <span className="text-[8px] text-yellow-400 shrink-0 mt-0.5">🎬</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card className="p-3">
            <StatsView stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Finished */}
      {isFinished && (
        <FinishedSection
          stats={stats}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          finalHomeGoals={homeGoals}
          finalAwayGoals={awayGoals}
          visibleEvents={visibleEvents}
          matchDbId={matchDbId}
          onExit={onExit}
        />
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
    ['Cartões Am.', stats.yellowCards, ''],
    ['Cartões Vm.', stats.redCards, ''],
    ['Passes', stats.passes, ''],
    ['Desarmes', stats.tackles, ''],
    ['Defesas', stats.saves, ''],
    ['Impedimentos', stats.offsides, ''],
  ];

  return (
    <div className="space-y-1.5">
      {rows.map(([label, vals, suffix]) => (
        <div key={label} className="flex items-center gap-2 text-[10px]">
          <span className="w-8 text-right font-bold">{vals[0]}{suffix}</span>
          <div className="flex-1 flex h-1.5 rounded overflow-hidden bg-muted/20">
            <div className="bg-blue-500 transition-all duration-500" style={{ width: `${vals[0] + vals[1] > 0 ? (vals[0] / (vals[0] + vals[1])) * 100 : 50}%` }} />
            <div className="bg-red-500 flex-1" />
          </div>
          <span className="w-8 text-left font-bold">{vals[1]}{suffix}</span>
          <span className="text-muted-foreground w-20 shrink-0 truncate">{label}</span>
        </div>
      ))}
      <div className="flex justify-between text-[8px] text-muted-foreground pt-1 border-t border-border/20">
        <span className="text-blue-400">{homeTeam}</span>
        <span className="text-red-400">{awayTeam}</span>
      </div>
    </div>
  );
}

/* ── FINISHED SECTION ──────────────────────────────────────── */

function FinishedSection({ stats, homeTeam, awayTeam, finalHomeGoals, finalAwayGoals, visibleEvents, matchDbId, onExit }: {
  stats: MatchStats; homeTeam: string; awayTeam: string;
  finalHomeGoals: number; finalAwayGoals: number;
  visibleEvents: SimEvent[]; matchDbId: string | null; onExit: () => void;
}) {
  const [showReplay, setShowReplay] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const goalEvents = visibleEvents.filter(e => e.isGoal);

  return (
    <div className="space-y-2 pt-2 animate-fade-in">
      <Card className="border-primary/20">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Resultado Final
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <StatsView stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} />
          <p className="text-[8px] text-muted-foreground text-center mt-2 border-t border-border/20 pt-2">
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
