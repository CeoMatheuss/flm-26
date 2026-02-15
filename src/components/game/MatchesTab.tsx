import { Match } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Check } from 'lucide-react';

interface Props {
  matches: Match[];
  clubName: string;
  onSimulate: (id: string) => void;
}

export function MatchesTab({ matches, clubName, onSimulate }: Props) {
  const nextIdx = matches.findIndex(m => !m.played);

  return (
    <div className="space-y-1 sm:space-y-1.5">
      {matches.map((match, i) => {
        const isNext = i === nextIdx;
        const resultColor = match.result
          ? match.result.home > match.result.away ? 'text-emerald-400' : match.result.home < match.result.away ? 'text-destructive' : 'text-primary'
          : '';

        return (
          <Card key={match.id} className={`${isNext ? 'border-primary/40 bg-primary/5' : match.played ? 'opacity-70' : ''} transition-colors`}>
            <CardContent className="p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2">
              <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono w-10 sm:w-14 shrink-0">{match.date}</span>

              {match.played ? (
                <Check className="h-3 w-3 text-emerald-400 shrink-0" />
              ) : (
                <div className="w-3 shrink-0" />
              )}

              <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                <span className="text-xs sm:text-sm font-medium truncate hidden sm:inline">{clubName}</span>
                {match.played && match.result ? (
                  <span className={`font-bold text-xs sm:text-sm px-1.5 sm:px-2 py-0.5 rounded bg-muted/50 font-mono ${resultColor}`}>
                    {match.result.home} - {match.result.away}
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-xs text-muted-foreground">vs</span>
                )}
                <span className="text-xs sm:text-sm truncate">{match.opponentLogo} {match.opponent}</span>
              </div>

              {isNext && (
                <Button size="sm" onClick={() => onSimulate(match.id)} className="h-6 sm:h-7 px-2 sm:px-3 text-[10px] sm:text-xs gap-1">
                  <Play className="h-3 w-3" /> Jogar
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
