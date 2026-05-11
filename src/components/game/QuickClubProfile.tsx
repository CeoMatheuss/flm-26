import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Users, Star, Shield, Activity, Loader2, Calendar, Target, TrendingUp } from 'lucide-react';
import { ClubShield } from './ClubShield';

interface Props {
  clubName: string;
}

export function QuickClubProfile({ clubName }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);

      // Parallel: world_team metadata + clubs row + shield from save + standings + recent matches
      const [teamRes, clubRes, shieldRes] = await Promise.all([
        supabase
          .from('world_teams')
          .select('id, name, logo, is_bot, user_id, country, strength, league_id, world_leagues(name, division, country_ref:world_countries(name, flag_emoji))')
          .eq('name', clubName)
          .maybeSingle(),
        supabase.from('clubs').select('*').eq('name', clubName).maybeSingle(),
        supabase.rpc('get_club_shields_by_names', { _names: [clubName] }),
      ]);

      if (cancelled) return;

      const team: any = teamRes.data;
      const club: any = clubRes.data;
      const shield: any = (shieldRes.data && (shieldRes.data as any[])[0]?.shield) || null;

      let standing: any = null;
      let recentMatches: any[] = [];
      let topScorers: any[] = [];

      if (team?.id && team?.league_id) {
        const [standRes, matchRes, scorerRes] = await Promise.all([
          supabase
            .from('world_league_table')
            .select('*')
            .eq('league_id', team.league_id)
            .order('points', { ascending: false }),
          supabase
            .from('world_matches')
            .select('id, round, status, home_goals, away_goals, scheduled_at, home_team_id, away_team_id, home_team:world_teams!world_matches_home_team_id_fkey(name, logo), away_team:world_teams!world_matches_away_team_id_fkey(name, logo)')
            .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
            .order('scheduled_at', { ascending: false })
            .limit(8),
          supabase
            .from('world_player_stats')
            .select('goals, assists, matches_played, player:world_players(name, position)')
            .eq('team_id', team.id)
            .order('goals', { ascending: false })
            .limit(5),
        ]);

        const fullTable = (standRes.data || []);
        const idx = fullTable.findIndex((s: any) => s.team_id === team.id);
        standing = {
          position: idx >= 0 ? idx + 1 : null,
          row: idx >= 0 ? fullTable[idx] : null,
          totalTeams: fullTable.length,
        };
        recentMatches = matchRes.data || [];
        topScorers = scorerRes.data || [];
      }

      if (cancelled) return;
      setData({ team, club, shield, standing, recentMatches, topScorers });
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [clubName]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!data?.team && !data?.club) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center space-y-2">
          <Shield className="h-10 w-10 mx-auto text-muted-foreground/30" />
          <h3 className="text-sm font-bold">Clube não encontrado</h3>
          <p className="text-xs text-muted-foreground">{clubName}</p>
        </CardContent>
      </Card>
    );
  }

  const { team, club, shield, standing, recentMatches, topScorers } = data;
  const leagueName = team?.world_leagues?.name || 'Sem liga';
  const countryFlag = team?.world_leagues?.country_ref?.flag_emoji || '🌍';
  const countryName = team?.world_leagues?.country_ref?.name || team?.country || club?.country || '—';
  const strength = team?.strength || club?.reputation || 65;
  const fans = club?.fans ?? 1000;
  const budget = club?.budget ?? 0;

  const shieldClub = {
    name: clubName,
    primaryColor: club?.primary_color,
    secondaryColor: club?.secondary_color,
    detailColor: club?.detail_color,
    logoUrl: club?.logo_url || team?.logo,
    shieldConfig: shield,
  };

  const lastResults = recentMatches
    .filter((m: any) => m.status === 'finished' && m.home_goals != null)
    .slice(0, 5)
    .map((m: any) => {
      const isHome = m.home_team_id === team?.id;
      const my = isHome ? m.home_goals : m.away_goals;
      const opp = isHome ? m.away_goals : m.home_goals;
      return my > opp ? 'V' : my === opp ? 'E' : 'D';
    });

  return (
    <div className="space-y-3">
      {/* Hero */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <ClubShield club={shieldClub} size={72} className="shrink-0 drop-shadow-lg" />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black truncate">{clubName}</h2>
                {team?.is_bot && <Badge variant="secondary" className="text-[8px]">BOT</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>{countryFlag} {countryName}</span>
                <span>•</span>
                <span className="truncate">{leagueName}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge variant="outline" className="text-[9px] gap-1"><Star className="h-2.5 w-2.5 text-amber-400" /> Rep {strength}</Badge>
                <Badge variant="outline" className="text-[9px] gap-1"><Users className="h-2.5 w-2.5 text-blue-400" /> {fans.toLocaleString()}</Badge>
                {standing?.position && (
                  <Badge variant="outline" className="text-[9px] gap-1 border-emerald-500/30 text-emerald-400">
                    <Trophy className="h-2.5 w-2.5" /> {standing.position}º na liga
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-3 w-full h-9">
          <TabsTrigger value="overview" className="text-[10px]">Visão Geral</TabsTrigger>
          <TabsTrigger value="form" className="text-[10px]">Forma</TabsTrigger>
          <TabsTrigger value="players" className="text-[10px]">Destaques</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-2 mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">Identidade</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Stat label="Reputação" value={`${strength}`} icon={<Star className="h-3 w-3 text-amber-400" />} />
              <Stat label="Torcida" value={fans.toLocaleString()} icon={<Users className="h-3 w-3 text-blue-400" />} />
              <Stat label="País" value={countryName} icon={<>{countryFlag}</>} />
              <Stat label="Liga" value={leagueName} icon={<Trophy className="h-3 w-3 text-emerald-400" />} />
            </CardContent>
          </Card>

          {standing?.row && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Trophy className="h-3 w-3 text-yellow-500" /> Posição na Tabela
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div><p className="text-lg font-black text-primary">{standing.position}º</p><p className="text-[8px] text-muted-foreground uppercase">Pos</p></div>
                  <div><p className="text-lg font-black">{standing.row.points}</p><p className="text-[8px] text-muted-foreground uppercase">Pts</p></div>
                  <div><p className="text-lg font-black text-emerald-500">{standing.row.wins}</p><p className="text-[8px] text-muted-foreground uppercase">V</p></div>
                  <div><p className="text-lg font-black text-amber-500">{standing.row.draws}</p><p className="text-[8px] text-muted-foreground uppercase">E</p></div>
                  <div><p className="text-lg font-black text-rose-500">{standing.row.losses}</p><p className="text-[8px] text-muted-foreground uppercase">D</p></div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="form" className="space-y-2 mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <Activity className="h-3 w-3 text-primary" /> Últimos 5 Jogos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lastResults.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sem partidas disputadas.</p>
              ) : (
                <div className="flex gap-1.5 justify-center">
                  {lastResults.map((r: string, i: number) => (
                    <span key={i} className={`w-9 h-9 rounded-md flex items-center justify-center text-sm font-black border ${
                      r === 'V' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      r === 'E' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}>{r}</span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <Calendar className="h-3 w-3 text-blue-400" /> Histórico Recente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {recentMatches.slice(0, 6).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between text-[10px] p-1.5 rounded bg-muted/20">
                  <span className="truncate flex-1 text-right pr-2 font-medium">{m.home_team?.name}</span>
                  <span className="font-black px-2 py-0.5 bg-background rounded shadow-sm">
                    {m.status === 'finished' ? `${m.home_goals} x ${m.away_goals}` : 'Agendado'}
                  </span>
                  <span className="truncate flex-1 pl-2 font-medium">{m.away_team?.name}</span>
                </div>
              ))}
              {recentMatches.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Sem jogos.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="players" className="space-y-2 mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <Target className="h-3 w-3 text-emerald-400" /> Artilheiros do Clube
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {topScorers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">Sem dados de jogadores.</p>
              ) : topScorers.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/20">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold w-4 ${i === 0 ? 'text-yellow-500' : 'text-muted-foreground'}`}>{i + 1}</span>
                    <Badge variant="outline" className="text-[8px] h-4">{s.player?.position}</Badge>
                    <span className="text-xs font-medium">{s.player?.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-primary">{s.goals} ⚽</p>
                    <p className="text-[8px] text-muted-foreground">{s.matches_played}j • {s.assists} 👟</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/50">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] text-muted-foreground uppercase">{label}</p>
        <p className="text-xs font-bold truncate">{value}</p>
      </div>
    </div>
  );
}
