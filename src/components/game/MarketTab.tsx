import { Player } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPlayerValue } from '@/utils/playerGenerator';
import { ShoppingCart, Banknote } from 'lucide-react';

interface Props {
  marketPlayers: Player[];
  clubPlayers: Player[];
  budget: number;
  onBuy: (player: Player) => void;
  onSell: (player: Player) => void;
  onRefresh: () => void;
}

export function MarketTab({ marketPlayers, clubPlayers, budget, onBuy, onSell, onRefresh }: Props) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm sm:text-lg">Jogadores Disponíveis</h3>
        <Button variant="outline" size="sm" onClick={onRefresh} className="text-xs sm:text-sm">Atualizar</Button>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        {marketPlayers.map(player => {
          const value = getPlayerValue(player);
          return (
            <Card key={player.id}>
              <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">{player.position}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs sm:text-sm truncate">{player.name}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{player.age}a • OVR {player.overall}</p>
                </div>
                <p className="text-xs sm:text-sm font-bold text-emerald-400 shrink-0">R${(value / 1000).toFixed(0)}k</p>
                <Button size="sm" onClick={() => onBuy(player)} disabled={budget < value} className="h-6 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs">
                  <ShoppingCart className="h-3 w-3 sm:mr-1" /> <span className="hidden sm:inline">Comprar</span>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <h3 className="font-semibold text-sm sm:text-lg mt-6 sm:mt-8">Vender Jogadores</h3>
      <div className="space-y-1.5 sm:space-y-2">
        {clubPlayers.map(player => {
          const value = Math.floor(getPlayerValue(player) * 0.8);
          return (
            <Card key={player.id}>
              <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">{player.position}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs sm:text-sm truncate">{player.name}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{player.age}a • OVR {player.overall}</p>
                </div>
                <p className="text-xs sm:text-sm font-bold text-yellow-400 shrink-0">R${(value / 1000).toFixed(0)}k</p>
                <Button size="sm" variant="destructive" onClick={() => onSell(player)} disabled={clubPlayers.length <= 11} className="h-6 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs">
                  <Banknote className="h-3 w-3 sm:mr-1" /> <span className="hidden sm:inline">Vender</span>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
