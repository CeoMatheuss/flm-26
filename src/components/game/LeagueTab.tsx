import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, Loader2, CheckCircle2, Calendar, Target, Swords, 
  TrendingUp, Users, Star, Newspaper, MessageSquare, 
  ChevronLeft, ChevronRight, Activity, Zap
} from 'lucide-react';
import { ClubShield } from './ClubShield';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  clubName: string;
  country?: string;
  clubPlayers?: any[];
}

export function LeagueTab({ clubName, clubPlayers }: Props) {
  const navigate = useNavigate();
  const [standings, setStandings] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [leagueInfo, setLeagueInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState(1);
  const [playerStats, setPlayerStats] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState('standings');

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: teamData } = await supabase
      .from('world_teams')
      .select('*, world_leagues(*, country_ref:world_countries(*))')
      .eq('user_id', user.id)
      .maybeSingle();

    if (teamData && teamData.league_id) {
      const league = teamData.world_leagues;
      setLeagueInfo({
        id: teamData.league_id,
        name: league?.name || 'Liga',
        country: league?.country,
        division: league?.division || 1,
        flag: (league as any)?.country_ref?.flag_emoji || '⚽',
        playerTeamId: teamData.id,
        currentRound: league?.current_round || 1
      });
      setCurrentRound(league?.current_round || 1);

      // 🤖 A simulação de bots agora é tratada centralmente via banco de dados ou worker,
      // mas mantemos a visualização sincronizada com as partidas reais.
      console.log(`[League] Carregando partidas e estatísticas da liga...`);

      const { data: standingsData } = await supabase
        .from('world_league_table')
        .select(`
          *, 
          world_teams (
            id,
            name, 
            logo, 
            is_bot,
            user_id
          )
        `)
        .eq('league_id', teamData.league_id)
        .order('points', { ascending: false })
        .order('goals_for', { ascending: false });
      
      if (standingsData) {
        const teamIds = standingsData.map(r => r.world_teams?.user_id).filter(Boolean);
        const { data: clubsData } = await supabase
          .from('clubs')
          .select('*')
          .in('user_id', teamIds);

        const teamNames = standingsData.map(r => r.world_teams?.name).filter(Boolean);
        const { data: shieldsData } = await supabase.rpc('get_club_shields_by_names', { _names: teamNames });
        const shieldByName = new Map<string, any>((shieldsData || []).map((s: any) => [s.club_name, s.shield]));

        const enhancedStandings = standingsData.map(row => {
          const club = clubsData?.find(c => c.user_id === row.world_teams?.user_id);
          const shieldFromSave = shieldByName.get(row.world_teams?.name);
          return {
            ...row,
            world_teams: {
              ...row.world_teams,
              ...club, 
              shield_config: shieldFromSave || (club as any)?.shield_config,
            }
          };
        });
        setStandings(enhancedStandings);
      }

      const { data: fixturesData } = await supabase
        .from('world_matches')
        .select(`
          *, 
          home_team:world_teams!world_matches_home_team_id_fkey(id, name, logo, is_bot, user_id), 
          away_team:world_teams!world_matches_away_team_id_fkey(id, name, logo, is_bot, user_id)
        `)
        .eq('league_id', teamData.league_id)
        .order('round', { ascending: true })
        .order('scheduled_at', { ascending: true });
      
      if (fixturesData) {
        const userIds = [
          ...fixturesData.map(f => f.home_team?.user_id),
          ...fixturesData.map(f => f.away_team?.user_id)
        ].filter(Boolean);

        const { data: clubsData } = await supabase
          .from('clubs')
          .select('*')
          .in('user_id', userIds);

        const allNames = [
          ...fixturesData.map(f => f.home_team?.name),
          ...fixturesData.map(f => f.away_team?.name)
        ].filter(Boolean);
        const { data: shieldsData } = await supabase.rpc('get_club_shields_by_names', { _names: allNames });
        const shieldByName = new Map<string, any>((shieldsData || []).map((s: any) => [s.club_name, s.shield]));

        const enhanceTeam = (t: any) => {
          const club = clubsData?.find(c => c.user_id === t?.user_id);
          return {
            ...t,
            ...club,
            shield_config: shieldByName.get(t?.name) || (club as any)?.shield_config,
          };
        };

        const enhancedFixtures = fixturesData.map(match => ({
          ...match,
          home_team: enhanceTeam(match.home_team),
          away_team: enhanceTeam(match.away_team),
        }));
        setFixtures(enhancedFixtures);
      }

      const { data: statsData, error: statsError } = await supabase
        .from('player_competition_stats')
        .select('*')
        .eq('competition_id', teamData.league_id)
        .eq('season', new Date().getFullYear())
        .order('goals', { ascending: false })
        .limit(100);

      if (statsError) console.error('[LeagueTab] stats error', statsError);

      if (statsData && statsData.length > 0) {
        const playerIds = [...new Set(statsData.map(s => s.player_id).filter(Boolean))];
        const teamIds = [...new Set(statsData.map(s => s.team_id).filter(Boolean))];

        const [{ data: playersData }, { data: teamsData }] = await Promise.all([
          supabase.from('world_players').select('id, name, position').in('id', playerIds),
          supabase.from('world_teams').select('id, name, logo').in('id', teamIds),
        ]);

        const playerMap = new Map((playersData || []).map(p => [p.id, p]));
        const teamMap = new Map((teamsData || []).map(t => [t.id, t]));

        const enriched = statsData.map(s => ({
          ...s,
          player: playerMap.get(s.player_id) || { name: 'Jogador', position: '-' },
          team: teamMap.get(s.team_id) || { name: 'Time', logo: null },
        }));
        setPlayerStats(enriched);
      } else {
        setPlayerStats([]);
      }

    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    
    // Set up realtime subscription for matches, table and player stats
    const channel = supabase.channel('league_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'world_matches' }, () => {
        loadData();
        window.dispatchEvent(new CustomEvent('league_match_updated'));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'world_league_table' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'world_leagues' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_competition_stats' }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Derive current round from actual match progression: the first round
  // that still has at least one non-finished match. If all are finished,
  // use the highest round number. Falls back to stored value if no fixtures.
  const derivedRound = useMemo(() => {
    if (!fixtures || fixtures.length === 0) return currentRound;
    const rounds = Array.from(new Set(fixtures.map(f => f.round))).sort((a, b) => a - b);
    for (const r of rounds) {
      const matches = fixtures.filter(f => f.round === r);
      const allFinished = matches.every(m => m.status === 'finished');
      if (!allFinished) return r;
    }
    return rounds[rounds.length - 1];
  }, [fixtures, currentRound]);

  // Sync displayed round with progression and keep leagueInfo aligned
  useEffect(() => {
    if (derivedRound && derivedRound !== currentRound) {
      setCurrentRound(derivedRound);
      setLeagueInfo((prev: any) => prev ? { ...prev, currentRound: derivedRound } : prev);
    }
  }, [derivedRound]);

  const roundMatches = useMemo(() => {
    return fixtures.filter(f => f.round === currentRound);
  }, [fixtures, currentRound]);

  const topScorers = useMemo(() => {
    return [...playerStats].sort((a, b) => b.goals - a.goals).slice(0, 30);
  }, [playerStats]);

  const topAssists = useMemo(() => {
    return [...playerStats].sort((a, b) => b.assists - a.assists).slice(0, 30);
  }, [playerStats]);

  const topRatings = useMemo(() => {
    return [...playerStats].filter(s => s.games_played >= 3).sort((a, b) => b.avg_rating - a.avg_rating).slice(0, 30);
  }, [playerStats]);

  if (loading && standings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Sincronizando com a federação...</p>
      </div>
    );
  }

  if (!leagueInfo) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground/20" />
          <h3 className="text-lg font-bold">Liga não encontrada</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Você ainda não está inscrito em uma liga. Aguarde a próxima temporada.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-2xl border border-primary/20">
            {leagueInfo.flag}
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              {leagueInfo.name}
              <Badge variant="secondary" className="text-[10px] uppercase">{leagueInfo.country}</Badge>
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3 text-emerald-500" /> Temporada Ativa
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 text-blue-500" /> Rodada {leagueInfo.currentRound}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Badge variant="outline" className="bg-yellow-500/5 text-yellow-500 border-yellow-500/20 px-3 py-1">
            Mundial (1º)
          </Badge>
          <Badge variant="outline" className="bg-emerald-500/5 text-emerald-500 border-emerald-500/20 px-3 py-1">
            Libertadores (2º-8º)
          </Badge>
          <Badge variant="outline" className="bg-red-500/5 text-red-500 border-red-500/20 px-3 py-1">
            Rebaixamento
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 h-auto p-1 bg-muted/50">
          <TabsTrigger value="standings" className="text-[10px] md:text-xs py-2">Tabela</TabsTrigger>
          <TabsTrigger value="matches" className="text-[10px] md:text-xs py-2">Jogos</TabsTrigger>
          <TabsTrigger value="prizes" className="text-[10px] md:text-xs py-2">Premiação</TabsTrigger>
          <TabsTrigger value="stats" className="text-[10px] md:text-xs py-2">Estatísticas</TabsTrigger>
          <TabsTrigger value="info" className="text-[10px] md:text-xs py-2">Info</TabsTrigger>
        </TabsList>

        {/* TAB: STANDINGS */}
        <TabsContent value="standings" className="mt-4">
          <Card className="overflow-hidden border-none shadow-md">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10 text-center font-bold">#</TableHead>
                      <TableHead className="min-w-[180px]">Clube</TableHead>
                      <TableHead className="text-center w-12">P</TableHead>
                      <TableHead className="text-center w-10">J</TableHead>
                      <TableHead className="text-center w-10">V</TableHead>
                      <TableHead className="text-center w-10">E</TableHead>
                      <TableHead className="text-center w-10">D</TableHead>
                      <TableHead className="text-center w-12 hidden md:table-cell">GP</TableHead>
                      <TableHead className="text-center w-12 hidden md:table-cell">GC</TableHead>
                      <TableHead className="text-center w-12">SG</TableHead>
                      <TableHead className="text-center w-32">Últimos 5</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.slice(0, 16).map((row, i) => {
                      const isPlayerTeam = row.team_id === leagueInfo.playerTeamId;
                      const diff = (row.goals_for || 0) - (row.goals_against || 0);
                      // Banco salva em W/D/L (Win/Draw/Loss). Convertemos para V/E/D (Vitória/Empate/Derrota).
                      const rawForm = (row.last_5_games || '-----').padEnd(5, '-').slice(-5);
                      const form = rawForm.split('').map(c => {
                        if (c === 'W') return 'V';
                        if (c === 'D') return 'E'; // Draw = Empate
                        if (c === 'L') return 'D'; // Loss = Derrota
                        return c; // já em V/E/D ou '-'
                      });
                      
                      // Decoration colors
                      let posColor = "text-muted-foreground";
                      let rowBg = isPlayerTeam ? "bg-primary/10 hover:bg-primary/20" : "hover:bg-accent/50";
                      
                      if (i < 1) posColor = "text-yellow-500 font-black"; // Super Mundial (1º)
                      else if (i < 8) posColor = "text-emerald-500 font-black"; // Libertadores (2º ao 8º)
                      else if (i >= 12) posColor = "text-red-500 font-bold"; // Rebaixamento (Z4: 13º, 14º, 15º, 16º)

                      return (
                        <TableRow key={row.id} className={`${rowBg} transition-colors border-b border-border/40`}>
                          <TableCell className={`text-center text-xs ${posColor}`}>
                            {i + 1}
                          </TableCell>
                          <TableCell className="cursor-pointer group/row" onClick={() => navigate(`/club?name=${encodeURIComponent(row.world_teams?.name)}`)}>
                            <div className="flex items-center gap-3">
                              <div className="shrink-0 flex items-center justify-center">
                                <ClubShield 
                                  club={{
                                    ...row.world_teams,
                                    // Map possible DB field names to what ClubShield expects
                                    primaryColor: row.world_teams?.primary_color || row.world_teams?.primaryColor,
                                    secondaryColor: row.world_teams?.secondary_color || row.world_teams?.secondaryColor,
                                    shieldPattern: row.world_teams?.shield_pattern || row.world_teams?.shieldPattern,
                                    shieldShape: row.world_teams?.shield_shape || row.world_teams?.shieldShape,
                                    shieldConfig: row.world_teams?.shield_config || row.world_teams?.shieldConfig,
                                    logoUrl: row.world_teams?.logo_url || row.world_teams?.logoUrl || row.world_teams?.logo
                                  }}
                                  size={28}
                                  className="drop-shadow-sm group-hover/row:scale-110 transition-transform"
                                  fallbackText={row.world_teams?.name}
                                />
                              </div>
                              <div className="flex flex-col">
                                <span className={`text-sm truncate max-w-[120px] md:max-w-none group-hover/row:text-primary transition-colors ${isPlayerTeam ? 'font-black text-primary' : 'font-medium'}`}>
                                  {isPlayerTeam ? clubName : row.world_teams?.name}
                                </span>
                                {isPlayerTeam && <span className="text-[8px] uppercase tracking-tighter text-primary font-bold">Seu Clube</span>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-black text-sm">{row.points}</TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">{row.played}</TableCell>
                          <TableCell className="text-center text-xs">{row.wins}</TableCell>
                          <TableCell className="text-center text-xs">{row.draws}</TableCell>
                          <TableCell className="text-center text-xs">{row.losses}</TableCell>
                          <TableCell className="text-center text-xs hidden md:table-cell">{row.goals_for}</TableCell>
                          <TableCell className="text-center text-xs hidden md:table-cell">{row.goals_against}</TableCell>
                          <TableCell className={`text-center text-xs font-bold ${diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-red-500' : ''}`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center justify-center gap-1.5">
                              {form.map((res, idx) => {
                                const bgColor = 
                                  res === 'V' ? 'bg-[#22c55e]' : // Green
                                  res === 'E' ? 'bg-[#94a3b8]' : // Gray/Slate
                                  res === 'D' ? 'bg-[#ef4444]' : // Red
                                  'bg-muted/30';
                                
                                const label = 
                                  res === 'V' ? 'V' : 
                                  res === 'E' ? 'E' : 
                                  res === 'D' ? 'D' : 
                                  '';

                                return (
                                  <div 
                                    key={idx} 
                                    className={`w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-black text-white shadow-sm border border-black/10
                                      ${bgColor} transition-transform hover:scale-110 cursor-default`}
                                    title={res === 'V' ? 'Vitória' : res === 'E' ? 'Empate' : res === 'D' ? 'Derrota' : 'Sem jogo'}
                                  >
                                    {label}
                                  </div>
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: MATCHES */}
        <TabsContent value="matches" className="mt-4">
          <div className="space-y-4">
             <div className="flex items-center justify-between bg-card p-3 rounded-lg border">
                <button onClick={() => setCurrentRound(r => Math.max(1, r - 1))} className="p-2 hover:bg-accent rounded-full"><ChevronLeft className="h-5 w-5" /></button>
                <div className="text-center">
                  <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Campeonato Mundial</span>
                  <h3 className="text-lg font-black">Rodada {currentRound}</h3>
                </div>
                <button onClick={() => setCurrentRound(r => Math.min(30, r + 1))} className="p-2 hover:bg-accent rounded-full"><ChevronRight className="h-5 w-5" /></button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               {roundMatches.map(match => (
                 <Card key={match.id} className="hover:border-primary/30 transition-all cursor-pointer overflow-hidden group">
                   <CardContent className="p-4">
                     <div className="grid grid-cols-7 items-center gap-2">
                        <div className="col-span-3 text-right space-y-1 cursor-pointer group/home" onClick={() => navigate(`/club?name=${encodeURIComponent(match.home_team?.name)}`)}>
                          <p className="text-sm font-bold truncate group-hover/home:text-primary transition-colors">{match.home_team?.name}</p>
                           <div className="flex justify-end gap-1">
                              <ClubShield 
                                club={{
                                  ...match.home_team,
                                  primaryColor: match.home_team?.primary_color || match.home_team?.primaryColor,
                                  secondaryColor: match.home_team?.secondary_color || match.home_team?.secondaryColor,
                                  shieldConfig: match.home_team?.shield_config || match.home_team?.shieldConfig,
                                  logoUrl: match.home_team?.logo_url || match.home_team?.logoUrl || match.home_team?.logo
                                }} 
                                fallbackText={match.home_team?.name} 
                                size={28} 
                                className="group-hover/home:scale-110 transition-transform"
                              />
                           </div>
                        </div>
                       <div className="col-span-1 flex flex-col items-center gap-1">
                         {match.status === 'finished' ? (
                           <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-md">
                              <span className="text-lg font-black text-primary">{match.home_goals}</span>
                              <span className="text-[10px] text-muted-foreground">x</span>
                              <span className="text-lg font-black text-primary">{match.away_goals}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <div className="text-[10px] font-bold bg-muted px-2 py-1 rounded text-muted-foreground uppercase">
                                {leagueInfo.division === 1 ? '19:30' : 'A def.'}
                              </div>
                            </div>
                          )}
                          {match.status === 'finished' && <Badge variant="outline" className="text-[7px] py-0 px-1 border-emerald-500/20 text-emerald-500">Encerrado</Badge>}
                          {match.stadium && <span className="text-[8px] text-muted-foreground truncate max-w-[80px] mt-1">🏟️ {match.stadium}</span>}
                       </div>
                        <div className="col-span-3 text-left space-y-1 cursor-pointer group/away" onClick={() => navigate(`/club?name=${encodeURIComponent(match.away_team?.name)}`)}>
                          <p className="text-sm font-bold truncate group-hover/away:text-primary transition-colors">{match.away_team?.name}</p>
                           <div className="flex justify-start gap-1">
                              <ClubShield 
                                club={{
                                  ...match.away_team,
                                  primaryColor: match.away_team?.primary_color || match.away_team?.primaryColor,
                                  secondaryColor: match.away_team?.secondary_color || match.away_team?.secondaryColor,
                                  shieldConfig: match.away_team?.shield_config || match.away_team?.shieldConfig,
                                  logoUrl: match.away_team?.logo_url || match.away_team?.logoUrl || match.away_team?.logo
                                }} 
                                fallbackText={match.away_team?.name} 
                                size={28} 
                                className="group-hover/away:scale-110 transition-transform"
                              />
                           </div>
                        </div>
                     </div>
                     
                     {/* Match Events Mini */}
                     {match.match_data?.events?.length > 0 && (
                       <div className="mt-3 pt-3 border-t border-dashed flex flex-wrap justify-center gap-x-4 gap-y-1">
                         {match.match_data.events.slice(0, 4).map((e: any, idx: number) => (
                           <div key={idx} className="flex items-center gap-1 text-[9px] text-muted-foreground">
                             <span>⚽</span>
                             <span className="font-medium">{e.playerName}</span>
                             <span className="font-bold text-primary">{e.minute}'</span>
                           </div>
                         ))}
                       </div>
                     )}
                   </CardContent>
                 </Card>
               ))}
               {roundMatches.length === 0 && (
                 <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl">
                    <Zap className="h-10 w-10 text-muted-foreground/20 mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">Nenhum jogo agendado para esta rodada.</p>
                 </div>
               )}
             </div>
          </div>
        </TabsContent>

        {/* TAB: STATS */}
        <TabsContent value="stats" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Artilheiros */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between border-b bg-muted/20">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-500" /> Artilheiros
                </CardTitle>
                <TrendingUp className="h-3 w-3 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {topScorers.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold w-4 ${i === 0 ? 'text-yellow-500' : ''}`}>{i + 1}</span>
                        <div className="cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/club?name=${encodeURIComponent(s.team?.name)}`)}>
                          <p className="text-xs font-bold">{s.player?.name}</p>
                          <p className="text-[10px] text-muted-foreground">{s.team?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-primary">{s.goals} ⚽</p>
                        <p className="text-[9px] text-muted-foreground">{s.games_played} jogos</p>
                      </div>
                    </div>
                  ))}
                  {topScorers.length === 0 && <div className="p-10 text-center text-xs text-muted-foreground">Aguardando gols...</div>}
                </div>
              </CardContent>
            </Card>

            {/* Assistências */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between border-b bg-muted/20">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" /> Assistências
                </CardTitle>
                <Star className="h-3 w-3 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {topAssists.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold w-4 text-muted-foreground">{i + 1}</span>
                        <div className="cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/club?name=${encodeURIComponent(s.team?.name)}`)}>
                          <p className="text-xs font-bold">{s.player?.name}</p>
                          <p className="text-[10px] text-muted-foreground">{s.team?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-blue-500">{s.assists} 👟</p>
                        <p className="text-[9px] text-muted-foreground">MD {s.games_played}</p>
                      </div>
                    </div>
                  ))}
                  {topAssists.length === 0 && <div className="p-10 text-center text-xs text-muted-foreground">Aguardando passes...</div>}
                </div>
              </CardContent>
            </Card>

            {/* Melhores Notas */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between border-b bg-muted/20">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" /> Melhores Notas
                </CardTitle>
                <Activity className="h-3 w-3 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {topRatings.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold w-4 text-muted-foreground">{i + 1}</span>
                        <div className="cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/club?name=${encodeURIComponent(s.team?.name)}`)}>
                          <p className="text-xs font-bold">{s.player?.name}</p>
                          <p className="text-[10px] text-muted-foreground">{s.team?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 font-black text-[10px]">
                          {Number(s.avg_rating).toFixed(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {topRatings.length === 0 && <div className="p-10 text-center text-xs text-muted-foreground">Processando notas...</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        {/* TAB: PRIZES */}
        <TabsContent value="prizes" className="mt-4">
          <Card>
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" /> Tabela de Premiação por Posição
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow>
                      <TableHead className="w-20 text-center font-bold">Posição</TableHead>
                      <TableHead>Classificação</TableHead>
                      <TableHead className="text-right font-bold">Premiação (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { pos: 1, label: "Campeão", prize: 18000000, color: "text-emerald-500 font-black bg-emerald-500/5" },
                      { pos: 2, label: "Vice-Campeão", prize: 15000000, color: "text-emerald-400 font-bold bg-emerald-400/5" },
                      { pos: 3, label: "3º Lugar", prize: 13000000, color: "text-emerald-400 bg-emerald-400/5" },
                      { pos: 4, label: "4º Lugar", prize: 11000000, color: "text-emerald-400 bg-emerald-400/5" },
                      { pos: 5, label: "Libertadores", prize: 9000000, color: "text-emerald-500 bg-emerald-500/5" },
                      { pos: 6, label: "Libertadores", prize: 8000000, color: "text-emerald-500 bg-emerald-500/5" },
                      { pos: 7, label: "Libertadores", prize: 7000000, color: "text-emerald-500 bg-emerald-500/5" },
                      { pos: 8, label: "Libertadores", prize: 6000000, color: "text-emerald-500 bg-emerald-500/5" },
                      { pos: 9, label: "Meio de Tabela", prize: 5000000, color: "" },
                      { pos: 10, label: "Meio de Tabela", prize: 4500000, color: "" },
                      { pos: 11, label: "Meio de Tabela", prize: 4000000, color: "" },
                      { pos: 12, label: "Meio de Tabela", prize: 3500000, color: "" },
                      { pos: 13, label: "Permanência", prize: 3000000, color: "" },
                      { pos: 14, label: "Rebaixamento", prize: 2500000, color: "text-red-400 bg-red-400/5" },
                      { pos: 15, label: "Rebaixamento", prize: 2000000, color: "text-red-500 bg-red-500/5" },
                      { pos: 16, label: "Rebaixamento", prize: 1500000, color: "text-red-600 bg-red-600/5" },
                    ].map((row) => (
                      <TableRow key={row.pos} className={row.pos % 2 === 0 ? "bg-muted/5" : ""}>
                        <TableCell className="text-center font-bold">{row.pos}º</TableCell>
                        <TableCell className="py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${row.color || "bg-muted text-muted-foreground"}`}>
                            {row.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">
                          R$ {row.prize.toLocaleString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="p-4 bg-emerald-500/5 text-[10px] text-emerald-600 font-bold border-t border-emerald-500/20 flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" />
                Premiações sincronizadas. O valor será depositado automaticamente após a 38ª rodada.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: INFO */}
        <TabsContent value="info" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-card to-primary/5">
              <CardHeader>
                <CardTitle className="text-sm">Regulamento da Liga</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-3 text-muted-foreground">
                <p>• 20 clubes disputam o título em turno e returno (38 rodadas).</p>
                <p>• <span className="text-yellow-500 font-bold">1º Lugar:</span> Vaga direta para o Mundial de Clubes.</p>
                <p>• <span className="text-emerald-500 font-bold">G2-G8:</span> Classificação para a Libertadores.</p>
                <p>• <span className="text-red-500 font-bold">Z4:</span> Rebaixamento para a divisão inferior.</p>
                <div className="p-3 bg-background/50 rounded-lg border border-dashed mt-4">
                  <p className="font-bold text-foreground mb-1">Critérios de Desempate:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Maior número de vitórias</li>
                    <li>Melhor saldo de gols</li>
                    <li>Mais gols pró</li>
                    <li>Confronto direto</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-500" /> Próxima Partida
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                <Swords className="h-10 w-10 text-amber-500/20 mb-3" />
                <p className="text-sm font-bold">Preparação para a Rodada {leagueInfo.currentRound + 1}</p>
                <p className="text-xs text-muted-foreground mt-1">Verifique suas táticas e escalação antes do kickoff.</p>
                <Badge variant="secondary" className="mt-4">Kickoff hoje às 19:30 BRT</Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}