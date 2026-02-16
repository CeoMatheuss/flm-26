import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Trophy, Swords, Shield, Star, Flame, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface RankingHistory {
  season: number;
  endRating: number;
  position: number;
  change: number;
}

interface Props {
  rating: number;
  rankingHistory: RankingHistory[];
  clubName: string;
  stats: { wins: number; draws: number; losses: number };
  season: number;
}

function getRankTier(rating: number): { name: string; color: string; icon: string; min: number; max: number } {
  if (rating >= 2000) return { name: 'Lendário', color: 'text-amber-400', icon: '👑', min: 2000, max: 2500 };
  if (rating >= 1700) return { name: 'Elite', color: 'text-purple-400', icon: '💎', min: 1700, max: 2000 };
  if (rating >= 1400) return { name: 'Ouro', color: 'text-yellow-400', icon: '🥇', min: 1400, max: 1700 };
  if (rating >= 1100) return { name: 'Prata', color: 'text-slate-300', icon: '🥈', min: 1100, max: 1400 };
  if (rating >= 800) return { name: 'Bronze', color: 'text-orange-400', icon: '🥉', min: 800, max: 1100 };
  return { name: 'Ferro', color: 'text-gray-400', icon: '⚙️', min: 500, max: 800 };
}

export function RankingTab({ rating, rankingHistory, clubName, stats, season }: Props) {
  const tier = getRankTier(rating);
  const progress = Math.min(100, Math.max(0, ((rating - tier.min) / (tier.max - tier.min)) * 100));
  const totalGames = stats.wins + stats.draws + stats.losses;
  const winRate = totalGames > 0 ? Math.round((stats.wins / totalGames) * 100) : 0;

  // Last season change
  const lastHistory = rankingHistory.length > 0 ? rankingHistory[rankingHistory.length - 1] : null;

  return (
    <div className="space-y-4">
      {/* Rating Card */}
      <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">Ranking Online</p>
              <h2 className="text-3xl sm:text-4xl font-bold">{rating}</h2>
              <p className={`text-sm font-semibold ${tier.color} flex items-center gap-1`}>
                {tier.icon} {tier.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Temporada {season}</p>
              <p className="text-sm font-bold">{clubName}</p>
              {lastHistory && (
                <div className={`flex items-center gap-1 text-xs mt-1 ${lastHistory.change >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>
                  {lastHistory.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {lastHistory.change >= 0 ? '+' : ''}{lastHistory.change} última temporada
                </div>
              )}
            </div>
          </div>

          {/* Tier Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{tier.min}</span>
              <span>Próximo tier: {tier.max}</span>
            </div>
            <Progress value={progress} className="h-2" />
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
              <p className="text-[10px] text-muted-foreground">+20 pts</p>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 text-center">
              <Minus className="h-4 w-4 mx-auto text-primary mb-1" />
              <p className="text-xs font-bold text-primary">Empate</p>
              <p className="text-[10px] text-muted-foreground">+5 pts</p>
            </div>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2 text-center">
              <TrendingDown className="h-4 w-4 mx-auto text-destructive mb-1" />
              <p className="text-xs font-bold text-destructive">Derrota</p>
              <p className="text-[10px] text-muted-foreground">−15 pts</p>
            </div>
          </div>

          <div className="text-[10px] sm:text-xs text-muted-foreground space-y-1 mt-2">
            <p className="flex items-center gap-1"><Swords className="h-3 w-3" /> <strong>Adversário forte:</strong> ganhar vale mais, perder dói menos</p>
            <p className="flex items-center gap-1"><Shield className="h-3 w-3" /> <strong>Adversário fraco:</strong> ganhar vale menos, perder dói mais</p>
            <p className="flex items-center gap-1"><Star className="h-3 w-3" /> <strong>Campeão:</strong> +10% ao final da temporada</p>
            <p className="flex items-center gap-1"><Flame className="h-3 w-3" /> <strong>Rebaixado:</strong> −20% ao final da temporada</p>
          </div>
        </CardContent>
      </Card>

      {/* Current Season Stats */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground">Temporada Atual</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {totalGames > 0 ? (
            <div className="space-y-3">
              <div className="flex gap-4 text-sm font-mono justify-center">
                <span className="text-emerald-400">{stats.wins}V</span>
                <span className="text-primary">{stats.draws}E</span>
                <span className="text-destructive">{stats.losses}D</span>
                <span className="text-muted-foreground">{totalGames} jogos</span>
              </div>
              <div className="flex gap-0.5 h-2 rounded overflow-hidden">
                {stats.wins > 0 && <div className="bg-emerald-500" style={{ flex: stats.wins }} />}
                {stats.draws > 0 && <div className="bg-primary" style={{ flex: stats.draws }} />}
                {stats.losses > 0 && <div className="bg-destructive" style={{ flex: stats.losses }} />}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Aproveitamento: <span className="font-bold text-foreground">{winRate}%</span>
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum jogo disputado ainda</p>
          )}
        </CardContent>
      </Card>

      {/* Ranking History */}
      {rankingHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground">Histórico de Ranking</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {[...rankingHistory].reverse().map((h, i) => {
                const hTier = getRankTier(h.endRating);
                return (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5">{`T${h.season}`}</Badge>
                      <span className="text-xs">{h.position}º lugar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] ${hTier.color}`}>{hTier.icon}</span>
                      <span className="text-sm font-bold">{h.endRating}</span>
                      <span className={`text-[10px] font-mono ${h.change >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>
                        {h.change >= 0 ? '+' : ''}{h.change}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tier Legend */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground">Tiers do Ranking</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { name: 'Ferro', icon: '⚙️', range: '500-799', color: 'text-gray-400' },
              { name: 'Bronze', icon: '🥉', range: '800-1099', color: 'text-orange-400' },
              { name: 'Prata', icon: '🥈', range: '1100-1399', color: 'text-slate-300' },
              { name: 'Ouro', icon: '🥇', range: '1400-1699', color: 'text-yellow-400' },
              { name: 'Elite', icon: '💎', range: '1700-1999', color: 'text-purple-400' },
              { name: 'Lendário', icon: '👑', range: '2000+', color: 'text-amber-400' },
            ].map(t => (
              <div key={t.name} className={`flex items-center gap-2 p-2 rounded bg-muted/30 ${rating >= parseInt(t.range) ? 'ring-1 ring-primary/30' : ''}`}>
                <span className="text-sm">{t.icon}</span>
                <div>
                  <p className={`text-xs font-bold ${t.color}`}>{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.range}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
