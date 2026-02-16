import { Match } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Check, Home, Swords, AlertTriangle, Trophy } from 'lucide-react';

interface Props {
  matches: Match[];
  clubName: string;
  stadiumName: string;
  friendliesPlayedToday: number;
  friendliesPlayedSeason: number;
  maxFriendliesPerDay: number;
  maxFriendliesPerSeason: number;
  onSimulate: (id: string) => void;
  onGenerateFriendly: () => void;
}

export function MatchesTab({ matches, clubName, stadiumName, friendliesPlayedToday, friendliesPlayedSeason, maxFriendliesPerDay, maxFriendliesPerSeason, onSimulate, onGenerateFriendly }: Props) {
  const canGenerateFriendly = friendliesPlayedToday < maxFriendliesPerDay && friendliesPlayedSeason < maxFriendliesPerSeason;
  const nextMatch = matches.find(m => !m.played);
  const playedMatches = matches.filter(m => m.played);
  
  // Progressive diminishing factor
  const diminishPct = friendliesPlayedSeason > 0 ? Math.max(10, 100 - (friendliesPlayedSeason * 3)) : 100;

  return (
    <div className="space-y-3">
      {/* Generate Friendly Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Swords className="h-4 w-4 text-primary" /> Amistosos vs BOT
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-muted/30 rounded-lg p-2">
              <p className="text-lg font-bold">{friendliesPlayedToday}/{maxFriendliesPerDay}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Hoje</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2">
              <p className="text-lg font-bold">{friendliesPlayedSeason}/{maxFriendliesPerSeason}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Temporada</p>
            </div>
          </div>

          {diminishPct < 100 && (
            <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <p className="text-[10px] text-amber-300">
                Ganhos reduzidos a <strong>{diminishPct}%</strong> (torcida, entrosamento, evolução). Quanto mais amistosos, menor o ganho.
              </p>
            </div>
          )}

          {nextMatch ? (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-border/30">
                  <Badge variant="secondary" className="text-[9px] gap-1">⚽ Amistoso</Badge>
                  <Badge variant="outline" className="text-[9px] gap-1">
                    <Home className="h-2.5 w-2.5" /> {stadiumName}
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
              disabled={!canGenerateFriendly}
              className="w-full gap-2"
            >
              <Swords className="h-4 w-4" />
              {!canGenerateFriendly 
                ? friendliesPlayedToday >= maxFriendliesPerDay 
                  ? 'Limite diário atingido' 
                  : 'Limite da temporada atingido'
                : 'Gerar Amistoso contra BOT'
              }
            </Button>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            Amistosos geram: 🏟️ torcida (reduzida) • ⚽ ritmo de jogo • 📈 entrosamento
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
                  <span className="text-muted-foreground font-mono w-14 shrink-0">{match.date}</span>
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
