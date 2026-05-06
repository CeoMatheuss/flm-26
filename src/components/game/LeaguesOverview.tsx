import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Globe, Trophy, Loader2, UserPlus, Users } from 'lucide-react';
import { countryNames } from '@/types/league';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  currentCountry?: string;
  clubName?: string;
  onBack: () => void;
  onJoin?: (leagueId: string) => void;
  isJoining?: boolean;
}

export function LeaguesOverview({ currentCountry, clubName, onBack, onJoin, isJoining }: Props) {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(false);

  useEffect(() => {
    const loadLeagues = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('world_leagues')
        .select('*, country:countries(name, code)')
        .order('division_level', { ascending: true });
      
      if (data) {
        setLeagues(data.map((d: any) => ({
          id: d.id,
          name: d.name,
          level: d.division_level,
          country_code: d.country?.code,
          country_name: d.country?.name,
          flag_emoji: d.country?.code === 'BR' ? '🇧🇷' : 
                      d.country?.code === 'ES' ? '🇪🇸' :
                      d.country?.code === 'EN' ? '🏴󠁧󠁢󠁥󠁮󠁧󠁿' : '⚽',
          status: d.status,
          match_time: d.match_time
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
        const { data } = await supabase
          .from('world_league_table' as any)
          .select('*')
          .eq('league_id', selectedLeagueId)
          .order('pts', { ascending: false })
          .order('gd', { ascending: false });
        if (data) setStandings(data);
        setLoadingStandings(false);
      };
      loadStandings();
    }
  }, [selectedLeagueId]);

  if (selectedLeagueId) {
    const league = leagues.find(l => l.id === selectedLeagueId);
    return (
      <div className="space-y-4 animate-in slide-in-from-right duration-300">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedLeagueId(null)} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <h2 className="text-lg font-bold flex items-center gap-2">
            {league?.flag_emoji} {league?.name}
          </h2>
        </div>

        <Card>
          <CardHeader className="pb-2 border-b">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                {league?.name} ({league?.country_name})
              </CardTitle>
              {onJoin && (
                <Button 
                  size="sm" 
                  onClick={() => onJoin(league.id)} 
                  disabled={isJoining || league.status !== 'waiting'}
                  className="h-8 gap-1.5 text-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {league.status === 'waiting' ? 'Entrar nesta Liga' : 'Liga Iniciada'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingStandings ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : standings.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Users className="h-10 w-10 text-muted-foreground/20 mx-auto" />
                <p className="text-sm text-muted-foreground">Nenhum time inscrito ainda.</p>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((row, i) => (
                    <TableRow key={row.team_id} className={row.club_name === clubName ? 'bg-primary/10' : ''}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="flex items-center gap-2 text-sm truncate">
                        <span className="text-base">{row.club_logo || '⚽'}</span>
                        <span className="font-medium truncate">{row.club_name}</span>
                      </TableCell>
                      <TableCell className="text-center font-bold">{row.pts}</TableCell>
                      <TableCell className="text-center text-xs">{row.mp}</TableCell>
                      <TableCell className="text-center text-xs">{row.w}</TableCell>
                      <TableCell className="text-center text-xs">{row.gd}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" /> Escolha sua Liga
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse bg-muted/20 border-muted">
              <CardContent className="h-24" />
            </Card>
          ))
        ) : leagues.map(league => (
          <Card
            key={league.id}
            className={`cursor-pointer transition-all hover:scale-[1.02] hover:border-primary/50 ${league.country_code === currentCountry ? 'border-primary ring-1 ring-primary/10' : ''}`}
            onClick={() => setSelectedLeagueId(league.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl filter drop-shadow-sm">{league.flag_emoji}</span>
                  <div>
                    <p className="font-bold text-sm tracking-tight">{league.name}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {league.country_name} • {league.match_time.slice(0, 5)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={league.status === 'waiting' ? 'outline' : 'default'} className="text-[8px] uppercase font-black">
                    {league.status === 'waiting' ? 'Aberto' : 'Iniciado'}
                  </Badge>
                  {league.country_code === currentCountry && (
                    <span className="text-[8px] text-primary font-bold">SUA REGIÃO</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
