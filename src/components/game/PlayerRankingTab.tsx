import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Star, Trophy, TrendingUp, TrendingDown, Minus, 
  Target, Award, Shield, User, Globe, Search,
  Zap, Flame, Crown, Filter, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PlayerRankingEntry {
  id: string;
  player_id: string;
  ranking_points: number;
  reputation_score: number;
  reputation_level: string;
  current_position: number;
  prev_position: number;
  position_rank?: number;
  total_goals: number;
  total_assists: number;
  total_clean_sheets?: number;
  avg_rating: number;
  mvp_count?: number;
  seasonal_points?: number;
  last_update?: string;
  players: {
    id: string;
    name: string;
    position: string;
    overall: number;
    potential: number;
    age: number;
    market_value: number;
    nationality: string;
    squad_status: string;
    clubs?: {
      club_name: string;
      logo_url: string | null;
      shield_config: any;
    } | null;
  };
}







export function PlayerRankingTab() {
  const [rankings, setRankings] = useState<PlayerRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('global');
  const [positionFilter, setPositionFilter] = useState('all');

  const fetchPlayerRankings = async () => {
    setLoading(true);
    try {
      // Primeiro, tentamos buscar no ranking global persistido
      let query = supabase
        .from('global_player_ranking')
        .select(`
          *,
          players:world_players (
            id,
            name,
            position,
            overall,
            potential,
            age,
            market_value,
            nationality,
            squad_status,
            clubs:world_teams (
              name,
              logo_url,
              shield_config
            )
          )
        `);

      if (category === 'promising') {
        query = query.order('ranking_points', { ascending: false }).filter('players.age', 'lte', 21);
      } else {
        query = query.order('ranking_points', { ascending: false });
      }

      const { data: rankingData, error: rankingError } = await query.limit(100);

      // Se houver erro ou poucos dados, complementamos com jogadores reais do world_players
      // para garantir que "todos os jogadores reais" apareçam
      let finalData = rankingData || [];

      if (rankingError || finalData.length < 50) {
        // Busca jogadores com maior overall que podem ainda não estar no ranking persistido
        const { data: allPlayers } = await supabase
          .from('world_players')
          .select(`
            id,
            name,
            position,
            overall,
            potential,
            age,
            market_value,
            nationality,
            squad_status,
            reputation,
            clubs:world_teams (
              name,
              logo_url,
              shield_config
            )
          `)
          .order('overall', { ascending: false })
          .limit(100);

        if (allPlayers) {
          // Mapeia para o formato do ranking se não existir no rankingData
          const existingPlayerIds = new Set(finalData.map(r => r.player_id || r.id));
          
          const missingPlayers = allPlayers
            .filter(p => !existingPlayerIds.has(p.id))
            .map(p => ({
              id: p.id,
              player_id: p.id,
              ranking_points: p.overall * 10, // Pontuação baseada em overall como fallback
              reputation_score: p.reputation || 50,
              reputation_level: p.reputation >= 90 ? 'Mundial' : p.reputation >= 75 ? 'Continental' : 'Nacional',
              current_position: 0,
              prev_position: 0,
              total_goals: 0,
              total_assists: 0,
              avg_rating: 6.0,
              players: {
                ...p,
                clubs: p.clubs ? { 
                  club_name: (p.clubs as any).name, 
                  logo_url: (p.clubs as any).logo_url, 
                  shield_config: (p.clubs as any).shield_config 
                } : null
              }
            }));
          
          finalData = [...finalData, ...missingPlayers].sort((a, b) => b.ranking_points - a.ranking_points);
        }
      }

      setRankings(finalData as any[]);
    } catch (error) {
      console.error('Error fetching player rankings:', error);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchPlayerRankings();
  }, [category]);

  const filteredRankings = useMemo(() => {
    return rankings.filter(entry => {
      const matchesSearch = entry.players.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            entry.players.clubs?.club_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === 'all' || entry.players.position.includes(positionFilter);
      return matchesSearch && matchesPosition;
    });
  }, [rankings, searchTerm, positionFilter]);

  const topPlayers = useMemo(() => filteredRankings.slice(0, 3), [filteredRankings]);
  const otherPlayers = useMemo(() => filteredRankings.slice(3), [filteredRankings]);

  const getReputationColor = (level: string) => {
    switch (level) {
      case 'Mundial': return 'text-amber-500 border-amber-500/20 bg-amber-500/10';
      case 'Continental': return 'text-blue-500 border-blue-500/20 bg-blue-500/10';
      case 'Nacional': return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10';
      default: return 'text-slate-500 border-slate-500/20 bg-slate-500/10';
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `€${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
    return `€${value}`;
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/50 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar jogador ou clube..." 
            className="pl-10 bg-background/50 border-white/10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center justify-center">
          <Tabs value={category} onValueChange={setCategory} className="bg-background/30 p-1 rounded-lg border border-white/5">
            <TabsList className="bg-transparent h-8">
              <TabsTrigger value="global" className="text-[10px] uppercase font-bold px-3">Geral</TabsTrigger>
              <TabsTrigger value="seasonal" className="text-[10px] uppercase font-bold px-3">Temporada</TabsTrigger>
              <TabsTrigger value="promising" className="text-[10px] uppercase font-bold px-3">Promessas</TabsTrigger>
              <TabsTrigger value="valuable" className="text-[10px] uppercase font-bold px-3">Valiosos</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <select 
            className="h-8 bg-background/50 border border-white/10 rounded-lg px-2 text-[10px] font-bold uppercase outline-none focus:ring-1 ring-primary"
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
          >
            <option value="all">Todas Posições</option>
            <option value="Goleiro">Goleiros</option>
            <option value="Zagueiro">Zagueiros</option>
            <option value="Meia">Meias</option>
            <option value="Atacante">Atacantes</option>
          </select>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {topPlayers.map((entry, idx) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className={`relative overflow-hidden border-2 transition-all duration-500 hover:scale-105 group
              ${idx === 0 ? 'border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]' : 
                idx === 1 ? 'border-slate-400/50' : 'border-orange-700/50'}`}>
              
              {/* Card Background Effects */}
              <div className={`absolute inset-0 opacity-10 pointer-events-none bg-gradient-to-br
                ${idx === 0 ? 'from-amber-500 to-transparent' : 
                  idx === 1 ? 'from-slate-400 to-transparent' : 'from-orange-700 to-transparent'}`} />
              
              <CardContent className="p-6 relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Rank #{idx + 1}</span>
                    <Badge className={`${getReputationColor(entry.reputation_level)} font-black text-[10px]`}>
                      {entry.reputation_level}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black italic text-primary drop-shadow-sm">{entry.players.overall}</div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Overall</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center overflow-hidden relative group-hover:rotate-3 transition-transform">
                    <User className="w-10 h-10 text-muted-foreground/50" />
                    {/* Placeholder for real photos if available */}
                    <div className="absolute bottom-0 right-0 bg-primary w-6 h-6 flex items-center justify-center rounded-tl-lg">
                      <Star className="w-3 h-3 text-black fill-black" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold truncate group-hover:text-primary transition-colors">{entry.players.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="w-3 h-3" /> {entry.players.nationality}
                      <span className="opacity-30">•</span>
                      <span>{entry.players.position}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                    <div className="text-[10px] text-muted-foreground uppercase mb-1">Gols/Assists</div>
                    <div className="text-sm font-bold">{entry.total_goals}/{entry.total_assists}</div>
                  </div>
                  <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                    <div className="text-[10px] text-muted-foreground uppercase mb-1">Nota Média</div>
                    <div className="text-sm font-bold text-emerald-500">{Number(entry.avg_rating).toFixed(2)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase">Valor de Mercado</div>
                    <div className="font-black text-amber-500">{formatCurrency(entry.players.market_value)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground uppercase">Points</div>
                    <div className="font-black italic">{Math.round(entry.ranking_points)}</div>
                  </div>
                </div>
              </CardContent>
              
              {/* Achievement Badge for #1 */}
              {idx === 0 && (
                <div className="absolute -top-1 -right-1 bg-amber-500 p-2 rounded-bl-2xl shadow-lg">
                  <Crown className="w-5 h-5 text-black" />
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Table */}
      <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="py-4 px-6 text-left font-bold w-16">Pos</th>
                  <th className="py-4 px-2 text-left font-bold">Jogador</th>
                  <th className="py-4 px-4 text-center font-bold">Ovr</th>
                  <th className="py-4 px-4 text-center font-bold hidden md:table-cell">Reputação</th>
                  <th className="py-4 px-4 text-center font-bold hidden sm:table-cell">G / A / CS</th>
                  <th className="py-4 px-4 text-center font-bold">Rating</th>
                  <th className="py-4 px-4 text-right font-bold">Points</th>
                  <th className="py-4 px-6 text-right font-bold w-20">Var</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence mode="popLayout">
                  {otherPlayers.map((entry, idx) => {
                    const pos = idx + 4;
                    const variation = entry.prev_position ? entry.prev_position - pos : 0;
                    
                    return (
                      <motion.tr
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        key={entry.id}
                        className="hover:bg-muted/30 group transition-all duration-200"
                      >
                        <td className="py-4 px-6">
                          <span className="text-sm font-black italic text-muted-foreground group-hover:text-primary transition-colors">
                            #{pos}
                          </span>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform overflow-hidden relative">
                              <User className="w-6 h-6 text-muted-foreground/30" />
                              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold">{entry.players.name}</span>
                              <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                                {entry.players.position} • {entry.players.age} anos
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Badge variant="outline" className="font-bold border-primary/20 text-primary bg-primary/5">
                            {entry.players.overall}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-center hidden md:table-cell">
                          <Badge className={`${getReputationColor(entry.reputation_level)} text-[9px] border px-2 py-0.5`}>
                            {entry.reputation_level}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-center hidden sm:table-cell">
                          <div className="flex items-center justify-center gap-2 text-xs font-medium">
                            <span title="Gols" className="text-emerald-500">{entry.total_goals}</span>
                            <span className="opacity-20">/</span>
                            <span title="Assistências" className="text-blue-500">{entry.total_assists}</span>
                            <span className="opacity-20">/</span>
                            <span title="Clean Sheets" className="text-amber-500">{entry.total_clean_sheets}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className={`text-sm font-black ${entry.avg_rating >= 7 ? 'text-emerald-500' : 'text-amber-500'}`}>
                              {Number(entry.avg_rating).toFixed(2)}
                            </span>
                            {entry.mvp_count > 0 && (
                              <Badge className="bg-amber-500/20 text-amber-500 text-[8px] px-1 py-0 h-4" variant="outline">
                                <Zap className="w-2 h-2 mr-0.5 fill-amber-500" /> {entry.mvp_count}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-black italic">{Math.round(entry.ranking_points)}</span>
                            <span className="text-[9px] text-muted-foreground uppercase">{formatCurrency(entry.players.market_value)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end">
                            {variation > 0 ? (
                              <div className="flex items-center text-emerald-500 gap-0.5 animate-bounce-slow">
                                <TrendingUp className="h-3 w-3" />
                                <span className="text-[10px] font-bold">{variation}</span>
                              </div>
                            ) : variation < 0 ? (
                              <div className="flex items-center text-red-500 gap-0.5">
                                <TrendingDown className="h-3 w-3" />
                                <span className="text-[10px] font-bold">{Math.abs(variation)}</span>
                              </div>
                            ) : (
                              <Minus className="h-3 w-3 text-muted-foreground/30" />
                            )}
                          </div>
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
      
      {/* Footer Info */}
      <div className="text-center pb-10">
        <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
          O ranking é atualizado em tempo real após cada partida, considerando desempenho individual, dificuldade da competição e importância dos gols. Jogadores com mais de 35 anos perdem reputação gradualmente se não mantiverem média alta.
        </p>
      </div>
    </div>
  );
}
