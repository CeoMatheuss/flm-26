import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Trophy,
  RefreshCw,
  Shield,
  User,
  Globe,
  Crown,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
} from 'lucide-react';
import { ClubShield } from './ClubShield';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayerRankingTab } from './PlayerRankingTab';
import { RankingScoringInfo } from './RankingScoringInfo';

interface RankingEntry {
  id: string;
  user_id: string;
  club_name: string;
  ranking_points: number;
  prev_position?: number | null;
  clubs?: any;
}

interface Props {
  rating: number;
  rankingHistory: any[];
  clubName: string;
  stats: { wins: number; draws: number; losses: number };
  season: number;
}

export function RankingTab({}: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myPosition, setMyPosition] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
  }, []);

  const fetchRankings = async () => {
    setLoading(true);
    const { data: rankingData, error } = await supabase
      .from('global_ranking')
      .select('id, user_id, club_name, ranking_points, prev_position')
      .not('user_id', 'is', null)
      .order('ranking_points', { ascending: false })
      .limit(100);

    if (!error && rankingData) {
      const userIds = rankingData.map((r: any) => r.user_id);

      // Escudos vivem em game_saves.club_data.club (configuração real do clube)
      const [savesRes, clubsRes] = await Promise.all([
        (supabase.from('game_saves').select('user_id, club_data') as any).in('user_id', userIds),
        (supabase.from('clubs').select('user_id, shield_config, logo_url, primary_color, secondary_color, detail_color') as any).in('user_id', userIds),
      ]);

      const savesMap = new Map<string, any>();
      (savesRes.data || []).forEach((s: any) => {
        const club = s?.club_data?.club;
        if (club) savesMap.set(s.user_id, club);
      });
      const clubsMap = new Map<string, any>();
      (clubsRes.data || []).forEach((c: any) => clubsMap.set(c.user_id, c));

      const enhanced = rankingData.map((r: any) => {
        const fromSave = savesMap.get(r.user_id);
        const fromClubs = clubsMap.get(r.user_id);
        // Mescla: shieldConfig do save tem prioridade (mais atualizado), depois clubs
        const merged = {
          ...(fromClubs || {}),
          ...(fromSave || {}),
        };
        return { ...r, clubs: merged };
      });

      setRankings(enhanced as any[]);
      if (userId) {
        const pos = rankingData.findIndex((r: any) => r.user_id === userId);
        setMyPosition(pos >= 0 ? pos + 1 : null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userId) fetchRankings();
  }, [userId]);

  useEffect(() => {
    const channel = supabase
      .channel('global-ranking-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_ranking' }, () => {
        fetchRankings();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const me = useMemo(() => rankings.find((r) => r.user_id === userId), [rankings, userId]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return rankings;
    return rankings.filter((r) => r.club_name.toLowerCase().includes(term));
  }, [rankings, search]);

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean) as RankingEntry[];

  return (
    <div className="space-y-5 pb-20 sm:pb-10">
      <Tabs defaultValue="clubs" className="w-full">
        <TabsList className="w-full max-w-md mx-auto grid grid-cols-2 mb-5 bg-card/60 border border-white/10 backdrop-blur-sm h-11 rounded-xl p-1">
          <TabsTrigger
            value="clubs"
            className="flex items-center gap-2 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-bold"
          >
            <Shield className="h-4 w-4" />
            Clubes
          </TabsTrigger>
          <TabsTrigger
            value="players"
            className="flex items-center gap-2 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-bold"
          >
            <User className="h-4 w-4" />
            Jogadores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clubs" className="space-y-5 animate-in fade-in duration-500">
          {/* Hero "Você" */}
          <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card shadow-[0_0_40px_-10px_hsl(var(--primary)/0.3)]">
            <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
              <Trophy className="w-40 h-40 -mt-6 -mr-6" />
            </div>
            <CardContent className="p-5 sm:p-6 relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/20 p-3 rounded-2xl border border-primary/30">
                    <Globe className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
                      Ranking Mundial
                    </p>
                    <p className="text-4xl sm:text-5xl font-black italic tracking-tighter leading-none mt-1">
                      #{myPosition || '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 sm:gap-8">
                  <div className="text-center sm:text-right">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                      Pontos
                    </p>
                    <p className="text-3xl sm:text-4xl font-black text-primary tabular-nums">
                      {me?.ranking_points || 0}
                    </p>
                  </div>
                  <RankingScoringInfo mode="clubs" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={fetchRankings}
                    disabled={loading}
                    className="h-10 w-10 bg-background/40 border-white/10 hover:bg-primary/10 hover:border-primary/30 rounded-xl"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clube..."
              className="pl-9 h-10 bg-card/60 border-white/10 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Podium TOP 3 */}
          {!loading && podiumOrder.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {podiumOrder.map((entry) => {
                const realPos = filtered.indexOf(entry) + 1;
                const tier =
                  realPos === 1
                    ? {
                        border: 'border-amber-400/40',
                        ring: 'ring-amber-400/30',
                        grad: 'from-amber-500/20 via-amber-500/5 to-transparent',
                        text: 'text-amber-400',
                        bar: 'from-amber-500 to-amber-300',
                        badge: 'bg-gradient-to-br from-amber-300 to-amber-600 text-black',
                        glow: 'shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)]',
                        h: 'mt-0',
                      }
                    : realPos === 2
                    ? {
                        border: 'border-slate-300/30',
                        ring: 'ring-slate-300/20',
                        grad: 'from-slate-300/15 via-slate-300/5 to-transparent',
                        text: 'text-slate-300',
                        bar: 'from-slate-400 to-slate-200',
                        badge: 'bg-gradient-to-br from-slate-200 to-slate-400 text-black',
                        glow: 'shadow-[0_0_30px_-12px_rgba(203,213,225,0.4)]',
                        h: 'sm:mt-6',
                      }
                    : {
                        border: 'border-orange-500/30',
                        ring: 'ring-orange-500/20',
                        grad: 'from-orange-500/15 via-orange-500/5 to-transparent',
                        text: 'text-orange-400',
                        bar: 'from-orange-600 to-orange-400',
                        badge: 'bg-gradient-to-br from-orange-400 to-orange-700 text-white',
                        glow: 'shadow-[0_0_30px_-12px_rgba(249,115,22,0.4)]',
                        h: 'sm:mt-10',
                      };
                const isMe = entry.user_id === userId;

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: realPos * 0.05 }}
                    className={tier.h}
                  >
                    <Card
                      onClick={() =>
                        (window as any).dispatchEvent(
                          new CustomEvent('flm:open-club-profile', {
                            detail: { club_name: entry.club_name },
                          })
                        )
                      }
                      className={`relative overflow-hidden border ${tier.border} bg-gradient-to-b ${tier.grad} ${tier.glow} transition-all hover:-translate-y-1 hover:scale-[1.02] duration-300 group cursor-pointer ${
                        isMe ? 'ring-2 ring-primary/40' : ''
                      }`}
                    >
                      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tier.bar}`} />
                      <CardContent className="p-3 sm:p-5 flex flex-col items-center text-center">
                        <div
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black italic text-sm shadow-lg ${tier.badge} ring-2 ring-background mb-2 sm:mb-3`}
                        >
                          {realPos === 1 ? <Crown className="w-4 h-4 sm:w-5 sm:h-5" /> : realPos}
                        </div>

                        <div
                          className={`relative w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center mb-2 sm:mb-3 ring-2 ${tier.ring} ring-offset-2 ring-offset-card rounded-2xl bg-background/40 border ${tier.border} group-hover:rotate-3 transition-transform`}
                        >
                          <ClubShield club={entry.clubs as any} size={56} />
                        </div>

                        <p
                          className={`text-xs sm:text-sm font-bold truncate w-full ${
                            isMe ? 'text-primary' : ''
                          }`}
                          title={entry.club_name}
                        >
                          {entry.club_name}
                        </p>

                        <div className="mt-2 sm:mt-3 flex items-baseline gap-1">
                          <span className={`text-lg sm:text-2xl font-black italic tabular-nums ${tier.text}`}>
                            {entry.ranking_points}
                          </span>
                          <span className="text-[9px] sm:text-[10px] uppercase text-muted-foreground font-bold">
                            pts
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Lista */}
          <Card className="border-white/5 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-sm overflow-hidden shadow-xl">
            <CardContent className="p-0">
              {loading && rankings.length === 0 ? (
                <div className="divide-y divide-white/5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-muted/40" />
                      <div className="w-10 h-10 rounded-xl bg-muted/40" />
                      <div className="flex-1 h-3 bg-muted/40 rounded w-1/3" />
                      <div className="w-10 h-6 bg-muted/40 rounded" />
                    </div>
                  ))}
                </div>
              ) : rest.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {filtered.length === 0 ? 'Nenhum clube encontrado.' : '—'}
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  <AnimatePresence mode="popLayout">
                    {rest.map((entry, idx) => {
                      const pos = idx + 4;
                      const isMe = entry.user_id === userId;
                      const variation = entry.prev_position ? entry.prev_position - pos : 0;
                      return (
                        <motion.li
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          transition={{ delay: Math.min(idx * 0.01, 0.18), duration: 0.2 }}
                          key={entry.id}
                          onClick={() =>
                            (window as any).dispatchEvent(
                              new CustomEvent('flm:open-club-profile', {
                                detail: { club_name: entry.club_name },
                              })
                            )
                          }
                          className={`group relative flex items-center gap-3 px-3 sm:px-5 py-3 cursor-pointer transition-all duration-200 ${
                            isMe
                              ? 'bg-primary/10 hover:bg-primary/15'
                              : 'hover:bg-primary/[0.04]'
                          }`}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-center" />

                          <div className="w-9 flex-shrink-0 flex items-center justify-center">
                            <span className="text-xs font-black text-muted-foreground tabular-nums group-hover:text-primary transition-colors">
                              {pos}
                            </span>
                          </div>

                          <div className="relative w-11 h-11 rounded-xl bg-background/40 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:border-primary/30 transition-colors overflow-hidden">
                            <ClubShield club={entry.clubs as any} size={36} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-bold truncate ${
                                isMe ? 'text-primary' : ''
                              }`}
                            >
                              {entry.club_name}
                              {isMe && (
                                <span className="ml-2 inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                              )}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                              Clube
                            </p>
                          </div>

                          {/* Variação */}
                          <div className="hidden sm:flex items-center justify-end w-12">
                            {variation > 0 ? (
                              <div className="flex items-center gap-0.5 text-emerald-400 text-xs font-bold">
                                <TrendingUp className="h-3 w-3" />
                                {variation}
                              </div>
                            ) : variation < 0 ? (
                              <div className="flex items-center gap-0.5 text-red-400 text-xs font-bold">
                                <TrendingDown className="h-3 w-3" />
                                {Math.abs(variation)}
                              </div>
                            ) : (
                              <Minus className="h-3 w-3 text-muted-foreground/40" />
                            )}
                          </div>

                          {/* Pontos */}
                          <div className="flex flex-col items-end w-16">
                            <span className="text-[9px] text-muted-foreground uppercase">Pts</span>
                            <span className="text-base font-black italic text-primary tabular-nums">
                              {entry.ranking_points}
                            </span>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="players" className="animate-in fade-in duration-500">
          <PlayerRankingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
