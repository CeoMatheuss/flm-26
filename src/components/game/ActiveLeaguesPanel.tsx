import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { RefreshCw, Globe, Trophy, Users, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { countryNames, countryFlags, countryContinents, getDivisionLabel } from '@/types/league';

interface LeagueSummary {
  id: string;
  name: string;
  country: string;
  division: number | null;
  season: number;
  season_status: string;
  current_round: number;
  total_rounds: number;
  max_members: number;
  member_count: number;
  league_type: string;
  auto_created: boolean;
}

interface TournamentSummary {
  id: string;
  name: string;
  format: string;
  status: string;
  max_teams: number;
  team_count: number;
  match_count: number;
  played_count: number;
  country: string;
  start_date: string | null;
  match_time: string;
}

const continentLabels: Record<string, string> = {
  south_america: '🌎 América do Sul',
  europe: '🌍 Europa',
  north_america: '🌎 América do Norte',
  africa: '🌍 África',
  asia: '🌏 Ásia/Oceania',
};

// Nomes reais de divisões agora vêm de getDivisionLabel(country, division)

const statusColors: Record<string, string> = {
  registration: 'text-blue-400 border-blue-500/30',
  waiting: 'text-warning border-warning/30',
  in_progress: 'text-success border-success/30',
  finished: 'text-muted-foreground border-muted',
};

const statusLabels: Record<string, string> = {
  registration: '📋 Inscrições',
  waiting: '⏳ Aguardando',
  in_progress: '🟢 Ativa',
  finished: '🏆 Finalizada',
};

export function ActiveLeaguesPanel() {
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedContinent, setExpandedContinent] = useState<string | null>('south_america');

  const load = useCallback(async () => {
    setLoading(true);
    
    // Load all auto-created leagues
    const { data: leagueData } = await supabase
      .from('multiplayer_leagues')
      .select('id, name, country, division, season, season_status, current_round, total_rounds, max_members, league_type, auto_created')
      .eq('auto_created', true)
      .order('country')
      .order('division');

    if (leagueData) {
      // Get member counts
      const leagueIds = leagueData.map(l => l.id);
      const { data: members } = await supabase
        .from('league_members')
        .select('league_id')
        .in('league_id', leagueIds.length > 0 ? leagueIds : ['none']);

      const countMap: Record<string, number> = {};
      (members || []).forEach(m => {
        countMap[m.league_id] = (countMap[m.league_id] || 0) + 1;
      });

      setLeagues(leagueData.map(l => ({
        ...l,
        member_count: countMap[l.id] || 0,
      })));
    }

    // Load active tournaments
    const { data: tData } = await supabase
      .from('custom_tournaments')
      .select('id, name, format, status, max_teams, country, start_date, match_time')
      .in('status', ['in_progress', 'registration', 'draft'])
      .order('created_at', { ascending: false });

    if (tData && tData.length > 0) {
      const tIds = tData.map(t => t.id);
      const [teamsRes, matchesRes] = await Promise.all([
        supabase.from('custom_tournament_teams').select('tournament_id').in('tournament_id', tIds),
        supabase.from('custom_tournament_matches').select('tournament_id, status').in('tournament_id', tIds),
      ]);

      const teamCounts: Record<string, number> = {};
      const matchCounts: Record<string, number> = {};
      const playedCounts: Record<string, number> = {};
      (teamsRes.data || []).forEach(t => { teamCounts[t.tournament_id] = (teamCounts[t.tournament_id] || 0) + 1; });
      (matchesRes.data || []).forEach(m => {
        matchCounts[m.tournament_id] = (matchCounts[m.tournament_id] || 0) + 1;
        if (m.status === 'played') playedCounts[m.tournament_id] = (playedCounts[m.tournament_id] || 0) + 1;
      });

      setTournaments(tData.map(t => ({
        ...t,
        team_count: teamCounts[t.id] || 0,
        match_count: matchCounts[t.id] || 0,
        played_count: playedCounts[t.id] || 0,
        match_time: (t as any).match_time || '20:00',
      })));
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group leagues by country code
  const countryCodes = Object.keys(countryNames);
  const continentOrder = ['south_america', 'europe', 'north_america', 'africa', 'asia'];

  // Map country names to codes for league matching
  const nameToCode: Record<string, string> = {};
  Object.entries(countryNames).forEach(([code, name]) => { nameToCode[name] = code; });

  const grouped = continentOrder.map(cont => {
    const codes = countryCodes.filter(c => countryContinents[c] === cont);
    return {
      continent: cont,
      label: continentLabels[cont],
      countries: codes.map(code => {
        const name = countryNames[code];
        const flag = countryFlags[code];
        const countryLeagues = leagues.filter(l => l.country === name || l.country === code);
        const totalMembers = countryLeagues.reduce((s, l) => s + l.member_count, 0);
        return { code, name, flag, leagues: countryLeagues, totalMembers };
      }).filter(c => c.leagues.length > 0 || true), // show all countries
    };
  });

  const totalPlayers = leagues.reduce((s, l) => s + l.member_count, 0);
  const totalLeagues = leagues.length;
  const activeLeagues = leagues.filter(l => l.season_status === 'in_progress').length;

  const formatLabels: Record<string, string> = { league: 'Liga', knockout: 'Mata-mata', group_knockout: 'Grupos' };

  return (
    <div className="space-y-3">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-1.5">
        <Card className="p-2 text-center">
          <p className="text-lg font-bold text-primary">{totalLeagues}</p>
          <p className="text-[8px] text-muted-foreground">Ligas</p>
        </Card>
        <Card className="p-2 text-center">
          <p className="text-lg font-bold text-success">{activeLeagues}</p>
          <p className="text-[8px] text-muted-foreground">Ativas</p>
        </Card>
        <Card className="p-2 text-center">
          <p className="text-lg font-bold">{totalPlayers}</p>
          <p className="text-[8px] text-muted-foreground">Jogadores</p>
        </Card>
        <Card className="p-2 text-center">
          <p className="text-lg font-bold text-warning">{tournaments.length}</p>
          <p className="text-[8px] text-muted-foreground">Torneios</p>
        </Card>
      </div>

      {/* Season 1 Info Banner */}
      <Card className="border-cyan-500/30" style={{ background: 'linear-gradient(135deg, hsl(190 80% 50% / 0.08), hsl(var(--primary) / 0.04))' }}>
        <CardContent className="p-3">
          <p className="text-xs font-bold mb-1">📋 Estrutura de Ligas — Temporada 1</p>
          <div className="text-[9px] text-muted-foreground space-y-0.5">
            <p>• <span className="font-bold text-foreground">38 países</span> em 5 continentes com ligas automáticas</p>
            <p>• Cada país terá <span className="font-bold text-foreground">4 divisões</span> (Série A, B, C, D) com 30 clubes cada</p>
            <p>• <span className="font-bold text-foreground">30 rodadas</span> por temporada, 1 jogo a cada 24h</p>
            <p>• Promoção/rebaixamento: <span className="font-bold text-success">4 sobem</span> / <span className="font-bold text-destructive">4 descem</span> no Dia 31</p>
            <p>• Premiação escalonada: A=100%, B=50%, C=25%, D=10%</p>
            <p>• Início oficial: <span className="font-bold text-cyan-400">01/05/2026</span></p>
          </div>
        </CardContent>
      </Card>

      {/* Active Tournaments */}
      {tournaments.length > 0 && (
        <Card>
          <CardHeader className="pb-1 px-3 pt-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-warning" /> Torneios Ativos ({tournaments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 space-y-1">
            {tournaments.map(t => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] bg-accent/10">
                <Trophy className="h-3 w-3 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{t.name}</p>
                  <p className="text-[8px] text-muted-foreground">
                    {formatLabels[t.format] || t.format} • {t.team_count}/{t.max_teams} times • {t.played_count}/{t.match_count} jogos
                    {t.country && ` • ${t.country}`}
                  </p>
                </div>
                <Badge variant="outline" className={`text-[7px] ${t.status === 'in_progress' ? 'text-success border-success/30' : 'text-blue-400 border-blue-500/30'}`}>
                  {t.status === 'in_progress' ? '🟢' : '📋'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Leagues by Continent */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-primary" /> Ligas por Continente
        </p>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-6 px-2 text-[9px]">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <ScrollArea className="max-h-[50vh]">
        <div className="space-y-2">
          {grouped.map(g => {
            const isOpen = expandedContinent === g.continent;
            const continentLeagues = g.countries.flatMap(c => c.leagues);
            const continentPlayers = continentLeagues.reduce((s, l) => s + l.member_count, 0);
            
            return (
              <Card key={g.continent}>
                <div
                  className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent/10 transition-colors"
                  onClick={() => setExpandedContinent(isOpen ? null : g.continent)}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-bold">{g.label}</p>
                    <Badge variant="secondary" className="text-[7px]">{g.countries.filter(c => c.leagues.length > 0).length} países</Badge>
                    {continentPlayers > 0 && <Badge variant="outline" className="text-[7px]">{continentPlayers} jogadores</Badge>}
                  </div>
                  {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </div>

                {isOpen && (
                  <CardContent className="px-2 pb-2 pt-0 space-y-1">
                    {g.countries.map(c => {
                      if (c.leagues.length === 0) {
                        return (
                          <div key={c.code} className="flex items-center gap-2 px-2 py-1 text-[9px] text-muted-foreground/50">
                            <span>{c.flag}</span>
                            <span>{c.name}</span>
                            <span className="text-[7px] ml-auto">Sem liga criada</span>
                          </div>
                        );
                      }
                      return (
                        <div key={c.code} className="rounded-lg border border-border/20 p-2 space-y-1">
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-sm">{c.flag}</span>
                            <span className="font-bold">{c.name}</span>
                            <Badge variant="outline" className="text-[7px] ml-auto">{c.totalMembers} jogadores</Badge>
                          </div>
                          <div className="space-y-0.5">
                            {c.leagues.sort((a, b) => (a.division || 1) - (b.division || 1)).map(l => (
                              <div key={l.id} className="flex items-center gap-1.5 text-[8px] px-1.5 py-0.5 rounded bg-accent/10">
                                <span className="font-bold shrink-0 truncate max-w-[140px]" title={getDivisionLabel(c.code, l.division)}>{getDivisionLabel(c.code, l.division)}</span>
                                <span className="text-muted-foreground">R{l.current_round}/{l.total_rounds}</span>
                                <span className="text-muted-foreground">{l.member_count}/{l.max_members}</span>
                                <Badge variant="outline" className={`text-[6px] ml-auto ${statusColors[l.season_status] || ''}`}>
                                  {statusLabels[l.season_status] || l.season_status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
