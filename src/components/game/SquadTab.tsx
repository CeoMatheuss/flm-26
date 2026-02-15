import { Player } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dumbbell, BedDouble } from 'lucide-react';

interface Props {
  players: Player[];
  budget: number;
  onTrain: (id: string) => void;
  onRest: (id: string) => void;
}

const posColors: Record<string, string> = {
  GOL: 'bg-primary/15 text-primary',
  ZAG: 'bg-blue-500/15 text-blue-400',
  LAT: 'bg-cyan-500/15 text-cyan-400',
  VOL: 'bg-emerald-500/15 text-emerald-400',
  MEI: 'bg-purple-500/15 text-purple-400',
  ATA: 'bg-red-500/15 text-red-400',
};

export function SquadTab({ players, budget, onTrain, onRest }: Props) {
  const sorted = [...players].sort((a, b) => {
    const order = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
    return order.indexOf(a.position) - order.indexOf(b.position);
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 mb-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{players.length} jogadores</p>
        <p className="text-xs text-muted-foreground">Treino: <span className="text-primary font-semibold">R$ 10k</span></p>
      </div>

      <div className="grid gap-2">
        {sorted.map(player => {
          const ageLabel = player.age <= 30 ? '📈' : player.age <= 33 ? '➡️' : '📉';
          return (
            <Card key={player.id} className="overflow-hidden hover:border-primary/30 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${posColors[player.position]}`}>{player.position}</span>
                  <span className="flex-1 font-medium text-sm">{player.name}</span>
                  <span className="text-[10px]" title={player.age <= 30 ? 'Evolui com treino' : player.age <= 33 ? 'Mantém nível' : 'Declínio por idade'}>{ageLabel}</span>
                  <span className="text-xs text-muted-foreground">{player.age}a</span>
                  <span className="text-lg font-bold">{player.overall}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                      <span>Energia</span>
                      <span className={player.stamina < 60 ? 'text-destructive' : ''}>{player.stamina}%</span>
                    </div>
                    <Progress value={player.stamina} className="h-1.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                      <span>Moral</span>
                      <span>{player.morale}%</span>
                    </div>
                    <Progress value={player.morale} className="h-1.5" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span>⚽ {player.goals}</span>
                    <span>🅰️ {player.assists}</span>
                    <span>💰 R${(player.salary / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onRest(player.id)}>
                      <BedDouble className="h-3 w-3" />
                    </Button>
                    <Button size="sm" className="h-7 px-2 text-xs" onClick={() => onTrain(player.id)} disabled={budget < 10000}>
                      <Dumbbell className="h-3 w-3 mr-1" /> Treinar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
