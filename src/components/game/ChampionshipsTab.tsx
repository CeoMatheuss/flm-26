import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Trophy, Calendar, Users, BarChart2, Newspaper, Loader2, Globe, ArrowLeft, TrendingUp, Filter, Star, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ClubShield } from './ClubShield';
import { formatMoney } from '@/lib/formatMoney';
import { cn } from '@/lib/utils';

export function ChampionshipsTab() {
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedStatus, setSelectedCountryStatus] = useState('active');
  const [selectedLeague, setSelectedLeague] = useState<any | null>(null);

  const [leagueData, setLeagueData] = useState<{
    standings: any[];
    matches: any[];
    stats: any[];
    scorers: any[];
  }>({
    standings: [],
    matches: [],
    stats: [],
    scorers: []
  });
  
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('standings');

  useEffect(() => {
    loadLeagues();
  }, []);

  const loadLeagues = async () => {
    setLoading(true);
    let query = supabase.from('world_leagues').select('*');
    
    if (selectedCountry !== 'all') query = query.eq('country', selectedCountry);
    if (selectedStatus === 'active') query = query.eq('active', true);
    
    const { data } = await query.order('division_level', { ascending: true });
    if (data) setLeagues(data);
    setLoading(false);
  };

  const loadLeagueDetails = async (league: any) => {
    setSelectedLeague(league);
    setLoadingDetails(true);
    setActiveSubTab('standings');

    // Parallel fetch for speed
    const [standingsRes, matchesRes, scorersRes] = await Promise.all([
      supabase.from('world_league_standings').select('*, world_teams(name, logo)').eq('league_id', league.id).order('points', { ascending: false }).order('goal_diff', { ascending: false }),
      supabase.from('world_matches').select('*, home_team:world_teams!world_matches_home_team_id_fkey(name, logo), away_team:world_teams!world_matches_away_team_id_fkey(name, logo)').eq('league_id', league.id).order('round', { ascending: false }).limit(20),
      supabase.from('world_player_stats').select('*, world_players(name), world_teams(name)').eq('league_id', league.id).order('goals', { ascending: false }).limit(10)
    ]);

    setLeagueData({
      standings: standingsRes.data || [],
      matches: matchesRes.data || [],
      scorers: scorersRes.data || [],
      stats: [] // Would normally compute from standings
    });
    setLoadingDetails(false);
  };

  const filteredLeagues = useMemo(() => {
    return leagues.filter(l => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.country.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leagues, searchTerm]);

  if (selectedLeague) {
    return (
      <div className="space-y-4 animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setSelectedLeague(null)} className="gap-2 text-muted-foreground hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Voltar ao Hub
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-white/10"><Star className="h-4 w-4 text-yellow-500" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-white/10"><Info className="h-4 w-4 text-indigo-400" /></Button>
          </div>
        </div>

        {/* League Header */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-6">
          <div className="absolute top-0 right-0 p-8 opacity-10 grayscale">
            <Trophy className="h-32 w-32" />
          </div>
          <div className="relative flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-3xl shadow-2xl shadow-indigo-500/20">
              <Trophy className="h-10 w-10 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] uppercase font-black">Liga Oficial</Badge>
                <Badge variant="outline" className="border-white/10 text-[10px]">{selectedLeague.country}</Badge>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tighter">{selectedLeague.name}</h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-4">
                <span>Temporada {selectedLeague.season_year}</span>
                <span>•</span>
                <span>Rodada {selectedLeague.current_round}</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold uppercase text-[10px]">Em Andamento</span>
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
          <TabsList className="bg-slate-950/50 border border-white/5 p-1 h-12 w-full grid grid-cols-4 md:flex md:w-auto">
            <TabsTrigger value="standings" className="text-xs px-6 data-[state=active]:bg-indigo-600/20 data-[state=active]:text-indigo-300">Tabela</TabsTrigger>
            <TabsTrigger value="matches" className="text-xs px-6">Jogos</TabsTrigger>
            <TabsTrigger value="scorers" className="text-xs px-6">Artilharia</TabsTrigger>
            <TabsTrigger value="stats" className="text-xs px-6">Estatísticas</TabsTrigger>
          </TabsList>

          <TabsContent value="standings" className="mt-4">
            {loadingDetails ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-indigo-500" /></div>
            ) : (
              <Card className="bg-slate-900/40 border-white/5 overflow-hidden">
                <Table>
                  <TableHeader className="bg-black/20">
                    <TableRow className="border-white/5">
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Clube</TableHead>
                      <TableHead className="text-center">P</TableHead>
                      <TableHead className="text-center">J</TableHead>
                      <TableHead className="text-center">V</TableHead>
                      <TableHead className="text-center">E</TableHead>
                      <TableHead className="text-center">D</TableHead>
                      <TableHead className="text-center">SG</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Forma</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leagueData.standings.map((team, idx) => (
                      <TableRow key={team.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                        <TableCell className={cn("text-center font-black", idx < 4 ? "text-indigo-400" : idx >= 12 ? "text-red-400" : "text-muted-foreground")}>
                          {idx + 1}
                        </TableCell>
                        <TableCell className="flex items-center gap-3 py-4">
                          <ClubShield club={{ logoUrl: team.world_teams?.logo } as any} size={24} />
                          <span className="font-bold text-white group-hover:text-indigo-300 transition-colors">{team.world_teams?.name}</span>
                        </TableCell>
                        <TableCell className="text-center font-black text-indigo-300 bg-indigo-500/5">{team.points}</TableCell>
                        <TableCell className="text-center">{team.played}</TableCell>
                        <TableCell className="text-center">{team.wins}</TableCell>
                        <TableCell className="text-center">{team.draws}</TableCell>
                        <TableCell className="text-center">{team.losses}</TableCell>
                        <TableCell className="text-center font-medium">{team.goal_diff}</TableCell>
                        <TableCell className="text-center hidden md:table-cell">
                          <div className="flex gap-1 justify-center">
                            {['V', 'V', 'E', 'D', 'V'].map((f, i) => (
                              <div key={i} className={cn("w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-black text-white shadow-sm", f === 'V' ? 'bg-emerald-500' : f === 'E' ? 'bg-slate-500' : 'bg-red-500')}>{f}</div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="matches" className="mt-4 space-y-3">
             {leagueData.matches.map((m) => (
               <div key={m.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-white/5 hover:border-indigo-500/30 transition-all group">
                 <div className="flex-1 flex items-center justify-end gap-3 text-right">
                   <span className="text-sm font-bold text-white group-hover:text-indigo-200">{m.home_team?.name}</span>
                   <ClubShield club={{ logoUrl: m.home_team?.logo } as any} size={24} />
                 </div>
                 <div className="mx-6 px-4 py-1.5 rounded-lg bg-black/40 border border-white/10 text-lg font-black text-indigo-400 min-w-[80px] text-center">
                    {m.status === 'finished' ? `${m.home_goals} - ${m.away_goals}` : <span className="text-xs uppercase tracking-widest text-muted-foreground">VS</span>}
                 </div>
                 <div className="flex-1 flex items-center justify-start gap-3">
                   <ClubShield club={{ logoUrl: m.away_team?.logo } as any} size={24} />
                   <span className="text-sm font-bold text-white group-hover:text-indigo-200">{m.away_team?.name}</span>
                 </div>
               </div>
             ))}
          </TabsContent>

          <TabsContent value="scorers" className="mt-4">
             <Card className="bg-slate-900/40 border-white/5 p-4">
               <div className="space-y-2">
                 {leagueData.scorers.map((s, i) => (
                   <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                     <div className="flex items-center gap-4">
                       <span className="text-lg font-black text-indigo-500/50 w-6">#{i+1}</span>
                       <div>
                         <p className="font-bold text-white text-sm">{s.world_players?.name}</p>
                         <p className="text-[10px] text-muted-foreground uppercase font-black">{s.world_teams?.name}</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="text-xl font-black text-indigo-400">{s.goals}</p>
                       <p className="text-[9px] text-muted-foreground uppercase">Gols</p>
                     </div>
                   </div>
                 ))}
               </div>
             </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 p-8 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-black border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
        
        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/30">
              <Trophy className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Hub Global de Campeonatos</h2>
              <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mt-1">Explorar competições em tempo real</p>
            </div>
          </div>
          <div className="hidden md:flex gap-2">
            <div className="text-right pr-4 border-r border-white/10">
              <p className="text-xl font-black text-indigo-400">{leagues.length}</p>
              <p className="text-[9px] text-muted-foreground uppercase font-black">Ligas Ativas</p>
            </div>
            <div className="text-right pl-4">
              <p className="text-xl font-black text-white">2026</p>
              <p className="text-[9px] text-muted-foreground uppercase font-black">Temporada Atual</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          <div className="md:col-span-2 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-indigo-400 transition-colors" />
            <Input 
              placeholder="Ex: Premier League, Brasileirão..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 bg-black/40 border-white/10 focus-visible:ring-indigo-500/50 rounded-xl"
            />
          </div>
          <Select value={selectedCountry} onValueChange={(v) => { setSelectedCountry(v); loadLeagues(); }}>
            <SelectTrigger className="h-12 bg-black/40 border-white/10 rounded-xl">
              <Globe className="h-4 w-4 mr-2 text-indigo-400" />
              <SelectValue placeholder="País" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              <SelectItem value="all">Todos os Países</SelectItem>
              <SelectItem value="Brasil">Brasil</SelectItem>
              <SelectItem value="Inglaterra">Inglaterra</SelectItem>
              <SelectItem value="Espanha">Espanha</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadLeagues} className="h-12 bg-indigo-600 hover:bg-indigo-500 font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-indigo-600/20">
            <Filter className="h-4 w-4 mr-2" /> Filtrar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="animate-spin h-10 w-10 text-indigo-500" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Sincronizando Base Mundial...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeagues.map((league) => (
            <Card 
              key={league.id} 
              onClick={() => loadLeagueDetails(league)}
              className="group hover:border-indigo-500/50 transition-all cursor-pointer bg-slate-900/40 border-white/5 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/5 rounded-2xl overflow-hidden"
            >
              <div className="h-1.5 w-full bg-indigo-600/20 group-hover:bg-indigo-500 transition-colors" />
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-white/5 flex items-center justify-center text-xl shadow-inner">
                    {league.country === 'Brasil' ? '🇧🇷' : league.country === 'Inglaterra' ? '🏴' : '🇪🇸'}
                  </div>
                  <div>
                    <CardTitle className="text-base font-black text-white group-hover:text-indigo-300 transition-colors">
                      {league.name}
                    </CardTitle>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{league.country} • Série {league.division}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-center">
                    <p className="text-[8px] text-muted-foreground uppercase font-black">Rodada</p>
                    <p className="text-sm font-black text-white">{league.current_round}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-center">
                    <p className="text-[8px] text-muted-foreground uppercase font-black">Clubes</p>
                    <p className="text-sm font-black text-white">{league.max_teams}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-center">
                    <p className="text-[8px] text-muted-foreground uppercase font-black">Status</p>
                    <div className="flex justify-center mt-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-indigo-400/60 pt-2 border-t border-white/5">
                  <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Temporada {league.season_year}</span>
                  <span className="group-hover:translate-x-1 transition-transform">Ver Detalhes →</span>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredLeagues.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4 rounded-3xl border border-dashed border-white/10 bg-white/5">
               <Trophy className="h-12 w-12 text-muted-foreground/20 mx-auto" />
               <p className="text-muted-foreground text-sm font-bold">Nenhum campeonato encontrado com esses filtros.</p>
               <Button variant="outline" size="sm" onClick={() => { setSelectedCountry('all'); setSearchTerm(''); }} className="border-white/10">Limpar Filtros</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
