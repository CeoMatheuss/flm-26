import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, TrendingDown, Minus, Trophy, Swords, Star, 
  Flame, BarChart3, RefreshCw, Globe, Users, Shield,
  History, Target, Award, ArrowUpRight, ArrowDownRight, User
} from 'lucide-react';
import { ClubShield } from './ClubShield';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayerRankingTab } from './PlayerRankingTab';


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
  prev_position?: number;
  recent_form?: string[];
  titles_count?: number;
  winning_streak?: number;
  points_history?: any[];
  goals_for: number;
  goals_against: number;
  division?: string;
  coach_name?: string;
  country?: string;
  clubs?: {
    shield_config: any;
    logo_url: string | null;
    reputation: number;
  };
}

interface Props {
  rating: number;
  rankingHistory: any[];
  clubName: string;
  stats: { wins: number; draws: number; losses: number };
  season: number;
}

type RankingCategory = 'global' | 'national' | 'seasonal' | 'offensive' | 'defensive';

export function RankingTab({ rating, rankingHistory, clubName, stats, season }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myPosition, setMyPosition] = useState<number | null>(null);
  const [category, setCategory] = useState<RankingCategory>('global');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
  }, []);

  const fetchRankings = async () => {
    setLoading(true);
    
    let query = supabase
      .from('global_ranking')
      .select('*');

    // Aplicar filtros e ordenação baseados na categoria
    switch (category) {
      case 'offensive':
        query = query.order('goals_for', { ascending: false });
        break;
      case 'defensive':
        query = query.order('goals_against', { ascending: true });
        break;
      case 'seasonal':
        query = query.order('season_points', { ascending: false });
        break;
      default:
        query = query.order('ranking_points', { ascending: false });
    }

    const { data: rankingData, error } = await query.not('user_id', 'is', null).limit(100);

    if (!error && rankingData) {
      const userIds = rankingData.map(r => r.user_id);
      const { data: clubsData } = await (supabase
        .from('clubs')
        .select('user_id, shield_config, logo_url, reputation') as any)
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

  useEffect(() => {
    if (userId) fetchRankings();
  }, [userId, category]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('global-ranking-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_ranking' }, () => {
        fetchRankings();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const me = useMemo(() => rankings.find(r => r.user_id === userId), [rankings, userId]);

  const variation = useMemo(() => {
    if (!me || !me.prev_position || !myPosition) return 0;
    return me.prev_position - myPosition;
  }, [me, myPosition]);

  const chartData = useMemo(() => {
    if (!me?.points_history) return [];
    return (me.points_history as any[]).map((h, i) => ({
      index: i,
      points: h.points,
      delta: h.delta
    }));
  }, [me]);

  const renderForm = (form: string[] = []) => {
    return (
      <div className="flex gap-1">
        {form.map((res, i) => (
          <div 
            key={i}
            className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm
              ${res === 'V' ? 'bg-emerald-500' : res === 'E' ? 'bg-amber-500' : 'bg-red-500'}`}
          >
            {res}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-10">
      <Tabs defaultValue="clubs" className="w-full">
        <TabsList className="w-full max-w-md mx-auto grid grid-cols-2 mb-8 bg-card border border-white/5">
          <TabsTrigger value="clubs" className="flex items-center gap-2 py-2">
            <Shield className="h-4 w-4" />
            <span className="font-bold">Ranking de Clubes</span>
          </TabsTrigger>
          <TabsTrigger value="players" className="flex items-center gap-2 py-2">
            <User className="h-4 w-4" />
            <span className="font-bold">Ranking de Jogadores</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clubs" className="space-y-6 animate-in fade-in duration-500">

      {/* Dynamic Header / My Stats Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main Card: Rank & Points */}
        <Card className="md:col-span-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Trophy className="w-32 h-32" />
          </div>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/20 p-2 rounded-xl">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Global Ranking</h3>
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl font-black italic tracking-tighter">#{myPosition || '—'}</span>
                      {variation !== 0 && (
                        <Badge variant={variation > 0 ? "default" : "destructive"} className="h-6 gap-1 animate-in fade-in zoom-in duration-500">
                          {variation > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {Math.abs(variation)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Pontos Atuais</p>
                    <p className="text-3xl font-bold text-primary">{me?.ranking_points || 0}</p>
                  </div>
                  <div className="h-10 w-px bg-border/50" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Desempenho</p>
                    {renderForm(me?.recent_form)}
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-[120px] bg-black/10 rounded-2xl p-4 border border-white/5">
                <p className="text-[10px] text-muted-foreground uppercase mb-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Evolução Recente
                </p>
                <div className="h-20 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-popover border border-border p-2 rounded-lg text-[10px] shadow-xl">
                                <p className="font-bold">{payload[0].value} pts</p>
                                <p className={payload[0].payload.delta >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                                  {payload[0].payload.delta >= 0 ? '+' : ''}{payload[0].payload.delta}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="points" 
                        stroke="var(--primary)" 
                        fillOpacity={1} 
                        fill="url(#colorPoints)" 
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Small Cards Column */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Sequência</p>
                <p className="text-2xl font-black italic">{me?.winning_streak || 0}V</p>
              </div>
              <Flame className={`h-8 w-8 ${me?.winning_streak && me.winning_streak >= 3 ? 'text-orange-500 animate-pulse' : 'text-muted-foreground/30'}`} />
            </CardContent>
          </Card>
          
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Títulos</p>
                <p className="text-2xl font-black italic">{me?.titles_count || 0}</p>
              </div>
              <Award className={`h-8 w-8 ${me?.titles_count && me.titles_count > 0 ? 'text-amber-500' : 'text-muted-foreground/30'}`} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Category Selectors */}
      <div className="flex flex-wrap gap-2">
        <Button 
          variant={category === 'global' ? "default" : "outline"} 
          size="sm" 
          onClick={() => setCategory('global')}
          className="rounded-full px-4 h-8 text-[10px] font-bold uppercase tracking-widest"
        >
          Mundial
        </Button>
        <Button 
          variant={category === 'seasonal' ? "default" : "outline"} 
          size="sm" 
          onClick={() => setCategory('seasonal')}
          className="rounded-full px-4 h-8 text-[10px] font-bold uppercase tracking-widest"
        >
          Temporada
        </Button>
        <Button 
          variant={category === 'offensive' ? "default" : "outline"} 
          size="sm" 
          onClick={() => setCategory('offensive')}
          className="rounded-full px-4 h-8 text-[10px] font-bold uppercase tracking-widest"
        >
          Ataque
        </Button>
        <Button 
          variant={category === 'defensive' ? "default" : "outline"} 
          size="sm" 
          onClick={() => setCategory('defensive')}
          className="rounded-full px-4 h-8 text-[10px] font-bold uppercase tracking-widest"
        >
          Defesa
        </Button>
      </div>

      {/* Global Ranking Table */}
      <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4 px-6 pt-6 flex flex-row items-center justify-between border-b border-white/5">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" /> 
              {category === 'global' ? 'Elite Mundial de Clubes' : 
               category === 'seasonal' ? 'Performance da Temporada' :
               category === 'offensive' ? 'Poder Ofensivo' : 'Solidez Defensiva'}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Ranking atualizado em tempo real baseado em clubes reais de jogadores</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchRankings} 
              disabled={loading} 
              className="h-9 px-3 gap-2 bg-background/50 border-white/10"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="py-3 px-6 text-left font-bold w-16">Pos</th>
                  <th className="py-3 px-2 text-left font-bold">Clube / Treinador</th>
                  <th className="py-3 px-4 text-center font-bold hidden md:table-cell">Reputação</th>
                  
                  <th className="py-3 px-4 text-right font-bold">
                    {category === 'offensive' ? 'Gols M.' : category === 'defensive' ? 'Gols S.' : 'Pontos'}
                  </th>
                  <th className="py-3 px-4 text-center font-bold hidden sm:table-cell">V/E/D</th>
                  <th className="py-3 px-6 text-right font-bold w-20">Var</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence mode="popLayout">
                  {rankings.map((entry, idx) => {
                    const pos = idx + 1;
                    const isMe = entry.user_id === userId;
                    const entryVar = entry.prev_position ? entry.prev_position - pos : 0;
                    
                    return (
                      <motion.tr
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.02, duration: 0.2 }}
                        key={entry.id}
                        className={`group transition-all duration-300 ${isMe ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/50'}`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            {pos <= 3 ? (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black italic shadow-lg
                                ${pos === 1 ? 'bg-gradient-to-br from-amber-300 to-amber-600 text-black' : 
                                  pos === 2 ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-black' : 
                                  'bg-gradient-to-br from-orange-400 to-orange-700 text-white'}`}>
                                {pos}
                              </div>
                            ) : (
                              <span className="text-sm font-bold text-muted-foreground ml-2">{pos}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div 
                            className="flex items-center gap-3 cursor-pointer group-hover:translate-x-1 transition-transform"
                            onClick={() => (window as any).dispatchEvent(new CustomEvent('flm:open-club-profile', { detail: { club_name: entry.club_name } }))}
                          >
                            <div className="relative">
                              <ClubShield club={entry.clubs as any} size={32} />
                              {isMe && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className={`text-sm font-bold truncate max-w-[120px] sm:max-w-[200px] ${isMe ? 'text-primary' : ''}`}>
                                {entry.club_name}
                              </span>
                              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground uppercase tracking-tight">
                                <Users className="h-2 w-2" /> 
                                <span className="truncate max-w-[80px]">{entry.coach_name || 'Desconhecido'}</span>
                                <span className="opacity-40">•</span>
                                <span>{entry.country || 'Inter.'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center hidden md:table-cell">
                          <Badge variant="outline" className="text-[10px] font-bold border-amber-500/20 text-amber-500">
                            ★ {entry.clubs?.reputation || 0}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-center hidden md:table-cell">
                          <div className="flex justify-center">
                            {renderForm(entry.recent_form)}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-sm font-black italic text-primary">
                            {category === 'offensive' ? entry.goals_for : category === 'defensive' ? entry.goals_against : entry.ranking_points}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center hidden sm:table-cell">
                          <div className="flex items-center justify-center gap-2 text-[10px] font-mono opacity-60">
                            <span className="text-emerald-500">{entry.wins}V</span>
                            <span className="text-amber-500">{entry.draws}E</span>
                            <span className="text-red-500">{entry.losses}D</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {entryVar !== 0 ? (
                            <div className={`flex items-center justify-end gap-1 font-bold text-xs ${entryVar > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {entryVar > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {Math.abs(entryVar)}
                            </div>
                          ) : (
                            <Minus className="h-3 w-3 text-muted-foreground/30 ml-auto" />
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-white/5 bg-background/50">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-bold flex items-center gap-2 text-primary">
                <Shield className="h-3.5 w-3.5" /> PESO DAS VITÓRIAS
              </p>
              <p className="text-[10px] text-muted-foreground">O ranking utiliza motor ELO. Ganhar de times com OVR maior rende bônus expressivos.</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold flex items-center gap-2 text-amber-500">
                <Trophy className="h-3.5 w-3.5" /> PESO DE COMPETIÇÃO
              </p>
              <p className="text-[10px] text-muted-foreground">Mundial (2.0x), Libertadores (1.6x), Liga (1.0x) e Amistosos (0.5x).</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold flex items-center gap-2 text-orange-500">
                <Flame className="h-3.5 w-3.5" /> MULTIPLICADORES
              </p>
              <p className="text-[10px] text-muted-foreground">Sequências de vitórias ativam multiplicadores de até 25% nos pontos ganhos.</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold flex items-center gap-2 text-emerald-500">
                <History className="h-3.5 w-3.5" /> DECAIMENTO
              </p>
              <p className="text-[10px] text-muted-foreground">Times inativos ou em má fase perdem reputação e posições gradualmente.</p>
            </div>
          </div>
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
