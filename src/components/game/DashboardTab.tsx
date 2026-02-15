import { Club } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, DollarSign, Star, Target, Shield, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import fcmLogo from '@/assets/fcm26-logo.png';

interface Props {
  club: Club;
}

export function DashboardTab({ club }: Props) {
  const nextMatch = club.matches.find(m => !m.played);
  const totalGames = club.stats.wins + club.stats.draws + club.stats.losses;
  const winRate = totalGames > 0 ? Math.round((club.stats.wins / totalGames) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Orçamento', value: `R$ ${(club.budget / 1000000).toFixed(1)}M`, icon: DollarSign, accent: 'bg-primary/10 border-primary/20' },
          { label: 'Torcida', value: club.fans.toLocaleString(), icon: Users, accent: 'bg-accent border-border' },
          { label: 'Pontos', value: club.stats.points.toString(), icon: Trophy, accent: 'bg-accent border-border' },
          { label: 'Reputação', value: `${club.reputation}/100`, icon: Star, accent: 'bg-accent border-border' },
          { label: 'Aproveitamento', value: `${winRate}%`, icon: TrendingUp, accent: 'bg-accent border-border' },
        ].map(item => (
          <Card key={item.label} className={`${item.accent}`}>
            <CardContent className="p-3 flex items-center gap-2">
              <item.icon className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
                <p className="text-sm font-bold truncate">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" /> Desempenho na Temporada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {totalGames > 0 ? (
              <>
                <div className="flex gap-4 text-sm font-mono">
                  <span className="text-emerald-400">{club.stats.wins}V</span>
                  <span className="text-primary">{club.stats.draws}E</span>
                  <span className="text-destructive">{club.stats.losses}D</span>
                  <span className="text-muted-foreground ml-auto">{totalGames} jogos</span>
                </div>
                <div className="flex gap-0.5 h-2 rounded overflow-hidden">
                  {club.stats.wins > 0 && <div className="bg-emerald-500" style={{ flex: club.stats.wins }} />}
                  {club.stats.draws > 0 && <div className="bg-primary" style={{ flex: club.stats.draws }} />}
                  {club.stats.losses > 0 && <div className="bg-destructive" style={{ flex: club.stats.losses }} />}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-muted/30 rounded p-2 text-center">
                    <p className="text-xl font-bold text-emerald-400">{club.stats.goalsFor}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Gols Pró</p>
                  </div>
                  <div className="bg-muted/30 rounded p-2 text-center">
                    <p className="text-xl font-bold text-destructive">{club.stats.goalsAgainst}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Gols Contra</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum jogo disputado ainda</p>
            )}
          </CardContent>
        </Card>

        {/* Next Match */}
        {nextMatch ? (
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" /> Próximo Jogo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-2">
                <div className="text-center flex-1">
                  <img src={fcmLogo} alt="FCM" className="w-10 h-10 mx-auto mb-1 rounded" />
                  <p className="font-bold text-sm">{club.name}</p>
                </div>
                <div className="text-center px-4">
                  <p className="text-[10px] text-muted-foreground uppercase">{nextMatch.date}</p>
                  <p className="text-lg font-bold text-muted-foreground">VS</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-3xl mb-1">{nextMatch.opponentLogo}</p>
                  <p className="font-bold text-sm">{nextMatch.opponent}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-primary/20">
            <CardContent className="p-6 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-bold">Temporada Encerrada!</p>
              <p className="text-sm text-muted-foreground">Vá até Temporada para iniciar a próxima</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Players */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Melhores do Elenco</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...club.players].sort((a, b) => b.overall - a.overall).slice(0, 5).map((player, i) => (
              <div key={player.id} className="flex items-center gap-2 py-1">
                <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                <span className="text-[10px] font-mono bg-primary/15 text-primary px-1.5 py-0.5 rounded">{player.position}</span>
                <span className="flex-1 text-sm font-medium">{player.name}</span>
                <span className="text-xs text-muted-foreground">{player.age}a</span>
                <span className="text-sm font-bold w-8 text-right">{player.overall}</span>
                <Progress value={player.overall} className="w-16 h-1.5" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
