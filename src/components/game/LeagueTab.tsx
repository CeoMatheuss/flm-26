import { LeagueTeam } from '@/types/league';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Props {
  teams: LeagueTeam[];
  clubName: string;
}

export function LeagueTab({ teams, clubName }: Props) {
  const sorted = [...teams].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tabela do Campeonato</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-center w-10">J</TableHead>
              <TableHead className="text-center w-10">V</TableHead>
              <TableHead className="text-center w-10">E</TableHead>
              <TableHead className="text-center w-10">D</TableHead>
              <TableHead className="text-center w-10">GP</TableHead>
              <TableHead className="text-center w-10">GC</TableHead>
              <TableHead className="text-center w-10">SG</TableHead>
              <TableHead className="text-center w-12 font-bold">P</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((team, i) => (
              <TableRow key={team.name} className={team.name === clubName ? 'bg-primary/10 font-semibold' : ''}>
                <TableCell className={i < 4 ? 'text-emerald-400 font-bold' : i >= sorted.length - 2 ? 'text-red-400 font-bold' : ''}>
                  {i + 1}
                </TableCell>
                <TableCell>
                  <span className="mr-2">{team.logo}</span>
                  {team.name}
                </TableCell>
                <TableCell className="text-center">{team.played}</TableCell>
                <TableCell className="text-center">{team.wins}</TableCell>
                <TableCell className="text-center">{team.draws}</TableCell>
                <TableCell className="text-center">{team.losses}</TableCell>
                <TableCell className="text-center">{team.goalsFor}</TableCell>
                <TableCell className="text-center">{team.goalsAgainst}</TableCell>
                <TableCell className="text-center">{team.goalsFor - team.goalsAgainst}</TableCell>
                <TableCell className="text-center font-bold">{team.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
