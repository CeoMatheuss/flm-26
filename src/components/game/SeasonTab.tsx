import { SeasonData } from '@/types/infrastructure';
import { LeagueTeam } from '@/types/league';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, Trophy, FastForward } from 'lucide-react';

interface Props {
  season: SeasonData;
  leagueTeams: LeagueTeam[];
  clubName: string;
  hasUnplayedMatches: boolean;
  onEndSeason: () => void;
}

export function SeasonTab({ season, leagueTeams, clubName, hasUnplayedMatches, onEndSeason }: Props) {
  const sorted = [...leagueTeams].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
  const clubPos = sorted.findIndex(t => t.name === clubName) + 1;

  return (
    <div className="space-y-6">
      <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-yellow-400" />
            Temporada {season.currentSeason}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{season.currentWeek - 1}</p>
              <p className="text-xs text-muted-foreground">Rodadas jogadas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{season.totalWeeks - season.currentWeek + 1}</p>
              <p className="text-xs text-muted-foreground">Rodadas restantes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{clubPos}º</p>
              <p className="text-xs text-muted-foreground">Posição atual</p>
            </div>
          </div>

          {!hasUnplayedMatches && (
            <Button onClick={onEndSeason} className="w-full gap-2">
              <FastForward className="h-4 w-4" /> Encerrar Temporada e Iniciar Nova
            </Button>
          )}
          {hasUnplayedMatches && (
            <p className="text-sm text-center text-muted-foreground">Jogue todas as partidas para encerrar a temporada</p>
          )}
        </CardContent>
      </Card>

      {season.seasonHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5" /> Histórico de Temporadas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Temp.</TableHead>
                  <TableHead>Posição</TableHead>
                  <TableHead>Pontos</TableHead>
                  <TableHead>V/E/D</TableHead>
                  <TableHead>Campeão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {season.seasonHistory.slice().reverse().map(s => (
                  <TableRow key={s.season} className={s.position === 1 ? 'bg-yellow-500/10' : ''}>
                    <TableCell className="font-medium">T{s.season}</TableCell>
                    <TableCell>
                      <Badge variant={s.position === 1 ? 'default' : s.position <= 4 ? 'secondary' : 'outline'}>
                        {s.position}º
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold">{s.points}</TableCell>
                    <TableCell>{s.wins}/{s.draws}/{s.losses}</TableCell>
                    <TableCell>{s.champion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
