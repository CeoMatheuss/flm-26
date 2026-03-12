import { Club } from '@/types/game';
import { GameEvent } from '@/types/events';
import { Infrastructure } from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, DollarSign, Star, Shield, TrendingUp, Flame, Heart, Zap, Swords } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { NewspaperCard } from './NewspaperCard';
import { MatchDashboardCard } from './MatchDashboardCard';
import { TournamentDashboardCard } from './TournamentDashboardCard';

interface Props {
  club: Club;
  events: GameEvent[];
  infrastructure?: Infrastructure;
  onOpenNewspaper?: () => void;
  onGoToFriendly?: () => void;
  userId?: string;
}

export function DashboardTab({ club, events, infrastructure, onOpenNewspaper, onGoToFriendly, userId }: Props) {
  const totalGames = club.stats.wins + club.stats.draws + club.stats.losses;
  const winRate = totalGames > 0 ? Math.round((club.stats.wins / totalGames) * 100) : 0;

  const last5 = club.matches.filter(m => m.played).slice(-5);
  const recentWins = last5.filter(m => m.result && m.result.home > m.result.away).length;
  const recentLosses = last5.filter(m => m.result && m.result.home < m.result.away).length;
  // More tolerant thresholds: crisis only after 5+ losses in last 5 matches (effectively all 5)
  const fanMood = recentWins >= 4 ? 'Eufórica 🔥' : recentWins >= 3 ? 'Empolgada 😄' : recentWins >= 2 ? 'Animada 🙂' : recentLosses >= 5 ? 'Revoltada 😡' : recentLosses >= 4 ? 'Insatisfeita 😤' : recentLosses >= 3 ? 'Preocupada 😟' : 'Estável 😐';
  const fanMoodColor = recentWins >= 3 ? 'text-emerald-400' : recentLosses >= 4 ? 'text-destructive' : 'text-primary';

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
    injury: 'border-l-orange-500 bg-orange-500/5',
    offer: 'border-l-blue-500 bg-blue-500/5',
    protest: 'border-l-red-500 bg-red-500/5',
    bonus: 'border-l-emerald-500 bg-emerald-500/5',
    discovery: 'border-l-purple-500 bg-purple-500/5',
    scandal: 'border-l-yellow-500 bg-yellow-500/5',
    player_upgrade: 'border-l-emerald-500 bg-emerald-500/5',
    fan_rage: 'border-l-red-500 bg-red-500/5',
    stadium_upgrade: 'border-l-cyan-500 bg-cyan-500/5',
    transfer_in: 'border-l-blue-400 bg-blue-400/5',
    transfer_out: 'border-l-orange-400 bg-orange-400/5',
    record: 'border-l-amber-500 bg-amber-500/5',
    captain: 'border-l-yellow-500 bg-yellow-500/5',
    derby: 'border-l-orange-600 bg-orange-600/5',
    weather: 'border-l-sky-400 bg-sky-400/5',
    season_awards: 'border-l-amber-500 bg-amber-500/5',
    player_unhappy: 'border-l-red-600 bg-red-600/5',
  };

  const stats = [
    { label: 'Orçamento', value: `R$${(club.budget / 1000000).toFixed(1)}M`, icon: DollarSign, color: 'text-primary' },
    { label: 'Torcida', value: club.fans >= 1000 ? `${(club.fans / 1000).toFixed(0)}k` : club.fans.toLocaleString(), icon: Users, color: 'text-foreground' },
    { label: 'Pontos', value: club.stats.points.toString(), icon: Trophy, color: 'text-foreground' },
    { label: 'Reputação', value: `${club.reputation}`, icon: Star, color: 'text-primary' },
    { label: 'Aproveit.', value: `${winRate}%`, icon: TrendingUp, color: 'text-foreground' },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Match Card */}
      <MatchDashboardCard club={club} userId={userId} onGoToFriendly={onGoToFriendly} />

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

      {/* Newspaper */}
      <NewspaperCard club={club} events={events} infrastructure={infrastructure} onOpenFullPage={onOpenNewspaper} />

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                {streak >= 3 && streakType === 'W' && <Flame className="h-3 w-3 text-orange-400" />}
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
                  <span className="game-badge bg-emerald-500/15 text-emerald-400">{club.stats.wins}V</span>
                  <span className="game-badge bg-primary/15 text-primary">{club.stats.draws}E</span>
                  <span className="game-badge bg-destructive/15 text-destructive">{club.stats.losses}D</span>
                  <span className="text-muted-foreground ml-auto text-[10px] self-center">{totalGames} jogos</span>
                </div>
                <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                  {club.stats.wins > 0 && <div className="bg-emerald-500 transition-all" style={{ flex: club.stats.wins }} />}
                  {club.stats.draws > 0 && <div className="bg-primary transition-all" style={{ flex: club.stats.draws }} />}
                  {club.stats.losses > 0 && <div className="bg-destructive transition-all" style={{ flex: club.stats.losses }} />}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="stat-card text-center">
                    <p className="text-lg font-bold text-emerald-400">{club.stats.goalsFor}</p>
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
      </div>

      {/* Last 5 Results */}
      {last5.length > 0 && (
        <Card className="game-card">
          <CardHeader className="section-header pb-2 px-3 sm:px-4 pt-3">
            <CardTitle className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground">Últimos Resultados</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className="flex gap-2 justify-center">
              {last5.map((m, i) => {
                const r = m.result!;
                const w = r.home > r.away;
                const d = r.home === r.away;
                return (
                  <div key={i} className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${w ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : d ? 'bg-primary/15 text-primary border border-primary/20' : 'bg-destructive/15 text-destructive border border-destructive/20'}`}>
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
              <div key={player.id} className="flex items-center gap-2 py-1 rounded-lg hover:bg-accent/30 px-1 transition-colors">
                <span className="text-[10px] text-muted-foreground w-4 text-center font-mono">{i + 1}</span>
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
