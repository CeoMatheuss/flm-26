import { useEffect, useState } from 'react';
import { Club } from '@/types/game';
import { GameEvent } from '@/types/events';
import { Infrastructure, getStadiumCapacity } from '@/types/infrastructure';
import { ClubProfile } from '@/types/clubProfile';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, DollarSign, Star, Shield, TrendingUp, Flame, Heart, Zap, Swords, Building2, Activity, Calendar, User, Instagram, GraduationCap, Dumbbell, Stethoscope, Landmark, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { NewspaperCard } from './NewspaperCard';
import { MatchDashboardCard } from './MatchDashboardCard';
import { TournamentDashboardCard } from './TournamentDashboardCard';
import { SeasonStartWidget } from './SeasonStartWidget';
import { BallonDorTeaserWidget } from './BallonDorTeaserWidget';
import { GlobalCompetitionsWidget } from './GlobalCompetitionsWidget';
import { PersonalizedCupWidget } from './PersonalizedCupWidget';

// Logic for standing sync
function LeagueStandingsMini({ userId }: { userId?: string }) {
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data: teamData } = await supabase.from('world_teams').select('id, league_id').eq('user_id', userId).maybeSingle();
      if (teamData && teamData.league_id) {
        const { data: table } = await supabase
          .from('world_league_table')
          .select('*, world_teams(name)')
          .eq('league_id', teamData.league_id)
          .order('points', { ascending: false })
          .limit(5);
        if (table) setStandings(table);
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  if (standings.length === 0) return null;

  return (
    <Card className="game-card">
      <CardHeader className="py-2 px-3 border-b border-border/50">
        <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Trophy className="h-3 w-3 text-emerald-400" /> Top 5 Liga
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/30">
          {standings.map((s, i) => (
            <div key={s.id} className="flex items-center justify-between px-3 py-1.5 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-muted-foreground w-3">{i + 1}</span>
                <span className="truncate max-w-[100px]">{s.team_id === userId ? 'Seu Time' : (s.world_teams?.name || `Time ${i + 1}`)}</span>
              </div>
              <span className="font-bold text-primary">{s.points} pts</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface Props {
  club: Club;
  events: GameEvent[];
  infrastructure?: Infrastructure;
  onOpenNewspaper?: () => void;
  onGoToFriendly?: () => void;
  userId?: string;
  onOpenTournament?: (tournamentId: string) => void;
  clubProfile?: ClubProfile;
  season?: number;
  currentWeek?: number;
  totalWeeks?: number;
  onViewClub?: (clubName: string) => void;
  onGoToSquad?: () => void;
  onRestAll?: () => void;
}

export function DashboardTab({ club, events, infrastructure, onOpenNewspaper, onGoToFriendly, userId, onOpenTournament, clubProfile, season, currentWeek, totalWeeks, onViewClub, onGoToSquad, onRestAll }: Props) {
  const tiredPlayers = club.players.filter(p => p.stamina < 45);
  const showFatigueWarning = tiredPlayers.length >= 3;

  const totalGames = club.stats.wins + club.stats.draws + club.stats.losses;

  const playedMatchesCount = club.stats.wins + club.stats.draws + club.stats.losses;
  const winRate = playedMatchesCount > 0 ? Math.round(((club.stats.wins * 3 + club.stats.draws) / (playedMatchesCount * 3)) * 100) : 0;

  const last5 = club.matches.filter(m => m.played).slice(-5);
  const recentWins = last5.filter(m => m.result && (m.isHome ? m.result.home > m.result.away : m.result.away > m.result.home)).length;
  const recentLosses = last5.filter(m => m.result && (m.isHome ? m.result.home < m.result.away : m.result.away < m.result.home)).length;
  const fanMood = recentWins >= 4 ? 'Eufórica 🔥' : recentWins >= 3 ? 'Empolgada 😄' : recentWins >= 2 ? 'Animada 🙂' : recentLosses >= 5 ? 'Revoltada 😡' : recentLosses >= 4 ? 'Insatisfeita 😤' : recentLosses >= 3 ? 'Preocupada 😟' : 'Estável 😐';
  const fanMoodColor = recentWins >= 3 ? 'text-success' : recentLosses >= 4 ? 'text-destructive' : 'text-primary';

  const playedMatches = club.matches.filter(m => m.played);
  let streak = 0;
  let streakType: 'V' | 'E' | 'D' | '' = '';
  for (let i = playedMatches.length - 1; i >= 0; i--) {
    const r = playedMatches[i].result;
    if (!r) break;
    const isHome = playedMatches[i].isHome;
    const t = (isHome ? r.home > r.away : r.away > r.home) ? 'V' : (r.home === r.away ? 'E' : 'D');
    if (streakType === '') streakType = t;
    if (t === streakType) streak++;
    else break;
  }
  const streakLabel = streak > 0 ? `${streak}${streakType} seguidas` : 'Nenhuma';

  const recentEvents = [...events].slice(0, 8);
  const eventColors: Record<string, string> = {
    injury: 'border-l-warning bg-warning/5',
    offer: 'border-l-primary bg-primary/5',
    protest: 'border-l-destructive bg-destructive/5',
    bonus: 'border-l-success bg-success/5',
    discovery: 'border-l-primary bg-primary/5',
    scandal: 'border-l-warning bg-warning/5',
    player_upgrade: 'border-l-success bg-success/5',
    fan_rage: 'border-l-destructive bg-destructive/5',
    stadium_upgrade: 'border-l-primary bg-primary/5',
    transfer_in: 'border-l-primary bg-primary/5',
    transfer_out: 'border-l-warning bg-warning/5',
    record: 'border-l-warning bg-warning/5',
    captain: 'border-l-warning bg-warning/5',
    derby: 'border-l-warning bg-warning/5',
    weather: 'border-l-primary bg-primary/5',
    season_awards: 'border-l-warning bg-warning/5',
    player_unhappy: 'border-l-destructive bg-destructive/5',
  };


  const stats = [
    { label: 'Orçamento', value: `R$${(club.budget / 1000000).toFixed(1)}M`, icon: DollarSign, color: 'text-primary' },
    { label: 'Torcida', value: club.fans >= 1000 ? `${(club.fans / 1000).toFixed(0)}k` : club.fans.toLocaleString(), icon: Users, color: 'text-foreground' },
    { label: 'Pontos', value: club.stats.points.toString(), icon: Trophy, color: 'text-foreground' },
    { label: 'Reputação', value: `${club.reputation}`, icon: Star, color: 'text-primary' },
    { label: 'Aproveit.', value: `${winRate}%`, icon: TrendingUp, color: 'text-foreground' },
  ];

  const stadiumCapacity = infrastructure ? getStadiumCapacity(infrastructure.stadium?.level || 1) : null;

  return (
    <div className="dashboard-grid">
      <div className="dashboard-main">
        {/* Fatigue Warning V4 */}
        {showFatigueWarning && (
          <Card className="border-orange-500/50 bg-orange-500/10 animate-in fade-in slide-in-from-top-4 duration-500">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 mx-auto sm:mx-0">
                  <Activity className="h-6 w-6 animate-pulse" />
                </div>
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                    <h3 className="text-sm font-black text-orange-400 uppercase tracking-wider">Aviso de Fadiga</h3>
                    <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-400 bg-orange-500/10">
                      {tiredPlayers.length} Jogadores
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Atenção: <span className="text-foreground font-bold">{tiredPlayers.length} jogadores</span> estão com fadiga elevada. 
                    Recomenda-se descanso para evitar lesões graves.
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-9 sm:h-8 text-[11px] sm:text-[10px] border-orange-500/30 text-orange-400 hover:bg-orange-500/20 bg-transparent rounded-lg flex-1 sm:flex-none" onClick={onRestAll}>
                      Descansar
                    </Button>
                    <Button size="sm" className="h-9 sm:h-8 text-[11px] sm:text-[10px] bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-lg shadow-orange-500/20 flex-1 sm:flex-none" onClick={onGoToSquad}>
                      Ver Elenco
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Club Info Widget */}
        <Card className="game-card border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              <div className="shrink-0">
                {club.shieldPattern ? (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center bg-card/40 rounded-2xl border border-border/40 shadow-inner">
                    <span className="text-5xl sm:text-6xl">🛡️</span>
                  </div>
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-primary/20 flex items-center justify-center text-4xl sm:text-5xl border border-primary/30">⚽</div>
                )}
              </div>
              <div className="flex-1 w-full space-y-3 text-center sm:text-left">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black truncate leading-none mb-1">{club.name}</h2>
                  {clubProfile?.motto && <p className="text-xs text-muted-foreground italic">"{clubProfile.motto}"</p>}
                </div>
                
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-sm">
                    <User className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">Presidente:</span>
                    <span className="font-bold truncate max-w-[120px]">{clubProfile?.ownerName || '—'}</span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">Fundação:</span>
                    <span className="font-bold">{clubProfile?.foundedDate || `T${clubProfile?.foundedSeason || season || 1}`}</span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-sm">
                    <Landmark className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">Estádio:</span>
                    <span className="font-bold truncate max-w-[150px]">{club.stadiumName}</span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-sm">
                    <Users className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">Elenco:</span>
                    <span className="font-bold">{club.players.length} jogadores</span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                  <Badge variant="secondary" className="px-2 py-0.5 text-[10px] gap-1.5 font-bold">
                    <Dumbbell className="h-3 w-3" /> CT Lvl.{infrastructure?.trainingCenter?.level || 0}
                  </Badge>
                  <Badge variant="secondary" className="px-2 py-0.5 text-[10px] gap-1.5 font-bold">
                    <Building2 className="h-3 w-3" /> Estádio Lvl.{infrastructure?.stadium?.level || 1}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match Card */}
        <MatchDashboardCard club={club} userId={userId} onGoToFriendly={onGoToFriendly} onViewClub={onViewClub} />

        {/* Stats Grid - Fluid scaling */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {stats.map(item => (
            <div key={item.label} className="stat-card">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground truncate">{item.label}</p>
                <p className="text-sm font-black truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Newspaper */}
        <NewspaperCard onOpenFullPage={onOpenNewspaper} userId={userId} />
      </div>

      <div className="dashboard-sidebar">
        {/* Season Start Widget */}
        <SeasonStartWidget seasonNumber={season} userId={userId} />

        {/* Personalized Cup Widget */}
        {userId && (
          <PersonalizedCupWidget 
            userId={userId} 
            onOpenCompetition={(id) => onOpenTournament?.(id)}
            onGoToMatches={onGoToFriendly}
          />
        )}

        {/* League Standings Sidebar */}
        <LeagueStandingsMini userId={userId} />

        {/* Fan Mood Card */}
        <Card className="game-card-accent overflow-hidden">
          <CardHeader className="section-header pb-3 pt-4">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" /> Torcida & Moral
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Humor</span>
              <span className={`text-sm font-black ${fanMoodColor}`}>{fanMood}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sequência</span>
              <span className="text-sm font-black flex items-center gap-1.5">
                {streak >= 3 && streakType === 'V' && <Flame className="h-3.5 w-3.5 text-warning" />}
                {streakLabel}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                <span>Reputação</span>
                <span>{club.reputation}%</span>
              </div>
              <Progress value={Math.min(100, club.reputation)} className="h-2 progress-glow" />
            </div>
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed px-2">
              {recentWins >= 3 ? '🔥 A torcida está lotando o estádio!' : recentLosses >= 3 ? '😤 Torcedores abandonando o clube...' : 'Mantenha bons resultados para crescer a torcida'}
            </p>
          </CardContent>
        </Card>

        {/* Recent Events Feed */}
        {recentEvents.length > 0 && (
          <Card className="game-card-accent">
            <CardHeader className="section-header pb-3 pt-4">
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" /> Feed de Eventos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {recentEvents.map(ev => (
                <div key={ev.id} className={`border-l-4 rounded-r-lg px-3 py-2.5 ${eventColors[ev.type] || 'border-l-border'} hover:bg-accent/30 transition-colors cursor-default`}>
                  <p className="text-xs font-bold leading-none mb-1">{ev.icon} {ev.title}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{ev.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>

        <Card className="game-card">
          <CardHeader className="section-header pb-2 px-3 sm:px-4 pt-3">
            <CardTitle className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-primary" /> Desempenho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 px-3 sm:px-4 pb-3">
            {totalGames > 0 ? (
              <>
                <div className="flex gap-3 text-xs font-mono">
                  <span className="game-badge bg-success/15 text-success">{club.stats.wins}V</span>
                  <span className="game-badge bg-primary/15 text-primary">{club.stats.draws}E</span>
                  <span className="game-badge bg-destructive/15 text-destructive">{club.stats.losses}D</span>
                  <span className="text-muted-foreground ml-auto text-[10px] self-center">{totalGames} jogos</span>
                </div>
                <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                  {club.stats.wins > 0 && <div className="bg-success transition-all" style={{ flex: club.stats.wins }} />}
                  {club.stats.draws > 0 && <div className="bg-primary transition-all" style={{ flex: club.stats.draws }} />}
                  {club.stats.losses > 0 && <div className="bg-destructive transition-all" style={{ flex: club.stats.losses }} />}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="stat-card text-center">
                    <p className="text-lg font-bold text-success">{club.stats.goalsFor}</p>
                    <p className="text-[8px] text-muted-foreground uppercase">Gols Pró</p>
                  </div>
                  <div className="stat-card text-center">
                    <p className="text-lg font-bold text-destructive">{club.stats.goalsAgainst}</p>
                    <p className="text-[8px] text-muted-foreground uppercase">Gols Contra</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum jogo disputado ainda</p>
            )}
          </CardContent>
        </Card>

        {/* Infrastructure Summary */}
        <Card className="game-card">
          <CardHeader className="section-header pb-2 px-3 sm:px-4 pt-3">
            <CardTitle className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-primary" /> Infraestrutura
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 sm:px-4 pb-3">
            {infrastructure ? (
              <>
                <div className="space-y-1.5">
                  {[
                    { label: 'Estádio', value: infrastructure.stadium?.level || 1, max: 10, icon: '🏟️' },
                    { label: 'CT', value: infrastructure.trainingCenter?.level || 1, max: 10, icon: '⚽' },
                    { label: 'Fisioterapia', value: infrastructure.physiotherapy?.level || 1, max: 10, icon: '🏥' },
                    { label: 'Academia', value: infrastructure.youthAcademy?.level || 1, max: 10, icon: '🎓' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className="text-[10px] w-4">{item.icon}</span>
                      <span className="text-[10px] text-muted-foreground w-16">{item.label}</span>
                      <Progress value={(item.value / item.max) * 100} className="flex-1 h-1.5 progress-glow" />
                      <span className="text-[9px] font-bold w-6 text-right">Lv.{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Last 5 Results */}
      {last5.length > 0 && (
        <Card className="game-card">
          <CardHeader className="section-header pb-2 px-3 sm:px-4 pt-3">
            <CardTitle className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-primary" /> Últimos Resultados
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className="flex gap-2 justify-center">
              {last5.map((m, i) => {
                const r = m.result!;
                const w = r.home > r.away;
                const d = r.home === r.away;
                return (
                  <div key={i} className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold transition-all ${w ? 'bg-success/15 text-success border border-success/20 shadow-sm shadow-success/10' : d ? 'bg-primary/15 text-primary border border-primary/20' : 'bg-destructive/15 text-destructive border border-destructive/20'}`}>
                    <span className="text-[7px] text-muted-foreground">{w ? 'V' : d ? 'E' : 'D'}</span>
                    {r.home}-{r.away}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Players */}
      <Card className="game-card">
        <CardHeader className="section-header pb-2 px-3 sm:px-4 pt-3">
          <CardTitle className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Star className="h-3.5 w-3.5 text-primary" /> Melhores do Elenco
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3">
          <div className="space-y-1.5">
            {[...club.players].sort((a, b) => b.overall - a.overall).slice(0, 5).map((player, i) => (
              <div key={player.id} className="flex items-center gap-2 py-1.5 rounded-lg hover:bg-accent/30 px-2 transition-colors">
                <span className={`text-[10px] w-4 text-center font-mono ${i === 0 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{i === 0 ? '⭐' : i + 1}</span>
                <span className="text-[9px] font-mono game-badge bg-primary/15 text-primary">{player.position}</span>
                <span className="flex-1 text-xs font-medium truncate">{player.name}</span>
                <span className="text-[10px] text-muted-foreground">{player.age}a</span>
                <span className="text-xs font-bold w-7 text-right tabular-nums">{player.overall}</span>
                <Progress value={player.overall} className="w-12 h-1.5 progress-glow" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
