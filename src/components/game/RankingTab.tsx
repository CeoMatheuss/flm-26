import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, RefreshCw, Shield, User, Globe } from 'lucide-react';
import { ClubShield } from './ClubShield';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayerRankingTab } from './PlayerRankingTab';

interface RankingEntry {
  id: string;
  user_id: string;
  club_name: string;
  ranking_points: number;
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

export function RankingTab({}: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myPosition, setMyPosition] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
  }, []);

  const fetchRankings = async () => {
    setLoading(true);
    const { data: rankingData, error } = await supabase
      .from('global_ranking')
      .select('id, user_id, club_name, ranking_points')
      .not('user_id', 'is', null)
      .order('ranking_points', { ascending: false })
      .limit(100);

    if (!error && rankingData) {
      const userIds = rankingData.map((r: any) => r.user_id);
      const { data: clubsData } = await (supabase
        .from('clubs')
        .select('user_id, shield_config, logo_url') as any)
        .in('user_id', userIds);

      const enhanced = rankingData.map((r: any) => ({
        ...r,
        clubs: clubsData?.find((c: any) => c.user_id === r.user_id),
      }));

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

  return (
    <div className="space-y-6 pb-20 sm:pb-10">
      <Tabs defaultValue="clubs" className="w-full">
        <TabsList className="w-full max-w-md mx-auto grid grid-cols-2 mb-6 bg-card border border-white/5">
          <TabsTrigger value="clubs" className="flex items-center gap-2 py-2">
            <Shield className="h-4 w-4" />
            <span className="font-bold">Clubes</span>
          </TabsTrigger>
          <TabsTrigger value="players" className="flex items-center gap-2 py-2">
            <User className="h-4 w-4" />
            <span className="font-bold">Jogadores</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clubs" className="space-y-4 animate-in fade-in duration-500">
          {/* My summary */}
          <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/10 overflow-hidden">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 p-2 rounded-xl">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Sua posição</p>
                  <p className="text-3xl font-black italic tracking-tighter">#{myPosition || '—'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Pontos</p>
                <p className="text-3xl font-black text-primary">{me?.ranking_points || 0}</p>
              </div>
            </CardContent>
          </Card>

          {/* Ranking */}
          <Card className="border-white/5 shadow-xl bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3 px-5 pt-5 flex flex-row items-center justify-between border-b border-white/5">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Ranking Global
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRankings}
                disabled={loading}
                className="h-8 px-3 gap-2 bg-background/50 border-white/10"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline text-xs">Atualizar</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-white/5">
                <AnimatePresence mode="popLayout">
                  {rankings.map((entry, idx) => {
                    const pos = idx + 1;
                    const isMe = entry.user_id === userId;
                    return (
                      <motion.li
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.015, duration: 0.18 }}
                        key={entry.id}
                        onClick={() =>
                          (window as any).dispatchEvent(
                            new CustomEvent('flm:open-club-profile', { detail: { club_name: entry.club_name } })
                          )
                        }
                        className={`flex items-center gap-3 px-4 sm:px-5 py-3 cursor-pointer transition-colors ${
                          isMe ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/40'
                        }`}
                      >
                        {/* Position */}
                        <div className="w-9 flex-shrink-0 flex items-center justify-center">
                          {pos <= 3 ? (
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-black italic text-sm shadow-md
                                ${
                                  pos === 1
                                    ? 'bg-gradient-to-br from-amber-300 to-amber-600 text-black'
                                    : pos === 2
                                    ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-black'
                                    : 'bg-gradient-to-br from-orange-400 to-orange-700 text-white'
                                }`}
                            >
                              {pos}
                            </div>
                          ) : (
                            <span className="text-sm font-bold text-muted-foreground">{pos}</span>
                          )}
                        </div>

                        {/* Shield */}
                        <ClubShield club={entry.clubs as any} size={32} />

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${isMe ? 'text-primary' : ''}`}>
                            {entry.club_name}
                          </p>
                        </div>

                        {/* Points */}
                        <div className="text-right flex-shrink-0">
                          <span className="text-base font-black italic text-primary tabular-nums">
                            {entry.ranking_points}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-1 uppercase">pts</span>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
                {!loading && rankings.length === 0 && (
                  <li className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Nenhum clube ranqueado ainda.
                  </li>
                )}
              </ul>
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
