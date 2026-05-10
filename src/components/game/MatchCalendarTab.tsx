import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar, Trophy, ArrowLeft, Star, BarChart3, Play,
  Clock, Loader2, ChevronLeft, ChevronRight, MapPin
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
  const [maxMatchdays, setMaxMatchdays] = useState<number>(38);

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
        .limit(100);
      setHistory((historyData as MatchHistoryItem[]) || []);

      const { data: userLeague } = await supabase
        .from('league_members')
        .select('league_id, multiplayer_leagues(current_round, total_rounds)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userLeague?.league_id) {
        const leagueInfo = userLeague.multiplayer_leagues as any;
        setSelectedMatchday(leagueInfo?.current_round || 1);
        setMaxMatchdays(leagueInfo?.total_rounds || 30);

        const { data: wm } = await supabase
          .from('world_matches') // Using modern world_matches instead of legacy league_matches
          .select('*, home_team:world_teams!world_matches_home_team_id_fkey(name, logo), away_team:world_teams!world_matches_away_team_id_fkey(name, logo)')
          .eq('league_id', userLeague.league_id)
          .order('round', { ascending: true })
          .order('scheduled_at', { ascending: true });
        
        if (wm) setWorldMatches(wm.map(m => ({ ...m, home_team: { club_name: (m as any).home_team?.name }, away_team: { club_name: (m as any).away_team?.name } })));

        // Fetch Cup Matches
        const { data: teamData } = await supabase.from('world_teams').select('id, country').eq('user_id', user.id).maybeSingle();
        if (teamData) {
          const { data: cm } = await supabase
            .from('cup_matches')
            .select('*, home_team:cup_teams!home_team_id(club_name, club_logo, user_id), away_team:cup_teams!away_team_id(club_name, club_logo, user_id)')
            .eq('status', 'scheduled')
            .or(`home_team.user_id.eq.${user.id},away_team.user_id.eq.${user.id}`);
          if (cm) setCupMatches(cm);
        }
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  if (selected) return <MatchDetailModal match={selected} clubName={clubName} onClose={() => setSelected(null)} />;
  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const filteredMatches = worldMatches.filter(m => m.round === selectedMatchday);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-muted/20 rounded-lg p-0.5">
        <button onClick={() => setActiveView('scheduled')} className={`flex-1 h-8 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${activeView === 'scheduled' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}>
          <Clock className="h-3.5 w-3.5" /> Calendário da Liga
        </button>
        <button onClick={() => setActiveView('history')} className={`flex-1 h-8 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${activeView === 'history' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}>
          <Calendar className="h-3.5 w-3.5" /> Histórico ({history.length})
        </button>
      </div>

      {activeView === 'scheduled' ? (
        <div className="space-y-3">
          <Card className="bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-3 flex items-center justify-between">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedMatchday(m => Math.max(1, m - 1))} disabled={selectedMatchday === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <p className="text-xs font-bold">Rodada {selectedMatchday} de {maxMatchdays}</p>
                <p className="text-[10px] text-muted-foreground">Calendário Oficial</p>
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedMatchday(m => Math.min(maxMatchdays, m + 1))} disabled={selectedMatchday === maxMatchdays}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <ScrollArea className="h-[460px]">
            <div className="space-y-2">
              {filteredMatches.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-10">Nenhum jogo nesta rodada.</p>
              ) : filteredMatches.map(m => (
                <Card key={m.id} className="border-border/40">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 text-right min-w-0">
                        <p className="text-xs font-bold truncate">{m.home_team?.club_name}</p>
                      </div>
                      <div className="bg-muted/30 px-3 py-1 rounded text-xs font-mono font-bold">
                        {m.status === 'finished' ? `${m.home_goals} x ${m.away_goals}` : '19:30'}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-xs font-bold truncate">{m.away_team?.club_name}</p>
                      </div>
                    </div>
                    {m.status !== 'finished' && (
                      <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{m.is_home ? clubName : 'Estádio Adversário'}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <ScrollArea className="h-[520px]">
          <div className="space-y-2">
            {history.map(m => (
              <Card key={m.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelected(m)}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="text-[10px] text-muted-foreground w-16">{formatDate(m.played_at)}</div>
                  <div className="flex-1 text-center font-bold text-xs truncate mx-2">
                    {m.home_team} {m.home_goals} x {m.away_goals} {m.away_team}
                  </div>
                  <Badge variant={m.home_goals > m.away_goals ? 'default' : 'outline'} className="text-[8px]">
                    {m.home_goals > m.away_goals ? 'V' : m.home_goals === m.away_goals ? 'E' : 'D'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
