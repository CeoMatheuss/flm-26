import { Club } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Swords, MapPin, Calendar, Clock, Radio, FileText, Building2, Crown, Trophy, Loader2, Play, Eye } from 'lucide-react';
import { ShieldCrest } from './ShieldCrest';
import { shieldPropsFromClub, hasShield } from './shieldHelpers';
import flmLogo from '@/assets/flm26-logo.png';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/* ── Component to show next tournament match when idle ── */
function NextTournamentMatch({ userId, clubName, onGoToFriendly, onViewClub }: { userId?: string; clubName: string; onGoToFriendly?: () => void; onViewClub?: (name: string) => void }) {
  const navigate = useNavigate();
  const [nextMatch, setNextMatch] = useState<{
    home: string; away: string; date: string; tournament: string;
    matchId: string; homeTeamId: string; awayTeamId: string;
    opponentStrength: number; isHome: boolean; tournamentName: string;
    status?: string; homeGoals?: number | null; awayGoals?: number | null; playedAt?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      const { data: myTeams } = await supabase
        .from('custom_tournament_teams')
        .select('id, tournament_id, club_name, bot_strength, user_id')
        .eq('user_id', userId);

      if (!myTeams || myTeams.length === 0) { if (!cancelled) setLoading(false); return; }

      const teamIds = myTeams.map(t => t.id);
      const tournamentIds = [...new Set(myTeams.map(t => t.tournament_id))];

      // Look at scheduled OR finished — we want the next pending OR last auto-simulated one
      const { data: matches } = await supabase
        .from('custom_tournament_matches')
        .select('*')
        .in('status', ['scheduled', 'finished'])
        .in('tournament_id', tournamentIds)
        .order('scheduled_at', { ascending: true })
        .limit(80);

      if (!matches) { if (!cancelled) setLoading(false); return; }

      // Prefer next scheduled; fallback to most recent finished
      const myScheduled = matches
        .filter(m => m.status === 'scheduled' && (teamIds.includes(m.home_team_id) || teamIds.includes(m.away_team_id)));
      const myFinished = matches
        .filter(m => m.status === 'finished' && (teamIds.includes(m.home_team_id) || teamIds.includes(m.away_team_id)))
        .sort((a, b) => new Date(b.played_at || b.scheduled_at || 0).getTime() - new Date(a.played_at || a.scheduled_at || 0).getTime());

      const myMatch = myScheduled[0] || myFinished[0];
      if (!myMatch) { if (!cancelled) setLoading(false); return; }

      const { data: matchTeams } = await supabase
        .from('custom_tournament_teams')
        .select('id, club_name, bot_strength, user_id')
        .in('id', [myMatch.home_team_id, myMatch.away_team_id]);

      const { data: tournament } = await supabase
        .from('custom_tournaments')
        .select('name')
        .eq('id', myMatch.tournament_id)
        .single();

      const homeT = matchTeams?.find(t => t.id === myMatch.home_team_id);
      const awayT = matchTeams?.find(t => t.id === myMatch.away_team_id);
      const isPlayerHome = homeT?.user_id === userId;
      const opponent = isPlayerHome ? awayT : homeT;

      if (cancelled) return;
      setNextMatch({
        home: homeT?.club_name || '???',
        away: awayT?.club_name || '???',
        date: myMatch.scheduled_at || '',
        tournament: tournament?.name || 'Campeonato',
        matchId: myMatch.id,
        homeTeamId: myMatch.home_team_id,
        awayTeamId: myMatch.away_team_id,
        opponentStrength: opponent?.bot_strength || 60,
        isHome: isPlayerHome,
        tournamentName: tournament?.name || 'Campeonato',
        status: myMatch.status,
        homeGoals: myMatch.home_goals ?? null,
        awayGoals: myMatch.away_goals ?? null,
        playedAt: myMatch.played_at || null,
      } as any);
      setLoading(false);
    };
    load();

    // Poll every 10s when expired-but-still-scheduled, to catch the cron simulation
    const interval = setInterval(load, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [userId]);

  // Live countdown timer (only relevant when match is still scheduled)
  useEffect(() => {
    if (!nextMatch?.date || nextMatch.status === 'finished') return;
    const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
    const update = () => {
      const scheduledTime = new Date(nextMatch.date).getTime();
      const now = Date.now();
      const diff = scheduledTime - now;
      const elapsed = now - scheduledTime;
      if (diff <= 0 && elapsed >= WINDOW_MS) {
        // Past 5-min window — server is simulating; just show "Aguardando..."
        setTimeLeft('Aguardando resultado...');
        setIsReady(false);
      } else if (diff <= 0) {
        // Within 5-min window — can play
        const remaining = WINDOW_MS - elapsed;
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setTimeLeft(`${mins}:${String(secs).padStart(2, '0')} restantes`);
        setIsReady(true);
      } else {
        setIsReady(false);
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(h > 0 ? `${h}h ${m}min` : `${m}:${String(s).padStart(2, '0')}`);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextMatch?.date, nextMatch?.status]);

  const handleGoToMatch = () => {
    if (!nextMatch) return;
    navigate('/', {
      replace: true,
      state: {
        playTournamentMatch: {
          matchId: nextMatch.matchId,
          tournamentMatchId: nextMatch.matchId,
          opponentName: nextMatch.isHome ? nextMatch.away : nextMatch.home,
          opponentStrength: nextMatch.opponentStrength,
          isHome: nextMatch.isHome,
          competition: nextMatch.tournamentName,
        },
      },
    });
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (nextMatch) {
    const matchDate = nextMatch.date ? new Date(nextMatch.date) : null;
    const isToday = matchDate ? matchDate.toDateString() === new Date().toDateString() : false;
    const fmt = nextMatch.date ? {
      dateFormatted: new Date(nextMatch.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      timeFormatted: new Date(nextMatch.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    } : null;

    const isFinished = nextMatch.status === 'finished';

    // Finished match — show as a normal closed match with score & report button
    if (isFinished) {
      return (
        <div className="text-center py-3 space-y-2">
          <div className="flex items-center justify-center gap-1.5">
            <Trophy className="h-4 w-4 text-primary" />
            <p className="text-[10px] font-bold text-primary uppercase">{nextMatch.tournament}</p>
          </div>
          <Badge variant="secondary" className="text-[9px]">Final</Badge>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => onViewClub?.(nextMatch.home)} className="text-xs font-bold truncate max-w-[90px] hover:text-primary hover:underline transition-colors cursor-pointer">{nextMatch.home}</button>
            <span className="text-xl font-black tabular-nums">{nextMatch.homeGoals ?? 0} <span className="text-muted-foreground">-</span> {nextMatch.awayGoals ?? 0}</span>
            <button onClick={() => onViewClub?.(nextMatch.away)} className="text-xs font-bold truncate max-w-[90px] hover:text-primary hover:underline transition-colors cursor-pointer">{nextMatch.away}</button>
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-[10px] h-8 w-full font-bold"
              onClick={() => navigate(`/replay/${nextMatch.matchId}`)}
            >
              <FileText className="h-3.5 w-3.5" /> VER RELATÓRIO
            </Button>
            {onGoToFriendly && (
              <Button size="sm" variant="ghost" className="gap-2 text-[10px] h-7" onClick={onGoToFriendly}>
                <Swords className="h-3 w-3" /> Jogar Amistoso
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-3 space-y-2">
        <div className="flex items-center justify-center gap-1.5">
          <Trophy className="h-4 w-4 text-primary" />
          <p className="text-[10px] font-bold text-primary uppercase">{nextMatch.tournament}</p>
        </div>
        <Badge variant={isReady ? 'destructive' : isToday ? 'secondary' : 'outline'} className={`text-[9px] ${isReady ? 'animate-pulse' : ''}`}>
          {isReady ? '🔴 PRONTO PARA JOGAR!' :
            isToday ? `⏰ HOJE às ${fmt?.timeFormatted}` :
            fmt ? `📅 ${fmt.dateFormatted} às ${fmt.timeFormatted}` : 'Em breve'}
        </Badge>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => onViewClub?.(nextMatch.home)} className="text-xs font-bold truncate max-w-[100px] hover:text-primary hover:underline transition-colors cursor-pointer">{nextMatch.home}</button>
          <span className="text-base font-black text-muted-foreground">VS</span>
          <button onClick={() => onViewClub?.(nextMatch.away)} className="text-xs font-bold truncate max-w-[100px] hover:text-primary hover:underline transition-colors cursor-pointer">{nextMatch.away}</button>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <Clock className={`h-3 w-3 ${isReady ? 'text-destructive' : 'text-muted-foreground'}`} />
          <p className={`text-[10px] font-bold ${isReady ? 'text-destructive' : 'text-muted-foreground'}`}>⏱️ {timeLeft}</p>
        </div>
        <div className="flex flex-col gap-1.5 pt-1">
          <Button
            size="sm"
            variant={isReady ? 'default' : 'outline'}
            className={`gap-2 text-[10px] h-8 w-full font-bold ${isReady ? 'animate-pulse' : ''}`}
            onClick={handleGoToMatch}
            disabled={!isReady}
          >
            {isReady ? <><Play className="h-3.5 w-3.5" /> ⚽ JOGAR PARTIDA</> : <><Eye className="h-3.5 w-3.5" /> Aguardando horário...</>}
          </Button>
          {onGoToFriendly && !isReady && (
            <Button size="sm" variant="ghost" className="gap-2 text-[10px] h-7" onClick={onGoToFriendly}>
              <Swords className="h-3 w-3" /> Jogar Amistoso
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-4">
      <Swords className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-muted-foreground" />
      <p className="font-bold text-sm">Nenhuma partida agendada</p>
      <p className="text-xs text-muted-foreground mt-1">Jogue um amistoso contra BOT FC!</p>
      {onGoToFriendly && (
        <Button size="sm" className="mt-3 gap-2" onClick={onGoToFriendly}>
          <Swords className="h-3.5 w-3.5" /> Ir para Amistosos
        </Button>
      )}
    </div>
  );
}

interface LiveMatchFromDB {
  id: string;
  home_team: string;
  away_team: string;
  stadium_name: string;
  stadium_capacity: number;
  match_id: string;
  home_goals: number;
  away_goals: number;
  is_home: boolean;
  competition: string;
  status: string;
  started_at: string;
  duration_seconds: number;
  events: any;
}

interface Props {
  club: Club;
  userId?: string;
  onGoToFriendly?: () => void;
  onViewClub?: (clubName: string) => void;
}

type MatchStatus = 'live' | 'finished' | 'none';

/**
 * matchDashboardCard — BLOCO FIXO OBRIGATÓRIO
 * Sempre renderizado no topo do dashboard. Nunca removido.
 * Consome dados do backend (live_matches table) e club.matches (scheduled/finished).
 */
export function MatchDashboardCard({ club, userId, onGoToFriendly, onViewClub }: Props) {
  const navigate = useNavigate();
  const [liveMatch, setLiveMatch] = useState<LiveMatchFromDB | null>(null);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [currentHomeGoals, setCurrentHomeGoals] = useState(0);
  const [currentAwayGoals, setCurrentAwayGoals] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumDaysLeft, setPremiumDaysLeft] = useState(0);

  // Check premium status
  useEffect(() => {
    if (!userId) return;
    const checkPremium = async () => {
      const { data } = await supabase.
      from('premium_users').
      select('activated_at, status').
      eq('user_id', userId).
      eq('status', 'active').
      maybeSingle();
      if (data) {
        const activatedAt = new Date(data.activated_at).getTime();
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const remaining = thirtyDaysMs - (now - activatedAt);
        if (remaining > 0) {
          setIsPremium(true);
          setPremiumDaysLeft(Math.ceil(remaining / (24 * 60 * 60 * 1000)));
        } else {
          setIsPremium(false);
        }
      }
    };
    checkPremium();
  }, [userId]);

  // Poll DB for active live match
  useEffect(() => {
    const fetchLive = async () => {
      const { data } = await supabase.
      from('live_matches').
      select('*').
      eq('status', 'live').
      order('created_at', { ascending: false }).
      limit(1).
      maybeSingle();

      if (data) {
        setLiveMatch(data as any);
        // Calculate current minute based on elapsed time
        const startTime = new Date(data.started_at).getTime();
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / (data.duration_seconds * 1000));

        // Get max minute from events
        const events = data.events as any[] || [];
        const maxMin = events.length > 0 ? Math.max(...events.map((e: any) => e.minute)) : 90;
        const gameMin = Math.floor(progress * maxMin);
        setCurrentMinute(gameMin);

        // ANTI-SPOILER: contar gols apenas dos eventos já "ocorridos" até o minuto atual.
        // Os campos home_goals/away_goals do banco contém o placar FINAL pré-calculado,
        // então usar diretamente revelaria o resultado antecipadamente no dashboard.
        const visibleGoals = events.filter((e: any) => e.minute <= gameMin && (e.isGoal || e.type === 'goal'));
        const liveHomeGoals = visibleGoals.filter((e: any) => e.team === 'home').length;
        const liveAwayGoals = visibleGoals.filter((e: any) => e.team === 'away').length;
        setCurrentHomeGoals(liveHomeGoals);
        setCurrentAwayGoals(liveAwayGoals);

        // If match time has elapsed, treat as finished locally (visual only)
        // NOTE: Actual finalization is handled exclusively by MatchResultLocker
        if (now >= startTime + data.duration_seconds * 1000) {
          setLiveMatch(null);
        }
      } else {
        setLiveMatch(null);
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 3000);
    return () => clearInterval(interval);
  }, []);

  // Determine match status and data
  // NOTE: Do NOT show pending bot friendlies as "scheduled" — they are on-demand only
  const lastFinished = [...club.matches].filter((m) => m.played).pop();

  let status: MatchStatus = 'none';
  if (liveMatch) {
    status = 'live';
  } else if (lastFinished) {
    status = 'finished';
  }

  // Resolve display data
  const homeTeamName = status === 'live' ?
  liveMatch!.home_team :
  status === 'finished' ?
  lastFinished!.isHome !== false ? club.name : lastFinished!.opponent :
  club.name;

  const awayTeamName = status === 'live' ?
  liveMatch!.away_team :
  status === 'finished' ?
  lastFinished!.isHome !== false ? lastFinished!.opponent : club.name :
  '—';

  const competition = status === 'live' ?
  liveMatch!.competition || 'Amistoso' :
  'Amistoso';

  const matchDate = status === 'finished' ?
  lastFinished!.date :
  '—';

  const venueName = status === 'live' ?
  liveMatch!.stadium_name || club.stadiumName :
  status === 'finished' ?
  lastFinished!.stadium || club.stadiumName :
  club.stadiumName;

  const venueCapacity = status === 'live' ?
  liveMatch!.stadium_capacity || null :
  status === 'finished' ?
  lastFinished!.stadiumCapacity || null :
  null;

  const isHome = status === 'live' ?
  liveMatch!.is_home :
  status === 'finished' ?
  lastFinished!.isHome !== false :
  true;

  // Border color based on status
  const borderClass = status === 'live' ?
  'border-destructive/60 bg-destructive/5' :
  status === 'finished' ?
  'border-muted-foreground/30' :
  'border-primary/30';

  // Club logo renderer
  const renderClubLogo = (isClub: boolean) => {
    if (isClub) {
      if (hasShield(club as any)) {
        return <ShieldCrest {...shieldPropsFromClub(club as any)} size={40} className="mx-auto mb-1" />;
      } else if (club.logoUrl) {
        return <img src={club.logoUrl} alt={club.name} className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 rounded object-cover" />;
      } else {
        return <img src={flmLogo} alt="FLM" className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 rounded" />;
      }
    }
    return <Swords className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-1 text-muted-foreground" />;
  };

  const isHomeTeamClub = homeTeamName === club.name;
  const isAwayTeamClub = awayTeamName === club.name;

  return (
    <Card className={`border-2 ${borderClass}`}>
      {isPremium &&
      <div className="bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-yellow-500/20 border-b border-yellow-500/30 px-3 py-1.5 space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Crown className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-[10px] sm:text-xs font-bold text-yellow-400 uppercase tracking-widest">Premium</span>
            <span className="text-[8px] sm:text-[9px] text-yellow-400/70">
              {premiumDaysLeft > 0 ? `${premiumDaysLeft} dia${premiumDaysLeft === 1 ? '' : 's'} restante${premiumDaysLeft === 1 ? '' : 's'}` : 'Expirando hoje'}
            </span>
          </div>
          <div className="h-1 w-full bg-yellow-950/40 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                premiumDaysLeft <= 3 ? 'bg-red-500' : premiumDaysLeft <= 7 ? 'bg-amber-500' : 'bg-yellow-400'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, (premiumDaysLeft / 30) * 100))}%` }}
            />
          </div>
        </div>
      }
      <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
          {status === 'live' ?
          <>
              <Radio className="h-3 w-3 sm:h-4 sm:w-4 text-destructive animate-pulse" />
              <span className="text-destructive font-bold">Partida Atual</span>
              <Badge variant="destructive" className="text-[9px] animate-pulse ml-auto">🔴 AO VIVO</Badge>
            </> :
          status === 'finished' ?
          <>
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-bold">Última Partida</span>
              <Badge variant="secondary" className="text-[9px] ml-auto">Encerrada</Badge>
            </> :
          null}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        {status === 'none' ?
        <NextTournamentMatch userId={userId} clubName={club.name} onGoToFriendly={onGoToFriendly} onViewClub={onViewClub} /> :

        <div className="space-y-3">
            {/* Info bar */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-border/30">
              <Badge variant="outline" className="text-[9px] sm:text-[10px]">⚽ {competition}</Badge>
              <Badge variant="outline" className="text-[9px] sm:text-[10px] flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5" /> {venueName}
              </Badge>
              {venueCapacity &&
            <Badge variant="outline" className="text-[9px] sm:text-[10px] flex items-center gap-1">
                  <Building2 className="h-2.5 w-2.5" /> {venueCapacity.toLocaleString()} lugares
                </Badge>
            }
              <Badge variant="outline" className="text-[9px] sm:text-[10px]">
                {isHome ? '🏠 Casa' : '✈️ Fora'}
              </Badge>
              {status === 'live' &&
            <Badge variant="outline" className="text-[9px] sm:text-[10px] text-emerald-500 border-emerald-500/30">
                  🖥️ Servidor
                </Badge>
            }
            </div>

            {/* Date & Status row */}
            <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {matchDate}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {status === 'live' ?
              <span className="text-destructive font-bold animate-pulse">AO VIVO — {currentMinute}'</span> :
              status === 'finished' ?
              <span>Encerrada</span> :

              <span>Agendada</span>
              }
              </span>
            </div>

            {/* Teams & Score */}
            <div className="flex items-center justify-between py-2">
              <div className="text-center flex-1 min-w-0">
                {renderClubLogo(isHomeTeamClub)}
                <button onClick={() => onViewClub?.(homeTeamName)} className="font-bold text-xs sm:text-sm truncate hover:text-primary hover:underline transition-colors cursor-pointer">{homeTeamName}</button>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Mandante</p>
              </div>

              <div className="text-center px-3 sm:px-5 shrink-0">
                {status === 'live' ?
              <>
                    <p className="text-2xl sm:text-3xl font-black tabular-nums">
                      {currentHomeGoals} <span className="text-muted-foreground">-</span> {currentAwayGoals}
                    </p>
                    <p className="text-[10px] sm:text-xs text-destructive font-bold animate-pulse mt-0.5">{currentMinute}'</p>
                  </> :
              status === 'finished' && lastFinished?.result ?
              <>
                    <p className="text-2xl sm:text-3xl font-black tabular-nums">
                      {lastFinished.result.home} <span className="text-muted-foreground">-</span> {lastFinished.result.away}
                    </p>
                    <Badge variant="secondary" className="text-[8px] mt-1">Final</Badge>
                  </> :

              <>
                    <p className="text-base sm:text-lg font-bold text-muted-foreground">VS</p>
                    <Badge variant="outline" className="text-[8px] mt-1">Agendada</Badge>
                  </>
              }
              </div>

              <div className="text-center flex-1 min-w-0">
                {renderClubLogo(isAwayTeamClub)}
                <button onClick={() => onViewClub?.(awayTeamName)} className="font-bold text-xs sm:text-sm truncate hover:text-primary hover:underline transition-colors cursor-pointer">{awayTeamName}</button>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Visitante</p>
              </div>
            </div>

            {/* Action buttons */}
            {status === 'live' && liveMatch &&
          <Button
            className="w-full gap-2 font-bold"
            variant="destructive"
            onClick={() => navigate('/match', { state: { liveMatchDbId: liveMatch.id } })}>
            
                <Radio className="h-4 w-4 animate-pulse" /> IR PARA A PARTIDA
              </Button>
          }
            {status === 'finished' &&
          <Button
            className="w-full gap-2 font-bold"
            variant="outline"
            disabled>
            
                <FileText className="h-4 w-4" /> VER RELATÓRIO
              </Button>
          }
          </div>
        }
      </CardContent>
    </Card>);

}