/**
 * ReplayPage — Watch a tournament match replay with 2D simulation and narration.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BarChart3, FastForward, LogOut } from 'lucide-react';
import { useMatchReplay } from '@/match/useMatchReplay';
import { SimEvent, MatchStats } from '@/match';
import { HighlightMiniCanvas, isHighlightEvent, getHighlightType } from '@/components/game/HighlightMiniCanvas';
import { ShieldCrest } from '@/components/game/ShieldCrest';
import { useMatchShields } from '@/hooks/useMatchShields';

interface ReplayPageState {
  matchData: {
    events: SimEvent[];
    stats: MatchStats;
    goal_scorers: any[];
    player_ratings: Record<string, number>;
    home_players: any[];
  };
  homeTeamName: string;
  awayTeamName: string;
  homeGoals: number;
  awayGoals: number;
}

export default function ReplayPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locState = location.state as ReplayPageState | null;
  const { state, startReplay, skipToEnd, destroy } = useMatchReplay();

  useEffect(() => {
    if (!locState) { navigate('/', { replace: true }); return; }
    startReplay({
      homeTeam: locState.homeTeamName,
      awayTeam: locState.awayTeamName,
      homeGoals: locState.homeGoals ?? 0,
      awayGoals: locState.awayGoals ?? 0,
      events: locState.matchData?.events || [],
      stats: locState.matchData?.stats as MatchStats || undefined as any,
    });
    return () => destroy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExit = () => navigate('/', { replace: true });

  const { phase, currentMinute, progress, homeTeam, awayTeam, homeGoals, awayGoals, visibleEvents, latestEvent, stats } = state;
  const isFinished = phase === 'finished';
  const isHalftime = phase === 'halftime';

  // Goal flash
  const [goalFlash, setGoalFlash] = useState(false);
  const lastGoalCount = useRef(0);
  useEffect(() => {
    const total = homeGoals + awayGoals;
    if (total > lastGoalCount.current) { setGoalFlash(true); setTimeout(() => setGoalFlash(false), 2000); }
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

  const eventsRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (eventsRef.current) eventsRef.current.scrollTop = 0; }, [visibleEvents.length]);

  if (phase === 'idle' || phase === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">📺 Carregando replay...</p>
      </div>
    );
  }

  const phaseLabel = () => {
    if (isFinished) return 'FIM';
    if (isHalftime) return 'INT';
    if (currentMinute <= 45) return '1ºT';
    return '2ºT';
  };

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 max-w-2xl mx-auto space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1" onClick={handleExit}>
            <LogOut className="h-3 w-3" /> Sair
          </Button>
          <Badge variant="secondary" className="text-[9px] px-2">📺 REPLAY</Badge>
          <Badge variant={isHalftime ? 'secondary' : isFinished ? 'outline' : 'default'} className="text-xs font-mono px-2">
            {currentMinute}' {phaseLabel()}
          </Badge>
        </div>
        {!isFinished && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] gap-1" onClick={skipToEnd}>
            <FastForward className="h-3 w-3" /> Pular
          </Button>
        )}
      </div>

      {/* Scoreboard */}
      <Card className={`p-3 transition-all duration-500 ${goalFlash ? 'ring-2 ring-yellow-400/50 shadow-lg shadow-yellow-400/10' : ''}`}>
        <div className="flex items-center gap-3 justify-center">
          <p className="text-xs sm:text-sm font-bold truncate text-right flex-1">{homeTeam}</p>
          <div className={`text-3xl sm:text-4xl font-black font-mono px-4 py-1.5 rounded-lg min-w-[90px] text-center transition-all duration-300 ${goalFlash ? 'bg-yellow-400/20 scale-105' : 'bg-muted/30'}`}>
            {homeGoals}<span className="text-muted-foreground text-base mx-1">×</span>{awayGoals}
          </div>
          <p className="text-xs sm:text-sm font-bold truncate text-left flex-1">{awayTeam}</p>
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

      {/* 2D Canvas */}
      {!isFinished && (
        <Card className={`p-2 transition-all duration-300 ${activeHighlight ? 'border-yellow-400/30 bg-yellow-400/5' : 'border-border/10 bg-muted/5'}`}>
          {activeHighlight && (
            <div className="text-center mb-1">
              <Badge variant="outline" className="text-[9px] font-mono">{activeHighlight.minute}' — {getHighlightLabel(activeHighlight.type)}</Badge>
            </div>
          )}
          <HighlightMiniCanvas
            type={activeHighlight ? getHighlightType(activeHighlight.type) : 'idle'}
            team={activeHighlight ? (activeHighlight.team === 'neutral' ? 'home' : activeHighlight.team) : 'home'}
            playerName={activeHighlight?.playerName}
            currentMinute={currentMinute}
            onComplete={activeHighlight ? () => setTimeout(() => setActiveHighlight(null), 1500) : undefined}
          />
          {activeHighlight && (
            <p className="text-[10px] text-center text-muted-foreground mt-1">{activeHighlight.description}</p>
          )}
        </Card>
      )}

      {/* Latest event commentary — compact */}
      {latestEvent && (
        <Card className="py-1.5 px-2.5">
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="text-[9px] font-mono shrink-0 mt-0.5">{latestEvent.minute}'</Badge>
            <p className={`text-xs font-semibold leading-snug ${getEventColor(latestEvent.type)}`}>
              {getEventIcon(latestEvent.type)} {latestEvent.description}
            </p>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="events" className="space-y-1">
        <TabsList className="w-full h-8">
          <TabsTrigger value="events" className="flex-1 text-[10px] gap-1">📝 Narração</TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 text-[10px] gap-1"><BarChart3 className="h-3 w-3" /> Estatísticas</TabsTrigger>
        </TabsList>
        <TabsContent value="events">
          <Card className="p-1.5">
            <div ref={eventsRef} className="max-h-[260px] sm:max-h-[300px] overflow-y-auto space-y-0.5">
              {visibleEvents.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">⏳ Aguardando início...</p>
              )}
              {[...visibleEvents].reverse().slice(0, 50).map((ev, i) => (
                <div key={`${ev.minute}-${i}`} className={`flex items-start gap-2 text-xs px-2 py-1.5 rounded transition-colors ${getEventBg(ev)}`}>
                  <Badge variant="outline" className="text-[8px] w-7 justify-center shrink-0 font-mono mt-0.5">{ev.minute}'</Badge>
                  <span className="text-[10px] shrink-0">{getEventIcon(ev.type)}</span>
                  <span className={`text-[11px] ${getEventColor(ev.type)} leading-snug`}>{ev.description}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="stats">
          <Card className="p-3">
            <ReplayStatsView stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Finished */}
      {isFinished && (
        <div className="space-y-2 pt-2 animate-fade-in">
          <Card className="border-primary/20">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Resultado Final do Replay</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <ReplayStatsView stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} />
              <p className="text-[8px] text-muted-foreground text-center mt-2 border-t border-border/20 pt-2">
                {visibleEvents.length} lances · ⚽ {homeGoals + awayGoals} gols
              </p>
            </CardContent>
          </Card>
          <Button className="w-full gap-2" onClick={handleExit}>
            <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}

function ReplayStatsView({ stats, homeTeam, awayTeam }: { stats: MatchStats; homeTeam: string; awayTeam: string }) {
  const rows: [string, [number, number], string][] = [
    ['Posse de Bola', stats.possession, '%'],
    ['Finalizações', stats.shots, ''],
    ['Chutes no Gol', stats.shotsOnTarget, ''],
    ['Escanteios', stats.corners, ''],
    ['Faltas', stats.fouls, ''],
    ['Cartões Am.', stats.yellowCards, ''],
    ['Passes', stats.passes, ''],
    ['Desarmes', stats.tackles, ''],
    ['Defesas', stats.saves, ''],
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

/* ── HELPERS (duplicated from MatchPage for independence) ─── */
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
  return 'text-muted-foreground';
}

function getEventBg(ev: SimEvent): string {
  if (ev.isGoal) return 'bg-emerald-500/10 border border-emerald-500/20';
  if (['halftime', 'kickoff', 'final_whistle'].includes(ev.type)) return 'bg-primary/5 border border-primary/10';
  if (['yellow_card', 'red_card'].includes(ev.type)) return 'bg-yellow-500/5 border border-yellow-500/10';
  if (isHighlightEvent(ev.type)) return 'bg-yellow-400/5';
  return 'bg-muted/5';
}

function getHighlightLabel(type: string): string {
  if (['foot_goal', 'header_goal'].includes(type)) return '⚽ GOL!';
  if (type === 'penalty_goal') return '⚽ GOL DE PÊNALTI!';
  if (type === 'penalty_miss') return '❌ PÊNALTI PERDIDO!';
  if (type === 'great_save') return '🧤 GRANDE DEFESA!';
  if (type === 'woodwork') return '🥅 BOLA NA TRAVE!';
  if (type === 'corner_danger') return '🏳️ ESCANTEIO PERIGOSO!';
  return '🎬 LANCE IMPORTANTE';
}
