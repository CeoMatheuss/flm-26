import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, Users, Swords, Target, ArrowLeft, Medal, TrendingUp, Shield } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  format: string;
  status: string;
  max_teams: number;
  prize_1st: number;
  prize_2nd: number;
  prize_3rd: number;
  start_date: string | null;
  match_time: string;
  country: string;
}

interface TournamentTeam {
  id: string;
  club_name: string;
  club_logo: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  played: number;
  group_letter: string | null;
  is_bot: boolean;
  bot_strength: number;
  eliminated: boolean;
}

interface TournamentMatch {
  id: string;
  home_team_id: string;
  away_team_id: string;
  round: number;
  stage: string | null;
  status: string;
  home_goals: number | null;
  away_goals: number | null;
  scheduled_at: string | null;
}

interface Props {
  onExpand?: (tournamentId: string) => void;
}

export function TournamentDashboardCard({ onExpand }: Props) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teamsMap, setTeamsMap] = useState<Record<string, TournamentTeam[]>>({});
  const [matchesMap, setMatchesMap] = useState<Record<string, TournamentMatch[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('custom_tournaments')
        .select('*')
        .in('status', ['in_progress', 'registration'])
        .order('created_at', { ascending: false })
        .limit(10);
      if (data && data.length > 0) {
        setTournaments(data as any);
        // Load teams/matches for all tournaments
        const ids = data.map(d => d.id);
        const [teamsRes, matchesRes] = await Promise.all([
          supabase.from('custom_tournament_teams').select('*').in('tournament_id', ids).order('points', { ascending: false }),
          supabase.from('custom_tournament_matches').select('*').in('tournament_id', ids).order('round', { ascending: true }),
        ]);
        const tMap: Record<string, TournamentTeam[]> = {};
        const mMap: Record<string, TournamentMatch[]> = {};
        ids.forEach(id => { tMap[id] = []; mMap[id] = []; });
        (teamsRes.data as any[] || []).forEach((t: any) => { if (tMap[t.tournament_id]) tMap[t.tournament_id].push(t); });
        (matchesRes.data as any[] || []).forEach((m: any) => { if (mMap[m.tournament_id]) mMap[m.tournament_id].push(m); });
        setTeamsMap(tMap);
        setMatchesMap(mMap);
      }
    };
    load();
  }, []);

  if (tournaments.length === 0) return null;

  // If expanded, show full view inline
  if (expandedId) {
    return <TournamentExpandedView tournamentId={expandedId} onClose={() => setExpandedId(null)} />;
  }

  const formatLabels: Record<string, string> = {
    league: 'Liga',
    knockout: 'Mata-mata',
    group_knockout: 'Grupos',
  };

  return (
    <Card className="game-card-accent">
      <CardHeader className="section-header pb-1 px-3 pt-3">
        <CardTitle className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Trophy className="h-3.5 w-3.5 text-primary" /> Campeonatos Ativos
          <Badge variant="outline" className="text-[8px] ml-auto">{tournaments.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-1.5">
        {tournaments.map(t => {
          const teams = teamsMap[t.id] || [];
          const matches = matchesMap[t.id] || [];
          const played = matches.filter(m => m.status === 'played').length;
          const sorted = [...teams].sort((a, b) => b.points - a.points || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against));
          const leader = sorted[0];

          return (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-lg bg-accent/20 hover:bg-accent/40 px-2.5 py-2 transition-colors cursor-pointer"
              onClick={() => setExpandedId(t.id)}
            >
              <Trophy className="h-3.5 w-3.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate">{t.name}</p>
                <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground">
                  <span>{formatLabels[t.format] || t.format}</span>
                  <span>•</span>
                  <span>{teams.length} times</span>
                  <span>•</span>
                  <span>{played}/{matches.length} jogos</span>
                  {leader && (
                    <>
                      <span>•</span>
                      <span className="text-primary font-bold">👑 {leader.club_name.slice(0, 10)}</span>
                    </>
                  )}
                </div>
              </div>
              <Badge variant="outline" className={`text-[7px] shrink-0 ${t.status === 'in_progress' ? 'text-success border-success/30' : 'text-warning border-warning/30'}`}>
                {t.status === 'in_progress' ? '🟢 Ativo' : '📋 Registro'}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ── EXPANDED FULL PAGE TOURNAMENT VIEW ─────────────────────── */

interface ExpandedProps {
  tournamentId: string;
  onClose: () => void;
}

export function TournamentExpandedView({ tournamentId, onClose }: ExpandedProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'calendar' | 'bracket'>('overview');

  useEffect(() => {
    const load = async () => {
      const [tRes, teamsRes, matchesRes] = await Promise.all([
        supabase.from('custom_tournaments').select('*').eq('id', tournamentId).single(),
        supabase.from('custom_tournament_teams').select('*').eq('tournament_id', tournamentId).order('points', { ascending: false }),
        supabase.from('custom_tournament_matches').select('*').eq('tournament_id', tournamentId).order('round', { ascending: true }),
      ]);
      if (tRes.data) setTournament(tRes.data as any);
      if (teamsRes.data) setTeams(teamsRes.data as any);
      if (matchesRes.data) setMatches(matchesRes.data as any);
    };
    load();
  }, [tournamentId]);

  if (!tournament) return null;

  const getTeamName = (id: string) => teams.find(t => t.id === id)?.club_name || '???';
  const getTeamLogo = (id: string) => teams.find(t => t.id === id)?.club_logo || '⚽';

  const groupLetters = [...new Set(teams.filter(t => t.group_letter).map(t => t.group_letter!))].sort();
  const hasGroups = groupLetters.length > 0;
  const sortedTeams = [...teams].sort((a, b) => b.points - a.points || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against));
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
  const totalPlayed = matches.filter(m => m.status === 'played').length;
  const totalGoals = matches.filter(m => m.status === 'played').reduce((s, m) => s + (m.home_goals || 0) + (m.away_goals || 0), 0);

  const formatLabels: Record<string, string> = {
    league: '🏟️ Liga',
    knockout: '⚔️ Mata-mata',
    group_knockout: '🏟️⚔️ Grupos + Mata-mata',
  };

  const tabs = [
    { key: 'overview' as const, label: 'Visão Geral', icon: TrendingUp },
    ...(hasGroups ? [{ key: 'groups' as const, label: 'Grupos', icon: Target }] : []),
    { key: 'calendar' as const, label: 'Calendário', icon: Calendar },
    ...(tournament.format === 'knockout' || tournament.format === 'group_knockout' ? [{ key: 'bracket' as const, label: 'Chaveamento', icon: Swords }] : []),
  ];

  return (
    <div className="space-y-3 animate-fade-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onClose} className="h-8 px-2 text-xs gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm sm:text-base font-black flex items-center gap-2 truncate">
            <Trophy className="h-4 w-4 text-primary shrink-0" /> {tournament.name}
          </h2>
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
            <Badge variant="outline" className="text-[7px] text-primary border-primary/30">{formatLabels[tournament.format]}</Badge>
            <span>{tournament.country === 'Mundial' ? '🌍 Mundial' : `🏴 ${tournament.country}`}</span>
          </div>
        </div>
      </div>

      {/* Stats banner */}
      <div className="grid grid-cols-5 gap-1.5">
        {[
          { label: 'Times', value: teams.length, icon: '👥' },
          { label: 'Jogos', value: `${totalPlayed}/${matches.length}`, icon: '⚽' },
          { label: 'Gols', value: totalGoals, icon: '🎯' },
          { label: '🥇 1º', value: `R$${(tournament.prize_1st / 1e6).toFixed(1)}M`, icon: '' },
          { label: 'Líder', value: sortedTeams[0]?.club_name?.slice(0, 8) || '-', icon: '👑' },
        ].map((s, i) => (
          <div key={i} className="stat-card text-center">
            <p className="text-[7px] text-muted-foreground">{s.icon} {s.label}</p>
            <p className="text-[10px] sm:text-xs font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-muted/30 rounded-lg p-0.5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 h-7 rounded-md text-[9px] sm:text-[10px] font-semibold flex items-center justify-center gap-1 transition-all ${
              activeTab === tab.key ? 'bg-primary/15 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-3 w-3" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <ScrollArea className="max-h-[60vh]">
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {/* Full standings */}
            <Card className="game-card">
              <CardHeader className="section-header pb-1 px-3 pt-2">
                <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Classificação Geral
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border/30">
                      <th className="text-left pl-1 py-1">#</th>
                      <th className="text-left py-1">Time</th>
                      <th className="text-center py-1 w-5">J</th>
                      <th className="text-center py-1 w-5">V</th>
                      <th className="text-center py-1 w-5">E</th>
                      <th className="text-center py-1 w-5">D</th>
                      <th className="text-center py-1 w-5">GP</th>
                      <th className="text-center py-1 w-5">GC</th>
                      <th className="text-center py-1 w-5">SG</th>
                      <th className="text-center py-1 w-6 font-bold">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeams.map((t, i) => (
                      <tr key={t.id} className={`border-b border-border/10 ${i < 3 ? 'bg-primary/5' : ''} ${t.eliminated ? 'opacity-40' : ''}`}>
                        <td className="pl-1 py-1 font-bold text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                        <td className="py-1 truncate max-w-[100px]">
                          {t.club_logo} <span className={`font-medium ${i < 3 ? 'text-primary' : ''}`}>{t.club_name}</span>
                          {t.is_bot && <span className="ml-0.5 text-[7px] text-muted-foreground">🤖</span>}
                        </td>
                        <td className="text-center py-1">{t.played}</td>
                        <td className="text-center py-1 text-success">{t.wins}</td>
                        <td className="text-center py-1">{t.draws}</td>
                        <td className="text-center py-1 text-destructive">{t.losses}</td>
                        <td className="text-center py-1">{t.goals_for}</td>
                        <td className="text-center py-1">{t.goals_against}</td>
                        <td className="text-center py-1">{t.goals_for - t.goals_against}</td>
                        <td className="text-center py-1 font-black text-primary">{t.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Top Attack / Defense */}
            <div className="grid grid-cols-2 gap-2">
              <Card className="game-card">
                <CardContent className="p-2.5 space-y-1">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">⚽ Melhor Ataque</p>
                  {[...teams].sort((a, b) => b.goals_for - a.goals_for).slice(0, 5).map((t, i) => (
                    <div key={t.id} className="flex items-center justify-between text-[9px] py-0.5">
                      <span className="truncate flex-1">{t.club_logo} {t.club_name}</span>
                      <span className="font-bold text-success ml-1">{t.goals_for}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="game-card">
                <CardContent className="p-2.5 space-y-1">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">🛡️ Melhor Defesa</p>
                  {[...teams].filter(t => t.played > 0).sort((a, b) => a.goals_against - b.goals_against).slice(0, 5).map((t, i) => (
                    <div key={t.id} className="flex items-center justify-between text-[9px] py-0.5">
                      <span className="truncate flex-1">{t.club_logo} {t.club_name}</span>
                      <span className="font-bold text-primary ml-1">{t.goals_against}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="space-y-2">
            {groupLetters.map(letter => {
              const groupTeams = teams
                .filter(t => t.group_letter === letter)
                .sort((a, b) => b.points - a.points || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against));
              const groupMatches = matches.filter(m => m.stage === `Grupo ${letter}`);
              return (
                <Card key={letter} className="game-card-accent">
                  <CardHeader className="pb-1 px-3 pt-2">
                    <CardTitle className="text-xs font-bold flex items-center gap-1">
                      <Target className="h-3 w-3 text-primary" /> Grupo {letter}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-2 space-y-2">
                    <table className="w-full text-[9px]">
                      <thead>
                        <tr className="text-muted-foreground border-b border-border/20">
                          <th className="text-left pl-1 py-0.5">#</th>
                          <th className="text-left py-0.5">Time</th>
                          <th className="text-center py-0.5">J</th>
                          <th className="text-center py-0.5">V</th>
                          <th className="text-center py-0.5">E</th>
                          <th className="text-center py-0.5">D</th>
                          <th className="text-center py-0.5">GP</th>
                          <th className="text-center py-0.5">GC</th>
                          <th className="text-center py-0.5 font-bold">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupTeams.map((t, i) => (
                          <tr key={t.id} className={`${i < 2 ? 'bg-primary/5' : ''} border-t border-border/10`}>
                            <td className="pl-1 py-1 font-bold">{i + 1}</td>
                            <td className="py-1 truncate max-w-[80px] font-medium">{t.club_logo} {t.club_name}</td>
                            <td className="text-center py-1">{t.played}</td>
                            <td className="text-center py-1 text-success">{t.wins}</td>
                            <td className="text-center py-1">{t.draws}</td>
                            <td className="text-center py-1 text-destructive">{t.losses}</td>
                            <td className="text-center py-1">{t.goals_for}</td>
                            <td className="text-center py-1">{t.goals_against}</td>
                            <td className="text-center py-1 font-bold text-primary">{t.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* Group matches */}
                    {groupMatches.length > 0 && (
                      <div className="space-y-0.5">
                        <p className="text-[7px] text-muted-foreground uppercase font-bold">Jogos do Grupo</p>
                        {groupMatches.map(m => (
                          <div key={m.id} className={`flex items-center justify-between p-1 rounded text-[8px] ${m.status === 'played' ? 'bg-success/5 border border-success/10' : 'border border-border/15'}`}>
                            <span className="truncate max-w-[55px]">{getTeamLogo(m.home_team_id)} {getTeamName(m.home_team_id)}</span>
                            <span className="font-bold">{m.status === 'played' ? `${m.home_goals} - ${m.away_goals}` : 'vs'}</span>
                            <span className="truncate max-w-[55px] text-right">{getTeamName(m.away_team_id)} {getTeamLogo(m.away_team_id)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-2">
            {rounds.map(round => {
              const roundMatches = matches.filter(m => m.round === round);
              const stageName = roundMatches[0]?.stage || `Rodada ${round}`;
              const played = roundMatches.filter(m => m.status === 'played').length;
              return (
                <Card key={round} className="game-card">
                  <CardHeader className="pb-1 px-3 pt-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-[10px] font-bold flex items-center gap-1 text-muted-foreground uppercase tracking-wider">
                        <Calendar className="h-3 w-3" /> {stageName}
                      </CardTitle>
                      <Badge variant="outline" className={`text-[7px] ${played === roundMatches.length ? 'text-success border-success/30' : 'text-muted-foreground'}`}>
                        {played}/{roundMatches.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-2 pb-2 space-y-0.5">
                    {roundMatches.map(match => (
                      <div key={match.id} className={`flex items-center justify-between p-1.5 rounded-lg border text-[9px] transition-colors ${match.status === 'played' ? 'border-success/15 bg-success/5' : 'border-border/20 hover:bg-accent/20'}`}>
                        <span className="font-medium truncate max-w-[80px]">{getTeamLogo(match.home_team_id)} {getTeamName(match.home_team_id)}</span>
                        <span className={`font-bold px-2 ${match.status === 'played' ? 'text-primary' : 'text-muted-foreground'}`}>
                          {match.status === 'played' ? `${match.home_goals} - ${match.away_goals}` : 'vs'}
                        </span>
                        <span className="font-medium truncate max-w-[80px] text-right">{getTeamName(match.away_team_id)} {getTeamLogo(match.away_team_id)}</span>
                        {match.scheduled_at && (
                          <span className="text-[7px] text-muted-foreground ml-1 shrink-0">
                            {new Date(match.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === 'bracket' && (
          <div className="space-y-2">
            <Card className="game-card">
              <CardContent className="p-3">
                <p className="text-[9px] text-muted-foreground text-center mb-2">⚔️ Chaveamento Mata-Mata</p>
                {rounds.map(round => {
                  const roundMatches = matches.filter(m => m.round === round);
                  const stageName = roundMatches[0]?.stage || `Rodada ${round}`;
                  return (
                    <div key={round} className="mb-3">
                      <p className="text-[8px] font-bold text-primary uppercase mb-1">{stageName}</p>
                      <div className="space-y-1">
                        {roundMatches.map(m => (
                          <div key={m.id} className={`border rounded-lg overflow-hidden ${m.status === 'played' ? 'border-success/20' : 'border-border/30'}`}>
                            <div className={`flex items-center justify-between px-2 py-1.5 text-[9px] ${m.status === 'played' && m.home_goals !== null && m.away_goals !== null && m.home_goals > m.away_goals ? 'bg-primary/8 font-bold' : ''}`}>
                              <span className="truncate max-w-[100px]">{getTeamLogo(m.home_team_id)} {getTeamName(m.home_team_id)}</span>
                              <span className="font-bold">{m.status === 'played' ? m.home_goals : '-'}</span>
                            </div>
                            <div className="border-t border-border/20" />
                            <div className={`flex items-center justify-between px-2 py-1.5 text-[9px] ${m.status === 'played' && m.home_goals !== null && m.away_goals !== null && m.away_goals > m.home_goals ? 'bg-primary/8 font-bold' : ''}`}>
                              <span className="truncate max-w-[100px]">{getTeamLogo(m.away_team_id)} {getTeamName(m.away_team_id)}</span>
                              <span className="font-bold">{m.status === 'played' ? m.away_goals : '-'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
