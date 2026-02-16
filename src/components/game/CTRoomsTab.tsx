import { CTRooms, ctRoomDefinitions, getCTRoomUpgradeCost } from '@/types/ctRooms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowUp, Home } from 'lucide-react';

interface Props {
  rooms: CTRooms;
  budget: number;
  trainingCenterLevel: number;
  onUpgradeRoom: (room: keyof CTRooms) => void;
}

export function CTRoomsTab({ rooms, budget, trainingCenterLevel, onUpgradeRoom }: Props) {
  const maxRoomLevel = Math.min(5, trainingCenterLevel); // CT level limits room level

  return (
    <div className="space-y-3">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3 flex items-center gap-3">
          <Home className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-bold text-primary">🏠 Centro de Treinamento — Salas</p>
            <p className="text-[10px] text-muted-foreground">
              Nível do CT: {trainingCenterLevel} — Libera salas até nível {maxRoomLevel}
            </p>
          </div>
        </CardContent>
      </Card>

      {trainingCenterLevel < 2 && (
        <Card className="border-yellow-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-yellow-400 font-medium">⚠️ Melhore o Centro de Treinamento para nível 2+ para desbloquear salas!</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(Object.keys(ctRoomDefinitions) as (keyof CTRooms)[]).map(key => {
          const def = ctRoomDefinitions[key];
          const level = rooms[key];
          const isMaxed = level >= maxRoomLevel || level >= 5;
          const cost = getCTRoomUpgradeCost(key, level);
          const canUpgrade = trainingCenterLevel >= 2 && !isMaxed && budget >= cost;
          const isLocked = trainingCenterLevel < 2;

          return (
            <Card key={key} className={isLocked ? 'opacity-50' : ''}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{def.icon}</span>
                    <div>
                      <p className="text-xs font-bold">{def.name}</p>
                      <p className="text-[9px] text-muted-foreground">{def.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px]">
                    Nv.{level}/{Math.min(5, maxRoomLevel)}
                  </Badge>
                </div>

                <Progress value={(level / 5) * 100} className="h-1.5" />

                <p className="text-[9px] text-primary font-medium">{def.effect}</p>

                {!isLocked && !isMaxed && (
                  <Button
                    size="sm"
                    onClick={() => onUpgradeRoom(key)}
                    disabled={!canUpgrade}
                    className="w-full h-7 text-[10px] gap-1"
                  >
                    <ArrowUp className="h-3 w-3" />
                    Nv.{level + 1} — R$ {(cost / 1000000).toFixed(2)}M
                  </Button>
                )}
                {isMaxed && level > 0 && (
                  <p className="text-[9px] text-center text-emerald-400 font-semibold">✅ Nível máximo!</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
