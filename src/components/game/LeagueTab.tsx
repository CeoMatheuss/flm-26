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
import { useLeagueFixer } from '@/hooks/useLeagueFixer';

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

export function LeagueTab({ clubName, country, clubPlayers, currentTier, currentTierLevel }: Props) {
  const [showAllLeagues, setShowAllLeagues] = useState(false);
  const [selectedCupId, setSelectedCupId] = useState<string | null>(null);
  const [cups, setCups] = useState<CupCompetition[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Auto-fix league if broken
  const [userId, setUserId] = useState<string | undefined>();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);
  useLeagueFixer(userId);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // sync_league_integrity garante que a liga do usuário esteja robusta
      await supabase.rpc('sync_league_integrity', { _user_id: user.id });

      // Carregar classificação da VIEW autoritativa
      const { data: standingsData, error: sErr } = await supabase
        .from('world_league_table')
        .select('*')
        .order('pts', { ascending: false })
        .order('gd', { ascending: false })
        .order('gf', { ascending: false });
      
      if (sErr) {
        console.error('Erro ao carregar tabela autoritativa:', sErr);
      } else if (standingsData) {
        setStandings(standingsData);
      }

      if (country) {
        const { data: cupData } = await supabase
          .from('cup_competitions')
          .select('*')
          .eq('country', country);
        if (cupData) setCups(cupData as unknown as CupCompetition[]);
      }
      setLoading(false);
    };

    loadData();
  }, [country, clubName]);

  const sorted = useMemo(() => standings, [standings]);

  const topScorers = useMemo(() => {
    return (clubPlayers || []).filter(p => (p.goals ?? 0) > 0)
      .map(p => ({ name: p.name, team: clubName, goals: p.goals ?? 0 }))
      .sort((a, b) => b.goals - a.goals).slice(0, 10);
  }, [clubPlayers, clubName]);

  const topAssisters = useMemo(() => {
    return (clubPlayers || []).filter(p => (p.assists ?? 0) > 0)
      .map(p => ({ name: p.name, team: clubName, assists: p.assists ?? 0 }))
      .sort((a, b) => b.assists - a.assists).slice(0, 10);
  }, [clubPlayers, clubName]);

  const hasGames = sorted.some(t => t.mp > 0);

  if (selectedCupId) {
    return <CupBracketView cupId={selectedCupId} onBack={() => setSelectedCupId(null)} />;
  }

  if (showAllLeagues) {
    return <LeaguesOverview currentCountry={country} clubName={clubName} onBack={() => setShowAllLeagues(false)} />;
  }

  const tierLabels: Record<string, string> = {
    varzea: '⚽ Várzea',
    pre_regional: '🏟️ Pré-Regional',
    regional: '🏆 Regional',
    nacional: '👑 Nacional',
  };
  const tierLabel = currentTier ? tierLabels[currentTier] || currentTier : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {tierLabel && (
            <Badge variant="default" className="text-[10px]">
              <Layers className="h-3 w-3 mr-1" />
              {tierLabel} {currentTierLevel && currentTierLevel > 1 ? `Div ${currentTierLevel}` : ''}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {cups.length > 0 && (
            <div className="flex gap-1">
              {cups.map(cup => (
                <Button
                  key={cup.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCupId(cup.id)}
                  className="gap-1 text-[10px] h-7"
                >
                  <Trophy className="h-3 w-3" />
                  {cup.name.length > 15 ? cup.name.slice(0, 15) + '…' : cup.name}
                </Button>
              ))}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowAllLeagues(true)} className="gap-1.5 text-xs">
            <Globe className="h-3.5 w-3.5" /> Ligas do Mundo
          </Button>
        </div>
      </div>

      {currentTier && (
        <Card className="border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold">Pirâmide:</span>
              {['varzea', 'pre_regional', 'regional', 'nacional'].map(tier => {
                const isActive = tier === currentTier;
                const tierName = tier === 'varzea' ? 'Várzea' : tier === 'pre_regional' ? 'Pré-Reg' : tier === 'regional' ? 'Regional' : 'Nacional';
                return (
                  <Badge
                    key={tier}
                    variant={isActive ? 'default' : 'outline'}
                    className={`text-[9px] ${isActive ? '' : 'opacity-50'}`}
                  >
                    {tierName}
                  </Badge>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Top 1 🌎 Mundial • 2-8 🏆 Continental • Últimos 4 ⬇️ Rebaixamento
            </p>
          </CardContent>
        </Card>
      )}

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
              {loading ? (
                 <TableRow><TableCell colSpan={10} className="text-center py-8">Carregando classificação...</TableCell></TableRow>
              ) : sorted.length === 0 ? (
                 <TableRow><TableCell colSpan={10} className="text-center py-8">Nenhum time encontrado na liga.</TableCell></TableRow>
              ) : sorted.map((row, i) => {
                const teamName = row.club_name || 'Desconhecido';
                const teamLogo = row.club_logo || '⚽';
                return (
                  <TableRow key={row.team_id} className={teamName === clubName ? 'bg-primary/10 font-semibold' : ''}>
                    <TableCell className={i === 0 ? 'text-yellow-400 font-bold' : i < 8 ? 'text-emerald-400 font-bold' : i >= sorted.length - 4 ? 'text-red-400 font-bold' : ''}>
                      {i + 1}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <span className="mr-1">{teamLogo}</span>
                        {teamName}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{row.mp}</TableCell>
                    <TableCell className="text-center">{row.w}</TableCell>
                    <TableCell className="text-center">{row.d}</TableCell>
                    <TableCell className="text-center">{row.l}</TableCell>
                    <TableCell className="text-center">{row.gf}</TableCell>
                    <TableCell className="text-center">{row.ga}</TableCell>
                    <TableCell className="text-center">{row.gd}</TableCell>
                    <TableCell className="text-center font-bold">{row.pts}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {hasGames && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
