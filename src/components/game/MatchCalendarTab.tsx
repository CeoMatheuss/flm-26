import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar, Trophy, ArrowLeft, Star, BarChart3, Play,
  Home, Plane, Clock, User, Loader2, ChevronRight
} from 'lucide-react';

interface MatchHistoryItem {
  id: string;
  competition: string;
  match_type: string;
  home_team: string;
  away_team: string;
  home_goals: number;
  away_goals: number;
  is_home: boolean;
  stadium_name: string;
  played_at: string;
  events: any[];
  stats: any;
  player_ratings: any;
  home_players: any[];
  goal_scorers: any[];
  man_of_the_match: string | null;
}

interface Props {
  userId: string;
  clubName: string;
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch { return iso; }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function eventColor(type: string) {
  if (type === 'foot_goal' || type === 'header_goal' || type === 'penalty_goal') return 'text-emerald-400 font-bold';
  if (type === 'great_save' || type === 'woodwork') return 'text-yellow-400';
  if (type === 'yellow_card') return 'text-yellow-300';
  if (type === 'red_card') return 'text-red-400';
  if (type === 'halftime') return 'text-primary font-semibold';
  if (type === 'final_whistle') return 'text-primary font-bold';
  if (type === 'kickoff') return 'text-blue-400';
  if (type === 'substitution') return 'text-sky-400';
  if (type === 'corner_danger') return 'text-orange-400';
  if (type === 'offside_trap') return 'text-muted-foreground';
  return 'text-muted-foreground';
}

// ── MODAL: Relatório + Replay de uma partida ─────────────────────
function MatchDetailModal({ match, clubName, onClose }: {
  match: MatchHistoryItem;
  clubName: string;
  onClose: () => void;
}) {
  const isHome = match.is_home;
  const myGoals = isHome ? match.home_goals : match.away_goals;
  const oppGoals = isHome ? match.away_goals : match.home_goals;
  const oppName = isHome ? match.away_team : match.home_team;
  const isWin = myGoals > oppGoals;
  const isDraw = myGoals === oppGoals;

  const stats = match.stats || {};
  const ratings = match.player_ratings || {};
  const players = match.home_players || [];
  const goalScorers = match.goal_scorers || [];
  const events: any[] = match.events || [];

  const resultColor = isWin ? 'text-emerald-400' : isDraw ? 'text-yellow-400' : 'text-destructive';
  const resultLabel = isWin ? 'VITÓRIA' : isDraw ? 'EMPATE' : 'DERROTA';
  const cardBorder = isWin ? 'border-emerald-500/30 bg-emerald-500/5' : isDraw ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-destructive/30 bg-destructive/5';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 px-2 gap-1">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-xs">Voltar</span>
        </Button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{match.competition} • {formatDate(match.played_at)}</p>
        </div>
      </div>

      {/* Score card */}
      <Card className={`border-2 ${cardBorder}`}>
        <CardContent className="p-4 text-center space-y-2">
          <Badge variant="outline" className={`text-xs ${resultColor}`}>{resultLabel}</Badge>
          <div className="flex items-center justify-center gap-4">
            <div className="text-right flex-1">
              <p className="text-sm font-bold truncate">{match.home_team}</p>
              <p className="text-[10px] text-muted-foreground">{isHome ? '🏠 Casa' : '✈️ Fora'}</p>
            </div>
            <div className="text-4xl font-black font-mono px-3">
              {match.home_goals}<span className="text-muted-foreground text-xl mx-1">x</span>{match.away_goals}
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-bold truncate">{match.away_team}</p>
            </div>
          </div>
          {match.man_of_the_match && (
            <div className="flex items-center justify-center gap-1 mt-1">
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] text-yellow-400">Melhor em campo: {match.man_of_the_match}</span>
            </div>
          )}
          {goalScorers.length > 0 && (
            <div className="text-[10px] text-muted-foreground">
              ⚽ {goalScorers.map((g: any) => `${g.name} ${g.minute}'`).join(' • ')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="replay">
        <TabsList className="w-full">
          <TabsTrigger value="replay" className="flex-1 text-xs gap-1"><Play className="h-3 w-3" />Replay</TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 text-xs gap-1"><BarChart3 className="h-3 w-3" />Stats</TabsTrigger>
          <TabsTrigger value="ratings" className="flex-1 text-xs gap-1"><Star className="h-3 w-3" />Notas</TabsTrigger>
        </TabsList>

        {/* REPLAY — lista completa de lances em texto */}
        <TabsContent value="replay">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[360px]">
                <div className="p-3 space-y-1">
                  {events.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">Sem lances registrados</p>
                  )}
                  {events.map((ev: any, i: number) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs ${
                        ev.isGoal ? 'bg-emerald-500/15 border border-emerald-500/30' :
                        ev.type === 'halftime' || ev.type === 'final_whistle' || ev.type === 'kickoff' ? 'bg-primary/10 border border-primary/20' :
                        ev.type === 'yellow_card' ? 'bg-yellow-500/10' :
                        ev.type === 'red_card' ? 'bg-destructive/10' :
                        ev.team === 'home' ? 'bg-blue-500/5' : ev.team === 'away' ? 'bg-red-500/5' : 'bg-muted/10'
                      }`}
                    >
                      <Badge variant="outline" className="text-[8px] font-mono w-8 justify-center shrink-0 mt-0.5">
                        {ev.minute}'
                      </Badge>
                      <span className={eventColor(ev.type)}>{ev.description}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ESTATÍSTICAS */}
        <TabsContent value="stats">
          <Card>
            <CardContent className="p-3 space-y-2">
              {([
                ['Posse de Bola', (stats.possession?.[0] ?? 50), (stats.possession?.[1] ?? 50), '%'],
                ['Finalizações', stats.shots?.[0] ?? 0, stats.shots?.[1] ?? 0, ''],
                ['No Alvo', stats.shotsOnTarget?.[0] ?? 0, stats.shotsOnTarget?.[1] ?? 0, ''],
                ['Escanteios', stats.corners?.[0] ?? 0, stats.corners?.[1] ?? 0, ''],
                ['Passes', stats.passes?.[0] ?? 0, stats.passes?.[1] ?? 0, ''],
                ['Faltas', stats.fouls?.[0] ?? 0, stats.fouls?.[1] ?? 0, ''],
                ['Cartões Am.', stats.yellowCards?.[0] ?? 0, stats.yellowCards?.[1] ?? 0, ''],
                ['Defesas', stats.saves?.[0] ?? 0, stats.saves?.[1] ?? 0, ''],
              ] as [string, number, number, string][]).map(([label, h, a, suf]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono w-7 text-right font-bold">{h}{suf}</span>
                  <div className="flex-1 flex h-1.5 rounded overflow-hidden bg-muted/20">
                    <div className="bg-blue-500 transition-all" style={{ width: `${h + a > 0 ? (h / (h + a)) * 100 : 50}%` }} />
                    <div className="bg-red-500 flex-1" />
                  </div>
                  <span className="text-[10px] font-mono w-7 font-bold">{a}{suf}</span>
                  <span className="text-[9px] text-muted-foreground w-16 truncate">{label}</span>
                </div>
              ))}
              <div className="flex justify-between text-[8px] text-muted-foreground pt-1 border-t border-border/20">
                <span className="text-blue-400 font-medium">{match.home_team}</span>
                <span className="text-red-400 font-medium">{match.away_team}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTAS DOS JOGADORES */}
        <TabsContent value="ratings">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[340px]">
                <div className="p-3 space-y-1">
                  {players.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">Dados não disponíveis</p>
                  )}
                  {players
                    .map((p: any) => ({ ...p, note: ratings[p.id] ?? 6.0 }))
                    .sort((a: any, b: any) => b.note - a.note)
                    .map((p: any) => {
                      const note = p.note;
                      const noteColor = note >= 8 ? 'text-emerald-400' : note >= 7 ? 'text-primary' : note >= 6 ? 'text-yellow-400' : 'text-destructive';
                      const isMOTM = p.name === match.man_of_the_match;
                      const scorer = goalScorers.filter((g: any) => g.name === p.name);
                      const assists = goalScorers.filter((g: any) => g.assist === p.name);
                      return (
                        <div key={p.id} className={`flex items-center justify-between px-2 py-1.5 rounded ${isMOTM ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-muted/10'}`}>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {isMOTM && <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{p.name}</p>
                              <p className="text-[9px] text-muted-foreground">{p.position}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {scorer.length > 0 && (
                              <span className="text-[8px] text-emerald-400 font-bold">⚽×{scorer.length}</span>
                            )}
                            {assists.length > 0 && (
                              <span className="text-[8px] text-blue-400 font-bold">🅰×{assists.length}</span>
                            )}
                            <span className={`text-sm font-black font-mono ${noteColor}`}>{note.toFixed(1)}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── CALENDÁRIO PRINCIPAL ─────────────────────────────────────────
interface ScheduledMatch {
  id: string;
  home_team: string;
  away_team: string;
  scheduled_at: string;
  stage: string;
  tournament_name: string;
  stadium_name: string;
}

export function MatchCalendarTab({ userId, clubName }: Props) {
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MatchHistoryItem | null>(null);
  const [activeView, setActiveView] = useState<'history' | 'scheduled'>('scheduled');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      
      // Load match history
      const { data } = await supabase
        .from('match_history')
        .select('*')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(100);
      setMatches((data as MatchHistoryItem[]) || []);

      // Load scheduled tournament matches for this user
      const { data: myTeams } = await supabase
        .from('custom_tournament_teams')
        .select('id, tournament_id, club_name')
        .eq('user_id', userId);

      if (myTeams && myTeams.length > 0) {
        const teamIds = myTeams.map(t => t.id);
        const tournamentIds = [...new Set(myTeams.map(t => t.tournament_id))];

        // Get tournament names
        const { data: tournaments } = await supabase
          .from('custom_tournaments')
          .select('id, name')
          .in('id', tournamentIds);
        const tournamentMap = new Map((tournaments || []).map(t => [t.id, t.name]));

        // Get scheduled matches where user is home or away
        const { data: scheduledMatches } = await supabase
          .from('custom_tournament_matches')
          .select('*')
          .eq('status', 'scheduled')
          .in('tournament_id', tournamentIds)
          .order('scheduled_at', { ascending: true })
          .limit(50);

        if (scheduledMatches) {
          // Get all team names for these matches
          const allTeamIds = new Set<string>();
          scheduledMatches.forEach(m => {
            allTeamIds.add(m.home_team_id);
            allTeamIds.add(m.away_team_id);
          });

          const { data: allTeams } = await supabase
            .from('custom_tournament_teams')
            .select('id, club_name, is_bot')
            .in('id', [...allTeamIds]);
          const teamNameMap = new Map((allTeams || []).map(t => [t.id, t.club_name]));

          const userScheduled: ScheduledMatch[] = scheduledMatches
            .filter(m => teamIds.includes(m.home_team_id) || teamIds.includes(m.away_team_id))
            .map(m => {
              const isHome = teamIds.includes(m.home_team_id);
              return {
                id: m.id,
                home_team: teamNameMap.get(m.home_team_id) || '???',
                away_team: teamNameMap.get(m.away_team_id) || '???',
                scheduled_at: m.scheduled_at || '',
                stage: m.stage || `Rodada ${m.round}`,
                tournament_name: tournamentMap.get(m.tournament_id) || 'Campeonato',
                stadium_name: isHome ? `Estádio de ${clubName}` : `Estádio de ${teamNameMap.get(m.home_team_id) || 'Visitante'}`,
              };
            });
          setScheduled(userScheduled);
        }
      }

      setLoading(false);
    };
    load();
  }, [userId, clubName]);

  if (selected) {
    return <MatchDetailModal match={selected} clubName={clubName} onClose={() => setSelected(null)} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Summary stats
  const total = matches.length;
  const wins = matches.filter(m => {
    const myG = m.is_home ? m.home_goals : m.away_goals;
    const oppG = m.is_home ? m.away_goals : m.home_goals;
    return myG > oppG;
  }).length;
  const draws = matches.filter(m => m.home_goals === m.away_goals).length;
  const losses = total - wins - draws;
  const goalsFor = matches.reduce((s, m) => s + (m.is_home ? m.home_goals : m.away_goals), 0);
  const goalsAgainst = matches.reduce((s, m) => s + (m.is_home ? m.away_goals : m.home_goals), 0);

  return (
    <div className="space-y-3">
      {/* View Toggle */}
      <div className="flex gap-1 bg-muted/20 rounded-lg p-0.5">
        <button
          onClick={() => setActiveView('scheduled')}
          className={`flex-1 h-8 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeView === 'scheduled' ? 'bg-primary/15 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Agendadas ({scheduled.length})
        </button>
        <button
          onClick={() => setActiveView('history')}
          className={`flex-1 h-8 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeView === 'history' ? 'bg-primary/15 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          Histórico ({matches.length})
        </button>
      </div>

      {activeView === 'scheduled' ? (
        <div className="space-y-3">
          {scheduled.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center space-y-3">
                <Clock className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium">Nenhuma partida agendada</p>
                <p className="text-xs text-muted-foreground">Participe de um campeonato para ter jogos agendados!</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    Partidas Agendadas
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-[10px] text-muted-foreground">
                  {scheduled.length} jogo{scheduled.length !== 1 ? 's' : ''} agendado{scheduled.length !== 1 ? 's' : ''} • Jogos iniciam automaticamente no horário
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[460px]">
                    <div className="divide-y divide-border/20">
                      {scheduled.map((match) => {
                        const isHome = match.home_team === clubName;
                        const now = new Date();
                        const matchDate = match.scheduled_at ? new Date(match.scheduled_at) : null;
                        const isToday = matchDate && matchDate.toDateString() === now.toDateString();
                        const isSoon = matchDate && (matchDate.getTime() - now.getTime()) < 3600000 && matchDate.getTime() > now.getTime();

                        return (
                          <div
                            key={match.id}
                            className={`flex items-center gap-3 px-3 py-3 transition-colors ${
                              isSoon ? 'bg-primary/8 border-l-2 border-primary' : isToday ? 'bg-accent/20' : ''
                            }`}
                          >
                            {/* Time */}
                            <div className="w-16 shrink-0">
                              {match.scheduled_at ? (
                                <>
                                  <p className="text-[10px] font-mono font-bold text-foreground">
                                    {new Date(match.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                  <p className="text-[8px] text-muted-foreground">
                                    {new Date(match.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                  </p>
                                </>
                              ) : (
                                <p className="text-[9px] text-muted-foreground">A definir</p>
                              )}
                            </div>

                            {/* Match info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {isHome
                                  ? <Home className="h-3 w-3 text-primary shrink-0" />
                                  : <Plane className="h-3 w-3 text-muted-foreground shrink-0" />}
                                <span className="text-xs font-bold truncate">{match.home_team}</span>
                                <span className="text-[9px] text-primary font-bold shrink-0">vs</span>
                                <span className="text-xs font-bold truncate">{match.away_team}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[8px] text-muted-foreground">🏟️ {match.stadium_name}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-[7px] h-4">{match.tournament_name}</Badge>
                                <span className="text-[8px] text-muted-foreground">{match.stage}</span>
                                {isSoon && <Badge className="text-[7px] h-4 bg-primary/20 text-primary border-primary/30">Em breve!</Badge>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {matches.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center space-y-3">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium">Nenhuma partida registrada</p>
                <p className="text-xs text-muted-foreground">Jogue seu primeiro amistoso para começar o histórico!</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary */}
              <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Histórico de Partidas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {[
                      { label: 'J', value: total, color: 'text-foreground' },
                      { label: 'V', value: wins, color: 'text-success' },
                      { label: 'E', value: draws, color: 'text-warning' },
                      { label: 'D', value: losses, color: 'text-destructive' },
                      { label: 'GP', value: goalsFor, color: 'text-primary' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-muted/20 rounded p-1.5">
                        <p className={`text-sm font-black font-mono ${color}`}>{value}</p>
                        <p className="text-[9px] text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                    <span>GP {goalsFor}</span>
                    <span>·</span>
                    <span>GC {goalsAgainst}</span>
                    <span>·</span>
                    <span>SG {goalsFor - goalsAgainst > 0 ? '+' : ''}{goalsFor - goalsAgainst}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Match list */}
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[460px]">
                    <div className="divide-y divide-border/20">
                      {matches.map((match, idx) => {
                        const myGoals = match.is_home ? match.home_goals : match.away_goals;
                        const oppGoals = match.is_home ? match.away_goals : match.home_goals;
                        const oppName = match.is_home ? match.away_team : match.home_team;
                        const isWin = myGoals > oppGoals;
                        const isDraw = myGoals === oppGoals;
                        const isLatest = idx === 0;

                        return (
                          <button
                            key={match.id}
                            onClick={() => setSelected(match)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/20 transition-colors text-left"
                          >
                            <div className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-black shrink-0 ${
                              isWin ? 'bg-success/20 text-success' :
                              isDraw ? 'bg-warning/20 text-warning' :
                              'bg-destructive/20 text-destructive'
                            }`}>
                              {isWin ? 'V' : isDraw ? 'E' : 'D'}
                            </div>

                            <div className="w-16 shrink-0">
                              <p className="text-[9px] font-mono text-muted-foreground">{formatDate(match.played_at)}</p>
                              <p className="text-[8px] text-muted-foreground/60">{formatTime(match.played_at)}</p>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                {match.is_home
                                  ? <Home className="h-2.5 w-2.5 text-primary shrink-0" />
                                  : <Plane className="h-2.5 w-2.5 text-muted-foreground shrink-0" />}
                                <span className="text-xs font-medium truncate">vs {oppName}</span>
                                {isLatest && <Badge variant="secondary" className="text-[7px] ml-1 shrink-0">Último</Badge>}
                              </div>
                              <p className="text-[9px] text-muted-foreground truncate">{match.competition}</p>
                            </div>

                            <div className={`text-sm font-black font-mono shrink-0 ${
                              isWin ? 'text-success' : isDraw ? 'text-warning' : 'text-destructive'
                            }`}>
                              {match.home_goals}–{match.away_goals}
                            </div>

                            <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
