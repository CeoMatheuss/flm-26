import { useState, useEffect } from 'react';
// @ts-ignore
import useSound from 'use-sound';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Globe, Loader2, Sparkles, Star, History, Target, Users, Zap, TrendingUp, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ClubShield } from './ClubShield';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface Props {
  userId: string;
}

export function WorldCupTab({ userId }: Props) {
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchWorldCupData = async () => {
      setLoading(true);
      try {
        // Busca o torneio mundial mais recente/ativo
        const { data: tournaments } = await supabase
          .from('tournaments')
          .select('*')
          .eq('type', 'world_cup')
          .order('season', { ascending: false })
          .limit(1);

        if (tournaments && tournaments.length > 0) {
          const t = tournaments[0];
          setTournament(t);

          // Busca grupos e classificações
          const { data: groupData } = await supabase
            .from('tournament_groups')
            .select('*, tournament_group_standings(*, world_teams(*))')
            .eq('tournament_id', t.id)
            .order('name', { ascending: true });
          
          setGroups(groupData || []);

          // Busca partidas do torneio
          const { data: matchData } = await supabase
            .from('tournament_matches')
            .select('*, home:world_teams!home_team_id(*), away:world_teams!away_team_id(*)')
            .eq('tournament_id', t.id)
            .order('scheduled_at', { ascending: true });
          
          setMatches(matchData || []);
        }

        // Busca histórico de campeões
        const { data: historyData } = await supabase
          .from('tournament_history')
          .select('*, winner:world_teams!winner_id(*)')
          .eq('tournament_name', 'Super Mundial de Clubes')
          .order('season', { ascending: false });
        
        setHistory(historyData || []);

      } catch (err) {
        console.error('Error fetching world cup data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorldCupData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground animate-pulse uppercase tracking-widest">Sincronizando Mundial...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="py-20 text-center space-y-4 max-w-md mx-auto px-4">
        <div className="h-20 w-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Globe className="h-10 w-10 text-muted-foreground opacity-20" />
        </div>
        <h3 className="text-xl font-black italic uppercase tracking-tighter">Nenhum Mundial em andamento</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O Super Mundial de Clubes ocorre a cada 4 temporadas. Continue evoluindo seu clube e subindo no ranking para garantir sua vaga na próxima edição!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0a0a1a] via-[#1a1a3a] to-[#0a0a1a] border border-primary/30 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Trophy className="h-64 w-64 text-primary rotate-12" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] border border-primary/30">
              <Sparkles className="h-3 w-3" /> Temporada {tournament.season}
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase italic">
              Super Mundial <span className="text-primary">FLM</span>
            </h1>
            <div className="flex items-center gap-4 justify-center md:justify-start">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-black">
                {tournament.status === 'scheduled' ? 'AGUARDANDO SORTEIO' : tournament.status.toUpperCase()}
              </Badge>
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Globe className="h-4 w-4" /> Sede: {tournament.host_country || 'A definir'}
              </div>
            </div>
          </div>

          {/* Trophy Display */}
          <div className="relative group">
            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all duration-700" />
            <div className="relative h-40 w-40 md:h-52 md:w-52 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-500">
               <Trophy className="h-32 w-32 md:h-44 md:w-44 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="groups" className="w-full">
        <TabsList className="grid grid-cols-3 h-14 bg-muted/20 backdrop-blur-md rounded-2xl p-1.5 border border-white/5">
          <TabsTrigger value="groups" className="rounded-xl font-black text-xs uppercase tracking-widest gap-2">
            <Users className="h-4 w-4" /> Grupos
          </TabsTrigger>
          <TabsTrigger value="matches" className="rounded-xl font-black text-xs uppercase tracking-widest gap-2">
            <Zap className="h-4 w-4" /> Mata-Mata
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl font-black text-xs uppercase tracking-widest gap-2">
            <History className="h-4 w-4" /> História
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {groups.map((group) => (
              <Card key={group.id} className="bg-card/40 border-border/50 rounded-3xl overflow-hidden backdrop-blur-sm">
                <CardHeader className="bg-muted/30 py-3 border-b border-border/50 text-center">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary italic">
                    {group.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/20">
                    {group.tournament_group_standings.sort((a: any, b: any) => b.points - a.points || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against)).map((standing: any, idx: number) => (
                      <div key={standing.id} className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors">
                        <span className={`text-[10px] font-black w-4 text-center ${idx < 2 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                          {idx + 1}
                        </span>
                        <ClubShield 
                          club={{
                            primaryColor: standing.world_teams?.primary_color || '#444',
                            secondaryColor: standing.world_teams?.secondary_color || '#fff',
                            shieldPattern: standing.world_teams?.shield_pattern || 'solid',
                            shieldShape: standing.world_teams?.shield_shape || 'classic',
                          } as any} 
                          size={24} 
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold truncate uppercase">{standing.world_teams?.name || 'Vaga aberta'}</p>
                        </div>
                        <span className="text-xs font-black text-white">{standing.points} <span className="text-[8px] font-normal text-muted-foreground">PTS</span></span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="matches" className="mt-6">
           {/* Knockout Bracket View */}
           <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4 bg-muted/10 rounded-[2.5rem] border-2 border-dashed border-white/5">
              <Zap className="h-10 w-10 opacity-20" />
              <p className="text-sm font-black uppercase tracking-widest italic">Aguardando definição dos grupos</p>
              <p className="text-[10px] max-w-xs text-center opacity-60">
                Os 16 melhores clubes da fase de grupos avançarão para o mata-mata em jogo único até a grande final.
              </p>
           </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history.length > 0 ? history.map((h) => (
              <Card key={h.id} className="bg-gradient-to-br from-card/80 to-background border-border/50 rounded-3xl overflow-hidden p-6 relative group hover:border-yellow-500/30 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Trophy className="h-12 w-12 text-yellow-500" />
                </div>
                <div className="flex items-center gap-6">
                  <div className="h-20 w-20 rounded-full border-4 border-yellow-500/20 bg-yellow-500/5 flex items-center justify-center p-3">
                    <ClubShield 
                      club={{
                        primaryColor: h.winner?.primary_color || '#444',
                        secondaryColor: h.winner?.secondary_color || '#fff',
                        shieldPattern: h.winner?.shield_pattern || 'solid',
                        shieldShape: h.winner?.shield_shape || 'classic',
                      } as any} 
                      size={50} 
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">CAMPEÃO TEMPORADA {h.season}</p>
                    <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">{h.winner?.name || 'Desconhecido'}</h3>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-bold">
                       <span className="flex items-center gap-1"><Target className="h-3 w-3" /> Placar: {h.score}</span>
                       <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Sede: {h.host_country}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )) : (
              <div className="col-span-full py-20 text-center text-muted-foreground italic text-sm">
                Nenhum campeão registrado ainda. O primeiro Super Mundial aguarda o seu legado.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
