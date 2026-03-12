import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Calendar, Users, Swords, Target } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  format: string;
  status: string;
  max_teams: number;
  prize_1st: number;
  start_date: string | null;
  match_time: string;
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

export function TournamentDashboardCard() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [view, setView] = useState<'standings' | 'calendar'>('standings');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('custom_tournaments')
        .select('*')
        .in('status', ['in_progress', 'registration'])
        .order('created_at', { ascending: false })
        .limit(5);
      if (data && data.length > 0) {
        setTournaments(data as any);
        setSelectedId(data[0].id);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const loadData = async () => {
      const [teamsRes, matchesRes] = await Promise.all([
        supabase.from('custom_tournament_teams').select('*').eq('tournament_id', selectedId).order('points', { ascending: false }),
        supabase.from('custom_tournament_matches').select('*').eq('tournament_id', selectedId).order('round', { ascending: true }),
      ]);
      if (teamsRes.data) setTeams(teamsRes.data as any);
      if (matchesRes.data) setMatches(matchesRes.data as any);
    };
    loadData();
  }, [selectedId]);

  if (tournaments.length === 0) return null;

  const selected = tournaments.find(t => t.id === selectedId);
  const getTeamName = (id: string) => teams.find(t => t.id === id)?.club_name || '???';
  const getTeamLogo = (id: string) => teams.find(t => t.id === id)?.club_logo || '⚽';

  // Group teams
  const groupLetters = [...new Set(teams.filter(t => t.group_letter).map(t => t.group_letter!))].sort();
  const hasGroups = groupLetters.length > 0;

  // Upcoming matches
  const upcoming = matches.filter(m => m.status !== 'played').slice(0, 6);
  const recent = matches.filter(m => m.status === 'played').slice(-4);

  const formatLabels: Record<string, string> = {
    league: '🏟️ Liga',
    knockout: '⚔️ Mata-mata',
    group_knockout: '🏟️⚔️ Grupos',
  };

  return (
    <Card className="game-card-accent border-yellow-500/20">
      <CardHeader className="section-header pb-1 px-3 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5 text-yellow-400" /> Campeonatos Ativos
          </CardTitle>
          {tournaments.length > 1 && (
            <div className="flex gap-0.5">
              {tournaments.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`h-5 px-1.5 rounded text-[7px] font-bold transition-colors ${
                    t.id === selectedId
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-muted/20 text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  {t.name.slice(0, 10)}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {selected && (
          <>
            {/* Tournament header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">{selected.name}</span>
                <Badge variant="outline" className="text-[7px] text-yellow-400 border-yellow-500/30">
                  {formatLabels[selected.format] || selected.format}
                </Badge>
              </div>
              <span className="text-[8px] text-muted-foreground">
                🥇 R$ {selected.prize_1st.toLocaleString('pt-BR')}
              </span>
            </div>

            {/* Toggle */}
            <div className="flex gap-0.5 bg-muted/20 rounded p-0.5">
              <button
                onClick={() => setView('standings')}
                className={`flex-1 h-5 rounded text-[8px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                  view === 'standings' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
                }`}
              >
                <Users className="h-2.5 w-2.5" /> Classificação
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`flex-1 h-5 rounded text-[8px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                  view === 'calendar' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
                }`}
              >
                <Calendar className="h-2.5 w-2.5" /> Calendário
              </button>
            </div>

            {view === 'standings' ? (
              <ScrollArea className="max-h-[280px]">
                {hasGroups ? (
                  <div className="space-y-2">
                    {groupLetters.map(letter => {
                      const groupTeams = teams
                        .filter(t => t.group_letter === letter)
                        .sort((a, b) => b.points - a.points || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against));
                      return (
                        <div key={letter}>
                          <p className="text-[9px] font-bold text-primary mb-0.5 flex items-center gap-1">
                            <Target className="h-2.5 w-2.5" /> Grupo {letter}
                          </p>
                          <table className="w-full text-[8px]">
                            <thead>
                              <tr className="text-muted-foreground">
                                <th className="text-left w-3">#</th>
                                <th className="text-left">Time</th>
                                <th className="text-center w-4">J</th>
                                <th className="text-center w-4">V</th>
                                <th className="text-center w-4">E</th>
                                <th className="text-center w-4">D</th>
                                <th className="text-center w-5">SG</th>
                                <th className="text-center w-5 font-bold">P</th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupTeams.map((t, i) => (
                                <tr key={t.id} className={`${i < 2 ? 'bg-emerald-500/8' : ''}`}>
                                  <td className="py-0.5 font-bold">{i + 1}</td>
                                  <td className="py-0.5 truncate max-w-[65px]">{t.club_logo} {t.club_name}</td>
                                  <td className="text-center py-0.5">{t.played}</td>
                                  <td className="text-center py-0.5 text-emerald-400">{t.wins}</td>
                                  <td className="text-center py-0.5">{t.draws}</td>
                                  <td className="text-center py-0.5 text-destructive">{t.losses}</td>
                                  <td className="text-center py-0.5">{t.goals_for - t.goals_against}</td>
                                  <td className="text-center py-0.5 font-bold">{t.points}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* League/Knockout standings */
                  <div className="space-y-0.5">
                    {teams.sort((a, b) => b.points - a.points || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against)).map((t, i) => (
                      <div key={t.id} className={`flex items-center gap-1.5 py-1 px-1 rounded text-[9px] ${i < 3 ? 'bg-emerald-500/8' : ''} ${t.eliminated ? 'opacity-40 line-through' : ''}`}>
                        <span className="w-3 text-center font-bold text-muted-foreground">{i + 1}</span>
                        <span>{t.club_logo}</span>
                        <span className="flex-1 font-semibold truncate">{t.club_name}</span>
                        <span className="text-[7px] text-muted-foreground">{t.played}J</span>
                        <span className="font-bold w-4 text-center">{t.points}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            ) : (
              <ScrollArea className="max-h-[280px]">
                <div className="space-y-2">
                  {/* Recent results */}
                  {recent.length > 0 && (
                    <div>
                      <p className="text-[8px] font-bold text-muted-foreground mb-0.5 uppercase">Últimos Resultados</p>
                      <div className="space-y-0.5">
                        {recent.map(m => (
                          <div key={m.id} className="flex items-center justify-between p-1 rounded bg-emerald-500/5 border border-emerald-500/10 text-[8px]">
                            <span className="truncate max-w-[60px]">{getTeamLogo(m.home_team_id)} {getTeamName(m.home_team_id)}</span>
                            <span className="font-bold px-1">{m.home_goals} - {m.away_goals}</span>
                            <span className="truncate max-w-[60px] text-right">{getTeamName(m.away_team_id)} {getTeamLogo(m.away_team_id)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upcoming */}
                  {upcoming.length > 0 && (
                    <div>
                      <p className="text-[8px] font-bold text-muted-foreground mb-0.5 uppercase">Próximos Jogos</p>
                      <div className="space-y-0.5">
                        {upcoming.map(m => (
                          <div key={m.id} className="flex items-center justify-between p-1 rounded border border-border/20 text-[8px]">
                            <div className="flex items-center gap-0.5 flex-1 min-w-0">
                              <span className="truncate max-w-[55px]">{getTeamLogo(m.home_team_id)} {getTeamName(m.home_team_id)}</span>
                              <span className="text-muted-foreground shrink-0">vs</span>
                              <span className="truncate max-w-[55px]">{getTeamName(m.away_team_id)} {getTeamLogo(m.away_team_id)}</span>
                            </div>
                            <div className="text-[7px] text-muted-foreground shrink-0 ml-1">
                              {m.scheduled_at ? (
                                <>
                                  {new Date(m.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                  {' '}
                                  {new Date(m.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </>
                              ) : (
                                <span>{m.stage || `R${m.round}`}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {upcoming.length === 0 && recent.length === 0 && (
                    <p className="text-[9px] text-muted-foreground text-center py-3">Nenhum jogo gerado ainda.</p>
                  )}
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
