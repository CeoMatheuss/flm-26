import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Player } from '@/types/game';
import { TacticsConfig } from '@/types/tactics';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Star, Film, LogOut, BarChart3, Loader2 } from 'lucide-react';
import { useMatchManager, SimEvent, MatchStats, EMPTY_STATS } from '@/match';
import { PostGameReportModal } from '@/components/game/PostGameReportModal';
import { PhaserMatchView } from '@/match/phaser/PhaserMatchView';

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
  const state = location.state as MatchPageState | null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { state: matchState, startNewMatch, loadFromDb, findActiveMatch, destroy } = useMatchManager();

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        if (state?.liveMatchDbId) {
          const ok = await loadFromDb(state.liveMatchDbId);
          if (!ok) setError('Partida não encontrada.');
          setLoading(false);
          return;
        }
        if (state) {
          const result = await startNewMatch({
            homeTeam: state.homeTeam,
            awayTeam: state.awayTeam,
            homePlayers: state.homePlayers,
            homeStrength: state.homeStrength,
            awayStrength: state.awayStrength,
            matchId: state.matchId,
            tactics: state.tactics,
            stadiumName: state.stadiumName,
            stadiumCapacity: state.stadiumCapacity,
            isHome: state.isHome,
            competition: 'Amistoso',
          });
          if (!result.success) setError(result.error || 'Erro ao iniciar partida.');
          setLoading(false);
          return;
        }
        const found = await findActiveMatch();
        if (!found) { navigate('/', { replace: true }); return; }
        setLoading(false);
      } catch {
        setError('Erro inesperado ao carregar partida.');
        setLoading(false);
      }
    };
    init();
    return () => destroy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Preparando partida no servidor...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={() => navigate('/', { replace: true })}>Voltar ao Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (matchState.phase === 'loading') return null;

  return <MatchViewer matchState={matchState} onExit={() => navigate('/', { replace: true })} />;
}

// Old canvas-based Pitch2DView replaced by PhaserMatchView

// ── MATCH VIEWER ──────────────────────────────────────────────────
function MatchViewer({ matchState, onExit }: {
  matchState: import('@/match').MatchManagerState;
  onExit: () => void;
}) {
  const { phase, snapshot, config, stats, lockedResult } = matchState;
  const { currentMinute, visibleEvents, homeGoals, awayGoals, latestEvent } = snapshot;
  const { homeTeam, awayTeam, stadiumName, stadiumCapacity } = config;

  const isFinished = phase === 'finished';
  const isHalftime = phase === 'halftime';
  const commentary = latestEvent?.description || '⚽ A bola vai rolar!';
  const lastEventType = latestEvent?.type || '';

  const finalHomeGoals = lockedResult?.homeGoals ?? homeGoals;
  const finalAwayGoals = lockedResult?.awayGoals ?? awayGoals;

  // Goal flash
  const [goalFlash, setGoalFlash] = useState(false);
  const lastGoalCount = useRef(0);
  useEffect(() => {
    const total = homeGoals + awayGoals;
    if (total > lastGoalCount.current) {
      setGoalFlash(true);
      setTimeout(() => setGoalFlash(false), 1800);
    }
    lastGoalCount.current = total;
  }, [homeGoals, awayGoals]);

  // Replay gols
  const [showReplay, setShowReplay] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const goalEvents = visibleEvents.filter(e => e.isGoal);

  const eventColor = (type: string) => {
    if (type === 'foot_goal' || type === 'header_goal' || type === 'penalty_goal') return 'text-emerald-400 font-bold';
    if (['great_save', 'woodwork', 'corner_danger', 'long_shot_miss', 'header_miss'].includes(type)) return 'text-yellow-400';
    if (type === 'yellow_card') return 'text-yellow-300';
    if (type === 'red_card') return 'text-red-400';
    if (type === 'penalty_miss') return 'text-red-400 font-bold';
    if (type === 'dangerous_foul') return 'text-orange-500 font-semibold';
    if (['midfield_foul', 'foul'].includes(type)) return 'text-orange-400';
    if (['dribble_ok', 'through_ball', 'possession', 'crossing', 'long_pass', 'pressing', 'throw_in', 'free_kick', 'gk_distribution'].includes(type)) return 'text-blue-300/70';
    if (type === 'tackle') return 'text-cyan-400';
    if (type === 'halftime') return 'text-primary font-semibold';
    if (type === 'final_whistle') return 'text-primary font-bold';
    if (type === 'kickoff') return 'text-blue-400 font-medium';
    if (type === 'substitution') return 'text-sky-400';
    return 'text-muted-foreground';
  };

  const phaseLabel = () => {
    if (isFinished) return 'FIM';
    if (isHalftime) return 'INT';
    if (phase === 'first_half') return '1ºT';
    if (phase === 'second_half') return '2ºT';
    return '...';
  };

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
          {isHalftime && (
            <Badge variant="outline" className="text-[9px] text-yellow-400 border-yellow-400/30 animate-pulse">
              ⏸ INTERVALO
            </Badge>
          )}
        </div>
        <div className="text-[9px] text-muted-foreground truncate max-w-[150px]">
          🏟️ {stadiumName}
        </div>
      </div>

      {/* Scoreboard */}
      <Card className={`p-3 transition-all duration-500 ${goalFlash ? 'border-yellow-400/60 shadow-lg shadow-yellow-400/10' : ''}`}>
        <div className="flex items-center gap-3 justify-center">
          <p className="text-xs sm:text-sm font-bold truncate text-right flex-1">{homeTeam}</p>
          <div className={`text-3xl sm:text-4xl font-black font-mono px-4 py-1.5 rounded-lg min-w-[90px] text-center transition-all duration-300 ${goalFlash ? 'bg-yellow-400/20 scale-105' : 'bg-muted/30'}`}>
            {isFinished ? finalHomeGoals : homeGoals}
            <span className="text-muted-foreground text-base mx-1">x</span>
            {isFinished ? finalAwayGoals : awayGoals}
          </div>
          <p className="text-xs sm:text-sm font-bold truncate text-left flex-1">{awayTeam}</p>
        </div>
        {goalFlash && latestEvent?.isGoal && (
          <p className="text-center text-xs font-bold text-yellow-400 animate-fade-in mt-1">
            ⚽ GOL! {latestEvent.playerName || 'Jogador'}{latestEvent.assistName ? ` (🅰 ${latestEvent.assistName})` : ''}
          </p>
        )}
      </Card>

      {/* Commentary */}
      <Card className="p-3">
        <p className={`text-sm sm:text-base text-center font-semibold leading-snug ${eventColor(lastEventType)}`}>
          {commentary}
        </p>
      </Card>

      {/* Halftime banner */}
      {isHalftime && (
        <Card className="border-primary/30 bg-primary/5 p-3 text-center animate-fade-in">
          <p className="text-sm font-bold text-primary">⏸ INTERVALO</p>
          <p className="text-xs text-muted-foreground mt-0.5">Os jogadores estão no vestiário. O jogo recomeça em instantes.</p>
        </Card>
      )}

      {/* Server badge */}
      {!isFinished && (
        <div className="text-center">
          <Badge variant="outline" className="text-[8px] text-emerald-500 border-emerald-500/30">
            🖥️ Simulação no servidor — pode sair e voltar a qualquer momento
          </Badge>
        </div>
      )}

      {/* 2D Pitch — Phaser */}
      <PhaserMatchView
        currentMinute={currentMinute}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeGoals={isFinished ? finalHomeGoals : homeGoals}
        awayGoals={isFinished ? finalAwayGoals : awayGoals}
        visibleEvents={visibleEvents}
        isFinished={isFinished}
        goalFlash={goalFlash}
        formation={config.competition ? undefined : '4-4-2'}
      />

      {/* Tabs: Lances + Stats */}
      <Tabs defaultValue="events" className="space-y-1">
        <TabsList className="w-full h-8">
          <TabsTrigger value="events" className="flex-1 text-[10px] gap-1">⚡ Lances</TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 text-[10px] gap-1">
            <BarChart3 className="h-3 w-3" /> Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card className="p-1.5 max-h-[280px] overflow-y-auto">
            <div className="space-y-0.5">
              {visibleEvents.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Aguardando lances...</p>
              )}
              {[...visibleEvents].reverse().slice(0, 40).map((ev, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 text-xs px-2 py-1.5 rounded transition-colors ${
                    ev.isGoal ? 'bg-emerald-500/10 border border-emerald-500/20' :
                    ev.type === 'halftime' || ev.type === 'kickoff' || ev.type === 'final_whistle' ? 'bg-primary/8 border border-primary/15' :
                    ev.team === 'home' ? 'bg-primary/4' : ev.team === 'away' ? 'bg-destructive/4' : 'bg-muted/8'
                  }`}
                >
                  <Badge variant="outline" className="text-[8px] w-7 justify-center shrink-0 font-mono mt-0.5">
                    {ev.minute}'
                  </Badge>
                  <span className={eventColor(ev.type)}>{ev.description}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card className="p-3">
            <div className="space-y-1.5">
              {([
                ['Posse de Bola', stats.possession, '%'],
                ['Finalizações', stats.shots, ''],
                ['Chutes no Gol', stats.shotsOnTarget, ''],
                ['Escanteios', stats.corners, ''],
                ['Faltas', stats.fouls, ''],
                ['Cartões Am.', stats.yellowCards, ''],
                ['Passes', stats.passes, ''],
                ['Defesas', stats.saves, ''],
              ] as [string, [number, number], string][]).map(([label, vals, suffix]) => (
                <div key={label} className="flex items-center gap-2 text-[10px]">
                  <span className="w-8 text-right font-bold">{vals[0]}{suffix}</span>
                  <div className="flex-1 flex h-1.5 rounded overflow-hidden bg-muted/20">
                    <div className="bg-blue-500 transition-all" style={{ width: `${vals[0] + vals[1] > 0 ? (vals[0] / (vals[0] + vals[1])) * 100 : 50}%` }} />
                    <div className="bg-red-500 flex-1" />
                  </div>
                  <span className="w-8 text-left font-bold">{vals[1]}{suffix}</span>
                  <span className="text-muted-foreground w-16 shrink-0 truncate">{label}</span>
                </div>
              ))}
              <div className="flex justify-between text-[8px] text-muted-foreground pt-1 border-t border-border/20">
                <span className="text-blue-400">{homeTeam}</span>
                <span className="text-red-400">{awayTeam}</span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Finished state */}
      {isFinished && (
        <div className="space-y-2 pt-2 animate-fade-in">
          {/* Final stats */}
          <Card className="border-primary/20">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Resultado Final
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-3 gap-1 text-[10px]">
                <span className="text-right font-bold text-blue-400">{homeTeam}</span>
                <span className="text-center text-muted-foreground">Estatística</span>
                <span className="text-left font-bold text-red-400">{awayTeam}</span>
                {([
                  [stats.possession[0] + '%', 'Posse', stats.possession[1] + '%'],
                  [stats.shots[0], 'Finalizações', stats.shots[1]],
                  [stats.shotsOnTarget[0], 'No Gol', stats.shotsOnTarget[1]],
                  [stats.corners[0], 'Escanteios', stats.corners[1]],
                  [stats.fouls[0], 'Faltas', stats.fouls[1]],
                  [stats.passes[0], 'Passes', stats.passes[1]],
                ] as [number | string, string, number | string][]).map(([h, label, a]) => (
                  <div key={label} className="contents">
                    <span className="text-right">{h}</span>
                    <span className="text-center text-muted-foreground">{label}</span>
                    <span className="text-left">{a}</span>
                  </div>
                ))}
              </div>
              <p className="text-[8px] text-muted-foreground text-center mt-2 border-t border-border/20 pt-2">
                {visibleEvents.length} lances registrados · ⚽ {finalHomeGoals + finalAwayGoals} gols
              </p>
            </CardContent>
          </Card>

          {/* Replay dos gols */}
          {goalEvents.length > 0 && (
            <Card className="border-primary/30">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Film className="h-4 w-4 text-primary" /> Replay dos Gols ({goalEvents.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                {!showReplay ? (
                  <Button variant="outline" className="w-full gap-2" onClick={() => { setShowReplay(true); setReplayIndex(0); }}>
                    <Film className="h-4 w-4" /> Ver Replay dos Gols
                  </Button>
                ) : goalEvents[replayIndex] ? (
                  <div className="space-y-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center space-y-2 animate-fade-in">
                      <Badge variant="outline" className="font-mono text-xs">{goalEvents[replayIndex].minute}'</Badge>
                      <p className="text-2xl">⚽</p>
                      <p className="text-sm font-bold text-emerald-400">GOOOL!</p>
                      <p className="text-base font-bold">{goalEvents[replayIndex].playerName || 'Jogador'}</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {goalEvents[replayIndex].goalType && (
                          <Badge variant="secondary" className="text-[10px]">{goalEvents[replayIndex].goalType}</Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {goalEvents[replayIndex].team === 'home' ? homeTeam : awayTeam}
                        </Badge>
                      </div>
                      {goalEvents[replayIndex].assistName && (
                        <p className="text-xs text-muted-foreground">🅰️ Assistência: <span className="font-medium text-blue-400">{goalEvents[replayIndex].assistName}</span></p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 text-xs" disabled={replayIndex <= 0} onClick={() => setReplayIndex(i => i - 1)}>← Ant.</Button>
                      <Badge variant="secondary" className="flex items-center text-[10px] px-2">{replayIndex + 1}/{goalEvents.length}</Badge>
                      <Button variant="outline" size="sm" className="flex-1 text-xs" disabled={replayIndex >= goalEvents.length - 1} onClick={() => setReplayIndex(i => i + 1)}>Próx. →</Button>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowReplay(false)}>Fechar Replay</Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Post-game report */}
          {matchState.matchDbId && (
            <PostGameReportButton matchDbId={matchState.matchDbId} />
          )}

          <Button className="w-full gap-2" onClick={onExit}>
            <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}

function PostGameReportButton({ matchDbId }: { matchDbId: string }) {
  const [showReport, setShowReport] = useState(false);
  return (
    <>
      <Button variant="outline" className="w-full gap-2" onClick={() => setShowReport(true)}>
        📊 Ver Relatório Pós-Jogo
      </Button>
      {showReport && <PostGameReportModal matchDbId={matchDbId} onClose={() => setShowReport(false)} />}
    </>
  );
}
