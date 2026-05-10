import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Globe, Trophy, Loader2, Users, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  onBack?: () => void;
}

export function ChampionshipsTab({ onBack }: Props) {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);

  // Sincroniza rodada inicial com a data atual (considerando que cada dia é uma rodada)
  useEffect(() => {
    const day = new Date().getDate();
    setCurrentRound(day);
  }, []);

  useEffect(() => {
    const loadLeagues = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('world_leagues')
        .select('*')
        .eq('active', true)
        .order('division_level', { ascending: true });
      
      if (data) {
        setLeagues(data.map((d: any) => ({
          id: d.id,
          name: d.name,
          level: d.division_level,
          country_name: 'Brasil', // Default for now
          country_code: 'BR',
          match_time: '19:30:00'
        })));
      }
      setLoading(false);
    };
    loadLeagues();
  }, []);

  useEffect(() => {
    if (!selectedLeagueId) return;

    const loadDetails = async () => {
      setLoadingDetails(true);
      const [{ data: standingsData }, { data: fixturesData }] = await Promise.all([
        supabase
          .from('world_league_table')
          .select('*, world_teams(name, logo)')
          .eq('league_id', selectedLeagueId)
          .order('points', { ascending: false })
          .order('goals_for', { ascending: false }),
        supabase
          .from('world_matches')
          .select('*, home_team:world_teams!world_matches_home_team_id_fkey(name), away_team:world_teams!world_matches_away_team_id_fkey(name)')
          .eq('league_id', selectedLeagueId)
          .eq('round', currentRound)
          .order('scheduled_at', { ascending: true }),
      ]);
      if (standingsData) setStandings(standingsData);
      if (fixturesData) setFixtures(fixturesData);
      setLoadingDetails(false);
    };
    loadDetails();

    // 🔴 Realtime: refresh standings + fixtures on any change in this league
    const channel = supabase
      .channel(`championship-${selectedLeagueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'world_matches', filter: `league_id=eq.${selectedLeagueId}` }, () => loadDetails())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'world_league_table', filter: `league_id=eq.${selectedLeagueId}` }, () => loadDetails())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedLeagueId, currentRound]);

  if (selectedLeagueId) {
    const league = leagues.find(l => l.id === selectedLeagueId);
    return (
      <div className="space-y-4 animate-in slide-in-from-right duration-300">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedLeagueId(null)} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" /> {league?.name} - {league?.country_name}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm">Classificação</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-center w-10">P</TableHead>
                      <TableHead className="text-center w-10">J</TableHead>
                      <TableHead className="text-center w-10">SG</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map((row, i) => (
                      <TableRow key={row.team_id}>
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell className="text-sm font-medium">{row.world_teams?.name || 'Time'}</TableCell>
                        <TableCell className="text-center font-bold">{row.points}</TableCell>
                        <TableCell className="text-center text-xs">{row.played}</TableCell>
                        <TableCell className="text-center text-xs">{row.goals_for - row.goals_against}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Rodada {currentRound}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setCurrentRound(r => Math.max(1, r - 1))}>◀</Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setCurrentRound(r => Math.min(30, r + 1))}>▶</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {fixtures.map((match) => (
                  <div key={match.id} className="p-2 text-[11px] grid grid-cols-7 items-center text-center">
                    <div className="col-span-3 truncate text-right font-medium">{match.home_team?.name}</div>
                    <div className="col-span-1 font-bold text-primary px-1">
                      {match.status === 'finished' ? `${match.home_goals}x${match.away_goals}` : 'vs'}
                    </div>
                    <div className="col-span-3 truncate text-left font-medium">{match.away_team?.name}</div>
                  </div>
                ))}
                {fixtures.length === 0 && !loadingDetails && (
                  <p className="p-4 text-center text-xs text-muted-foreground italic">Nenhum jogo nesta rodada</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" /> Campeonatos Globais
        </h2>
        {onBack && <Button variant="ghost" size="sm" onClick={onBack}>Voltar</Button>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse h-24 bg-muted/20" />
          ))
        ) : leagues.map(league => (
          <Card
            key={league.id}
            className="cursor-pointer hover:border-primary/50 transition-all hover:scale-[1.02]"
            onClick={() => setSelectedLeagueId(league.id)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                  🏆
                </div>
                <div>
                  <p className="font-bold text-sm">{league.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">{league.country_name}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[9px]">{league.match_time.slice(0, 5)}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
