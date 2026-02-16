import { Achievement, achievementDefinitions } from '@/types/achievements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Lock } from 'lucide-react';

interface Props {
  achievements: Achievement[];
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  league: { label: 'Liga', color: 'text-emerald-400 border-emerald-500/30' },
  player: { label: 'Jogador', color: 'text-blue-400 border-blue-500/30' },
  club: { label: 'Clube', color: 'text-purple-400 border-purple-500/30' },
  special: { label: 'Especial', color: 'text-yellow-400 border-yellow-500/30' },
};

export function AchievementsTab({ achievements }: Props) {
  const unlocked = achievements.filter(a => a.unlockedAt);
  const total = achievementDefinitions.length;

  return (
    <div className="space-y-3">
      <Card className="border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 via-amber-500/5 to-orange-500/5">
        <CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <Trophy className="h-6 w-6 text-yellow-400" />
          <div>
            <p className="text-sm font-bold text-yellow-400">🏅 Conquistas</p>
            <p className="text-[10px] text-muted-foreground">
              {unlocked.length}/{total} desbloqueadas
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Progress value={(unlocked.length / total) * 100} className="w-20 h-2" />
            <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              {Math.round((unlocked.length / total) * 100)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {(['league', 'player', 'club', 'special'] as const).map(category => {
        const defs = achievementDefinitions.filter(d => d.category === category);
        const catInfo = categoryLabels[category];

        return (
          <Card key={category}>
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge variant="outline" className={`text-[9px] ${catInfo.color}`}>{catInfo.label}</Badge>
                <span className="text-[10px] text-muted-foreground">
                  {defs.filter(d => achievements.some(a => a.id === d.id && a.unlockedAt)).length}/{defs.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {defs.map(def => {
                  const achieved = achievements.find(a => a.id === def.id && a.unlockedAt);
                  return (
                    <div
                      key={def.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                        achieved
                          ? 'bg-yellow-500/5 border-yellow-500/20'
                          : 'bg-muted/10 border-border/30 opacity-60'
                      }`}
                    >
                      <span className="text-lg shrink-0">{achieved ? def.icon : '🔒'}</span>
                      <div className="min-w-0">
                        <p className={`text-[11px] font-bold ${achieved ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                          {def.name}
                        </p>
                        <p className="text-[9px] text-muted-foreground truncate">{def.description}</p>
                      </div>
                      {achieved && (
                        <Trophy className="h-3 w-3 text-yellow-400 shrink-0 ml-auto" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
