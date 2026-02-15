import { Player } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dumbbell, BedDouble } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  players: Player[];
  budget: number;
  onTrain: (id: string) => void;
  onRest: (id: string) => void;
}

const positionColors: Record<string, string> = {
  GOL: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  ZAG: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  LAT: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  VOL: 'bg-green-500/20 text-green-300 border-green-500/30',
  MEI: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  ATA: 'bg-red-500/20 text-red-300 border-red-500/30',
};

export function SquadTab({ players, budget, onTrain, onRest }: Props) {
  const sortedPlayers = [...players].sort((a, b) => {
    const order = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
    return order.indexOf(a.position) - order.indexOf(b.position);
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{players.length} jogadores no elenco</p>
        <p className="text-sm">Treino: <span className="font-bold text-emerald-400">R$ 10.000</span></p>
      </div>

      {sortedPlayers.map(player => (
        <Card key={player.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-xs font-mono px-2 py-1 rounded border ${positionColors[player.position]}`}>
                {player.position}
              </span>
              <div className="flex-1">
                <p className="font-semibold">{player.name}</p>
                <p className="text-xs text-muted-foreground">{player.age} anos • R$ {(player.salary / 1000).toFixed(0)}k/mês</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{player.overall}</p>
                <p className="text-[10px] text-muted-foreground">OVERALL</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Energia</span>
                  <span>{player.stamina}%</span>
                </div>
                <Progress value={player.stamina} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Moral</span>
                  <span>{player.morale}%</span>
                </div>
                <Progress value={player.morale} className="h-2" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">⚽ {player.goals} gols</Badge>
                <Badge variant="outline" className="text-xs">🅰️ {player.assists} assist.</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onRest(player.id)}>
                  <BedDouble className="h-3 w-3 mr-1" /> Descansar
                </Button>
                <Button size="sm" onClick={() => onTrain(player.id)} disabled={budget < 10000}>
                  <Dumbbell className="h-3 w-3 mr-1" /> Treinar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
