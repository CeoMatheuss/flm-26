import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Trophy, Swords, Star, Flame, BarChart3, RefreshCw, Globe, Users, Shield } from 'lucide-react';
import { ClubShield } from './ClubShield';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface RankingEntry {
  id: string;
  user_id: string;
  club_name: string;
  ranking_points: number;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  last_change: number;
  current_competition: string;
  clubs?: {
    shield_config: any;
    logo_url: string | null;
  };
}

interface Props {
  rating: number;
  rankingHistory: any[];
  clubName: string;
  stats: { wins: number; draws: number; losses: number };
  season: number;
}

export function RankingTab({ rating, rankingHistory, clubName, stats, season }: Props) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
  }, []);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myPosition, setMyPosition] = useState<number | null>(null);

  const fetchRankings = async () => {
    setLoading(true);
    const { data: rankingData, error } = await supabase
      .from('global_ranking')
      .select('*')
      .order('ranking_points', { ascending: false })
      .limit(200);

    if (!error && rankingData) {
      const userIds = rankingData.map(r => r.user_id);
      const { data: clubsData } = await supabase
        .from('clubs')
        .select('user_id, shield_config, logo_url')
        .in('user_id', userIds);

      const enhanced = rankingData.map(r => ({
        ...r,
        clubs: clubsData?.find(c => c.user_id === r.user_id)
      }));

      setRankings(enhanced as any[]);
      if (userId) {
        const pos = rankingData.findIndex((r: any) => r.user_id === userId);
        setMyPosition(pos >= 0 ? pos + 1 : null);
      }
    }
    setLoading(false);
  };

  // Ensure user has a ranking entry
  useEffect(() => {
    if (!userId) return;
    const ensureEntry = async () => {
      const { data } = await supabase
        .from('global_ranking')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!data) {
        await supabase.from('global_ranking').insert({
          user_id: userId,
          club_name: clubName,
          ranking_points: 0,
          games_played: stats.wins + stats.draws + stats.losses,
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses,
        });
      } else {
        await supabase.from('global_ranking').update({ club_name: clubName }).eq('user_id', userId);
      }
      fetchRankings();
    };
    ensureEntry();
  }, [userId, clubName]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('global-ranking-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_ranking' }, () => {
        fetchRankings();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const totalGames = stats.wins + stats.draws + stats.losses;
  const winRate = totalGames > 0 ? Math.round((stats.wins / totalGames) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* My Ranking Summary */}
      <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" /> Ranking Global
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold">{myPosition ? `#${myPosition}` : '—'}</h2>
              <p className="text-sm font-semibold text-primary">{clubName}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Temporada {season}</p>
              <p className="text-2xl font-bold">{rankings.find(r => r.user_id === userId)?.ranking_points ?? 0} <span className="text-xs text-muted-foreground">pts</span></p>
              <div className="flex gap-3 text-xs font-mono justify-end">
                <span className="text-emerald-500 font-bold">{stats.wins}V</span>
                <span className="text-amber-500 font-bold">{stats.draws}E</span>
                <span className="text-red-500 font-bold">{stats.losses}D</span>
              </div>
              {totalGames > 0 && (
                <p className="text-[10px] text-muted-foreground">{winRate}% aproveitamento</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" /> Como Funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-center">
              <Trophy className="h-4 w-4 mx-auto text-emerald-400 mb-1" />
              <p className="text-xs font-bold text-emerald-400">Vitória</p>
              <p className="text-[10px] text-muted-foreground">+ pontos</p>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 text-center">
              <Minus className="h-4 w-4 mx-auto text-primary mb-1" />
              <p className="text-xs font-bold text-primary">Empate</p>
              <p className="text-[10px] text-muted-foreground">+ poucos pts</p>
            </div>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2 text-center">
              <TrendingDown className="h-4 w-4 mx-auto text-destructive mb-1" />
              <p className="text-xs font-bold text-destructive">Derrota</p>
              <p className="text-[10px] text-muted-foreground">− pontos</p>
            </div>
          </div>

          <div className="text-[10px] sm:text-xs text-muted-foreground space-y-1 mt-2">
            <p className="flex items-center gap-1"><Trophy className="h-3 w-3" /> <strong>Peso:</strong> Liga 1.0 · Copa 1.2 · Continental 1.6 · Mundial 2.0</p>
            <p className="flex items-center gap-1"><Swords className="h-3 w-3" /> <strong>Adversário forte:</strong> ganhar vale mais, perder dói menos</p>
            <p className="flex items-center gap-1"><Shield className="h-3 w-3" /> <strong>Adversário fraco:</strong> ganhar vale menos, perder dói mais</p>
            <p className="flex items-center gap-1"><Star className="h-3 w-3" /> <strong>Campeão:</strong> +10% a +25% ao final da temporada</p>
            <p className="flex items-center gap-1"><Flame className="h-3 w-3" /> <strong>Rebaixado:</strong> −10% a −25% ao final da temporada</p>
          </div>
        </CardContent>
      </Card>

      {/* Global Ranking Table */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Globe className="h-3.5 w-3.5" /> Classificação Global
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9px] gap-1">
              <Users className="h-3 w-3" /> {rankings.length} times
            </Badge>
            <Button variant="ghost" size="sm" onClick={fetchRankings} disabled={loading} className="h-7 px-2">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-4 pb-4">
          {loading && rankings.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Carregando ranking...</p>
          ) : rankings.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhum clube no ranking ainda</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="text-left py-2 px-1 w-8">#</th>
                    <th className="text-left py-2 px-1">Clube</th>
                    <th className="text-right py-2 px-1">Pts</th>
                    <th className="text-center py-2 px-1 hidden sm:table-cell">V</th>
                    <th className="text-center py-2 px-1 hidden sm:table-cell">E</th>
                    <th className="text-center py-2 px-1 hidden sm:table-cell">D</th>
                    <th className="text-left py-2 px-1 hidden sm:table-cell">Competição</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((entry, idx) => {
                    const pos = idx + 1;
                    const isMe = entry.user_id === userId;
                    return (
                      <tr
                        key={entry.id}
                        className={`border-b border-border/30 transition-colors ${isMe ? 'bg-primary/10 font-semibold' : 'hover:bg-muted/30'}`}
                      >
                        <td className="py-2 px-1">
                          {pos <= 3 ? (
                            <span className={`font-bold ${pos === 1 ? 'text-amber-400' : pos === 2 ? 'text-slate-300' : 'text-orange-400'}`}>
                              {pos}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{pos}</span>
                          )}
                        </td>
                        <td className="py-2 px-1 truncate max-w-[100px] sm:max-w-[160px] cursor-pointer hover:text-primary transition-colors" onClick={() => (window as any).dispatchEvent(new CustomEvent('flm:open-club-profile', { detail: { club_name: entry.club_name } }))}>
                          {entry.club_name || 'Sem nome'}
                          {isMe && <Badge variant="outline" className="ml-1 text-[8px] px-1 py-0">Você</Badge>}
                        </td>
                        <td className="py-2 px-1 text-right font-bold">{entry.ranking_points}</td>
                        <td className="py-2 px-1 text-center text-emerald-500 font-bold hidden sm:table-cell">{entry.wins}</td>
                        <td className="py-2 px-1 text-center text-amber-500 font-bold hidden sm:table-cell">{entry.draws}</td>
                        <td className="py-2 px-1 text-center text-red-500 font-bold hidden sm:table-cell">{entry.losses}</td>
                        <td className="py-2 px-1 text-muted-foreground truncate max-w-[80px] hidden sm:table-cell">{entry.current_competition}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
