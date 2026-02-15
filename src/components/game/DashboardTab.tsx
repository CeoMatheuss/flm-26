import { Club } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, DollarSign, Star, Target, Shield } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Props {
  club: Club;
}

export function DashboardTab({ club }: Props) {
  const nextMatch = club.matches.find(m => !m.played);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Orçamento</p>
              <p className="text-lg font-bold">R$ {(club.budget / 1000000).toFixed(1)}M</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Torcida</p>
              <p className="text-lg font-bold">{club.fans.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Trophy className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pontos</p>
              <p className="text-lg font-bold">{club.stats.points}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Star className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reputação</p>
              <p className="text-lg font-bold">{club.reputation}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" /> Desempenho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-emerald-400">V {club.stats.wins}</span>
              <span className="text-yellow-400">E {club.stats.draws}</span>
              <span className="text-red-400">D {club.stats.losses}</span>
            </div>
            <div className="flex gap-1 h-3 rounded-full overflow-hidden">
              {club.stats.wins > 0 && (
                <div className="bg-emerald-500" style={{ flex: club.stats.wins }} />
              )}
              {club.stats.draws > 0 && (
                <div className="bg-yellow-500" style={{ flex: club.stats.draws }} />
              )}
              {club.stats.losses > 0 && (
                <div className="bg-red-500" style={{ flex: club.stats.losses }} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{club.stats.goalsFor}</p>
                <p className="text-xs text-muted-foreground">Gols marcados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">{club.stats.goalsAgainst}</p>
                <p className="text-xs text-muted-foreground">Gols sofridos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {nextMatch && (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" /> Próximo Jogo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-3xl mb-1">⚽</p>
                  <p className="font-bold">{club.name}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">{nextMatch.date}</p>
                  <p className="text-2xl font-bold text-muted-foreground">VS</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl mb-1">{nextMatch.opponentLogo}</p>
                  <p className="font-bold">{nextMatch.opponent}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Jogadores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...club.players]
              .sort((a, b) => b.overall - a.overall)
              .slice(0, 5)
              .map(player => (
                <div key={player.id} className="flex items-center gap-3">
                  <span className="text-xs font-mono bg-primary/20 text-primary px-2 py-0.5 rounded">{player.position}</span>
                  <span className="flex-1 font-medium">{player.name}</span>
                  <span className="text-sm font-bold">{player.overall} OVR</span>
                  <Progress value={player.overall} className="w-20 h-2" />
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
