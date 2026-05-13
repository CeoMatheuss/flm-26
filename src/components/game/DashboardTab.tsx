import { useEffect, useState, useMemo } from 'react';
import { Club } from '@/types/game';
import { GameEvent } from '@/types/events';
import { Infrastructure, getStadiumCapacity } from '@/types/infrastructure';
import { ClubProfile } from '@/types/clubProfile';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, DollarSign, Star, Shield, TrendingUp, Flame, Heart, Zap, Swords, Building2, Activity, Calendar, User, Instagram, GraduationCap, Dumbbell, Stethoscope, Landmark, Loader2, FileText, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { ClubShield } from './ClubShield';
import { PersonalizedCupWidget } from './PersonalizedCupWidget';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { NewspaperCard } from './NewspaperCard';
import { MatchDashboardCard } from './MatchDashboardCard';
import { TournamentDashboardCard } from './TournamentDashboardCard';
import { SeasonStartWidget } from './SeasonStartWidget';
import { BallonDorTeaserWidget } from './BallonDorTeaserWidget';



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
            <div 
              key={s.id} 
              className="flex items-center justify-between px-3 py-1.5 text-[10px] cursor-pointer hover:bg-accent/30 transition-colors group"
              onClick={() => (window as any).dispatchEvent(new CustomEvent('flm:open-club-profile', { detail: { club_name: s.world_teams?.name } }))}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-muted-foreground w-3">{i + 1}</span>
                <span className="truncate max-w-[100px] group-hover:text-primary transition-colors">{s.team_id === userId ? 'Seu Time' : (s.world_teams?.name || `Time ${i + 1}`)}</span>
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
  const recentWins = last5.filter(m => m.result && (m.isHome ? m.result.home > m.result.away : m.result.away > m.result.home) && !(m as any).isFriendly).length;
  const recentLosses = last5.filter(m => m.result && (m.isHome ? m.result.home < m.result.away : m.result.away < m.result.home) && !(m as any).isFriendly).length;
  const fanMood = recentWins >= 4 ? 'Eufórica 🔥' : recentWins >= 3 ? 'Empolgada 😄' : recentWins >= 2 ? 'Animada 🙂' : recentLosses >= 5 ? 'Revoltada 😡' : recentLosses >= 4 ? 'Insatisfeita 😤' : recentLosses >= 3 ? 'Preocupada 😟' : 'Estável 😐';
  const fanMoodColor = recentWins >= 3 ? 'text-success' : recentLosses >= 4 ? 'text-destructive' : 'text-primary';

  const playedMatches = club.matches.filter(m => m.played && !(m as any).isFriendly);
  let streak = 0;
  let streakType: 'V' | 'E' | 'D' | '' = '';
  for (let i = playedMatches.length - 1; i >= 0; i--) {
    const r = playedMatches[i].result;
    if (!r) continue;
    const isHome = playedMatches[i].isHome;
    const outcome = (isHome ? r.home > r.away : r.away > r.home) ? 'V' : (r.home === r.away ? 'E' : 'D');
    if (streakType === '') streakType = outcome;
    if (outcome === streakType) streak++;
    else break;
  }
  const streakLabel = streak > 0 ? `${streak}${streakType} seguidas` : 'Nenhuma';

  const handleOpenProfile = (name?: string) => {
    if (!name) return;
    (window as any).dispatchEvent(new CustomEvent('flm:open-club-profile', { detail: { club_name: name } }));
  };


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
    { label: 'Saldo', value: formatMoneyShort(club.budget), icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Torcida', value: club.fans >= 1000 ? `${(club.fans / 1000).toFixed(0)}k` : club.fans.toLocaleString(), icon: Users, color: 'text-foreground' },
    { label: 'Pontos', value: club.stats.points.toString(), icon: Trophy, color: 'text-foreground' },
    { label: 'Reputação', value: `${club.reputation}`, icon: Star, color: 'text-primary' },
    { label: 'Aproveit.', value: `${winRate}%`, icon: TrendingUp, color: 'text-foreground' },
  ];

  function formatMoneyShort(val: number) {
    return `R$ ${val.toLocaleString('pt-BR')}`;
  }

  const stadiumLevel = infrastructure?.stadium?.level || 1;
  const stadiumCapacity = infrastructure ? getStadiumCapacity(stadiumLevel) : null;
  const nextStadiumCapacity = infrastructure ? getStadiumCapacity(stadiumLevel + 1) : null;
  const isMaxStadium = stadiumLevel >= (infrastructure?.stadium?.maxLevel || 15);
  const avgOvr = club.players.length > 0 ? Math.round(club.players.reduce((s, p) => s + (p.overall || 0), 0) / club.players.length) : 0;
  const lastHomeMatch = [...club.matches].reverse().find((m: any) => m.played && m.isHome && (m as any).attendance);
  const lastAttendance = (lastHomeMatch as any)?.attendance as number | undefined;
  const occupancyPct = lastAttendance && stadiumCapacity ? Math.min(100, Math.round((lastAttendance / stadiumCapacity) * 100)) : null;
  const estMatchRevenue = stadiumCapacity ? Math.round(stadiumCapacity * (club.ticketPrice || 0) * 0.85) : 0;

  return (
    <div className="space-y-3 sm:space-y-4 pb-10">
      {/* Top section: full width alerts */}
      {showFatigueWarning && (
        <Card className="border-orange-500/50 bg-orange-500/10 animate-in fade-in slide-in-from-top-4 duration-500">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                <Activity className="h-6 w-6 animate-pulse" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-orange-400 uppercase tracking-wider">Aviso de Fadiga</h3>
                  <Badge variant="outline" className="text-[10px] border-orange-500/30 text-orange-400 bg-orange-500/10">
                    {tiredPlayers.length} Jogadores
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Atenção: <span className="text-foreground font-bold">{tiredPlayers.length} jogadores</span> estão com fadiga elevada. 
                  Recomenda-se descanso para evitar lesões graves e queda drástica de rendimento físico.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" className="h-8 text-[10px] border-orange-500/30 text-orange-400 hover:bg-orange-500/20 bg-transparent rounded-lg" onClick={onRestAll}>
                    Descansar Elenco
                  </Button>
                  <Button size="sm" className="h-8 text-[10px] bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-lg shadow-orange-500/20" onClick={onGoToSquad}>
                    Ir para Elenco
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main responsive grid: 1 col mobile, 12 cols on lg+ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">

      {/* === LEFT COLUMN (Identity + Match) === */}
      <div className="lg:col-span-5 xl:col-span-4 space-y-3 sm:space-y-4">

      {/* Club Info Widget */}
      <Card className="game-card border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 cursor-pointer hover:scale-105 transition-transform" onClick={() => handleOpenProfile(club.name)}>
              <ClubShield club={club as any} size={64} className="sm:w-16 sm:h-16" />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <h2 className="text-sm sm:text-base font-black truncate cursor-pointer hover:text-primary transition-colors" onClick={() => handleOpenProfile(club.name)}>{club.name}</h2>
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
                  <Users className="h-3 w-3 text-primary" />
                  <span className="text-muted-foreground">Elenco:</span>
                  <span className="font-bold">{club.players.length} jog. (OVR {avgOvr})</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-primary" />
                  <span className="text-muted-foreground">País:</span>
                  <span className="font-bold truncate">{club.country || '—'}</span>
                </div>
              </div>

              {/* Stadium block */}
              <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-2 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Landmark className="h-3 w-3 text-primary shrink-0" />
                    <span className="font-bold truncate">{club.stadiumName}</span>
                  </div>
                  <Badge variant="outline" className="text-[8px] gap-1 shrink-0">
                    <Building2 className="h-2.5 w-2.5" /> Lv.{stadiumLevel}{!isMaxStadium ? `/${infrastructure?.stadium?.maxLevel || 15}` : ' MAX'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Capacidade</span>
                    <span className="font-bold">{stadiumCapacity?.toLocaleString() || '?'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Ingresso</span>
                    <span className="font-bold">R${club.ticketPrice}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Torcida</span>
                    <span className="font-bold">{club.fans.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Receita/jogo</span>
                    <span className="font-bold text-emerald-400">{formatMoneyShort(estMatchRevenue)}</span>
                  </div>
                  {occupancyPct !== null && (
                    <div className="flex items-center justify-between col-span-2">
                      <span className="text-muted-foreground">Última lotação</span>
                      <span className="font-bold">{lastAttendance?.toLocaleString()} ({occupancyPct}%)</span>
                    </div>
                  )}
                  {!isMaxStadium && nextStadiumCapacity && (
                    <div className="flex items-center justify-between col-span-2">
                      <span className="text-muted-foreground">Próx. nível</span>
                      <span className="font-bold text-primary">+{(nextStadiumCapacity - (stadiumCapacity || 0)).toLocaleString()} lugares</span>
                    </div>
                  )}
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
                  <Star className="h-2.5 w-2.5" /> Reputação {club.reputation}
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
      <SeasonStartWidget seasonNumber={season} userId={userId} />

      {/* Ballon d'Or Teaser — aparece nas últimas 4 rodadas da temporada */}
      <BallonDorTeaserWidget
        season={season ?? 1}
        currentWeek={currentWeek ?? 1}
        totalWeeks={totalWeeks ?? 38}
        userId={userId}
      />


      {/* Match Card */}
      <MatchDashboardCard club={club} userId={userId} onGoToFriendly={onGoToFriendly} onViewClub={onViewClub} stadiumLevel={stadiumLevel} />

      </div>
      {/* === END LEFT COLUMN === */}

      {/* === RIGHT COLUMN (Performance + Feed) === */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-3 sm:space-y-4">

      {/* Stats Row — Refeito como widget de Ranking e Reputação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="game-card border-primary/20 bg-primary/5">
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-[10px] sm:text-xs uppercase tracking-widest text-primary flex items-center justify-between">
              🏆 Pontuação & Ranking
              <span className="text-[9px] font-mono text-muted-foreground">S{season}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-3xl sm:text-4xl font-black text-foreground tabular-nums leading-none">
                  {club.stats.points}<span className="text-sm font-bold text-muted-foreground ml-1">pts</span>
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Badge variant="outline" className="text-[10px] border-primary/20 bg-primary/10">
                    Posição #{Math.floor(Math.random() * 50) + 1}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">Aproveit. {winRate}%</span>
                </div>
              </div>
              <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border/10">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Meta da Diretoria</span>
                <span className="text-[10px] font-bold text-primary">{(club.stats.points / 50 * 100).toFixed(0)}%</span>
              </div>
              <Progress value={Math.min(100, (club.stats.points / 50) * 100)} className="h-2 progress-glow" />
            </div>
          </CardContent>
        </Card>

        <Card className="game-card border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-[10px] sm:text-xs uppercase tracking-widest text-amber-500 flex items-center justify-between">
              ⭐ Prestígio & Reputação
              <Badge variant="outline" className="text-[8px] h-4 border-amber-500/30 text-amber-400">Nível {Math.floor(club.reputation / 20) + 1}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl sm:text-4xl font-black text-amber-500 leading-none">{club.reputation}</p>
                  <p className="text-xs font-bold text-amber-500/60 uppercase">/100</p>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < Math.floor(club.reputation / 20) ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{club.reputation >= 80 ? 'Clube de Elite' : club.reputation >= 50 ? 'Respeitado' : 'Emergente'}</span>
                </div>
              </div>
              <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Star className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground">Influência no Mercado</p>
                  <Progress value={club.reputation} className="h-1.5 bg-amber-500/10 [&>div]:bg-amber-500" />
                </div>
                <Badge variant="outline" className="text-[9px] border-emerald-500/20 text-emerald-400">+{(club.reputation * 0.1).toFixed(1)}%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>





      {/* TournamentDashboardCard Removido */}


      {/* Próximos Jogos Oficiais removidos */}


      {/* Newspaper */}
      <NewspaperCard onOpenFullPage={onOpenNewspaper} userId={userId} />

      {/* Top 5 League Standings */}
      <LeagueStandingsMini userId={userId} />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-3">
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
        {/* Fan Mood Card - Sincronizado com Performance */}
        <Card className="game-card-accent overflow-hidden">
          <CardHeader className="section-header pb-2 px-3 sm:px-4 pt-3 border-b border-border/10 bg-muted/5">
            <CardTitle className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Heart className="h-3.5 w-3.5 text-primary" /> Torcida & Moral
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-3 sm:px-4 py-4">
            <div className="flex items-center gap-4">
              <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${recentWins >= 3 ? 'bg-success/20 animate-pulse' : recentLosses >= 3 ? 'bg-destructive/20' : 'bg-primary/20'}`}>
                {recentWins >= 4 ? '🔥' : recentWins >= 3 ? '😄' : recentWins >= 2 ? '🙂' : recentLosses >= 5 ? '😡' : recentLosses >= 4 ? '😤' : recentLosses >= 3 ? '😟' : '😐'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Status do Humor</span>
                  <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 h-4 ${fanMoodColor} bg-transparent border-current/20`}>
                    {fanMood}
                  </Badge>
                </div>
                <p className="text-xs font-medium text-foreground leading-tight">
                  {recentWins >= 3 ? 'A torcida está lotando o estádio e apoiando o time!' : recentLosses >= 3 ? 'Clima tenso! A torcida exige resultados imediatos.' : 'Apoio moderado. Resultados positivos trarão mais gente.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-xl bg-background/50 border border-border/50 flex flex-col items-center">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Flame className={`h-3 w-3 ${streak >= 3 && streakType === 'V' ? 'text-warning' : 'text-muted-foreground/50'}`} />
                  <span className="text-[8px] uppercase font-bold">Sequência</span>
                </div>
                <span className="text-xs font-black">{streakLabel}</span>
              </div>
              <div className="p-2 rounded-xl bg-background/50 border border-border/50 flex flex-col items-center">
                <div className="flex items-center gap-1 text-muted-foreground mb-1">
                  <Users className="h-3 w-3 text-primary/70" />
                  <span className="text-[8px] uppercase font-bold">Engajamento</span>
                </div>
                <span className="text-xs font-black">{(winRate * 0.8 + streak * 5).toFixed(0)}%</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-end">
                <span className="text-[9px] font-bold text-muted-foreground uppercase">Reputação do Clube</span>
                <span className="text-[10px] font-mono font-bold">{club.reputation}/100</span>
              </div>
              <div className="relative">
                <Progress value={Math.min(100, club.reputation)} className="h-2 progress-glow" />
                {club.reputation > 80 && <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />}
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
              <Users className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground leading-none mb-1">Base de Fãs</p>
                <p className="text-xs font-black tabular-nums">{club.fans.toLocaleString()} torcedores</p>
              </div>
              {recentWins > recentLosses ? (
                <div className="flex items-center text-[10px] font-bold text-success">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  +{(recentWins * 1.5).toFixed(1)}%
                </div>
              ) : recentLosses > recentWins ? (
                <div className="flex items-center text-[10px] font-bold text-destructive">
                  <TrendingUp className="h-3 w-3 mr-0.5 rotate-180" />
                  -{(recentLosses * 1.2).toFixed(1)}%
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Infrastructure */}
      <div className="grid grid-cols-1 gap-3">
        <Card className="game-card">
          <CardHeader className="section-header pb-3 px-4 sm:px-5 pt-4">
            <CardTitle className="text-sm sm:text-base uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> Infraestrutura
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 sm:px-5 pb-4">
            {infrastructure ? (
              <div className="space-y-3">
                {[
                  { label: 'Estádio', value: infrastructure.stadium?.level || 1, max: infrastructure.stadium?.maxLevel || 15, icon: '🏟️' },
                  { label: 'CT', value: infrastructure.trainingCenter?.level || 1, max: infrastructure.trainingCenter?.maxLevel || 30, icon: '⚽' },
                  { label: 'Fisioterapia', value: infrastructure.physiotherapy?.level || 1, max: infrastructure.physiotherapy?.maxLevel || 10, icon: '🏥' },
                  { label: 'Academia', value: infrastructure.youthAcademy?.level || 1, max: infrastructure.youthAcademy?.maxLevel || 30, icon: '🎓' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-base sm:text-lg w-6 text-center">{item.icon}</span>
                    <span className="text-xs sm:text-sm text-muted-foreground w-24 sm:w-28">{item.label}</span>
                    <Progress value={(item.value / item.max) * 100} className="flex-1 h-2.5 sm:h-3 progress-glow" />
                    <span className="text-xs sm:text-sm font-bold w-16 sm:w-20 text-right tabular-nums">Lv.{item.value}<span className="text-muted-foreground/60 text-[10px]">/{item.max}</span></span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
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
                  <div key={i} className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold transition-all ${w ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10' : d ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'}`}>
                    <span className="text-[7px] opacity-70 mb-0.5">{w ? 'V' : d ? 'E' : 'D'}</span>
                    <span className="text-xs">{r.home}-{r.away}</span>
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
      {/* === END RIGHT COLUMN === */}

      </div>
      {/* === END MAIN GRID === */}
    </div>
  );
}
