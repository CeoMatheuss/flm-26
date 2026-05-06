import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, Loader2, CheckCircle2, Calendar, Target, Swords } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  clubName: string;
  country?: string;
  clubPlayers?: any[];
}

export function LeagueTab({ clubName, clubPlayers }: Props) {
  const [standings, setStandings] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [leagueInfo, setLeagueInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState(new Date().getDate());

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: teamData } = await supabase
      .from('world_teams')
      .select('*, world_leagues(name, country_id)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (teamData && teamData.league_id) {
      setLeagueInfo({
        league_id: teamData.league_id,
        league_name: teamData.world_leagues?.name || 'Liga Mundial',
        player_team_id: teamData.id,
        country_id: teamData.world_leagues?.country_id
      });
      
      // Load Standings
      const { data: standingsData } = await supabase
        .from('world_league_table')
        .select('*, world_teams(name, logo, is_bot)')
        .eq('league_id', teamData.league_id)
        .order('points', { ascending: false })
        .order('goals_for', { ascending: false });
      
      if (standingsData) setStandings(standingsData);

      // Load Fixtures for current round
      const { data: fixturesData } = await supabase
        .from('world_matches')
        .select('*, home_team:world_teams!world_matches_home_team_id_fkey(name), away_team:world_teams!world_matches_away_team_id_fkey(name)')
        .eq('league_id', teamData.league_id)
        .eq('round', currentRound)
        .order('scheduled_at', { ascending: true });
      
      if (fixturesData) setFixtures(fixturesData);
    } else {
      setLeagueInfo(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [clubName, currentRound]);

  const topScorers = useMemo(() => {
    return (clubPlayers || []).filter(p => (p.goals ?? 0) > 0)
      .map(p => ({ name: p.name, team: clubName, goals: p.goals ?? 0 }))
      .sort((a, b) => b.goals - a.goals).slice(0, 3);
  }, [clubPlayers, clubName]);

  if (loading && standings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground italic">Carregando informações da liga...</p>
      </div>
    );
  }

  if (!leagueInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
        <Trophy className="h-12 w-12 text-muted-foreground/20" />
        <h3 className="text-lg font-bold">Liga em andamento</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Uma temporada já está em curso. Você foi inscrito na <span className="text-primary font-bold">Copa de Iniciantes</span> e entrará na liga principal no dia 1º do próximo mês.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-[10px] bg-emerald-500 hover:bg-emerald-600">
            <Trophy className="h-3 w-3 mr-1" />
            {leagueInfo.league_name}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            ● Temporada Ativa
          </Badge>
        </div>
        <div className="flex items-center gap-2">
           <Badge variant="secondary" className="text-[10px]">
             Dia {new Date().getDate()} de 30
           </Badge>
        </div>
      </div>

      <Tabs defaultValue="standings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="standings" className="text-xs">Classificação</TabsTrigger>
          <TabsTrigger value="fixtures" className="text-xs">Rodadas</TabsTrigger>
        </TabsList>

        <TabsContent value="standings">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Classificação</CardTitle>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Ranking Global</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/50">
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-center w-8">J</TableHead>
                      <TableHead className="text-center w-8">SG</TableHead>
                      <TableHead className="text-center w-10 font-bold text-primary">P</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map((row, i) => {
                      const isPlayerTeam = row.team_id === leagueInfo.player_team_id;
                      const teamName = row.world_teams?.name || `Time ${i + 1}`;
                      return (
                        <TableRow key={row.team_id} className={`${isPlayerTeam ? 'bg-primary/15 font-semibold' : ''} border-b border-border/40 transition-colors`}>
                          <TableCell className={i === 0 ? 'text-yellow-400 font-black' : i < 4 ? 'text-emerald-400 font-bold' : i >= standings.length - 4 ? 'text-red-400 font-bold' : 'text-muted-foreground'}>
                            {i + 1}
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-2">
                              <span className="text-sm shrink-0">⚽</span>
                              <span className="truncate max-w-[150px]">{isPlayerTeam ? clubName : teamName}</span>
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-xs">{row.played}</TableCell>
                          <TableCell className="text-center text-xs">{row.goals_for - row.goals_against}</TableCell>
                          <TableCell className="text-center font-black text-primary">{row.points}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" /> Info da Temporada
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progresso do mês:</span>
                    <span className="font-bold">{new Date().getDate()} / 30 dias</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500" 
                      style={{ width: `${(new Date().getDate() / 30) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-emerald-500/10 rounded text-[10px] text-emerald-500 font-bold">
                    <CheckCircle2 className="h-3 w-3" />
                    Sincronizado com o servidor
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-400" /> Melhores do Clube
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Artilheiros</p>
                    {topScorers.length > 0 ? topScorers.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                        <span className="truncate">{s.name}</span>
                        <span className="font-bold">{s.goals} ⚽</span>
                      </div>
                    )) : <p className="text-[10px] text-muted-foreground italic">Nenhum gol ainda</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fixtures">
          <Card>
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Calendário</CardTitle>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentRound(prev => Math.max(1, prev - 1))}
                    className="p-1 hover:bg-accent rounded"
                  >
                    ◀
                  </button>
                  <span className="text-sm font-bold bg-primary/10 px-3 py-1 rounded">
                    Rodada {currentRound}
                  </span>
                  <button 
                    onClick={() => setCurrentRound(prev => Math.min(30, prev + 1))}
                    className="p-1 hover:bg-accent rounded"
                  >
                    ▶
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {fixtures.map((match) => (
                  <div key={match.id} className="grid grid-cols-7 items-center p-3 hover:bg-accent/50 transition-colors text-center">
                    <div className="col-span-3 text-right font-semibold truncate pr-2">
                      {match.home_team?.name}
                    </div>
                    <div className="col-span-1 flex flex-col items-center justify-center gap-1">
                      {match.status === 'finished' ? (
                        <div className="flex items-center gap-2 bg-primary/10 px-2 py-0.5 rounded font-black text-primary text-sm">
                          <span>{match.home_goals}</span>
                          <span className="text-[10px] text-muted-foreground">x</span>
                          <span>{match.away_goals}</span>
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          19:30
                        </div>
                      )}
                    </div>
                    <div className="col-span-3 text-left font-semibold truncate pl-2">
                      {match.away_team?.name}
                    </div>
                  </div>
                ))}
                {fixtures.length === 0 && (
                   <div className="py-10 text-center text-muted-foreground italic text-sm">
                     Nenhuma partida encontrada para esta rodada.
                   </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
