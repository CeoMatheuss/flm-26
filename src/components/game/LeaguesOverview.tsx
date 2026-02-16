import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Globe, Trophy } from 'lucide-react';
import { leaguesByCountry, countryNames, countryFlags, countryLeagueNames, countryContinents, LeagueTeam } from '@/types/league';

interface Props {
  currentCountry?: string;
  clubName?: string;
  onBack: () => void;
}

const continentLabels: Record<string, string> = {
  south_america: '🌎 América do Sul',
  europe: '🌍 Europa',
  north_america: '🌎 América do Norte/Central',
  africa: '🌍 África',
  asia: '🌏 Ásia / Oceania',
};

const continentOrder = ['south_america', 'europe', 'north_america', 'africa', 'asia'];

export function LeaguesOverview({ currentCountry, clubName, onBack }: Props) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const countries = Object.keys(leaguesByCountry);
  const grouped = continentOrder.map(cont => ({
    continent: cont,
    label: continentLabels[cont],
    codes: countries.filter(c => countryContinents[c] === cont),
  }));

  if (selectedCountry) {
    const teams = [...leaguesByCountry[selectedCountry]].sort((a, b) => (b.strength || 0) - (a.strength || 0));
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedCountry(null)} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <h2 className="text-lg font-bold flex items-center gap-2">
            {countryFlags[selectedCountry]} {countryLeagueNames[selectedCountry]}
          </h2>
          {selectedCountry === currentCountry && (
            <Badge variant="default" className="text-[10px]">Sua Liga</Badge>
          )}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              {countryNames[selectedCountry]} — {teams.length} clubes (Série A)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Clube</TableHead>
                  <TableHead className="text-center w-16">Força</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team, i) => (
                  <TableRow key={team.name}>
                    <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                    <TableCell className="flex items-center gap-2 text-sm">
                      <span className="text-base">{team.logo}</span>
                      <span className="font-medium">{team.name}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        (team.strength || 0) >= 85 ? 'bg-emerald-500/20 text-emerald-400' :
                        (team.strength || 0) >= 75 ? 'bg-primary/20 text-primary' :
                        (team.strength || 0) >= 65 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {team.strength || '?'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" /> Ligas do Mundo
        </h2>
        <Badge variant="secondary" className="text-[10px]">{countries.length} países</Badge>
      </div>

      {grouped.map(g => (
        <div key={g.continent} className="space-y-2">
          <h3 className="font-bold text-sm text-muted-foreground">{g.label}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {g.codes.map(code => {
              const teams = leaguesByCountry[code];
              const topTeams = [...teams].sort((a, b) => (b.strength || 0) - (a.strength || 0)).slice(0, 3);
              const isCurrentLeague = code === currentCountry;

              return (
                <Card
                  key={code}
                  className={`cursor-pointer transition-all hover:scale-[1.02] hover:border-primary/50 ${isCurrentLeague ? 'border-primary ring-1 ring-primary/30' : ''}`}
                  onClick={() => setSelectedCountry(code)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{countryFlags[code]}</span>
                        <div>
                          <p className="font-bold text-sm">{countryLeagueNames[code]}</p>
                          <p className="text-[10px] text-muted-foreground">{countryNames[code]} • {teams.length} clubes</p>
                        </div>
                      </div>
                      {isCurrentLeague && (
                        <Badge variant="default" className="text-[9px]">Sua Liga</Badge>
                      )}
                    </div>

                    <div className="space-y-1">
                      {topTeams.map((t, i) => (
                        <div key={t.name} className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground w-3">{i + 1}</span>
                          <span>{t.logo}</span>
                          <span className="flex-1 truncate">{t.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{t.strength}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
