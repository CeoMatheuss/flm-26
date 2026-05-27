import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Star,
  Target,
  Award,
  Shield,
  User,
  Search,
  Crown,
  Sparkles,
  TrendingUp,
  Medal,
  Flame,
  Tag,
  Handshake,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { RankingScoringInfo } from './RankingScoringInfo';

type Category = 'global' | 'scorers' | 'assists' | 'goalkeepers' | 'youth';

const GK_POSITIONS = ['Goleiro', 'GOL', 'GK'];
const isGoalkeeper = (pos?: string | null) => !!pos && GK_POSITIONS.includes(pos);

interface Row {
  id: string;
  player_id: string;
  ranking_points: number;
  total_goals: number;
  total_assists: number;
  total_clean_sheets: number;
  penalties_saved: number;
  avg_rating: number;
  players: {
    id: string;
    name: string;
    position: string;
    overall: number;
    age: number;
    nationality: string;
    clubs?: { name: string; logo: string | null } | null;
  } | null;
}

const CATEGORIES: { id: Category; label: string; short: string; icon: any }[] = [
  { id: 'global', label: 'Geral', short: 'Geral', icon: Star },
  { id: 'scorers', label: 'Artilheiros', short: 'Gols', icon: Target },
  { id: 'assists', label: 'Assistências', short: 'Assist.', icon: Award },
  { id: 'goalkeepers', label: 'Goleiros', short: 'GK', icon: Shield },
  { id: 'youth', label: 'Jovens Talentos', short: 'Jovens', icon: Sparkles },
];

export function PlayerRankingTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('global');

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('global_player_ranking')
      .select(`
        id, player_id, ranking_points, total_goals, total_assists,
        total_clean_sheets, penalties_saved, avg_rating,
        players:world_players (
          id, name, position, overall, age, nationality,
          clubs:world_teams ( name, logo )
        )
      `)
      .order('ranking_points', { ascending: false })
      .limit(500);

    if (error) console.error('[PlayerRanking] fetch error:', error);
    setRows((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('player-ranking-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'global_player_ranking' },
        () => fetchData()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const list = useMemo(() => {
    let filtered = rows.filter((r) => r.players);

    if (category === 'goalkeepers') {
      filtered = filtered.filter((r) => isGoalkeeper(r.players?.position));
    } else if (category === 'youth') {
      filtered = filtered.filter((r) => (r.players?.age ?? 99) <= 21);
    } else if (category !== 'global') {
      filtered = filtered.filter((r) => !isGoalkeeper(r.players?.position));
    }

    const sorted = [...filtered];
    if (category === 'scorers') {
      sorted.sort(
        (a, b) =>
          b.total_goals - a.total_goals ||
          b.total_assists - a.total_assists ||
          Number(b.avg_rating) - Number(a.avg_rating)
      );
    } else if (category === 'assists') {
      sorted.sort(
        (a, b) =>
          b.total_assists - a.total_assists ||
          b.total_goals - a.total_goals ||
          Number(b.avg_rating) - Number(a.avg_rating)
      );
    } else if (category === 'goalkeepers') {
      sorted.sort(
        (a, b) =>
          Number(b.ranking_points) - Number(a.ranking_points) ||
          Number(b.avg_rating) - Number(a.avg_rating) ||
          b.total_clean_sheets - a.total_clean_sheets ||
          b.penalties_saved - a.penalties_saved
      );
    } else if (category === 'youth') {
      sorted.sort(
        (a, b) =>
          (b.players?.overall ?? 0) - (a.players?.overall ?? 0) ||
          Number(b.ranking_points) - Number(a.ranking_points)
      );
    } else {
      sorted.sort(
        (a, b) =>
          Number(b.ranking_points) - Number(a.ranking_points) ||
          Number(b.avg_rating) - Number(a.avg_rating) ||
          b.total_goals - a.total_goals ||
          b.total_assists - a.total_assists
      );
    }

    const term = search.toLowerCase().trim();
    if (term) {
      return sorted.filter(
        (r) =>
          (r.players?.name || '').toLowerCase().includes(term) ||
          (r.players?.clubs?.name || '').toLowerCase().includes(term)
      );
    }
    return sorted;
  }, [rows, category, search]);

  const primaryStat = (r: Row) => {
    if (category === 'scorers') return { label: 'Gols', value: r.total_goals };
    if (category === 'assists') return { label: 'Assist.', value: r.total_assists };
    if (category === 'goalkeepers') return { label: 'Pên. Def.', value: r.penalties_saved };
    if (category === 'youth') return { label: 'OVR', value: r.players?.overall ?? 0 };
    return { label: 'Pts', value: Math.round(Number(r.ranking_points)) };
  };

  const top3 = list.slice(0, 3);
  const rest = list.slice(3, 200);

  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean) as Row[]; // 2 - 1 - 3

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="sticky top-0 z-10 -mx-1 px-1 pb-1">
        <div className="flex flex-col gap-3 bg-gradient-to-br from-card via-card to-card/80 p-3 rounded-2xl border border-white/10 shadow-lg backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar jogador ou clube..."
                className="pl-9 h-10 bg-background/60 border-white/10 text-sm rounded-xl focus-visible:ring-primary/40"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <RankingScoringInfo mode="players" className="self-start sm:self-auto" />
            <Tabs
              value={category}
              onValueChange={(v) => setCategory(v as Category)}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid grid-cols-5 w-full sm:w-auto bg-background/40 border border-white/10 h-10 rounded-xl p-1">
                {CATEGORIES.map((c) => {
                  const Icon = c.icon;
                  return (
                    <TabsTrigger
                      key={c.id}
                      value={c.id}
                      className="text-[10px] uppercase font-bold gap-1.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">{c.short}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Podium TOP 3 */}
      {!loading && podiumOrder.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {podiumOrder.map((r) => {
            const realPos = list.indexOf(r) + 1;
            const stat = primaryStat(r);
            const p = r.players!;
            const tier =
              realPos === 1
                ? {
                    border: 'border-amber-400/40',
                    ring: 'ring-amber-400/30',
                    grad: 'from-amber-500/20 via-amber-500/5 to-transparent',
                    text: 'text-amber-400',
                    badge: 'bg-gradient-to-br from-amber-300 to-amber-600 text-black',
                    glow: 'shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)]',
                    h: 'sm:mt-0 mt-0',
                  }
                : realPos === 2
                ? {
                    border: 'border-slate-300/30',
                    ring: 'ring-slate-300/20',
                    grad: 'from-slate-300/15 via-slate-300/5 to-transparent',
                    text: 'text-slate-300',
                    badge: 'bg-gradient-to-br from-slate-200 to-slate-400 text-black',
                    glow: 'shadow-[0_0_30px_-12px_rgba(203,213,225,0.4)]',
                    h: 'sm:mt-6',
                  }
                : {
                    border: 'border-orange-500/30',
                    ring: 'ring-orange-500/20',
                    grad: 'from-orange-500/15 via-orange-500/5 to-transparent',
                    text: 'text-orange-400',
                    badge: 'bg-gradient-to-br from-orange-400 to-orange-700 text-white',
                    glow: 'shadow-[0_0_30px_-12px_rgba(249,115,22,0.4)]',
                    h: 'sm:mt-10',
                  };

            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: realPos * 0.05 }}
                className={tier.h}
              >
                <Card
                  className={`relative overflow-hidden border ${tier.border} bg-gradient-to-b ${tier.grad} ${tier.glow} transition-transform hover:-translate-y-1 hover:scale-[1.02] duration-300 group cursor-default`}
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${
                      realPos === 1
                        ? 'from-amber-500 to-amber-300'
                        : realPos === 2
                        ? 'from-slate-400 to-slate-200'
                        : 'from-orange-600 to-orange-400'
                    }`}
                  />
                  <CardContent className="p-3 sm:p-5 flex flex-col items-center text-center">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black italic text-sm shadow-lg ${tier.badge} ring-2 ring-background mb-2 sm:mb-3`}
                    >
                      {realPos === 1 ? <Crown className="w-4 h-4 sm:w-5 sm:h-5" /> : realPos}
                    </div>

                    <div
                      className={`relative w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-background to-background/60 border ${tier.border} flex items-center justify-center mb-2 sm:mb-3 ring-2 ${tier.ring} ring-offset-2 ring-offset-card group-hover:rotate-3 transition-transform`}
                    >
                      <User className={`w-8 h-8 sm:w-10 sm:h-10 ${tier.text} opacity-80`} />
                      <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground border-0 text-[9px] sm:text-[10px] font-black px-1.5 py-0">
                        {p.overall}
                      </Badge>
                    </div>

                    <p className="text-xs sm:text-sm font-bold truncate w-full mt-1" title={p.name}>
                      {p.name}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate w-full uppercase tracking-wide">
                      {p.position} • {p.clubs?.name || 'Sem clube'}
                    </p>

                    <div className="mt-2 sm:mt-3 flex items-baseline gap-1">
                      <span className={`text-lg sm:text-2xl font-black italic tabular-nums ${tier.text}`}>
                        {stat.value}
                      </span>
                      <span className="text-[9px] sm:text-[10px] uppercase text-muted-foreground font-bold">
                        {stat.label}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-[9px] sm:text-[10px] text-emerald-400 font-bold">
                      <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-emerald-400" />
                      {Number(r.avg_rating).toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Lista principal */}
      <Card className="border-white/5 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-sm overflow-hidden shadow-xl">
        <CardContent className="p-0">
          {loading && rows.length === 0 ? (
            <div className="divide-y divide-white/5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-muted/40" />
                  <div className="w-10 h-10 rounded-lg bg-muted/40" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted/40 rounded w-1/3" />
                    <div className="h-2 bg-muted/30 rounded w-1/4" />
                  </div>
                  <div className="w-10 h-6 bg-muted/40 rounded" />
                </div>
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nenhum jogador encontrado.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {rest.map((r, idx) => {
                  const pos = idx + 4;
                  const stat = primaryStat(r);
                  const p = r.players!;
                  const isYoung = (p.age ?? 99) <= 21;
                  const isHot = Number(r.avg_rating) >= 7.5;

                  return (
                    <motion.li
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ delay: Math.min(idx * 0.008, 0.15), duration: 0.18 }}
                      key={r.id}
                      className="group flex items-center gap-3 px-3 sm:px-5 py-3 hover:bg-primary/[0.04] transition-all duration-200 relative"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-center" />

                      <div className="w-9 flex-shrink-0 flex items-center justify-center">
                        <span className="text-xs font-black text-muted-foreground tabular-nums group-hover:text-primary transition-colors">
                          {pos}
                        </span>
                      </div>

                      <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-background/80 to-background/40 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:border-primary/30 transition-colors">
                        <User className="w-5 h-5 text-muted-foreground/60" />
                        <Badge className="absolute -bottom-1 -right-1 h-4 min-w-[18px] px-1 text-[9px] font-black bg-primary text-primary-foreground border-2 border-card rounded-md">
                          {p.overall}
                        </Badge>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold truncate">{p.name}</p>
                          {isYoung && (
                            <Sparkles className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                          )}
                          {isHot && <Flame className="h-3 w-3 text-orange-400 flex-shrink-0" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wide">
                          {p.position} • {p.clubs?.name || 'Sem clube'}
                        </p>
                      </div>

                      <div className="hidden md:flex flex-col items-end w-14">
                        <span className="text-[9px] text-muted-foreground uppercase">Nota</span>
                        <span className="text-xs font-bold text-emerald-400 tabular-nums">
                          {Number(r.avg_rating).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex flex-col items-end w-16">
                        <span className="text-[9px] text-muted-foreground uppercase">
                          {stat.label}
                        </span>
                        <span className="text-base font-black italic text-primary tabular-nums">
                          {stat.value}
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
    </div>
  );
}
