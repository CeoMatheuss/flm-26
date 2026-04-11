import { useState, useMemo, useEffect } from 'react';
import { LeagueTeam } from '@/types/league';
import { Player } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Trophy, Target, Layers } from 'lucide-react';
import { LeaguesOverview } from './LeaguesOverview';
import { CupBracketView } from './CupBracketView';
import { supabase } from '@/integrations/supabase/client';

interface CupCompetition {
  id: string;
  name: string;
  cup_type: string;
  country: string | null;
  status: string;
}

interface Props {
  teams: LeagueTeam[];
  clubName: string;
  country?: string;
  clubPlayers?: Player[];
  currentTier?: string;
  currentTierLevel?: number;
}

export function LeagueTab({ teams, clubName, country, clubPlayers, currentTier, currentTierLevel }: Props) {
  const [showAllLeagues, setShowAllLeagues] = useState(false);
  const [selectedCupId, setSelectedCupId] = useState<string | null>(null);
  const [cups, setCups] = useState<CupCompetition[]>([]);

  useEffect(() => {
    if (country) {
      supabase
        .from('cup_competitions')
        .select('*')
        .eq('country', country)
        .then(({ data }) => {
          if (data) setCups(data as unknown as CupCompetition[]);
        });
    }
  }, [country]);

  const sorted = useMemo(() => 
    [...teams].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)),
    [teams]
  );

  const topScorers = useMemo(() => {
    const scorers: { name: string; team: string; goals: number }[] = [];
    if (clubPlayers) {
      for (const p of clubPlayers) {
        if ((p.goals ?? 0) > 0) {
          scorers.push({ name: p.name, team: clubName, goals: p.goals ?? 0 });
        }
      }
    }
    for (const team of sorted) {
      if (team.name === clubName) continue;
      if (team.goalsFor > 0) {
        const numScorers = Math.min(3, Math.max(1, Math.floor(team.goalsFor / 4)));
        for (let i = 0; i < numScorers; i++) {
          const share = i === 0 ? 0.4 : i === 1 ? 0.3 : 0.3;
          const goals = Math.max(1, Math.round(team.goalsFor * share));
          const fakeNames = [
            'R. Silva', 'M. Santos', 'G. Oliveira', 'L. Costa', 'F. Lima',
            'D. Pereira', 'A. Souza', 'T. Ferreira', 'P. Almeida', 'V. Rodrigues',
            'J. Araújo', 'H. Barbosa', 'C. Ribeiro', 'E. Martins', 'B. Cardoso',
            'N. Nascimento', 'K. Monteiro', 'W. Campos', 'I. Duarte', 'S. Correia',
          ];
          const nameIdx = (team.name.length + i * 7) % fakeNames.length;
          scorers.push({ name: fakeNames[nameIdx], team: team.name, goals });
        }
      }
    }
    return scorers.sort((a, b) => b.goals - a.goals).slice(0, 10);
  }, [sorted, clubPlayers, clubName]);

  const topAssisters = useMemo(() => {
    const assisters: { name: string; team: string; assists: number }[] = [];
    if (clubPlayers) {
      for (const p of clubPlayers) {
        if ((p.assists ?? 0) > 0) {
          assisters.push({ name: p.name, team: clubName, assists: p.assists ?? 0 });
        }
      }
    }
    for (const team of sorted) {
      if (team.name === clubName) continue;
      if (team.goalsFor > 1) {
        const numAssisters = Math.min(2, Math.max(1, Math.floor(team.goalsFor / 6)));
        for (let i = 0; i < numAssisters; i++) {
          const share = i === 0 ? 0.35 : 0.25;
          const assists = Math.max(1, Math.round(team.goalsFor * share * 0.7));
          const fakeNames = [
            'L. Mendes', 'C. Rocha', 'R. Borges', 'M. Reis', 'A. Amaral',
            'T. Melo', 'J. Pires', 'F. Tavares', 'D. Fonseca', 'G. Castro',
            'V. Azevedo', 'P. Moura', 'H. Barros', 'E. Sampaio', 'B. Andrade',
          ];
          const nameIdx = (team.name.length + i * 5 + 3) % fakeNames.length;
          assisters.push({ name: fakeNames[nameIdx], team: team.name, assists });
        }
      }
    }
    return assisters.sort((a, b) => b.assists - a.assists).slice(0, 10);
  }, [sorted, clubPlayers, clubName]);

  const hasGames = sorted.some(t => t.played > 0);

  if (selectedCupId) {
    return <CupBracketView cupId={selectedCupId} onBack={() => setSelectedCupId(null)} />;
  }

  if (showAllLeagues) {
    return <LeaguesOverview currentCountry={country} clubName={clubName} onBack={() => setShowAllLeagues(false)} />;
  }

  // Tier display
  const tierLabels: Record<string, string> = {
    varzea: '⚽ Várzea',
    pre_regional: '🏟️ Pré-Regional',
    regional: '🏆 Regional',
    nacional: '👑 Nacional',
  };
  const tierLabel = currentTier ? tierLabels[currentTier] || currentTier : null;





  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <Button variant="outline" size="sm" onClick={() => setShowAllLeagues(true)} className="gap-1.5 text-xs">
          <Globe className="h-3.5 w-3.5" /> Ver Todas as Ligas
        </Button>
      </div>

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
                  <TableCell className={i < 4 ? 'text-emerald-400 font-bold' : i >= sorted.length - 3 ? 'text-red-400 font-bold' : ''}>
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <span className="mr-1">{team.logo}</span>
                      {team.name}
                    </span>
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

      {/* Awards Section */}
      {hasGames && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Top Scorers */}
          <Card className="border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" /> Artilheiros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {topScorers.length > 0 ? topScorers.map((s, i) => (
                <div key={i} className="flex items-center gap-2 py-1 px-2 rounded bg-muted/20">
                  <span className={`text-[10px] font-bold w-4 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-muted-foreground'}`}>
                    {i + 1}
                  </span>
                  <span className="text-xs font-medium flex-1 truncate">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-20">{s.team}</span>
                  <Badge variant={i === 0 ? 'default' : 'outline'} className="text-[10px] px-1.5 h-5">
                    {s.goals} ⚽
                  </Badge>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground text-center py-2">Nenhum gol marcado</p>
              )}
            </CardContent>
          </Card>

          {/* Top Assisters */}
          <Card className="border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-400" /> Mais Assistências
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {topAssisters.length > 0 ? topAssisters.map((a, i) => (
                <div key={i} className="flex items-center gap-2 py-1 px-2 rounded bg-muted/20">
                  <span className={`text-[10px] font-bold w-4 ${i === 0 ? 'text-blue-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-muted-foreground'}`}>
                    {i + 1}
                  </span>
                  <span className="text-xs font-medium flex-1 truncate">{a.name}</span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-20">{a.team}</span>
                  <Badge variant={i === 0 ? 'default' : 'outline'} className="text-[10px] px-1.5 h-5">
                    {a.assists} 🅰️
                  </Badge>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground text-center py-2">Nenhuma assistência</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
