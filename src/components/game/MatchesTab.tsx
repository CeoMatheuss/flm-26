import { Match } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface Props {
  matches: Match[];
  clubName: string;
  onSimulate: (id: string) => void;
}

export function MatchesTab({ matches, clubName, onSimulate }: Props) {
  return (
    <div className="space-y-3">
      {matches.map(match => (
        <Card key={match.id} className={match.played ? 'opacity-80' : 'border-primary/30'}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xs text-muted-foreground w-16">{match.date}</span>
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-medium text-sm">{clubName}</span>
                  {match.played && match.result ? (
                    <span className={`font-bold text-lg px-3 py-0.5 rounded ${
                      match.result.home > match.result.away
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : match.result.home < match.result.away
                        ? 'text-red-400 bg-red-500/10'
                        : 'text-yellow-400 bg-yellow-500/10'
                    }`}>
                      {match.result.home} x {match.result.away}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">vs</span>
                  )}
                  <span className="font-medium text-sm">{match.opponentLogo} {match.opponent}</span>
                </div>
              </div>
              {!match.played && (
                <Button size="sm" onClick={() => onSimulate(match.id)} className="gap-1">
                  <Play className="h-3 w-3" /> Jogar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
