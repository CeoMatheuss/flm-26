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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Jogadores Disponíveis</h3>
        <Button variant="outline" size="sm" onClick={onRefresh}>Atualizar Mercado</Button>
      </div>

      <div className="space-y-2">
        {marketPlayers.map(player => {
          const value = getPlayerValue(player);
          return (
            <Card key={player.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <Badge variant="outline" className="text-xs">{player.position}</Badge>
                <div className="flex-1">
                  <p className="font-medium text-sm">{player.name}</p>
                  <p className="text-xs text-muted-foreground">{player.age} anos • OVR {player.overall}</p>
                </div>
                <p className="text-sm font-bold text-emerald-400">R$ {(value / 1000).toFixed(0)}k</p>
                <Button size="sm" onClick={() => onBuy(player)} disabled={budget < value}>
                  <ShoppingCart className="h-3 w-3 mr-1" /> Comprar
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <h3 className="font-semibold text-lg mt-8">Vender Jogadores</h3>
      <div className="space-y-2">
        {clubPlayers.map(player => {
          const value = Math.floor(getPlayerValue(player) * 0.8);
          return (
            <Card key={player.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <Badge variant="outline" className="text-xs">{player.position}</Badge>
                <div className="flex-1">
                  <p className="font-medium text-sm">{player.name}</p>
                  <p className="text-xs text-muted-foreground">{player.age} anos • OVR {player.overall}</p>
                </div>
                <p className="text-sm font-bold text-yellow-400">R$ {(value / 1000).toFixed(0)}k</p>
                <Button size="sm" variant="destructive" onClick={() => onSell(player)} disabled={clubPlayers.length <= 11}>
                  <Banknote className="h-3 w-3 mr-1" /> Vender
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
