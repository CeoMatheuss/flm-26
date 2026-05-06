import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Trophy, Target, Layers, Loader2, UserPlus, CheckCircle2, Calendar } from 'lucide-react';
import { LeaguesOverview } from './LeaguesOverview';
import { CupBracketView } from './CupBracketView';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CupCompetition {
  id: string;
  name: string;
  cup_type: string;
  country: string | null;
  status: string;
}

interface LeagueInfo {
  league_id: string;
  league_name: string;
  status: string;
  team_count: number;
  player_team_id: string;
}

interface Props {
  clubName: string;
  country?: string;
  clubPlayers?: any[];
}

export function LeagueTab({ clubName, country, clubPlayers }: Props) {
  const [standings, setStandings] = useState<any[]>([]);
  const [leagueInfo, setLeagueInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load user team and league info
    const { data: teamData } = await supabase
      .from('world_teams')
      .select('*, world_leagues(name)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (teamData && teamData.league_id) {
      setLeagueInfo({
        league_id: teamData.league_id,
        league_name: teamData.world_leagues?.name || 'Liga Mundial',
        player_team_id: teamData.id,
        status: 'in_progress'
      });
      
      const { data: standingsData } = await supabase
        .from('world_league_table')
        .select('*')
        .eq('league_id', teamData.league_id)
        .order('points', { ascending: false })
        .order('goals_for', { ascending: false });
      
      if (standingsData) {
        setStandings(standingsData);
      }
    } else {
      setLeagueInfo(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [country, clubName]);

  const topScorers = useMemo(() => {
    return (clubPlayers || []).filter(p => (p.goals ?? 0) > 0)
      .map(p => ({ name: p.name, team: clubName, goals: p.goals ?? 0 }))
      .sort((a, b) => b.goals - a.goals).slice(0, 10);
  }, [clubPlayers, clubName]);

  const topAssisters = useMemo(() => {
    return (clubPlayers || []).filter(p => (p.assists ?? 0) > 0)
      .map(p => ({ name: p.name, team: clubName, assists: p.assists ?? 0 }))
      .sort((a, b) => b.assists - a.assists).slice(0, 10);
  }, [clubPlayers, clubName]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground italic">Carregando informações da liga...</p>
      </div>
    );
  }

  if (selectedCupId) {
    return <CupBracketView cupId={selectedCupId} onBack={() => setSelectedCupId(null)} />;
  }

  if (showAllLeagues || !leagueInfo) {
    return (
      <LeaguesOverview 
        currentCountry={country} 
        clubName={clubName} 
        onBack={() => setShowAllLeagues(false)} 
        onJoin={handleJoinLeague}
        isJoining={joining}
      />
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
            {leagueInfo.status === 'in_progress' ? '● Em Andamento' : '○ Aguardando'}
          </Badge>
        </div>
        <div className="flex gap-2">
          {cups.length > 0 && (
            <div className="flex gap-1">
              {cups.map(cup => (
                <Button
                  key={cup.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCupId(cup.id)}
                  className="gap-1 text-[10px] h-7"
                >
                  <Trophy className="h-3 w-3" />
                  {cup.name.length > 15 ? cup.name.slice(0, 15) + '…' : cup.name}
                </Button>
              ))}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowAllLeagues(true)} className="gap-1.5 text-xs">
            <Globe className="h-3.5 w-3.5" /> Outras Ligas
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Classificação</CardTitle>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Temporada Atual</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-center w-10">J</TableHead>
                  <TableHead className="text-center w-10">V</TableHead>
                  <TableHead className="text-center w-10 font-bold">P</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((row, i) => {
                  const isPlayerTeam = row.user_id === leagueInfo.player_team_id || row.club_name === clubName;
                  return (
                    <TableRow key={row.team_id} className={`${isPlayerTeam ? 'bg-primary/15 font-semibold' : ''} border-b border-border/40`}>
                      <TableCell className={i === 0 ? 'text-yellow-400 font-black' : i < 4 ? 'text-emerald-400 font-bold' : i >= standings.length - 4 ? 'text-red-400 font-bold' : 'text-muted-foreground'}>
                        {i + 1}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <span className="text-base">{row.club_logo || '⚽'}</span>
                          <span className="truncate max-w-[120px] sm:max-w-none">{row.club_name}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-xs">{row.mp}</TableCell>
                      <TableCell className="text-center text-xs">{row.w}</TableCell>
                      <TableCell className="text-center font-black text-primary">{row.pts}</TableCell>
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
                <Calendar className="h-4 w-4 text-primary" /> Status da Liga
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Times inscritos:</span>
                <span className="font-bold">{leagueInfo.team_count} / 16</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500" 
                  style={{ width: `${(leagueInfo.team_count / 16) * 100}%` }}
                />
              </div>
              {leagueInfo.status === 'waiting' && (
                <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded text-[10px] text-amber-500 font-medium">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Aguardando outros times para iniciar...
                </div>
              )}
              {leagueInfo.status === 'in_progress' && (
                <div className="flex items-center gap-2 p-2 bg-emerald-500/10 rounded text-[10px] text-emerald-500 font-bold">
                  <CheckCircle2 className="h-3 w-3" />
                  A liga começou! Boa sorte.
                </div>
              )}
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
                {topScorers.slice(0, 3).map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                    <span className="truncate">{s.name}</span>
                    <span className="font-bold">{s.goals} ⚽</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
