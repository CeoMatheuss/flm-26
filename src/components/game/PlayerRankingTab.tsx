import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Target, Award, Shield, User, Search, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

type Category = 'global' | 'scorers' | 'assists' | 'goalkeepers';

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_player_ranking' }, () => {
        fetchData();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const list = useMemo(() => {
    let filtered = rows.filter((r) => r.players); // só jogadores válidos

    // Filtro de categoria
    if (category === 'goalkeepers') {
      filtered = filtered.filter((r) => r.players?.position === 'Goleiro');
    } else if (category !== 'global') {
      filtered = filtered.filter((r) => r.players?.position !== 'Goleiro');
    }

    // Ordenação + critérios de desempate
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
    } else {
      sorted.sort(
        (a, b) =>
          Number(b.ranking_points) - Number(a.ranking_points) ||
          Number(b.avg_rating) - Number(a.avg_rating) ||
          b.total_goals - a.total_goals ||
          b.total_assists - a.total_assists
      );
    }

    // Busca
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
    if (category === 'goalkeepers')
      return { label: 'Pên. Def.', value: r.penalties_saved };
    return { label: 'Pts', value: Math.round(Number(r.ranking_points)) };
  };

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card/50 p-3 rounded-xl border border-white/5">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar jogador ou clube..."
            className="pl-9 h-9 bg-background/50 border-white/10 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs value={category} onValueChange={(v) => setCategory(v as Category)} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto bg-background/30 border border-white/5 h-9">
            <TabsTrigger value="global" className="text-[10px] uppercase font-bold gap-1">
              <Star className="h-3 w-3" /> <span className="hidden sm:inline">Geral</span>
            </TabsTrigger>
            <TabsTrigger value="scorers" className="text-[10px] uppercase font-bold gap-1">
              <Target className="h-3 w-3" /> <span className="hidden sm:inline">Artilheiros</span>
            </TabsTrigger>
            <TabsTrigger value="assists" className="text-[10px] uppercase font-bold gap-1">
              <Award className="h-3 w-3" /> <span className="hidden sm:inline">Assist.</span>
            </TabsTrigger>
            <TabsTrigger value="goalkeepers" className="text-[10px] uppercase font-bold gap-1">
              <Shield className="h-3 w-3" /> <span className="hidden sm:inline">Goleiros</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Lista */}
      <Card className="border-white/5 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          {loading && rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : list.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Nenhum jogador encontrado.</div>
          ) : (
            <ul className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {list.slice(0, 200).map((r, idx) => {
                  const pos = idx + 1;
                  const stat = primaryStat(r);
                  const p = r.players!;
                  return (
                    <motion.li
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ delay: Math.min(idx * 0.01, 0.2), duration: 0.18 }}
                      key={r.id}
                      className="flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      {/* Posição */}
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
                            {pos === 1 ? <Crown className="w-4 h-4" /> : pos}
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">{pos}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-lg bg-background/60 border border-white/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-muted-foreground/50" />
                      </div>

                      {/* Nome + clube */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wide">
                          {p.position} • {p.clubs?.name || 'Sem clube'}
                        </p>
                      </div>

                      {/* OVR */}
                      <Badge
                        variant="outline"
                        className="hidden sm:flex font-bold border-primary/20 text-primary bg-primary/5 h-6"
                      >
                        {p.overall}
                      </Badge>

                      {/* Nota média */}
                      <div className="hidden md:flex flex-col items-end w-14">
                        <span className="text-[9px] text-muted-foreground uppercase">Nota</span>
                        <span className="text-xs font-bold text-emerald-500 tabular-nums">
                          {Number(r.avg_rating).toFixed(2)}
                        </span>
                      </div>

                      {/* Estatística principal */}
                      <div className="flex flex-col items-end w-16">
                        <span className="text-[9px] text-muted-foreground uppercase">{stat.label}</span>
                        <span className="text-base font-black italic text-primary tabular-nums">{stat.value}</span>
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
