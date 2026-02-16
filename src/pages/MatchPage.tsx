import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Player } from '@/types/game';
import { TacticsConfig, Formation, PlayStyle, Pressing, Tempo, Marking, PassingStyle, DefenseLine, Width } from '@/types/tactics';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Star, Film, LogOut, BarChart3, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// ---- Types ----
interface SimEvent {
  minute: number;
  type: string;
  description: string;
  team: 'home' | 'away' | 'neutral';
  playerName?: string;
  assistName?: string;
  goalType?: string;
  isGoal?: boolean;
}

interface MatchStats {
  possession: [number, number];
  shots: [number, number];
  shotsOnTarget: [number, number];
  corners: [number, number];
  fouls: [number, number];
  yellowCards: [number, number];
  redCards: [number, number];
  passes: [number, number];
  tackles: [number, number];
  saves: [number, number];
  offsides: [number, number];
}

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
  // If reconnecting to existing match:
  liveMatchDbId?: string;
}

// Constants: 12 min real time = 90 game minutes
const MATCH_DURATION_S = 720;
const GAME_MINUTES = 95; // ~95 including added time

export default function MatchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as MatchPageState | null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchDbId, setMatchDbId] = useState<string | null>(state?.liveMatchDbId || null);
  const [matchData, setMatchData] = useState<{
    events: SimEvent[];
    homeGoals: number;
    awayGoals: number;
    stats: MatchStats;
    playerRatings: Record<string, number>;
    startedAt: string;
    durationSeconds: number;
    homeTeam: string;
    awayTeam: string;
    stadiumName: string;
    stadiumCapacity: number;
    isHome: boolean;
    competition: string;
    status: string;
  } | null>(null);

  // Start match on server or reconnect
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);

      try {
        // If reconnecting to an existing match
        if (matchDbId) {
          const { data: existing, error: fetchErr } = await supabase
            .from('live_matches')
            .select('*')
            .eq('id', matchDbId)
            .maybeSingle();
          
          if (fetchErr || !existing) {
            setError('Partida não encontrada.');
            setLoading(false);
            return;
          }

          setMatchData({
            events: (existing.events as any) || [],
            homeGoals: existing.home_goals,
            awayGoals: existing.away_goals,
            stats: (existing.stats as any) || { possession: [50,50], shots: [0,0], shotsOnTarget: [0,0], corners: [0,0], fouls: [0,0], yellowCards: [0,0], redCards: [0,0], passes: [0,0], tackles: [0,0], saves: [0,0], offsides: [0,0] },
            playerRatings: (existing.player_ratings as any) || {},
            startedAt: existing.started_at,
            durationSeconds: existing.duration_seconds,
            homeTeam: existing.home_team,
            awayTeam: existing.away_team,
            stadiumName: existing.stadium_name,
            stadiumCapacity: existing.stadium_capacity,
            isHome: existing.is_home,
            competition: existing.competition || 'Amistoso',
            status: existing.status,
          });
          setLoading(false);
          return;
        }

        if (!state) {
          // Check if there's an active match in DB
          const { data: activeMatch } = await supabase
            .from('live_matches')
            .select('*')
            .eq('status', 'live')
            .maybeSingle();

          if (activeMatch) {
            setMatchDbId(activeMatch.id);
            setMatchData({
              events: (activeMatch.events as any) || [],
              homeGoals: activeMatch.home_goals,
              awayGoals: activeMatch.away_goals,
              stats: (activeMatch.stats as any) || { possession: [50,50], shots: [0,0], shotsOnTarget: [0,0], corners: [0,0], fouls: [0,0], yellowCards: [0,0], redCards: [0,0], passes: [0,0], tackles: [0,0], saves: [0,0], offsides: [0,0] },
              playerRatings: (activeMatch.player_ratings as any) || {},
              startedAt: activeMatch.started_at,
              durationSeconds: activeMatch.duration_seconds,
              homeTeam: activeMatch.home_team,
              awayTeam: activeMatch.away_team,
              stadiumName: activeMatch.stadium_name,
              stadiumCapacity: activeMatch.stadium_capacity,
              isHome: activeMatch.is_home,
              competition: activeMatch.competition || 'Amistoso',
              status: activeMatch.status,
            });
            setLoading(false);
            return;
          }

          navigate('/', { replace: true });
          return;
        }

        // Start new match on server
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          setError('Você precisa estar logado.');
          setLoading(false);
          return;
        }

        const resp = await supabase.functions.invoke('start-match', {
          body: {
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
          },
        });

        if (resp.error) {
          setError('Erro ao iniciar partida no servidor.');
          setLoading(false);
          return;
        }

        const result = resp.data;
        if (!result.success) {
          // Match already exists
          if (result.matchDbId) {
            setMatchDbId(result.matchDbId);
            // Re-trigger to load existing
            return;
          }
          setError(result.error || 'Erro ao iniciar partida.');
          setLoading(false);
          return;
        }

        setMatchDbId(result.matchDbId);
        // Fetch full match data
        const { data: newMatch } = await supabase
          .from('live_matches')
          .select('*')
          .eq('id', result.matchDbId)
          .single();

        if (newMatch) {
          setMatchData({
            events: (newMatch.events as any) || [],
            homeGoals: newMatch.home_goals,
            awayGoals: newMatch.away_goals,
            stats: (newMatch.stats as any) || { possession: [50,50], shots: [0,0], shotsOnTarget: [0,0], corners: [0,0], fouls: [0,0], yellowCards: [0,0], redCards: [0,0], passes: [0,0], tackles: [0,0], saves: [0,0], offsides: [0,0] },
            playerRatings: (newMatch.player_ratings as any) || {},
            startedAt: newMatch.started_at,
            durationSeconds: newMatch.duration_seconds,
            homeTeam: newMatch.home_team,
            awayTeam: newMatch.away_team,
            stadiumName: newMatch.stadium_name,
            stadiumCapacity: newMatch.stadium_capacity,
            isHome: newMatch.is_home,
            competition: newMatch.competition || 'Amistoso',
            status: newMatch.status,
          });
        }
        setLoading(false);
      } catch (err) {
        setError('Erro inesperado ao carregar partida.');
        setLoading(false);
      }
    };

    init();
  }, [matchDbId, state, navigate]);

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

  if (!matchData) return null;

  return (
    <MatchViewer
      matchData={matchData}
      matchDbId={matchDbId!}
      onExit={() => navigate('/', { replace: true })}
    />
  );
}

// ---- Match Viewer (pure viewer, no simulation logic) ----
function MatchViewer({ matchData, matchDbId, onExit }: {
  matchData: {
    events: SimEvent[];
    homeGoals: number;
    awayGoals: number;
    stats: MatchStats;
    playerRatings: Record<string, number>;
    startedAt: string;
    durationSeconds: number;
    homeTeam: string;
    awayTeam: string;
    stadiumName: string;
    stadiumCapacity: number;
    isHome: boolean;
    competition: string;
    status: string;
  };
  matchDbId: string;
  onExit: () => void;
}) {
  const { events: allEvents, homeGoals: finalHomeGoals, awayGoals: finalAwayGoals, stats, playerRatings, startedAt, durationSeconds, homeTeam, awayTeam, stadiumName, stadiumCapacity, status: initialStatus } = matchData;

  const startTime = useMemo(() => new Date(startedAt).getTime(), [startedAt]);
  const endTime = useMemo(() => startTime + durationSeconds * 1000, [startTime, durationSeconds]);

  // Current state based on elapsed time
  const [currentMinute, setCurrentMinute] = useState(0);
  const [visibleEvents, setVisibleEvents] = useState<SimEvent[]>([]);
  const [currentHomeGoals, setCurrentHomeGoals] = useState(0);
  const [currentAwayGoals, setCurrentAwayGoals] = useState(0);
  const [isFinished, setIsFinished] = useState(initialStatus === 'finished');
  const [commentary, setCommentary] = useState('⚽ A bola vai rolar!');
  const [lastEventType, setLastEventType] = useState('');
  const [goalFlash, setGoalFlash] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);

  // Determine the max game minute from events
  const maxGameMinute = useMemo(() => {
    if (allEvents.length === 0) return 90;
    return Math.max(...allEvents.map(e => e.minute));
  }, [allEvents]);

  // Tick: reveal events based on elapsed real time
  useEffect(() => {
    if (isFinished) {
      // Show all events
      setVisibleEvents(allEvents);
      setCurrentMinute(maxGameMinute);
      setCurrentHomeGoals(finalHomeGoals);
      setCurrentAwayGoals(finalAwayGoals);
      if (allEvents.length > 0) {
        setCommentary(allEvents[allEvents.length - 1].description);
        setLastEventType(allEvents[allEvents.length - 1].type);
      }
      return;
    }

    const tick = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / (durationSeconds * 1000));
      const gameMin = Math.floor(progress * maxGameMinute);
      
      setCurrentMinute(gameMin);

      // Reveal events up to current game minute
      const visible = allEvents.filter(e => e.minute <= gameMin);
      setVisibleEvents(visible);

      // Count goals up to current minute
      let hg = 0, ag = 0;
      for (const ev of visible) {
        if (ev.isGoal) {
          if (ev.team === 'home') hg++;
          else if (ev.team === 'away') ag++;
        }
      }
      setCurrentHomeGoals(hg);
      setCurrentAwayGoals(ag);

      // Update commentary to latest event
      if (visible.length > 0) {
        const last = visible[visible.length - 1];
        setCommentary(last.description);
        setLastEventType(last.type);
      }

      // Check if match is done
      if (now >= endTime) {
        setIsFinished(true);
        setVisibleEvents(allEvents);
        setCurrentMinute(maxGameMinute);
        setCurrentHomeGoals(finalHomeGoals);
        setCurrentAwayGoals(finalAwayGoals);
        // Mark as finished in DB
        supabase
          .from('live_matches')
          .update({ status: 'finished', current_minute: maxGameMinute })
          .eq('id', matchDbId)
          .then(() => {});
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [allEvents, startTime, endTime, durationSeconds, maxGameMinute, finalHomeGoals, finalAwayGoals, isFinished, matchDbId]);

  // Goal flash effect
  const lastGoalCount = useRef(0);
  useEffect(() => {
    const total = currentHomeGoals + currentAwayGoals;
    if (total > lastGoalCount.current) {
      setGoalFlash(true);
      setTimeout(() => setGoalFlash(false), 1200);
    }
    lastGoalCount.current = total;
  }, [currentHomeGoals, currentAwayGoals]);

  // Time display
  const realTimeLeft = useMemo(() => {
    if (isFinished) return 0;
    return Math.max(0, endTime - Date.now());
  }, [endTime, isFinished, currentMinute]);

  const formatTimeDisplay = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const phase = isFinished ? 'finished' : currentMinute <= 45 ? 'first_half' : currentMinute <= 50 ? 'halftime' : 'second_half';

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

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 max-w-2xl mx-auto space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1" onClick={onExit}>
            <LogOut className="h-3 w-3" /> Sair
          </Button>
          <Badge variant={phase === 'halftime' ? 'secondary' : phase === 'finished' ? 'outline' : 'default'} className="text-xs font-mono px-2">
            {currentMinute}' {phase === 'first_half' ? '1ºT' : phase === 'halftime' ? 'INT' : phase === 'second_half' ? '2ºT' : 'FIM'}
          </Badge>
          {!isFinished && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {formatTimeDisplay(realTimeLeft)}
            </span>
          )}
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
            {currentHomeGoals} <span className="text-muted-foreground text-base">x</span> {currentAwayGoals}
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

      {/* Bottom tabs */}
      <Tabs defaultValue="events" className="space-y-1">
        <TabsList className="w-full h-8">
          <TabsTrigger value="events" className="flex-1 text-[10px] gap-1">⚡ Lances</TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 text-[10px] gap-1"><BarChart3 className="h-3 w-3" /> Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card className="p-1.5 max-h-[250px] overflow-y-auto">
            <div className="space-y-0.5">
              {visibleEvents.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-3">Aguardando lances...</p>}
              {[...visibleEvents].reverse().slice(0, 20).map((ev, i) => (
                <div key={i} className={`flex items-center gap-1.5 text-[9px] sm:text-[10px] px-1 py-0.5 rounded ${ev.isGoal ? 'bg-emerald-500/10 border border-emerald-500/20' : ev.team === 'home' ? 'bg-primary/5' : ev.team === 'away' ? 'bg-destructive/5' : 'bg-muted/10'}`}>
                  <Badge variant="outline" className="text-[6px] w-6 justify-center shrink-0 font-mono">{ev.minute}'</Badge>
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
                Total de lances: {allEvents.length} | ⚽ Gols: {finalHomeGoals + finalAwayGoals}
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

          <Button className="w-full gap-2" onClick={() => {
            onExit();
          }}>
            <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
