import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Globe, Trophy, Loader2 } from 'lucide-react';
import { countryNames, countryFlags, countryLeagueNames, countryContinents } from '@/types/league';
import { supabase } from '@/integrations/supabase/client';

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
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(false);

  useEffect(() => {
    const loadLeagues = async () => {
      setLoading(true);
      const { data } = await (supabase
        .from('world_divisions' as any)
        .select('*, league:world_leagues(*, country:countries(*))')
        .order('level', { ascending: true }) as any);
      
      if (data) {
        setLeagues(data.map((d: any) => ({
          id: d.id,
          name: d.name,
          level: d.level,
          league_name: d.league?.name,
          country: d.league?.country?.code,
          flag_emoji: d.league?.country?.code === 'BR' ? '🇧🇷' : '⚽', // Simple fallback
        })));
      }
      setLoading(false);
    };
    loadLeagues();
  }, []);

  useEffect(() => {
    if (selectedLeagueId) {
      const loadStandings = async () => {
        setLoadingStandings(true);
        const { data } = await (supabase
          .from('world_league_table' as any)
          .select('*')
          .eq('division_id', selectedLeagueId)
          .order('pts', { ascending: false })
          .order('gd', { ascending: false })
          .order('gf', { ascending: false }) as any);
        if (data) setStandings(data);
        setLoadingStandings(false);
      };
      loadStandings();
    }
  }, [selectedLeagueId]);

  if (selectedLeagueId) {
    const league = leagues.find(l => l.id === selectedLeagueId);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedLeagueId(null)} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <h2 className="text-lg font-bold flex items-center gap-2">
            {league?.flag_emoji} {league?.league_name}
          </h2>
          {league?.country === currentCountry && (
            <Badge variant="default" className="text-[10px]">Sua Liga</Badge>
          )}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              {league?.league_name} — Série {league?.division === 1 ? 'A' : league?.division === 2 ? 'B' : league?.division === 3 ? 'C' : 'D'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingStandings ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Clube</TableHead>
                    <TableHead className="text-center w-10">P</TableHead>
                    <TableHead className="text-center w-10">J</TableHead>
                    <TableHead className="text-center w-10">V</TableHead>
                    <TableHead className="text-center w-10">SG</TableHead>
                    <TableHead className="text-center w-14">Prêmio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((row, i) => {
                    const pos = i + 1;
                    let reward = '—';
                    if (pos === 1) reward = '16M';
                    else if (pos === 2) reward = '15M';
                    else if (pos === 3) reward = '14M';
                    else if (pos === 4) reward = '13M';
                    else if (pos >= 5 && pos <= 8) {
                      reward = (13 - (pos - 4)).toString() + 'M';
                    }
                    else {
                      reward = Math.max(4, 7 - (pos - 9)).toString() + 'M';
                    }
                    
                    return (
                      <TableRow key={row.team_id} className={row.team?.club_name === clubName ? 'bg-primary/10' : ''}>
                        <TableCell className="text-muted-foreground text-xs">{pos}</TableCell>
                        <TableCell className="flex items-center gap-2 text-sm truncate">
                          <span className="text-base">{row.team?.club_logo}</span>
                          <span className="font-medium truncate">{row.team?.club_name}</span>
                        </TableCell>
                        <TableCell className="text-center font-bold">{row.pts}</TableCell>
                        <TableCell className="text-center text-xs">{row.mp}</TableCell>
                        <TableCell className="text-center text-xs">{row.w}</TableCell>
                        <TableCell className="text-center text-xs">{row.gd}</TableCell>
                        <TableCell className="text-center text-[10px] font-bold text-emerald-500">{reward}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const grouped = continentOrder.map(cont => ({
    continent: cont,
    label: continentLabels[cont],
    leagues: leagues.filter(l => countryContinents[l.country] === cont),
  })).filter(g => g.leagues.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" /> Ligas do Mundo
        </h2>
        <Badge variant="secondary" className="text-[10px]">{leagues.length} competições</Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : grouped.map(g => (
        <div key={g.continent} className="space-y-2">
          <h3 className="font-bold text-sm text-muted-foreground">{g.label}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {g.leagues.map(league => (
              <Card
                key={league.id}
                className={`cursor-pointer transition-all hover:scale-[1.02] hover:border-primary/50 ${league.country === currentCountry ? 'border-primary ring-1 ring-primary/30' : ''}`}
                onClick={() => setSelectedLeagueId(league.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{league.flag_emoji}</span>
                      <div>
                        <p className="font-bold text-sm">{league.league_name}</p>
                        <p className="text-[10px] text-muted-foreground">{countryNames[league.country]} • Série {league.division === 1 ? 'A' : league.division === 2 ? 'B' : league.division === 3 ? 'C' : 'D'}</p>
                      </div>
                    </div>
                    {league.country === currentCountry && (
                      <Badge variant="default" className="text-[9px]">Sua Liga</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
