import { Club } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Swords, MapPin, Calendar, Clock, Radio, FileText, Building2, Crown, Trophy, Loader2, Play, Eye, X } from 'lucide-react';
import { ShieldCrest } from './ShieldCrest';
import { ClubShield } from './ClubShield';
import { shieldPropsFromClub, hasShield } from './shieldHelpers';
import flmLogo from '@/assets/flm26-logo.png';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMatchShields } from '@/hooks/useMatchShields';

/* ── Component to show next match (friendly OR tournament) when idle ── */
function NextTournamentMatch({ userId, clubName, onGoToFriendly }: { userId?: string; clubName: string; onGoToFriendly?: () => void }) {
  const handleOpenProfile = (name?: string) => {
    if (!name) return;
    (window as any).dispatchEvent(new CustomEvent('flm:open-club-profile', { detail: { club_name: name } }));
  };

  const navigate = useNavigate();
  const [nextMatch, setNextMatch] = useState<{
    home: string; away: string; date: string; tournament: string;
    matchId: string; homeTeamId: string; awayTeamId: string;
    opponentStrength: number; isHome: boolean; tournamentName: string;
    status?: string; homeGoals?: number | null; awayGoals?: number | null; playedAt?: string | null;
    round?: number;
    kind?: 'friendly' | 'tournament' | 'league';
    stage?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;

    const loadNextMatch = async () => {
      const { data: teamData } = await supabase
        .from('world_teams')
        .select('id, name')
        .eq('user_id', userId)
        .maybeSingle();

      if (!teamData) {
        if (!cancelled) {
          setNextMatch(null);
          setLoading(false);
        }
        return;
      }

      const candidates: any[] = [];

      // 1. Próxima partida da Copa Nacional (busca via national_cup_teams do usuário)
      const { data: cupTeamRows } = await supabase
        .from('national_cup_teams')
        .select('id, cup_id')
        .eq('user_id', userId)
        .eq('eliminated', false);

      const cupTeamIds = (cupTeamRows || []).map((r: any) => r.id);

      if (cupTeamIds.length > 0) {
        const idsCsv = cupTeamIds.join(',');
        const { data: cupMatches } = await supabase
          .from('national_cup_matches')
          .select(`
            id, round, status, scheduled_at, home_team_id, away_team_id,
            cup:national_cups (name),
            home:national_cup_teams!home_team_id (club_name, strength, user_id),
            away:national_cup_teams!away_team_id (club_name, strength, user_id)
          `)
          .or(`home_team_id.in.(${idsCsv}),away_team_id.in.(${idsCsv})`)
          .in('status', ['scheduled', 'live'])
          .order('scheduled_at', { ascending: true })
          .limit(1);

        if (cupMatches && cupMatches.length > 0) {
          const m: any = cupMatches[0];
          const isHome = m.home?.user_id === userId;
          candidates.push({
            home: m.home.club_name,
            away: m.away.club_name,
            date: m.scheduled_at,
            tournament: m.cup?.name || 'Copa Nacional',
            matchId: m.id,
            homeTeamId: m.home_team_id,
            awayTeamId: m.away_team_id,
            opponentStrength: isHome ? m.away.strength : m.home.strength,
            isHome,
            tournamentName: m.cup?.name || 'Copa Nacional',
            status: m.status,
            round: m.round,
            kind: 'tournament',
            stage: `Fase ${m.round}`,
          });
        }
      }

      // 2. Próxima partida da Liga
      const { data: matches, error } = await supabase
        .from('world_matches')
        .select(`
          id,
          round,
          status,
          scheduled_at,
          home_team_id,
          away_team_id,
          world_leagues (name),
          home_team:world_teams!world_matches_home_team_id_fkey (name, strength),
          away_team:world_teams!world_matches_away_team_id_fkey (name, strength)
        `)
        .or(`home_team_id.eq.${teamData.id},away_team_id.eq.${teamData.id}`)
        .in('status', ['scheduled', 'live'])
        .order('scheduled_at', { ascending: true })
        .limit(1);

      if (error) console.error('Error fetching next match:', error);

      if (matches && matches.length > 0) {
        const m: any = matches[0];
        const isHome = m.home_team_id === teamData.id;
        candidates.push({
          home: m.home_team.name,
          away: m.away_team.name,
          date: m.scheduled_at,
          tournament: m.world_leagues?.name || 'Liga',
          matchId: m.id,
          homeTeamId: m.home_team_id,
          awayTeamId: m.away_team_id,
          opponentStrength: isHome ? m.away_team.strength : m.home_team.strength,
          isHome,
          tournamentName: m.world_leagues?.name || 'Liga',
          status: m.status,
          round: m.round,
          kind: 'league',
          stage: 'Liga',
        });
      }

      if (!cancelled) {
        if (candidates.length === 0) {
          setNextMatch(null);
        } else {
          candidates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setNextMatch(candidates[0]);
        }
        setLoading(false);
      }
    };

    loadNextMatch();

    const channel = supabase
      .channel(`dash-next-match-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'world_matches' }, () => loadNextMatch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'national_cup_matches' }, () => loadNextMatch())
      .subscribe();

    // Listen for custom league update events from other components
    const handleSync = () => loadNextMatch();
    window.addEventListener('league_match_updated', handleSync);

    const interval = setInterval(loadNextMatch, 60000);
    return () => { 
      cancelled = true; 
      clearInterval(interval); 
      supabase.removeChannel(channel); 
      window.removeEventListener('league_match_updated', handleSync);
    };
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
      
      if (diff <= 0 && elapsed >= 1 * 60 * 1000) {
        // More than 1 min past -> should be simulated
        setTimeLeft('Simulando...');
        setIsReady(false);
      } else if (diff <= 0) {
        // Within the kickoff window
        setTimeLeft('🔴 AO VIVO');
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
    // Amistoso → manda usuário pra aba de amistosos onde o lobby abre
    if (nextMatch.kind === 'friendly') {
      onGoToFriendly?.();
      return;
    }
    const stageStr = String(nextMatch.stage || '').toLowerCase();
    const isKnockout = stageStr && !stageStr.startsWith('grupo') && stageStr !== 'league' && stageStr !== 'liga' && stageStr !== 'group';
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
          tieBreaker: nextMatch.kind === 'tournament' ? 'both' : (isKnockout ? 'both' : 'none'),
          isNationalCup: nextMatch.kind === 'tournament'
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
    // Horário exibido = horário real salvo no banco (Liga 19:30 BRT, Copa 12:00 BRT)
    const fmt = nextMatch.date ? {
      dateFormatted: new Date(nextMatch.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }),
      timeFormatted: new Date(nextMatch.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }),
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
            <button onClick={() => handleOpenProfile(nextMatch.home)} className="text-xs font-bold truncate max-w-[90px] hover:text-primary hover:underline transition-colors cursor-pointer">{nextMatch.home}</button>
            <span className="text-xl font-black tabular-nums">{nextMatch.homeGoals ?? 0} <span className="text-muted-foreground">-</span> {nextMatch.awayGoals ?? 0}</span>
            <button onClick={() => handleOpenProfile(nextMatch.away)} className="text-xs font-bold truncate max-w-[90px] hover:text-primary hover:underline transition-colors cursor-pointer">{nextMatch.away}</button>
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
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-3 space-y-2">
        <div className="flex items-center justify-center gap-1.5">
          <Swords className="h-4 w-4 text-primary" />
          <p className="text-[10px] font-bold text-primary uppercase">
            {nextMatch.tournament} {nextMatch.round ? `• Rodada ${nextMatch.round}` : ''}
          </p>
        </div>
        <Badge variant={isReady ? 'destructive' : isToday ? 'secondary' : 'outline'} className={`text-[9px] ${isReady ? 'animate-pulse' : ''}`}>
          {isReady ? '🔴 AO VIVO' :
            isToday && fmt ? `⏰ HOJE às ${fmt.timeFormatted}` :
            fmt ? `📅 ${fmt.dateFormatted} às ${fmt.timeFormatted}` : 'Em breve'}
        </Badge>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => handleOpenProfile(nextMatch.home)} className="text-xs font-bold truncate max-w-[100px] hover:text-primary hover:underline transition-colors cursor-pointer">{nextMatch.home}</button>
          <span className="text-base font-black text-muted-foreground">VS</span>
          <button onClick={() => handleOpenProfile(nextMatch.away)} className="text-xs font-bold truncate max-w-[100px] hover:text-primary hover:underline transition-colors cursor-pointer">{nextMatch.away}</button>
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
            {isReady ? <><Play className="h-3.5 w-3.5" /> ⚽ JOGAR PARTIDA</> : <><Eye className="h-3.5 w-3.5" /> AGUARDANDO HORÁRIO</>}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-4">
      <Swords className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-muted-foreground" />
      <p className="font-bold text-sm">Nenhuma partida agendada</p>
      <p className="text-xs text-muted-foreground mt-1">Jogue um amistoso contra BOT FC!</p>
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
  // Trigger league sync on dashboard load
  useEffect(() => {
    if (!userId) return;
    const sync = async () => {
      try {
        const { data: team } = await supabase.from('world_teams').select('id, name, logo').eq('user_id', userId).maybeSingle();
        if (!team) {
          // Initialize player in the world league system (replaces a bot or joins cup)
          await supabase.rpc('replace_bot_with_player', { 
            _user_id: userId, 
            _team_name: club.name, 
            _logo: club.logoUrl || '⚽',
            _country: (club as any).country || 'Brasil'
          });
        }
        // Always sync cup status to ensure fixtures are generated/simulated
        await supabase.rpc('sync_beginner_cup', { _user_id: userId });
      } catch (e) {
        console.error('League sync error:', e);
      }
    };
    sync();
  }, [userId, club.name]);

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

  // ── Auto-hide do widget de resultado finalizado ──
  // Regras:
  //  • Aparece por até FINISHED_DISPLAY_MS após detectar a partida finalizada.
  //  • Reset automático quando o id muda (nova partida finalizada) ou quando uma live entra.
  //  • Botão X também esconde manualmente. Ocultar imediatamente se uma nova live começar.
  //  • IMPORTANTE: se a partida foi finalizada há MAIS que FINISHED_DISPLAY_MS (ex.:
  //    save antigo, recarregou a página), o widget JÁ NASCE escondido. Isso garante
  //    que não apareça um resultado "fantasma" travado na tela.
  const FINISHED_DISPLAY_MS = 20_000; // 20s
  const FADE_OUT_MS = 600;
  const [finishedHidden, setFinishedHidden] = useState(false);
  const [finishedFadingOut, setFinishedFadingOut] = useState(false);
  const [trackedFinishedId, setTrackedFinishedId] = useState<string | null>(null);

  // Quanto tempo passou desde o término da partida finalizada (em ms)
  const finishedAgeMs = useMemo(() => {
    if (!lastFinished) return Number.POSITIVE_INFINITY;
    // Tenta vários campos de timestamp possíveis
    const tsRaw = (lastFinished as any).playedAt
      ?? (lastFinished as any).finishedAt
      ?? (lastFinished as any).date
      ?? null;
    const ts = tsRaw ? new Date(tsRaw).getTime() : NaN;
    if (!Number.isFinite(ts)) return 0; // sem timestamp válido → trata como recém
    return Date.now() - ts;
  }, [lastFinished]);

  useEffect(() => {
    const id = lastFinished?.id ?? null;
    if (id && id !== trackedFinishedId) {
      // Nova partida finalizada detectada — reseta visibilidade
      setTrackedFinishedId(id);
      // Se a partida é antiga demais, já nasce escondida (evita widget fantasma)
      const isStale = finishedAgeMs > FINISHED_DISPLAY_MS;
      setFinishedHidden(isStale);
      setFinishedFadingOut(false);
    }
    if (!id) {
      setTrackedFinishedId(null);
      setFinishedHidden(false);
      setFinishedFadingOut(false);
    }
  }, [lastFinished?.id, trackedFinishedId, finishedAgeMs]);

  useEffect(() => {
    // Esconde se a tela ficar oculta (mudou de aba, minimizou) — limpa o widget
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && trackedFinishedId) {
        setFinishedHidden(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [trackedFinishedId]);

  useEffect(() => {
    if (!trackedFinishedId || finishedHidden || liveMatch) return;
    // Se a partida já é antiga, não inicia o timer — esconde já.
    if (finishedAgeMs > FINISHED_DISPLAY_MS) {
      setFinishedHidden(true);
      return;
    }
    const remaining = Math.max(1_000, FINISHED_DISPLAY_MS - Math.max(0, finishedAgeMs));
    const fadeTimer = setTimeout(() => setFinishedFadingOut(true), Math.max(0, remaining - FADE_OUT_MS));
    const hideTimer = setTimeout(() => setFinishedHidden(true), remaining);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, [trackedFinishedId, finishedHidden, liveMatch, finishedAgeMs]);

  // Se uma nova partida ao vivo iniciar, esconde imediatamente o resultado anterior
  useEffect(() => {
    if (liveMatch && trackedFinishedId) {
      setFinishedHidden(true);
    }
  }, [liveMatch, trackedFinishedId]);

  let status: MatchStatus = 'none';
  if (liveMatch) {
    status = 'live';
  } else if (lastFinished && !finishedHidden) {
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

  // Resolve REAL shields for both teams (synced with player choices) — only when in live/finished
  const { homeShield, awayShield } = useMatchShields(
    status !== 'none' ? homeTeamName : undefined,
    status !== 'none' ? awayTeamName : undefined,
  );

  // Render the appropriate shield for a side, prioritizing the player's own club shield
  const renderTeamShield = (isClubSide: boolean, side: 'home' | 'away') => {
    if (isClubSide && hasShield(club as any)) {
      return <ShieldCrest {...shieldPropsFromClub(club as any)} size={40} className="mx-auto mb-1" />;
    }
    const props = side === 'home' ? homeShield : awayShield;
    return <ShieldCrest {...props} size={40} className="mx-auto mb-1" />;
  };

  return (
    <Card
      className={`border-2 ${borderClass} relative transition-opacity duration-500 ${
        status === 'finished' && finishedFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {status === 'finished' && (
        <Button
          size="icon"
          variant="ghost"
          aria-label="Fechar widget de resultado"
          onClick={() => { setFinishedFadingOut(true); setTimeout(() => setFinishedHidden(true), FADE_OUT_MS); }}
          className="absolute top-1.5 right-1.5 h-7 w-7 z-20 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
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
        <NextTournamentMatch userId={userId || ''} clubName={club.name} onGoToFriendly={onGoToFriendly} /> :

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
                {renderTeamShield(isHomeTeamClub, 'home')}
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
                {renderTeamShield(isAwayTeamClub, 'away')}
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
            onClick={() => {
              // Interação manual: fecha o widget e leva ao histórico/relatório
              setFinishedFadingOut(true);
              setTimeout(() => setFinishedHidden(true), FADE_OUT_MS);
              if (lastFinished?.id) {
                navigate(`/replay/${lastFinished.id}`);
              }
            }}>
            
                <FileText className="h-4 w-4" /> VER RELATÓRIO
              </Button>
          }
          </div>
        }
      </CardContent>
    </Card>);

}