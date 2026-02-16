import { Match } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Check, Home, Swords, AlertTriangle, Trophy, Clock, Calendar, Ban } from 'lucide-react';
import { useMemo } from 'react';

interface Props {
  matches: Match[];
  clubName: string;
  stadiumName: string;
  friendliesPlayedSeason: number;
  maxFriendliesPerSeason: number;
  alreadyPlayedToday: boolean;
  lastFriendlyDate: string;
  onSimulate: (id: string) => void;
  onGenerateFriendly: () => void;
}

function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return isoStr;
  }
}

function formatTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function getTimeUntilMidnight(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}min`;
}

export function MatchesTab({ matches, clubName, stadiumName, friendliesPlayedSeason, maxFriendliesPerSeason, alreadyPlayedToday, lastFriendlyDate, onSimulate, onGenerateFriendly }: Props) {
  const canGenerate = !alreadyPlayedToday && friendliesPlayedSeason < maxFriendliesPerSeason;
  const nextMatch = matches.find(m => !m.played);
  const playedMatches = matches.filter(m => m.played);
  
  const diminishPct = friendliesPlayedSeason > 0 ? Math.max(10, 100 - (friendliesPlayedSeason * 3)) : 100;
  const timeUntilReset = useMemo(() => alreadyPlayedToday ? getTimeUntilMidnight() : '', [alreadyPlayedToday]);

  return (
    <div className="space-y-3">
      {/* Friendly Match Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Swords className="h-4 w-4 text-primary" /> Amistosos vs BOT
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Status cards */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className={`rounded-lg p-2 ${alreadyPlayedToday ? 'bg-destructive/10 border border-destructive/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                {alreadyPlayedToday ? <Ban className="h-3.5 w-3.5 text-destructive" /> : <Check className="h-3.5 w-3.5 text-emerald-400" />}
                <p className="text-lg font-bold">{alreadyPlayedToday ? '0' : '1'}</p>
              </div>
              <p className="text-[9px] text-muted-foreground uppercase">Disponível Hoje</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2">
              <p className="text-lg font-bold">{friendliesPlayedSeason}/{maxFriendliesPerSeason}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Temporada</p>
            </div>
          </div>

          {/* Cooldown timer */}
          {alreadyPlayedToday && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Clock className="h-4 w-4 text-blue-400 shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-300">Próximo amistoso em:</p>
                <p className="text-sm font-bold text-blue-400">{timeUntilReset}</p>
              </div>
            </div>
          )}

          {/* Last match info */}
          {lastFriendlyDate && alreadyPlayedToday && (
            <div className="flex items-center gap-2 p-2 rounded bg-muted/20 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Último amistoso: {formatDate(lastFriendlyDate)} às {formatTime(lastFriendlyDate)}</span>
            </div>
          )}

          {/* Diminishing returns warning */}
          {diminishPct < 100 && (
            <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <p className="text-[10px] text-amber-300">
                Ganhos reduzidos a <strong>{diminishPct}%</strong> (torcida, entrosamento, evolução).
              </p>
            </div>
          )}

          {/* Next match or generate button */}
          {nextMatch ? (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-border/30">
                  <Badge variant="secondary" className="text-[9px] gap-1">⚽ Amistoso</Badge>
                  <Badge variant="outline" className="text-[9px] gap-1">
                    <Home className="h-2.5 w-2.5" /> {stadiumName}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] gap-1">
                    <Clock className="h-2.5 w-2.5" /> {formatTime(nextMatch.date)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs sm:text-sm font-medium truncate">{clubName}</span>
                    <span className="text-[10px] text-muted-foreground">vs</span>
                    <span className="text-xs sm:text-sm truncate">{nextMatch.opponent}</span>
                  </div>
                  <Button size="sm" onClick={() => onSimulate(nextMatch.id)} className="h-7 px-3 text-xs gap-1">
                    <Play className="h-3 w-3" /> Jogar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button 
              onClick={onGenerateFriendly} 
              disabled={!canGenerate}
              className="w-full gap-2"
            >
              <Swords className="h-4 w-4" />
              {alreadyPlayedToday 
                ? 'Volte amanhã para jogar' 
                : friendliesPlayedSeason >= maxFriendliesPerSeason
                  ? 'Limite da temporada atingido'
                  : 'Gerar Amistoso contra BOT'
              }
            </Button>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            ⚽ 1 amistoso por dia • 🏟️ torcida (reduzida) • 📈 entrosamento
          </p>
        </CardContent>
      </Card>

      {/* Match History */}
      {playedMatches.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5" /> Histórico ({playedMatches.length} amistosos)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {[...playedMatches].reverse().map((match) => {
              const resultColor = match.result
                ? match.result.home > match.result.away ? 'text-emerald-400' : match.result.home < match.result.away ? 'text-destructive' : 'text-primary'
                : '';

              return (
                <div key={match.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-muted/20 text-xs">
                  <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                  <div className="flex flex-col w-16 shrink-0">
                    <span className="text-muted-foreground font-mono text-[10px]">{formatDate(match.date)}</span>
                    <span className="text-muted-foreground/60 font-mono text-[9px]">{formatTime(match.date)}</span>
                  </div>
                  <span className="truncate flex-1">{match.opponent}</span>
                  {match.result && (
                    <span className={`font-bold font-mono px-1.5 py-0.5 rounded bg-muted/50 ${resultColor}`}>
                      {match.result.home} - {match.result.away}
                    </span>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
