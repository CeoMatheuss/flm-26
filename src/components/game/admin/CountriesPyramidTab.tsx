import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, RefreshCw, Users, Bot, AlertCircle } from 'lucide-react';
import { countryNames, countryFlags, countryContinents } from '@/types/league';
import {
  LeagueRow, MemberRow, tierLabels, tierColors, statusColors, statusLabels,
} from './leagueHelpers';

const continentLabels: Record<string, string> = {
  south_america: '🌎 América do Sul',
  europe: '🌍 Europa',
  north_america: '🌎 América do Norte',
  africa: '🌍 África',
  asia: '🌏 Ásia / Oceania',
};

interface CountryStatus {
  country: string;
  total_players: number;
  max_capacity: number;
  is_locked: boolean;
}

export function CountriesPyramidTab() {
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [countryStatus, setCountryStatus] = useState<CountryStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [search, setSearch] = useState('');
  const [openCountries, setOpenCountries] = useState<Record<string, boolean>>({});
  const [openLeagues, setOpenLeagues] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    const [lRes, mRes, cRes] = await Promise.all([
      supabase.from('multiplayer_leagues').select('*').order('country').order('tier_level', { ascending: false }),
      supabase.from('league_members').select('*'),
      supabase.from('country_status').select('*'),
    ]);
    if (lRes.data) setLeagues(lRes.data as LeagueRow[]);
    if (mRes.data) setMembers(mRes.data as MemberRow[]);
    if (cRes.data) setCountryStatus(cRes.data as CountryStatus[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const filtered = leagues.filter(l => {
      if (filterCountry !== 'all' && l.country !== filterCountry) return false;
      if (filterTier !== 'all' && l.tier !== filterTier) return false;
      if (search && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    // continent → country → leagues
    const map: Record<string, Record<string, LeagueRow[]>> = {};
    for (const l of filtered) {
      const continent = countryContinents[l.country] || 'other';
      if (!map[continent]) map[continent] = {};
      if (!map[continent][l.country]) map[continent][l.country] = [];
      map[continent][l.country].push(l);
    }
    return map;
  }, [leagues, filterCountry, filterTier, search]);

  const allCountries = useMemo(() => [...new Set(leagues.map(l => l.country))].sort(), [leagues]);

  const memberCount = (leagueId: string) => members.filter(m => m.league_id === leagueId).length;
  const leagueMembers = (leagueId: string) => members
    .filter(m => m.league_id === leagueId)
    .sort((a, b) => b.points - a.points || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against));

  const countryInfo = (country: string) => {
    const cs = countryStatus.find(c => c.country === country);
    const playerCount = members.filter(m => leagues.find(l => l.id === m.league_id)?.country === country).length;
    const leagueCount = leagues.filter(l => l.country === country).length;
    return { cs, playerCount, leagueCount };
  };

  return (
    <div className="space-y-3">
      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os países</SelectItem>
                {allCountries.map(c => (
                  <SelectItem key={c} value={c}>{countryFlags[c] || '🏳️'} {countryNames[c] || c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tiers</SelectItem>
                <SelectItem value="national">🏆 Nacional</SelectItem>
                <SelectItem value="regional">🥇 Regional</SelectItem>
                <SelectItem value="pre_regional">🥈 Pré-Regional</SelectItem>
                <SelectItem value="varzea">⚽ Várzea</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Buscar liga…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 text-xs md:col-span-1"
            />
            <Button size="sm" onClick={load} disabled={loading} className="h-8 text-xs">
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {Object.entries(grouped).sort().map(([continent, countries]) => (
        <div key={continent} className="space-y-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            {continentLabels[continent] || continent}
          </h3>
          {Object.entries(countries).map(([country, leagueList]) => {
            const { cs, playerCount, leagueCount } = countryInfo(country);
            const isOpen = openCountries[country] ?? true;
            const capacityPct = cs ? (cs.total_players / cs.max_capacity) * 100 : 0;
            const capColor = capacityPct >= 90 ? 'bg-red-500/20 text-red-400 border-red-500/30'
              : capacityPct >= 70 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              : 'bg-green-500/20 text-green-400 border-green-500/30';
            return (
              <Collapsible key={country} open={isOpen} onOpenChange={(v) => setOpenCountries(p => ({ ...p, [country]: v }))}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="pb-2 hover:bg-muted/30 cursor-pointer transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="text-lg">{countryFlags[country] || '🏳️'}</span>
                          <CardTitle className="text-sm">{countryNames[country] || country}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px]">
                            <Users className="h-2.5 w-2.5 mr-0.5" /> {playerCount}
                          </Badge>
                          <Badge variant="outline" className="text-[9px]">{leagueCount} ligas</Badge>
                          {cs && (
                            <Badge className={`text-[9px] ${capColor}`}>
                              {cs.total_players}/{cs.max_capacity} {cs.is_locked && '🔒'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-1.5">
                      {leagueList.map(l => {
                        const count = memberCount(l.id);
                        const isLeagueOpen = openLeagues[l.id];
                        const tierKey = l.tier || 'varzea';
                        return (
                          <Collapsible
                            key={l.id}
                            open={isLeagueOpen}
                            onOpenChange={(v) => setOpenLeagues(p => ({ ...p, [l.id]: v }))}
                          >
                            <div className="border border-border/50 rounded-lg overflow-hidden">
                              <CollapsibleTrigger className="w-full">
                                <div className="p-2 hover:bg-muted/30 transition">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      {isLeagueOpen ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                                      <span className="text-xs font-semibold truncate">{l.name}</span>
                                      {l.division && <span className="text-[10px] text-muted-foreground">Div {l.division}</span>}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Badge variant="outline" className={`text-[8px] ${tierColors[tierKey] || ''}`}>
                                        {tierLabels[tierKey] || tierKey}
                                      </Badge>
                                      <Badge variant="outline" className={`text-[8px] ${count !== l.max_members ? 'text-red-400 border-red-500/30' : 'text-green-400 border-green-500/30'}`}>
                                        {count}/{l.max_members}
                                      </Badge>
                                      <Badge variant="outline" className={`text-[8px] ${statusColors[l.season_status] || ''}`}>
                                        {statusLabels[l.season_status] || l.season_status}
                                      </Badge>
                                      <span className="text-[8px] text-muted-foreground">R{l.current_round}/{l.total_rounds}</span>
                                    </div>
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="border-t border-border/50 bg-muted/10 p-2">
                                  <ScrollArea className="max-h-[280px]">
                                    <table className="w-full text-[10px]">
                                      <thead>
                                        <tr className="text-muted-foreground border-b border-border/50">
                                          <th className="text-left p-1">#</th>
                                          <th className="text-left p-1">Clube</th>
                                          <th className="text-center p-1">Tipo</th>
                                          <th className="text-center p-1">Pts</th>
                                          <th className="text-center p-1">J</th>
                                          <th className="text-center p-1">V-E-D</th>
                                          <th className="text-center p-1">SG</th>
                                          <th className="text-center p-1">Rep</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {leagueMembers(l.id).map((m, i) => (
                                          <tr key={m.id} className="border-b border-border/20 hover:bg-muted/20">
                                            <td className="p-1 text-muted-foreground">{i + 1}</td>
                                            <td className="p-1">
                                              <span className="font-semibold">{m.club_logo} {m.club_name}</span>
                                            </td>
                                            <td className="p-1 text-center">
                                              <Badge variant="outline" className="text-[8px] text-green-400 border-green-500/30">
                                                <Users className="h-2 w-2 mr-0.5" /> Player
                                              </Badge>
                                            </td>
                                            <td className="p-1 text-center font-bold">{m.points}</td>
                                            <td className="p-1 text-center">{m.played}</td>
                                            <td className="p-1 text-center">{m.wins}-{m.draws}-{m.losses}</td>
                                            <td className="p-1 text-center">{m.goals_for - m.goals_against > 0 ? '+' : ''}{m.goals_for - m.goals_against}</td>
                                            <td className="p-1 text-center text-muted-foreground">{m.reputation}</td>
                                          </tr>
                                        ))}
                                        {/* Bot rows for empty slots */}
                                        {Array.from({ length: Math.max(0, l.max_members - leagueMembers(l.id).length) }).map((_, i) => (
                                          <tr key={`bot-${i}`} className="border-b border-border/20 opacity-60">
                                            <td className="p-1 text-muted-foreground">{leagueMembers(l.id).length + i + 1}</td>
                                            <td className="p-1 text-muted-foreground italic">🤖 Bot {i + 1}</td>
                                            <td className="p-1 text-center">
                                              <Badge variant="outline" className="text-[8px] text-muted-foreground">
                                                <Bot className="h-2 w-2 mr-0.5" /> BOT
                                              </Badge>
                                            </td>
                                            <td colSpan={5} className="p-1 text-center text-muted-foreground text-[9px]">vaga preenchida na simulação</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </ScrollArea>
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        );
                      })}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      ))}

      {!loading && Object.keys(grouped).length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Nenhuma liga encontrada com os filtros atuais.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
