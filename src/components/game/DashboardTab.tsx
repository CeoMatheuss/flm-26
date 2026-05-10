import { useEffect, useState } from 'react';
import { Club } from '@/types/game';
import { GameEvent } from '@/types/events';
import { Infrastructure, getStadiumCapacity } from '@/types/infrastructure';
import { ClubProfile } from '@/types/clubProfile';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, DollarSign, Star, TrendingUp, Flame, Heart, Zap, Building2, Activity, Calendar, User, Landmark, Loader2, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { NewspaperCard } from './NewspaperCard';
import { MatchDashboardCard } from './MatchDashboardCard';
import { SeasonStartWidget } from './SeasonStartWidget';
import { PersonalizedCupWidget } from './PersonalizedCupWidget';

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

export function DashboardTab({ club, events, infrastructure, onOpenNewspaper, onGoToFriendly, userId, onOpenTournament, clubProfile, season, onViewClub, onGoToSquad, onRestAll }: Props) {
  const tiredPlayers = club.players.filter(p => p.stamina < 45);
  const showFatigueWarning = tiredPlayers.length >= 3;

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-8 space-y-6">
        {showFatigueWarning && (
          <Card className="border-orange-500/50 bg-orange-500/10">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Activity className="h-5 w-5 text-orange-400" />
                <div>
                  <h3 className="text-sm font-bold text-orange-400">Aviso de Fadiga</h3>
                  <p className="text-xs text-muted-foreground">{tiredPlayers.length} jogadores cansados.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={onRestAll}>Descansar</Button>
                <Button size="sm" className="h-8 text-[11px] bg-orange-500" onClick={onGoToSquad}>Ver Elenco</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="game-card border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center text-4xl border border-primary/30 shrink-0">⚽</div>
              <div className="flex-1 space-y-2">
                <div>
                  <h2 className="text-2xl font-black">{club.name}</h2>
                  {clubProfile?.motto && <p className="text-xs text-muted-foreground italic">"{clubProfile.motto}"</p>}
                </div>
                <div className="flex flex-wrap gap-4 text-sm font-medium">
                  <div className="flex items-center gap-1.5"><User className="h-4 w-4 text-primary" /> {clubProfile?.ownerName || '—'}</div>
                  <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-primary" /> {clubProfile?.foundedDate || `T${clubProfile?.foundedSeason || season || 1}`}</div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="px-2 py-0.5 text-[10px] gap-1.5 font-bold"><Dumbbell className="h-3 w-3" /> CT Lvl.{infrastructure?.trainingCenter?.level || 0}</Badge>
                  <Badge variant="secondary" className="px-2 py-0.5 text-[10px] gap-1.5 font-bold"><Building2 className="h-3 w-3" /> Estádio Lvl.{infrastructure?.stadium?.level || 1}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <MatchDashboardCard club={club} userId={userId} onGoToFriendly={onGoToFriendly} onViewClub={onViewClub} />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stats.map(item => (
            <div key={item.label} className="bg-card/40 border border-border/20 rounded-xl p-3 flex flex-col items-center text-center transition-all hover:bg-accent/20">
              <div className="p-1.5 rounded-lg bg-primary/10 mb-1">
                <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
              </div>
              <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-tight">{item.label}</p>
              <p className="text-base font-black leading-none">{item.value}</p>
            </div>
          ))}
        </div>

        <NewspaperCard onOpenFullPage={onOpenNewspaper} userId={userId} />
      </div>

      <div className="lg:col-span-4 space-y-6">
        <SeasonStartWidget seasonNumber={season} userId={userId} />
        {userId && <PersonalizedCupWidget userId={userId} onOpenCompetition={onOpenTournament} onGoToMatches={onGoToFriendly} />}
        <LeagueStandingsMini userId={userId} />
        
        <Card className="game-card">
          <CardHeader className="py-4 px-6 border-b border-border/10">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" /> Torcida & Moral
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">Humor da Torcida</span>
              <span className={`text-sm font-black ${fanMoodColor}`}>{fanMood}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">Sequência Atual</span>
              <span className="text-sm font-black">{streakLabel}</span>
            </div>
            <Progress value={Math.min(100, club.reputation)} className="h-2" />
          </CardContent>
        </Card>

        {recentEvents.length > 0 && (
          <Card className="game-card">
            <CardHeader className="py-4 px-6 border-b border-border/10">
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" /> Feed de Notícias
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {recentEvents.map(ev => (
                <div key={ev.id} className={`border-l-4 rounded-r-lg px-4 py-3 ${eventColors[ev.type] || 'border-l-border'} bg-accent/20`}>
                  <p className="text-xs font-bold mb-1">{ev.icon} {ev.title}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{ev.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
