import { Club } from '@/types/game';
import { GameEvent } from '@/types/events';
import { Infrastructure, getStadiumCapacity } from '@/types/infrastructure';
import { ClubProfile } from '@/types/clubProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, DollarSign, Star, Shield, TrendingUp, Flame, Heart, Zap, Swords, Building2, Activity, Calendar, User, Instagram, GraduationCap, Dumbbell, Stethoscope, Landmark } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { NewspaperCard } from './NewspaperCard';
import { MatchDashboardCard } from './MatchDashboardCard';
import { TournamentDashboardCard } from './TournamentDashboardCard';
import { SeasonStartWidget } from './SeasonStartWidget';

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
  onViewClub?: (clubName: string) => void;
}

export function DashboardTab({ club, events, infrastructure, onOpenNewspaper, onGoToFriendly, userId, onOpenTournament, clubProfile, season, onViewClub }: Props) {

  const totalGames = club.stats.wins + club.stats.draws + club.stats.losses;
  const winRate = totalGames > 0 ? Math.round((club.stats.wins / totalGames) * 100) : 0;

  const last5 = club.matches.filter(m => m.played).slice(-5);
  const recentWins = last5.filter(m => m.result && m.result.home > m.result.away).length;
  const recentLosses = last5.filter(m => m.result && m.result.home < m.result.away).length;
  const fanMood = recentWins >= 4 ? 'Eufórica 🔥' : recentWins >= 3 ? 'Empolgada 😄' : recentWins >= 2 ? 'Animada 🙂' : recentLosses >= 5 ? 'Revoltada 😡' : recentLosses >= 4 ? 'Insatisfeita 😤' : recentLosses >= 3 ? 'Preocupada 😟' : 'Estável 😐';
  const fanMoodColor = recentWins >= 3 ? 'text-success' : recentLosses >= 4 ? 'text-destructive' : 'text-primary';

  const playedMatches = club.matches.filter(m => m.played);
  let streak = 0;
  let streakType: 'W' | 'D' | 'L' | '' = '';
  for (let i = playedMatches.length - 1; i >= 0; i--) {
    const r = playedMatches[i].result;
    if (!r) break;
    const t = r.home > r.away ? 'W' : r.home < r.away ? 'L' : 'D';
    if (streakType === '') streakType = t;
    if (t === streakType) streak++;
    else break;
  }
  const streakLabel = streak > 0 ? `${streak}${streakType === 'W' ? 'V' : streakType === 'L' ? 'D' : 'E'} seguidas` : 'Nenhuma';

  const recentEvents = events.slice(0, 5);
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
    <div className="space-y-3 sm:space-y-4">
      {/* Club Info Widget */}
      <Card className="game-card border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0">
              {club.shieldPattern ? (
                <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                  <span className="text-3xl">🛡️</span>
                </div>
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-primary/20 flex items-center justify-center text-2xl">⚽</div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <h2 className="text-sm sm:text-base font-black truncate">{club.name}</h2>
              {clubProfile?.motto && <p className="text-[9px] text-muted-foreground italic">"{clubProfile.motto}"</p>}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 text-primary" />
                  <span className="text-muted-foreground">Presidente:</span>
                  <span className="font-bold truncate">{clubProfile?.ownerName || '—'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-primary" />
                  <span className="text-muted-foreground">Fundação:</span>
                  <span className="font-bold">{clubProfile?.foundedDate || `T${clubProfile?.foundedSeason || season || 1}`}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Landmark className="h-3 w-3 text-primary" />
                  <span className="text-muted-foreground">Estádio:</span>
                  <span className="font-bold truncate">{club.stadiumName} ({stadiumCapacity?.toLocaleString() || '?'})</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-primary" />
                  <span className="text-muted-foreground">Elenco:</span>
                  <span className="font-bold">{club.players.length} jogadores</span>
                </div>
              </div>
              {/* Infrastructure mini */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge variant="outline" className="text-[8px] gap-1">
                  <Dumbbell className="h-2.5 w-2.5" /> CT Lv.{infrastructure?.trainingCenter?.level || 0}
                </Badge>
                <Badge variant="outline" className="text-[8px] gap-1">
                  <Stethoscope className="h-2.5 w-2.5" /> Fisio Lv.{infrastructure?.physiotherapy?.level || 0}
                </Badge>
                <Badge variant="outline" className="text-[8px] gap-1">
                  <GraduationCap className="h-2.5 w-2.5" /> Base Lv.{infrastructure?.youthAcademy?.level || 0}
                </Badge>
                <Badge variant="outline" className="text-[8px] gap-1">
                  <Building2 className="h-2.5 w-2.5" /> Estádio Lv.{infrastructure?.stadium?.level || 1}
                </Badge>
              </div>
              {/* Instagram */}
              {clubProfile?.instagram ? (
                <a href={clubProfile.instagram.startsWith('http') ? clubProfile.instagram : `https://instagram.com/${clubProfile.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-pink-400 hover:underline mt-0.5">
                  <Instagram className="h-3 w-3" /> {clubProfile.instagram.startsWith('http') ? clubProfile.instagram.match(/instagram\.com\/([^/?]+)/)?.[1] ? `@${clubProfile.instagram.match(/instagram\.com\/([^/?]+)/)?.[1]}` : clubProfile.instagram : `@${clubProfile.instagram.replace('@', '')}`}
                </a>
              ) : (
                <p className="text-[9px] text-muted-foreground/50 mt-0.5">📸 Vincule seu Instagram no Perfil do Clube</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Season Start Widget */}
      <SeasonStartWidget seasonNumber={season} />

      {/* Match Card */}
      <MatchDashboardCard club={club} userId={userId} onGoToFriendly={onGoToFriendly} onViewClub={onViewClub} />

      {/* Stats Row */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {stats.map(item => (
          <div key={item.label} className="stat-card flex items-center gap-1.5">
            <item.icon className={`h-3.5 w-3.5 ${item.color} shrink-0`} />
            <div className="min-w-0">
              <p className="text-[8px] sm:text-[10px] uppercase tracking-wider text-muted-foreground truncate">{item.label}</p>
              <p className="text-xs sm:text-sm font-bold truncate">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active Tournaments */}
      <TournamentDashboardCard onExpand={onOpenTournament} />

      {/* Newspaper */}
      <NewspaperCard onOpenFullPage={onOpenNewspaper} userId={userId} />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Events Feed */}
        {recentEvents.length > 0 && (
          <Card className="game-card-accent">
            <CardHeader className="section-header pb-2 px-3 sm:px-4 pt-3">
              <CardTitle className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-primary" /> Eventos Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 space-y-1.5">
              {recentEvents.map(ev => (
                <div key={ev.id} className={`border-l-2 rounded-r-lg px-3 py-2 ${eventColors[ev.type] || 'border-l-border'} transition-colors`}>
                  <p className="text-xs sm:text-sm font-semibold">{ev.icon} {ev.title}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{ev.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Fan Mood Card */}
        <Card className="game-card-accent">
          <CardHeader className="section-header pb-2 px-3 sm:px-4 pt-3">
            <CardTitle className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Heart className="h-3.5 w-3.5 text-primary" /> Torcida & Moral
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 px-3 sm:px-4 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Humor</span>
              <span className={`text-xs font-bold ${fanMoodColor}`}>{fanMood}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Sequência</span>
              <span className="text-xs font-bold flex items-center gap-1">
                {streak >= 3 && streakType === 'W' && <Flame className="h-3 w-3 text-warning" />}
                {streakLabel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Torcedores</span>
              <span className="text-xs font-bold">{club.fans.toLocaleString()}</span>
            </div>
            <Progress value={Math.min(100, club.reputation)} className="h-1.5 progress-glow" />
            <p className="text-[9px] text-muted-foreground text-center">
              {recentWins >= 3 ? '🔥 A torcida está lotando o estádio!' : recentLosses >= 3 ? '😤 Torcedores abandonando o clube...' : 'Mantenha bons resultados para crescer a torcida'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance + Infrastructure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Performance */}
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
                <div className="flex items-center justify-between text-[9px] bg-accent/30 rounded-lg px-2 py-1.5">
                  <span className="text-muted-foreground">Nível do estádio</span>
                  <span className="font-bold">Lv.{infrastructure.stadium?.level || 1}</span>
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
