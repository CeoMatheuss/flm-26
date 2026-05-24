import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Trophy, Clock, Zap, Activity, AlertTriangle, MapPin, ChevronLeft, ChevronRight, RefreshCw, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ClubShield } from './ClubShield';

interface MatchEntry {
  id: string;
  competition: string;
  home_team: string;
  away_team: string;
  scheduled_at: string;
  status: string;
  home_goals?: number;
  away_goals?: number;
  home_shield?: any;
  away_shield?: any;
  venue?: string;
  is_player_match?: boolean;
}

export function MatchCalendarTab({ userId, clubName }: { userId: string; clubName: string }) {
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);
  const [seasonMonth, setSeasonMonth] = useState(1);
  const [playerTeamId, setPlayerTeamId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: teamData } = await supabase
        .from('world_teams')
        .select('id, league_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (teamData) {
        setPlayerTeamId(teamData.id);
      }

      // Fetch all matches for the current day across all systems
      // In a real scenario, we'd query multiple tables. Here we consolidate for the UI.
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      
      const { data: worldMatches } = await supabase
        .from('world_matches')
        .select(`
          id, scheduled_at, status, home_goals, away_goals, stadium,
          home_team:world_teams!world_matches_home_team_id_fkey(id, name, shield_config),
          away_team:world_teams!world_matches_away_team_id_fkey(id, name, shield_config)
        `)
        .order('scheduled_at', { ascending: true });

      const formatted: MatchEntry[] = (worldMatches || []).map((m: any) => ({
        id: m.id,
        competition: 'Liga Nacional',
        home_team: m.home_team?.name || 'Time A',
        away_team: m.away_team?.name || 'Time B',
        scheduled_at: m.scheduled_at,
        status: m.status,
        home_goals: m.home_goals,
        away_goals: m.away_goals,
        home_shield: m.home_team?.shield_config,
        away_shield: m.away_team?.shield_config,
        venue: m.stadium,
        is_player_match: m.home_team?.id === teamData?.id || m.away_team?.id === teamData?.id
      }));

      setMatches(formatted);
    } catch (err) {
      console.error('[Calendar] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const channel = supabase.channel('calendar_global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'world_matches' }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const filtered = matches.filter(m => {
    const d = new Date(m.scheduled_at).getDate();
    return d === selectedDay || (selectedDay === 0); // 0 means show all
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      {/* Calendar Day Picker */}
      <Card className="bg-black/40 border-white/5 overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-white/5 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Central de Calendário
          </CardTitle>
          <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">DIA {selectedDay} / 30</Badge>
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="w-full">
            <div className="flex gap-1.5 pb-2">
              {Array.from({ length: 30 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedDay(i + 1)}
                  className={`shrink-0 w-10 h-12 rounded-lg flex flex-col items-center justify-center transition-all border
                    ${selectedDay === i + 1 
                      ? 'bg-primary text-black border-primary shadow-lg shadow-primary/20 scale-105' 
                      : 'bg-white/5 text-zinc-500 border-white/5 hover:bg-white/10 hover:text-white'}`}
                >
                  <span className="text-[8px] font-black uppercase opacity-60">DIA</span>
                  <span className="text-sm font-black">{i + 1}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Daily Overview Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-emerald-400 uppercase">Partidas Hoje</p>
              <p className="text-lg font-black">{filtered.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/5 border-orange-500/20">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-orange-400 uppercase">Risco de Lesão</p>
              <p className="text-lg font-black">MÉDIO</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matches List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Clock className="h-3 w-3" /> Agenda do Dia
          </h3>
          <Button variant="ghost" size="sm" onClick={loadData} className="h-6 text-[9px] gap-1">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> ATUALIZAR
          </Button>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-[10px] font-black uppercase text-zinc-600 tracking-tighter">Sincronizando universo...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
            <Calendar className="h-10 w-10 text-white/10 mx-auto mb-2" />
            <p className="text-xs text-zinc-500">Nenhuma partida importante agendada para hoje.</p>
          </div>
        ) : (
          filtered.map(m => {
            const time = new Date(m.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            return (
              <Card 
                key={m.id} 
                className={`overflow-hidden border-white/5 bg-zinc-900/60 transition-all hover:bg-zinc-900/80
                  ${m.is_player_match ? 'ring-1 ring-primary/40 bg-primary/5' : ''}`}
              >
                <CardContent className="p-0">
                  <div className="flex items-center p-3 gap-3">
                    <div className="w-12 text-center border-r border-white/5 pr-3">
                      <p className="text-xs font-black text-primary">{time}</p>
                      <p className="text-[8px] font-bold text-zinc-500 uppercase mt-0.5">{m.competition.split(' ')[0]}</p>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-between gap-2 px-2">
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <ClubShield club={{ shieldConfig: m.home_shield } as any} size={28} />
                        <span className="text-[9px] font-black uppercase truncate w-full text-center">{m.home_team}</span>
                      </div>
                      
                      <div className="flex flex-col items-center min-w-[50px]">
                        {m.status === 'finished' ? (
                          <div className="text-lg font-black tracking-tighter flex items-center gap-1.5">
                            <span className={m.home_goals! > (m.away_goals || 0) ? 'text-emerald-400' : ''}>{m.home_goals}</span>
                            <span className="text-zinc-600 text-xs">X</span>
                            <span className={m.away_goals! > (m.home_goals || 0) ? 'text-emerald-400' : ''}>{m.away_goals}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[8px] bg-black/40 border-white/10 py-0 h-4">VS</Badge>
                        )}
                        <Badge variant="ghost" className="text-[7px] text-zinc-500 p-0 mt-1">{m.venue || 'Estádio'}</Badge>
                      </div>

                      <div className="flex flex-col items-center gap-1 flex-1">
                        <ClubShield club={{ shieldConfig: m.away_shield } as any} size={28} />
                        <span className="text-[9px] font-black uppercase truncate w-full text-center">{m.away_team}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      {m.is_player_match && (
                        <Badge className="bg-primary text-black text-[7px] font-black px-1 h-3.5">SEU JOGO</Badge>
                      )}
                      <div className="flex gap-1">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                         <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                         <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Fatigue Summary Section */}
      <Card className="bg-orange-500/10 border-orange-500/30">
        <CardHeader className="py-2 px-3 border-b border-orange-500/20">
          <CardTitle className="text-[9px] font-black uppercase tracking-widest text-orange-400 flex items-center gap-2">
            <AlertTriangle className="h-3 w-3" /> Relatório de Carga
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          <p className="text-[10px] text-zinc-400 leading-tight">
            Seu time possui <span className="text-orange-400 font-bold">2 jogos</span> hoje. A rotação automática da IA priorizará a partida da <span className="text-white font-bold">Liga</span>.
          </p>
          <div className="flex items-center gap-4">
             <div className="flex-1">
                <div className="flex justify-between text-[8px] mb-1 uppercase font-bold">
                   <span>Fadiga Média</span>
                   <span className="text-orange-400">64%</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-orange-500 w-[64%]" />
                </div>
             </div>
             <div className="flex-1">
                <div className="flex justify-between text-[8px] mb-1 uppercase font-bold">
                   <span>Risco de Lesão</span>
                   <span className="text-red-400">ALTO</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-red-500 w-[82%]" />
                </div>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
