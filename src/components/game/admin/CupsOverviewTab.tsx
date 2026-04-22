import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Trophy, Globe, Flag, Building, Sparkles } from 'lucide-react';
import { countryFlags, countryNames } from '@/types/league';

interface CupRow {
  id: string;
  name: string;
  cup_type: string;
  country: string | null;
  continent: string | null;
  status: string | null;
  current_round: number | null;
  total_rounds: number | null;
  season_year: number | null;
  format: string | null;
}

interface CupTeamRow {
  cup_id: string;
  is_bot: boolean;
}

interface CustomTournament {
  id: string;
  name: string;
  status: string;
  format: string;
  max_teams: number;
  current_round: number;
  total_rounds: number;
  country: string | null;
}

const cupIcons: Record<string, JSX.Element> = {
  continental: <Globe className="h-3.5 w-3.5 text-purple-400" />,
  national: <Flag className="h-3.5 w-3.5 text-blue-400" />,
  regional: <Building className="h-3.5 w-3.5 text-amber-400" />,
};

const cupTypeLabels: Record<string, string> = {
  continental: 'Continental',
  national: 'Nacional',
  regional: 'Regional',
};

export function CupsOverviewTab() {
  const [cups, setCups] = useState<CupRow[]>([]);
  const [teams, setTeams] = useState<CupTeamRow[]>([]);
  const [tournaments, setTournaments] = useState<CustomTournament[]>([]);
  const [tournamentTeams, setTournamentTeams] = useState<Array<{ tournament_id: string; is_bot: boolean }>>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [cRes, tRes, tournRes, ttRes] = await Promise.all([
      supabase.from('cup_competitions').select('*').order('season_year', { ascending: false }),
      supabase.from('cup_teams').select('cup_id, is_bot'),
      supabase.from('custom_tournaments').select('id, name, status, format, max_teams, current_round, total_rounds, country').order('created_at', { ascending: false }),
      supabase.from('custom_tournament_teams').select('tournament_id, is_bot'),
    ]);
    if (cRes.data) setCups(cRes.data as CupRow[]);
    if (tRes.data) setTeams(tRes.data as CupTeamRow[]);
    if (tournRes.data) setTournaments(tournRes.data as CustomTournament[]);
    if (ttRes.data) setTournamentTeams(ttRes.data as any[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const teamCount = (cupId: string) => teams.filter(t => t.cup_id === cupId).length;
  const botCount = (cupId: string) => teams.filter(t => t.cup_id === cupId && t.is_bot).length;
  const tTeamCount = (id: string) => tournamentTeams.filter(t => t.tournament_id === id).length;

  const grouped = {
    continental: cups.filter(c => c.cup_type === 'continental'),
    national: cups.filter(c => c.cup_type === 'national'),
    regional: cups.filter(c => c.cup_type === 'regional'),
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-400" /> Copas & Torneios
        </h3>
        <Button size="sm" onClick={load} disabled={loading} className="h-7 text-xs">
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {(['continental', 'national', 'regional'] as const).map(type => (
        <Card key={type}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              {cupIcons[type]} Copas {cupTypeLabels[type]} ({grouped[type].length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {grouped[type].length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-3">Nenhuma copa {cupTypeLabels[type].toLowerCase()} cadastrada.</p>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-1.5">
                  {grouped[type].map(c => {
                    const count = teamCount(c.id);
                    const bots = botCount(c.id);
                    return (
                      <div key={c.id} className="p-2 rounded border border-border/50 bg-muted/10">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{c.name}</p>
                            <p className="text-[9px] text-muted-foreground">
                              {c.country && `${countryFlags[c.country] || '🏳️'} ${countryNames[c.country] || c.country} • `}
                              {c.continent && `${c.continent} • `}
                              {c.season_year && `Temp ${c.season_year} • `}
                              R{c.current_round || 0}/{c.total_rounds || 0}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 items-end shrink-0">
                            <Badge variant="outline" className="text-[8px]">{count} times</Badge>
                            {bots > 0 && (
                              <Badge variant="outline" className="text-[8px] text-muted-foreground">🤖 {bots}</Badge>
                            )}
                            <Badge variant="outline" className="text-[8px]">{c.status || 'pending'}</Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Custom Tournaments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-pink-400" /> Torneios Customizados ({tournaments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tournaments.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-3">Nenhum torneio customizado.</p>
          ) : (
            <ScrollArea className="max-h-[280px]">
              <div className="space-y-1.5">
                {tournaments.map(t => (
                  <div key={t.id} className="p-2 rounded border border-border/50 bg-muted/10">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{t.name}</p>
                        <p className="text-[9px] text-muted-foreground">
                          {t.country && `${countryFlags[t.country] || '🏳️'} • `}
                          Formato: {t.format} • R{t.current_round}/{t.total_rounds}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 items-end shrink-0">
                        <Badge variant="outline" className="text-[8px]">{tTeamCount(t.id)}/{t.max_teams}</Badge>
                        <Badge variant="outline" className="text-[8px]">{t.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
