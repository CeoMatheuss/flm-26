import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Player } from '@/types/game';
import { TacticsConfig } from '@/types/tactics';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Star, Film, LogOut, BarChart3, Loader2 } from 'lucide-react';
import { useMatchManager, SimEvent, MatchStats, EMPTY_STATS } from '@/match';

// ---- Types ----
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
        // Reconnect to existing match by ID
        if (state?.liveMatchDbId) {
          const ok = await loadFromDb(state.liveMatchDbId);
          if (!ok) { setError('Partida não encontrada.'); }
          setLoading(false);
          return;
        }

        // Start new match
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

          if (!result.success) {
            setError(result.error || 'Erro ao iniciar partida.');
          }
          setLoading(false);
          return;
        }

        // No state — check for active match
        const found = await findActiveMatch();
        if (!found) {
          navigate('/', { replace: true });
          return;
        }
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

  return (
    <MatchViewer
      matchState={matchState}
      onExit={() => navigate('/', { replace: true })}
    />
  );
}

// ---- 2D Pitch View (PURE VISUAL — no state modification) ----
function Pitch2DView({ currentMinute, homeTeam, awayTeam, homeGoals, awayGoals, visibleEvents, isFinished }: {
  currentMinute: number;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  visibleEvents: SimEvent[];
  isFinished: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const seed = useCallback((n: number) => {
    let x = Math.sin(n * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    const homeBase = [
      { x: 0.06, y: 0.5 },
      { x: 0.18, y: 0.15 }, { x: 0.18, y: 0.38 }, { x: 0.18, y: 0.62 }, { x: 0.18, y: 0.85 },
      { x: 0.38, y: 0.15 }, { x: 0.35, y: 0.38 }, { x: 0.35, y: 0.62 }, { x: 0.38, y: 0.85 },
      { x: 0.48, y: 0.35 }, { x: 0.48, y: 0.65 },
    ];
    const awayBase = homeBase.map(p => ({ x: 1 - p.x, y: p.y }));

    const draw = () => {
      const t = Date.now() * 0.001;
      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = '#1a6b3c';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      for (let i = 0; i < 10; i++) {
        if (i % 2 === 0) ctx.fillRect(i * (W / 10), 0, W / 10, H);
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(4, 4, W - 8, H - 8);
      ctx.beginPath(); ctx.moveTo(W / 2, 4); ctx.lineTo(W / 2, H - 4); ctx.stroke();
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 40, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeRect(4, H * 0.25, W * 0.15, H * 0.5);
      ctx.strokeRect(W - 4 - W * 0.15, H * 0.25, W * 0.15, H * 0.5);
      ctx.strokeRect(4, H * 0.38, W * 0.06, H * 0.24);
      ctx.strokeRect(W - 4 - W * 0.06, H * 0.38, W * 0.06, H * 0.24);

      ctx.beginPath(); ctx.arc(W / 2, H / 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();

      const lastEvent = visibleEvents.length > 0 ? visibleEvents[visibleEvents.length - 1] : null;
      let ballX = 0.5, ballY = 0.5;
      let attackShift = 0;

      if (lastEvent) {
        if (lastEvent.team === 'home') { attackShift = 0.1; ballX = 0.55 + seed(currentMinute * 3) * 0.3; }
        else if (lastEvent.team === 'away') { attackShift = -0.1; ballX = 0.15 + seed(currentMinute * 3) * 0.3; }
        if (lastEvent.isGoal && lastEvent.team === 'home') { ballX = 0.92; ballY = 0.5; }
        if (lastEvent.isGoal && lastEvent.team === 'away') { ballX = 0.08; ballY = 0.5; }
        if (lastEvent.type === 'halftime' || lastEvent.type === 'final_whistle') { ballX = 0.5; ballY = 0.5; attackShift = 0; }
        ballY = 0.3 + seed(currentMinute * 7 + 1) * 0.4;
      }

      const drawPlayers = (bases: { x: number; y: number }[], color: string, shift: number) => {
        bases.forEach((p, i) => {
          const jx = Math.sin(t * 1.3 + i * 2.1) * 0.015 + seed(currentMinute + i * 13) * 0.03 - 0.015;
          const jy = Math.cos(t * 1.1 + i * 1.7) * 0.015 + seed(currentMinute + i * 17) * 0.03 - 0.015;
          const px = (p.x + shift + jx) * W;
          const py = (p.y + jy) * H;
          ctx.beginPath(); ctx.ellipse(px + 1, py + 3, 5, 2, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
          ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fillStyle = color; ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2; ctx.stroke();
        });
      };

      drawPlayers(homeBase, '#3b82f6', attackShift);
      drawPlayers(awayBase, '#ef4444', -attackShift);

      const bx = ballX * W, by = ballY * H;
      ctx.beginPath(); ctx.ellipse(bx + 1, by + 2, 4, 1.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
      ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 0.8; ctx.stroke();

      if (!isFinished) { animRef.current = requestAnimationFrame(draw); }
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [currentMinute, visibleEvents, isFinished, seed]);

  return (
    <Card className="p-1.5 overflow-hidden">
      <div className="relative w-full aspect-[5/3]">
        <canvas ref={canvasRef} width={500} height={300} className="w-full h-full rounded-lg" />
        <div className="absolute top-1 left-2 right-2 flex justify-between items-center">
          <span className="text-[8px] font-bold text-blue-300 drop-shadow-md">{homeTeam}</span>
          <span className="text-[10px] font-mono font-black text-white drop-shadow-md">{homeGoals} x {awayGoals}</span>
          <span className="text-[8px] font-bold text-red-300 drop-shadow-md">{awayTeam}</span>
        </div>
        {isFinished && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <span className="text-white font-bold text-lg tracking-widest">FIM DE JOGO</span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ---- Match Viewer (pure viewer — reads from MatchManager state) ----
function MatchViewer({ matchState, onExit }: {
  matchState: import('@/match').MatchManagerState;
  onExit: () => void;
}) {
  const { phase, snapshot, config, stats, lockedResult } = matchState;
  const { currentMinute, visibleEvents, homeGoals, awayGoals, latestEvent } = snapshot;
  const { homeTeam, awayTeam, stadiumName, stadiumCapacity } = config;

  const isFinished = phase === 'finished';
  const commentary = latestEvent?.description || '⚽ A bola vai rolar!';
  const lastEventType = latestEvent?.type || '';

  // Goal flash effect
  const [goalFlash, setGoalFlash] = useState(false);
  const lastGoalCount = useRef(0);
  useEffect(() => {
    const total = homeGoals + awayGoals;
    if (total > lastGoalCount.current) {
      setGoalFlash(true);
      setTimeout(() => setGoalFlash(false), 1200);
    }
    lastGoalCount.current = total;
  }, [homeGoals, awayGoals]);

  // Replay state
  const [showReplay, setShowReplay] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);

  const eventColor = (type: string) => {
    if (type.includes('goal') || type === 'own_goal') return 'text-emerald-400 font-bold';
    if (['strong_shot', 'great_save', 'woodwork', 'corner_danger', 'rebound'].includes(type)) return 'text-yellow-400';
    if (type === 'yellow_card' || type === 'second_yellow') return 'text-yellow-300';
    if (type === 'red_card') return 'text-red-400';
    if (['midfield_foul', 'dangerous_foul', 'hard_foul', 'side_foul'].includes(type)) return 'text-orange-400';
    if (type === 'dribble_ok' || type === 'one_two') return 'text-blue-400';
    if (type === 'serious_injury') return 'text-red-500';
    if (type === 'final_whistle' || type === 'halftime') return 'text-primary font-bold';
    return 'text-muted-foreground';
  };

  const goalEvents = visibleEvents.filter(e => e.isGoal);

  const finalHomeGoals = lockedResult?.homeGoals ?? homeGoals;
  const finalAwayGoals = lockedResult?.awayGoals ?? awayGoals;

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 max-w-2xl mx-auto space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1" onClick={onExit}>
            <LogOut className="h-3 w-3" /> Sair
          </Button>
          <Badge variant={phase === 'halftime' ? 'secondary' : isFinished ? 'outline' : 'default'} className="text-xs font-mono px-2">
            {currentMinute}' {phase === 'first_half' ? '1ºT' : phase === 'halftime' ? 'INT' : phase === 'second_half' ? '2ºT' : 'FIM'}
          </Badge>
        </div>
        <div className="text-[9px] text-muted-foreground">
          🏟️ {stadiumName} ({stadiumCapacity?.toLocaleString()})
        </div>
      </div>

      {/* Scoreboard */}
      <Card className="p-3">
        <div className="flex items-center gap-3 justify-center">
          <p className="text-xs sm:text-sm font-bold truncate text-right flex-1">{homeTeam}</p>
          <div className={`text-3xl sm:text-4xl font-black font-mono px-4 py-1.5 rounded-lg min-w-[90px] text-center transition-colors ${goalFlash ? 'bg-yellow-400/20' : 'bg-muted/30'}`}>
            {isFinished ? finalHomeGoals : homeGoals} <span className="text-muted-foreground text-base">x</span> {isFinished ? finalAwayGoals : awayGoals}
          </div>
          <p className="text-xs sm:text-sm font-bold truncate text-left flex-1">{awayTeam}</p>
        </div>
      </Card>

      {/* Commentary */}
      <Card className="p-3">
        <p className={`text-sm sm:text-base text-center font-semibold ${eventColor(lastEventType)}`}>{commentary}</p>
      </Card>

      {/* Server-side badge */}
      {!isFinished && (
        <div className="text-center">
          <Badge variant="outline" className="text-[8px] text-emerald-500 border-emerald-500/30">
            🖥️ Simulação rodando no servidor — pode sair e voltar a qualquer momento
          </Badge>
        </div>
      )}

      {/* 2D Pitch View — PURE VISUAL, no state modification */}
      <Pitch2DView
        currentMinute={currentMinute}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeGoals={isFinished ? finalHomeGoals : homeGoals}
        awayGoals={isFinished ? finalAwayGoals : awayGoals}
        visibleEvents={visibleEvents}
        isFinished={isFinished}
      />

      {/* Bottom tabs */}
      <Tabs defaultValue="events" className="space-y-1">
        <TabsList className="w-full h-8">
          <TabsTrigger value="events" className="flex-1 text-[10px] gap-1">⚡ Lances</TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 text-[10px] gap-1"><BarChart3 className="h-3 w-3" /> Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card className="p-1.5 max-h-[300px] overflow-y-auto">
            <div className="space-y-1">
              {visibleEvents.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Aguardando lances...</p>}
              {[...visibleEvents].reverse().slice(0, 20).map((ev, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs sm:text-sm px-2 py-1 rounded ${ev.isGoal ? 'bg-emerald-500/10 border border-emerald-500/20' : ev.team === 'home' ? 'bg-primary/5' : ev.team === 'away' ? 'bg-destructive/5' : 'bg-muted/10'}`}>
                  <Badge variant="outline" className="text-[8px] w-7 justify-center shrink-0 font-mono">{ev.minute}'</Badge>
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
                ['Cartões Amarelos', stats.yellowCards, ''],
                ['Cartões Vermelhos', stats.redCards, ''],
                ['Passes', stats.passes, ''],
                ['Desarmes', stats.tackles, ''],
                ['Defesas', stats.saves, ''],
                ['Impedimentos', stats.offsides, ''],
              ] as [string, [number, number], string][]).map(([label, vals, suffix]) => (
                <div key={label} className="flex items-center gap-2 text-[10px]">
                  <span className="w-8 text-right font-bold">{vals[0]}{suffix}</span>
                  <div className="flex-1 flex h-1.5 rounded overflow-hidden bg-muted/20">
                    <div className="bg-blue-500 transition-all" style={{ width: `${vals[0] + vals[1] > 0 ? (vals[0] / (vals[0] + vals[1])) * 100 : 50}%` }} />
                    <div className="bg-red-500 transition-all" style={{ width: `${vals[0] + vals[1] > 0 ? (vals[1] / (vals[0] + vals[1])) * 100 : 50}%` }} />
                  </div>
                  <span className="w-8 text-left font-bold">{vals[1]}{suffix}</span>
                </div>
              ))}
              <div className="flex justify-between text-[8px] text-muted-foreground pt-1">
                <span className="text-blue-400">{homeTeam}</span>
                <span className="text-red-400">{awayTeam}</span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Finished state */}
      {isFinished && (
        <div className="space-y-2 pt-2">
          <Card className="border-primary/20">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Estatísticas Finais
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-3 gap-1 text-[9px]">
                <span className="text-right font-bold text-blue-400">{homeTeam}</span>
                <span className="text-center text-muted-foreground">Estatística</span>
                <span className="text-left font-bold text-red-400">{awayTeam}</span>
                {([
                  [stats.possession[0] + '%', 'Posse', stats.possession[1] + '%'],
                  [stats.shots[0], 'Finalizações', stats.shots[1]],
                  [stats.shotsOnTarget[0], 'No Gol', stats.shotsOnTarget[1]],
                  [stats.corners[0], 'Escanteios', stats.corners[1]],
                  [stats.fouls[0], 'Faltas', stats.fouls[1]],
                ] as [number | string, string, number | string][]).map(([h, label, a]) => (
                  <div key={label} className="contents">
                    <span className="text-right">{h}</span>
                    <span className="text-center text-muted-foreground">{label}</span>
                    <span className="text-left">{a}</span>
                  </div>
                ))}
              </div>
              <p className="text-[8px] text-muted-foreground text-center mt-2">
                Total de lances: {visibleEvents.length} | ⚽ Gols: {finalHomeGoals + finalAwayGoals}
              </p>
            </CardContent>
          </Card>

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
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center space-y-2 animate-fade-in">
                      <Badge variant="outline" className="font-mono text-xs">{goalEvents[replayIndex].minute}'</Badge>
                      <p className="text-lg font-bold text-emerald-400">⚽ GOOOOL!</p>
                      <p className="text-sm font-semibold">{goalEvents[replayIndex].playerName || 'Jogador'}</p>
                      {goalEvents[replayIndex].goalType && <Badge variant="secondary" className="text-[10px]">{goalEvents[replayIndex].goalType}</Badge>}
                      {goalEvents[replayIndex].assistName && (
                        <p className="text-xs text-muted-foreground">🅰️ Assistência: <span className="font-medium text-blue-400">{goalEvents[replayIndex].assistName}</span></p>
                      )}
                      <p className="text-xs text-muted-foreground italic">{goalEvents[replayIndex].description}</p>
                      <Badge className="text-sm font-mono px-3">
                        {goalEvents[replayIndex].team === 'home' ? homeTeam : awayTeam}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 text-xs" disabled={replayIndex <= 0} onClick={() => setReplayIndex(i => i - 1)}>← Anterior</Button>
                      <Badge variant="secondary" className="flex items-center text-[10px] px-2">{replayIndex + 1}/{goalEvents.length}</Badge>
                      <Button variant="outline" size="sm" className="flex-1 text-xs" disabled={replayIndex >= goalEvents.length - 1} onClick={() => setReplayIndex(i => i + 1)}>Próximo →</Button>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowReplay(false)}>Fechar Replay</Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          <Button className="w-full gap-2" onClick={onExit}>
            <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
