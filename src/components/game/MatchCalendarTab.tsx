import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar, Trophy, ArrowLeft, Star, BarChart3, Play,
  Clock, Loader2, ChevronLeft, ChevronRight, MapPin, RefreshCw
} from 'lucide-react';
import { ClubShield } from './ClubShield';

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

function MatchDetailModal({ match, clubName, onClose }: {
  match: MatchHistoryItem;
  clubName: string;
  onClose: () => void;
}) {
  const isHome = match.is_home;
  const myGoals = isHome ? match.home_goals : match.away_goals;
  const oppGoals = isHome ? match.away_goals : match.home_goals;
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
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 px-2 gap-1">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-xs">Voltar</span>
        </Button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{match.competition} • {formatDate(match.played_at)}</p>
        </div>
      </div>

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
        </CardContent>
      </Card>

      <Tabs defaultValue="replay">
        <TabsList className="w-full">
          <TabsTrigger value="replay" className="flex-1 text-xs gap-1"><Play className="h-3 w-3" />Replay</TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 text-xs gap-1"><BarChart3 className="h-3 w-3" />Stats</TabsTrigger>
          <TabsTrigger value="ratings" className="flex-1 text-xs gap-1"><Star className="h-3 w-3" />Notas</TabsTrigger>
        </TabsList>

        <TabsContent value="replay">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[360px]">
                <div className="p-3 space-y-1">
                  {events.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Sem lances registrados</p>}
                  {events.map((ev: any, i: number) => (
                    <div key={i} className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs ${ev.isGoal ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-muted/10'}`}>
                      <Badge variant="outline" className="text-[8px] font-mono w-8 justify-center shrink-0 mt-0.5">{ev.minute}'</Badge>
                      <span className={eventColor(ev.type)}>{ev.description}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardContent className="p-3 space-y-2">
              {([
                ['Posse de Bola', (stats.possession?.[0] ?? 50), (stats.possession?.[1] ?? 50), '%'],
                ['Finalizações', stats.shots?.[0] ?? 0, stats.shots?.[1] ?? 0, ''],
                ['No Alvo', stats.shotsOnTarget?.[0] ?? 0, stats.shotsOnTarget?.[1] ?? 0, ''],
                ['Escanteios', stats.corners?.[0] ?? 0, stats.corners?.[1] ?? 0, ''],
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ratings">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[340px]">
                <div className="p-3 space-y-1">
                  {players.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Dados não disponíveis</p>}
                  {players.map((p: any) => {
                    const note = ratings[p.id] ?? 6.0;
                    const noteColor = note >= 8 ? 'text-emerald-400' : note >= 7 ? 'text-primary' : 'text-muted-foreground';
                    return (
                      <div key={p.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/10">
                        <p className="text-xs font-medium truncate">{p.name}</p>
                        <span className={`text-sm font-black font-mono ${noteColor}`}>{note.toFixed(1)}</span>
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

export function MatchCalendarTab({ userId, clubName }: Props) {
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [worldMatches, setWorldMatches] = useState<any[]>([]);
  const [cupMatches, setCupMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MatchHistoryItem | null>(null);
  const [activeView, setActiveView] = useState<'history' | 'scheduled'>('scheduled');
  const [selectedMatchday, setSelectedMatchday] = useState<number>(1);
  const [maxMatchdays, setMaxMatchdays] = useState<number>(30);
  const [leagueDivision, setLeagueDivision] = useState<number>(1);
  const [leagueName, setLeagueName] = useState<string>('Liga');
  const [cupName, setCupName] = useState<string>('Copa');
  const [cupCurrentRound, setCupCurrentRound] = useState<number>(1);
  const [scope, setScope] = useState<'all' | 'league' | 'cup'>('all');
  const [myTeamId, setMyTeamId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: historyData } = await supabase
        .from('match_history')
        .select('*')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(50);
      setHistory((historyData as MatchHistoryItem[]) || []);

      const { data: teamData } = await supabase
        .from('world_teams')
        .select('*, league:world_leagues(id, name, current_round, total_rounds, division)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (teamData) {
        setMyTeamId(teamData.id);
      }

      if (teamData?.league) {
        const league = teamData.league as any;
        setSelectedMatchday(league.current_round || 1);
        setMaxMatchdays(league.total_rounds || 30);
        setLeagueDivision(league.division || 1);
        setLeagueName(league.name || 'Liga');

        const { data: wm } = await supabase
          .from('world_matches')
          .select(`
            *, 
            home_team:world_teams!world_matches_home_team_id_fkey(id, name, logo, is_bot, user_id), 
            away_team:world_teams!world_matches_away_team_id_fkey(id, name, logo, is_bot, user_id)
          `)
          .eq('league_id', league.id)
          .order('round', { ascending: true })
          .order('scheduled_at', { ascending: true });
        
        if (wm) {
          const userIds = [...wm.map(m => m.home_team?.user_id), ...wm.map(m => m.away_team?.user_id)].filter(Boolean);
          const { data: clubsData } = await supabase.from('clubs').select('*').in('user_id', userIds);

          const enhanced = wm.map(m => ({
            ...m,
            competition_kind: 'league' as const,
            competition_name: league.name || 'Liga',
            home_full: { ...m.home_team, ...clubsData?.find(c => c.user_id === m.home_team?.user_id) },
            away_full: { ...m.away_team, ...clubsData?.find(c => c.user_id === m.away_team?.user_id) }
          }));
          setWorldMatches(enhanced);
        }
      }

      // Carrega Copa atual do usuário
      const { data: myCupTeam } = await supabase
        .from('national_cup_teams')
        .select('cup_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (myCupTeam?.cup_id) {
        const { data: cupInfo } = await supabase
          .from('national_cups')
          .select('id, name, current_round')
          .eq('id', myCupTeam.cup_id)
          .maybeSingle();
        if (cupInfo) {
          setCupName(cupInfo.name);
          setCupCurrentRound(cupInfo.current_round || 1);
        }

        const { data: cm } = await supabase
          .from('national_cup_matches')
          .select('*, home:national_cup_teams!home_team_id(*), away:national_cup_teams!away_team_id(*)')
          .eq('cup_id', myCupTeam.cup_id)
          .order('round', { ascending: true })
          .order('scheduled_at', { ascending: true });

        if (cm) {
          const enhanced = cm.map(m => ({
            ...m,
            competition_kind: 'cup' as const,
            competition_name: cupInfo?.name || 'Copa',
            home_team: { name: m.home?.club_name, logo: m.home?.club_logo, user_id: m.home?.user_id },
            away_team: { name: m.away?.club_name, logo: m.away?.club_logo, user_id: m.away?.user_id },
            home_full: { name: m.home?.club_name, logoUrl: m.home?.club_logo },
            away_full: { name: m.away?.club_name, logoUrl: m.away?.club_logo },
          }));
          setCupMatches(enhanced);
        }
      }

      setLoading(false);
    };
    load();
  }, [userId]);

  if (selected) return <MatchDetailModal match={selected} clubName={clubName} onClose={() => setSelected(null)} />;
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-xs text-muted-foreground uppercase font-black tracking-widest italic">Sincronizando Agenda...</p>
    </div>
  );

  const leagueRoundMatches = scope === 'cup' ? [] : worldMatches.filter(m => 
    m.round === selectedMatchday && 
    (myTeamId ? (m.home_team_id === myTeamId || m.away_team_id === myTeamId) : true)
  );
  const cupRoundMatches = scope === 'league' ? [] : cupMatches.filter(m => 
    (myTeamId ? (m.home_team_id === myTeamId || m.away_team_id === myTeamId) : true)
  );
  const filteredMatches = [...leagueRoundMatches, ...cupRoundMatches];

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header com Tabs Estilizadas */}
      <div className="flex bg-black/40 border border-white/5 p-1 rounded-xl">
        <button 
          onClick={() => setActiveView('scheduled')} 
          className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2
            ${activeView === 'scheduled' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-zinc-500 hover:text-white'}`}
        >
          <Calendar className="h-4 w-4" /> Calendário Oficial
        </button>
        <button 
          onClick={() => setActiveView('history')} 
          className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2
            ${activeView === 'history' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-zinc-500 hover:text-white'}`}
        >
          <Trophy className="h-4 w-4" /> Histórico Real
        </button>
      </div>

      {activeView === 'scheduled' ? (
        <div className="space-y-4">
          {/* Filtro de Competição */}
          <div className="flex bg-black/40 border border-white/5 p-1 rounded-xl text-[10px]">
            {(['all', 'league', 'cup'] as const).map(s => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`flex-1 py-2 rounded-lg font-black uppercase tracking-widest transition-all
                  ${scope === s ? 'bg-primary text-black' : 'text-zinc-500 hover:text-white'}`}
              >
                {s === 'all' ? 'Tudo' : s === 'league' ? leagueName : cupName}
              </button>
            ))}
          </div>

          {/* Navegador de Rodadas (apenas para Liga) */}
          {scope !== 'cup' && (
            <div className="flex items-center justify-between bg-zinc-900/60 border border-white/5 p-4 rounded-xl shadow-2xl">
              <Button variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/10"
                onClick={() => setSelectedMatchday(m => Math.max(1, m - 1))} disabled={selectedMatchday === 1}>
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <div className="text-center">
                <span className="text-[10px] text-primary font-black uppercase tracking-tighter italic">{leagueName}</span>
                <h3 className="text-xl font-black text-white italic leading-tight">RODADA {selectedMatchday}</h3>
                <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Total de {maxMatchdays} Jornadas</p>
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/10"
                onClick={() => setSelectedMatchday(m => Math.min(maxMatchdays, m + 1))} disabled={selectedMatchday === maxMatchdays}>
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>
          )}

          {scope === 'cup' && cupRoundMatches.length > 0 && (
            <div className="bg-zinc-900/60 border border-amber-500/20 p-4 rounded-xl text-center">
              <span className="text-[10px] text-amber-400 font-black uppercase tracking-tighter italic">{cupName}</span>
              <h3 className="text-xl font-black text-white italic leading-tight">FASE {cupCurrentRound}</h3>
            </div>
          )}

          <ScrollArea className="h-[480px] pr-4">
            <div className="space-y-3 pb-10">
              {filteredMatches.length === 0 ? (
                <div className="text-center py-20 bg-black/20 border-2 border-dashed border-white/5 rounded-2xl">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-10" />
                  <p className="text-sm font-bold uppercase tracking-widest opacity-30">Aguardando definição dos jogos</p>
                </div>
              ) : filteredMatches.map(m => {
                const isFinished = m.status === 'finished';
                const isCup = m.competition_kind === 'cup';
                const displayTime = m.scheduled_at
                  ? new Date(m.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                  : '--:--';
                const displayDate = m.scheduled_at
                  ? new Date(m.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                  : '';

                return (
                  <Card key={`${m.competition_kind}-${m.id}`} className={`overflow-hidden border-white/5 bg-zinc-900/40 hover:border-primary/20 transition-all ${isFinished ? 'opacity-70' : ''}`}>
                    <CardContent className="p-4">
                      {/* Cabeçalho competição + data */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                        <Badge className={`text-[8px] uppercase font-black tracking-widest border-none ${isCup ? 'bg-amber-500/20 text-amber-400' : 'bg-primary/20 text-primary'}`}>
                          {m.competition_name}
                        </Badge>
                        <div className="text-[9px] font-mono text-white/50">{displayDate} • {displayTime}</div>
                      </div>

                      <div className="grid grid-cols-7 items-center gap-4">
                        <div className="col-span-3 flex flex-col items-center gap-2">
                          <ClubShield club={m.home_full} size={42} className="drop-shadow-[0_0_12px_rgba(0,0,0,0.5)]" />
                          <p className="text-[11px] font-black text-white uppercase italic text-center leading-tight truncate w-full">{m.home_team?.name}</p>
                        </div>

                        <div className="col-span-1 flex flex-col items-center justify-center gap-1">
                          {isFinished ? (
                            <div className="bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                              <span className="text-lg font-black text-white italic">{m.home_goals}</span>
                              <span className="text-[10px] text-primary/50 font-bold">x</span>
                              <span className="text-lg font-black text-white italic">{m.away_goals}</span>
                            </div>
                          ) : (
                            <div className="bg-black/60 border border-white/10 px-3 py-1 rounded text-[11px] font-black text-primary italic">
                              {displayTime}
                            </div>
                          )}
                          {!isFinished && <Badge variant="outline" className="text-[7px] py-0 px-1 border-white/10 text-muted-foreground uppercase">Agendado</Badge>}
                          {isFinished && <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[7px] py-0 px-1 uppercase font-black tracking-widest">Final</Badge>}
                        </div>

                        <div className="col-span-3 flex flex-col items-center gap-2">
                          <ClubShield club={m.away_full} size={42} className="drop-shadow-[0_0_12px_rgba(0,0,0,0.5)]" />
                          <p className="text-[11px] font-black text-white uppercase italic text-center leading-tight truncate w-full">{m.away_team?.name}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-1.5 opacity-50">
                            <MapPin className="h-3 w-3 text-primary" />
                            <span className="text-[9px] font-bold text-white truncate max-w-[160px] uppercase">{m.stadium_name || (isCup ? 'Sede Definida' : 'Estádio Municipal')}</span>
                         </div>
                         <div className={`text-[9px] font-black italic uppercase tracking-tighter ${isCup ? 'text-amber-400/40' : 'text-primary/40'}`}>
                           {isCup ? `Fase ${m.round}` : `Rodada ${m.round}`}
                         </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <ScrollArea className="h-[520px]">
          <div className="space-y-2 pb-10">
            {history.length === 0 ? (
              <div className="text-center py-20 bg-black/20 border-2 border-dashed border-white/5 rounded-2xl">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-10" />
                <p className="text-sm font-bold uppercase tracking-widest opacity-30">Nenhum histórico registrado</p>
              </div>
            ) : history.map(m => {
              const isWin = m.home_goals > m.away_goals;
              const isDraw = m.home_goals === m.away_goals;
              return (
                <Card key={m.id} className="cursor-pointer border-white/5 bg-zinc-900/40 hover:border-primary/40 transition-all overflow-hidden group" onClick={() => setSelected(m)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-primary italic uppercase leading-none">{m.competition}</span>
                      <span className="text-[9px] text-muted-foreground font-bold uppercase mt-1">{formatDate(m.played_at)}</span>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center gap-3 px-4">
                      <span className="text-[10px] font-bold text-white uppercase truncate max-w-[80px] text-right">{m.home_team}</span>
                      <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded border border-white/5">
                        <span className="text-sm font-black text-white italic">{m.home_goals}</span>
                        <span className="text-[9px] opacity-20">-</span>
                        <span className="text-sm font-black text-white italic">{m.away_goals}</span>
                      </div>
                      <span className="text-[10px] font-bold text-white uppercase truncate max-w-[80px] text-left">{m.away_team}</span>
                    </div>

                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-inner
                      ${isWin ? 'bg-emerald-500 text-white' : isDraw ? 'bg-zinc-500 text-white' : 'bg-red-500 text-white'}`}>
                      {isWin ? 'V' : isDraw ? 'E' : 'D'}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
