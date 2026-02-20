import { Club } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Swords, MapPin, Calendar, Clock, Radio, FileText, Building2 } from 'lucide-react';
import { ShieldCrest } from './ShieldCrest';
import flmLogo from '@/assets/flm26-logo.png';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

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
}

type MatchStatus = 'scheduled' | 'live' | 'finished' | 'none';

/**
 * matchDashboardCard — BLOCO FIXO OBRIGATÓRIO
 * Sempre renderizado no topo do dashboard. Nunca removido.
 * Consome dados do backend (live_matches table) e club.matches (scheduled/finished).
 */
export function MatchDashboardCard({ club }: Props) {
  const navigate = useNavigate();
  const [liveMatch, setLiveMatch] = useState<LiveMatchFromDB | null>(null);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [currentHomeGoals, setCurrentHomeGoals] = useState(0);
  const [currentAwayGoals, setCurrentAwayGoals] = useState(0);

  // Poll DB for active live match
  useEffect(() => {
    const fetchLive = async () => {
      const { data } = await supabase
        .from('live_matches')
        .select('*')
        .eq('status', 'live')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setLiveMatch(data as any);
        // Calculate current minute based on elapsed time
        const startTime = new Date(data.started_at).getTime();
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / (data.duration_seconds * 1000));

        // Get max minute from events
        const events = (data.events as any[]) || [];
        const maxMin = events.length > 0 ? Math.max(...events.map((e: any) => e.minute)) : 90;
        const gameMin = Math.floor(progress * maxMin);
        setCurrentMinute(gameMin);

        // CORREÇÃO Bug #5: usar home_goals/away_goals diretamente do banco.
        // Não recalcular contando eventos — isso causava placares divergentes.
        // Os gols já vêm corretos do Edge Function.
        setCurrentHomeGoals(data.home_goals);
        setCurrentAwayGoals(data.away_goals);

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
  const nextMatch = club.matches.find(m => !m.played);
  const lastFinished = [...club.matches].filter(m => m.played).pop();

  let status: MatchStatus = 'none';
  if (liveMatch) {
    status = 'live';
  } else if (nextMatch) {
    status = 'scheduled';
  } else if (lastFinished) {
    status = 'finished';
  }

  // Resolve display data
  const homeTeamName = status === 'live'
    ? liveMatch!.home_team
    : status === 'scheduled'
      ? (nextMatch!.isHome !== false ? club.name : nextMatch!.opponent)
      : status === 'finished'
        ? (lastFinished!.isHome !== false ? club.name : lastFinished!.opponent)
        : club.name;

  const awayTeamName = status === 'live'
    ? liveMatch!.away_team
    : status === 'scheduled'
      ? (nextMatch!.isHome !== false ? nextMatch!.opponent : club.name)
      : status === 'finished'
        ? (lastFinished!.isHome !== false ? lastFinished!.opponent : club.name)
        : '—';

  const competition = status === 'live'
    ? (liveMatch!.competition || 'Amistoso')
    : 'Amistoso';

  const matchDate = status === 'scheduled'
    ? nextMatch!.date
    : status === 'finished'
      ? lastFinished!.date
      : '—';

  const venueName = status === 'live'
    ? (liveMatch!.stadium_name || club.stadiumName)
    : status === 'scheduled'
      ? (nextMatch!.stadium || club.stadiumName)
      : status === 'finished'
        ? (lastFinished!.stadium || club.stadiumName)
        : club.stadiumName;

  const venueCapacity = status === 'live'
    ? (liveMatch!.stadium_capacity || null)
    : status === 'scheduled'
      ? (nextMatch!.stadiumCapacity || null)
      : status === 'finished'
        ? (lastFinished!.stadiumCapacity || null)
        : null;

  const isHome = status === 'live'
    ? liveMatch!.is_home
    : status === 'scheduled'
      ? (nextMatch!.isHome !== false)
      : status === 'finished'
        ? (lastFinished!.isHome !== false)
        : true;

  // Border color based on status
  const borderClass = status === 'live'
    ? 'border-destructive/60 bg-destructive/5'
    : status === 'finished'
      ? 'border-muted-foreground/30'
      : 'border-primary/30';

  // Club logo renderer
  const renderClubLogo = (isClub: boolean) => {
    if (isClub) {
      if (club.shieldPattern) {
        return <ShieldCrest primaryColor={club.primaryColor || '#2563EB'} secondaryColor={club.secondaryColor || '#FFF'} pattern={club.shieldPattern} size={40} className="mx-auto mb-1" />;
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
      <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
          {status === 'live' ? (
            <>
              <Radio className="h-3 w-3 sm:h-4 sm:w-4 text-destructive animate-pulse" />
              <span className="text-destructive font-bold">Partida Atual</span>
              <Badge variant="destructive" className="text-[9px] animate-pulse ml-auto">🔴 AO VIVO</Badge>
            </>
          ) : status === 'finished' ? (
            <>
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-bold">Última Partida</span>
              <Badge variant="secondary" className="text-[9px] ml-auto">Encerrada</Badge>
            </>
          ) : (
            <>
              <Target className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              <span className="text-muted-foreground font-bold">
                {status === 'scheduled' ? 'Próxima Partida' : 'Partida'}
              </span>
              {status === 'scheduled' && (
                <Badge variant="outline" className="text-[9px] ml-auto">Agendada</Badge>
              )}
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        {status === 'none' ? (
          <div className="text-center py-4">
            <Swords className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="font-bold text-sm">Nenhuma partida agendada</p>
            <p className="text-xs text-muted-foreground mt-1">Gere um amistoso na aba Amistosos!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Info bar */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-border/30">
              <Badge variant="outline" className="text-[9px] sm:text-[10px]">⚽ {competition}</Badge>
              <Badge variant="outline" className="text-[9px] sm:text-[10px] flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5" /> {venueName}
              </Badge>
              {venueCapacity && (
                <Badge variant="outline" className="text-[9px] sm:text-[10px] flex items-center gap-1">
                  <Building2 className="h-2.5 w-2.5" /> {venueCapacity.toLocaleString()} lugares
                </Badge>
              )}
              <Badge variant="outline" className="text-[9px] sm:text-[10px]">
                {isHome ? '🏠 Casa' : '✈️ Fora'}
              </Badge>
              {status === 'live' && (
                <Badge variant="outline" className="text-[9px] sm:text-[10px] text-emerald-500 border-emerald-500/30">
                  🖥️ Servidor
                </Badge>
              )}
            </div>

            {/* Date & Status row */}
            <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {matchDate}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {status === 'live' ? (
                  <span className="text-destructive font-bold animate-pulse">AO VIVO — {currentMinute}'</span>
                ) : status === 'finished' ? (
                  <span>Encerrada</span>
                ) : (
                  <span>Agendada</span>
                )}
              </span>
            </div>

            {/* Teams & Score */}
            <div className="flex items-center justify-between py-2">
              <div className="text-center flex-1 min-w-0">
                {renderClubLogo(isHomeTeamClub)}
                <p className="font-bold text-xs sm:text-sm truncate">{homeTeamName}</p>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Mandante</p>
              </div>

              <div className="text-center px-3 sm:px-5 shrink-0">
                {status === 'live' ? (
                  <>
                    <p className="text-2xl sm:text-3xl font-black tabular-nums">
                      {currentHomeGoals} <span className="text-muted-foreground">-</span> {currentAwayGoals}
                    </p>
                    <p className="text-[10px] sm:text-xs text-destructive font-bold animate-pulse mt-0.5">{currentMinute}'</p>
                  </>
                ) : status === 'finished' && lastFinished?.result ? (
                  <>
                    <p className="text-2xl sm:text-3xl font-black tabular-nums">
                      {lastFinished.result.home} <span className="text-muted-foreground">-</span> {lastFinished.result.away}
                    </p>
                    <Badge variant="secondary" className="text-[8px] mt-1">Final</Badge>
                  </>
                ) : (
                  <>
                    <p className="text-base sm:text-lg font-bold text-muted-foreground">VS</p>
                    <Badge variant="outline" className="text-[8px] mt-1">Agendada</Badge>
                  </>
                )}
              </div>

              <div className="text-center flex-1 min-w-0">
                {renderClubLogo(isAwayTeamClub)}
                <p className="font-bold text-xs sm:text-sm truncate">{awayTeamName}</p>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Visitante</p>
              </div>
            </div>

            {/* Action buttons */}
            {status === 'live' && liveMatch && (
              <Button
                className="w-full gap-2 font-bold"
                variant="destructive"
                onClick={() => navigate('/match', { state: { liveMatchDbId: liveMatch.id } })}
              >
                <Radio className="h-4 w-4 animate-pulse" /> IR PARA A PARTIDA
              </Button>
            )}
            {status === 'finished' && (
              <Button
                className="w-full gap-2 font-bold"
                variant="outline"
                disabled
              >
                <FileText className="h-4 w-4" /> VER RELATÓRIO
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
