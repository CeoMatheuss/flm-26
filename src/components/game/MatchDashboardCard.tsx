import { Club, Match } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Swords, MapPin, Calendar, Clock, Radio, FileText, Building2 } from 'lucide-react';
import { ShieldCrest } from './ShieldCrest';
import flmLogo from '@/assets/flm26-logo.png';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface LiveMatchData {
  homeTeam: string;
  awayTeam: string;
  stadiumName: string;
  stadiumCapacity?: number;
  matchId: string;
  homeGoals?: number;
  awayGoals?: number;
  minute?: number;
  isHome?: boolean;
  competition?: string;
}

interface Props {
  club: Club;
}

type MatchStatus = 'scheduled' | 'live' | 'finished' | 'none';

/**
 * matchDashboardCard — BLOCO FIXO OBRIGATÓRIO
 * Sempre renderizado no topo do dashboard. Nunca removido.
 * Consome dados de sessionStorage (live) e club.matches (scheduled/finished).
 */
export function MatchDashboardCard({ club }: Props) {
  const navigate = useNavigate();
  const [liveMatch, setLiveMatch] = useState<LiveMatchData | null>(null);

  // Poll sessionStorage for live match data every 2s
  useEffect(() => {
    const checkLive = () => {
      try {
        const raw = sessionStorage.getItem('match_live');
        if (raw) {
          setLiveMatch(JSON.parse(raw));
        } else {
          setLiveMatch(null);
        }
      } catch {
        setLiveMatch(null);
      }
    };
    checkLive();
    const interval = setInterval(checkLive, 2000);
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
    ? liveMatch!.homeTeam
    : status === 'scheduled'
      ? (nextMatch!.isHome !== false ? club.name : nextMatch!.opponent)
      : status === 'finished'
        ? (lastFinished!.isHome !== false ? club.name : lastFinished!.opponent)
        : club.name;

  const awayTeamName = status === 'live'
    ? liveMatch!.awayTeam
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
    ? (liveMatch!.stadiumName || club.stadiumName)
    : status === 'scheduled'
      ? (nextMatch!.stadium || club.stadiumName)
      : status === 'finished'
        ? (lastFinished!.stadium || club.stadiumName)
        : club.stadiumName;

  const venueCapacity = status === 'live'
    ? (liveMatch!.stadiumCapacity || club.matches.find(m => m.id === liveMatch!.matchId)?.stadiumCapacity || null)
    : status === 'scheduled'
      ? (nextMatch!.stadiumCapacity || null)
      : status === 'finished'
        ? (lastFinished!.stadiumCapacity || null)
        : null;

  const isHome = status === 'live'
    ? (liveMatch!.isHome ?? liveMatch!.homeTeam === club.name)
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
          /* === SEM PARTIDA === */
          <div className="text-center py-4">
            <Swords className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="font-bold text-sm">Nenhuma partida agendada</p>
            <p className="text-xs text-muted-foreground mt-1">Gere um amistoso na aba Amistosos!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Info bar: Competition, Stadium, Capacity, Home/Away */}
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
            </div>

            {/* Date & Status row */}
            <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {matchDate}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {status === 'live' ? (
                  <span className="text-destructive font-bold animate-pulse">AO VIVO — {liveMatch!.minute ?? 0}'</span>
                ) : status === 'finished' ? (
                  <span>Encerrada</span>
                ) : (
                  <span>Agendada</span>
                )}
              </span>
            </div>

            {/* Teams & Score */}
            <div className="flex items-center justify-between py-2">
              {/* Home Team */}
              <div className="text-center flex-1 min-w-0">
                {renderClubLogo(isHomeTeamClub)}
                <p className="font-bold text-xs sm:text-sm truncate">{homeTeamName}</p>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Mandante</p>
              </div>

              {/* Score / VS */}
              <div className="text-center px-3 sm:px-5 shrink-0">
                {status === 'live' ? (
                  <>
                    <p className="text-2xl sm:text-3xl font-black tabular-nums">
                      {liveMatch!.homeGoals ?? 0} <span className="text-muted-foreground">-</span> {liveMatch!.awayGoals ?? 0}
                    </p>
                    <p className="text-[10px] sm:text-xs text-destructive font-bold animate-pulse mt-0.5">{liveMatch!.minute ?? 0}'</p>
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

              {/* Away Team */}
              <div className="text-center flex-1 min-w-0">
                {renderClubLogo(isAwayTeamClub)}
                <p className="font-bold text-xs sm:text-sm truncate">{awayTeamName}</p>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground">Visitante</p>
              </div>
            </div>

            {/* Action buttons */}
            {status === 'live' && (
              <Button
                className="w-full gap-2 font-bold"
                variant="destructive"
                onClick={() => navigate('/match')}
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
