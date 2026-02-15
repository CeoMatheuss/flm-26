import { Player, PlayerAttributes, ScoutReport } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPlayerValue } from '@/utils/playerGenerator';
import { ShoppingCart, Banknote, UserPlus, Search, EyeOff, RefreshCw, DollarSign } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

interface Props {
  marketPlayers: Player[];
  freeAgents: Player[];
  clubPlayers: Player[];
  budget: number;
  clubName: string;
  listedForSale: string[];
  scoutReports: ScoutReport[];
  onBuy: (player: Player) => void;
  onSell: (player: Player) => void;
  onSignFreeAgent: (player: Player, offeredSalary: number) => void;
  onRefresh: () => void;
  onRefreshFreeAgents: () => void;
}

const posColors: Record<string, string> = {
  GOL: 'bg-primary/15 text-primary',
  ZAG: 'bg-blue-500/15 text-blue-400',
  LAT: 'bg-cyan-500/15 text-cyan-400',
  VOL: 'bg-emerald-500/15 text-emerald-400',
  MEI: 'bg-purple-500/15 text-purple-400',
  ATA: 'bg-red-500/15 text-red-400',
};

const attrLabels: Record<keyof PlayerAttributes, string> = {
  speed: '⚡ Vel',
  shooting: '🎯 Fin',
  passing: '📐 Pas',
  defending: '🛡️ Def',
  physical: '💪 Fís',
  dribbling: '🎨 Dri',
};

function getPlayerExpectedSalary(player: Player): number {
  // Base salary expectation based on overall
  return Math.floor(player.overall * 200 + player.age * 100);
}

export function MarketTab({ marketPlayers, freeAgents, clubPlayers, budget, clubName, listedForSale, scoutReports, onBuy, onSell, onSignFreeAgent, onRefresh, onRefreshFreeAgents }: Props) {
  const [salaryOffers, setSalaryOffers] = useState<Record<string, number>>({});
  const listedPlayers = clubPlayers.filter(p => listedForSale.includes(p.id));

  return (
    <div className="space-y-4 sm:space-y-6">
      <Tabs defaultValue="market" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="market" className="text-[10px] sm:text-xs">🛒 Mercado</TabsTrigger>
          <TabsTrigger value="free" className="text-[10px] sm:text-xs">📋 Livres</TabsTrigger>
          <TabsTrigger value="sell" className="text-[10px] sm:text-xs">💰 Vender</TabsTrigger>
        </TabsList>

        <TabsContent value="market" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm sm:text-lg">Mercado de Transferências</h3>
            <Button variant="outline" size="sm" onClick={onRefresh} className="text-xs sm:text-sm gap-1">
              <RefreshCw className="h-3 w-3" /> Atualizar
            </Button>
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            {marketPlayers.map(player => {
              const value = getPlayerValue(player);
              return (
                <Card key={player.id}>
                  <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                    <span className={`text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${posColors[player.position]}`}>{player.position}</span>
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
        </TabsContent>

        {/* Free Agents - Salary Negotiation */}
        <TabsContent value="free" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm sm:text-lg">Jogadores Livres</h3>
              <p className="text-[10px] text-muted-foreground">Negocie apenas o salário — contrate olheiros para saber o nível real</p>
            </div>
            <Button variant="outline" size="sm" onClick={onRefreshFreeAgents} className="text-xs sm:text-sm gap-1">
              <RefreshCw className="h-3 w-3" /> Atualizar
            </Button>
          </div>
          <div className="space-y-2">
            {freeAgents.map(player => {
              const expectedSalary = getPlayerExpectedSalary(player);
              const report = scoutReports.find(r => r.player.id === player.id);
              const currentOffer = salaryOffers[player.id] ?? expectedSalary;
              const salaryOptions = [
                expectedSalary,
                Math.ceil(expectedSalary * 1.15),
                Math.ceil(expectedSalary * 1.3),
                Math.ceil(expectedSalary * 1.5),
              ];

              return (
                <Card key={player.id} className={report ? 'border-primary/30' : ''}>
                  <CardContent className="p-2 sm:p-3">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                      <span className={`text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${posColors[player.position]}`}>{player.position}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs sm:text-sm truncate">{player.name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {player.age}a • OVR <span className="text-muted-foreground/50"><EyeOff className="h-3 w-3 inline" /> ???</span>
                        </p>
                      </div>
                      {report && (
                        <Badge variant="outline" className="text-[9px] text-primary border-primary/30 shrink-0">
                          <Search className="h-2.5 w-2.5 mr-0.5" /> ~{report.estimatedOverall}
                        </Badge>
                      )}
                    </div>

                    {/* Salary negotiation */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <DollarSign className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-[9px] text-muted-foreground shrink-0">Salário:</span>
                      {salaryOptions.map(sal => (
                        <Button
                          key={sal}
                          size="sm"
                          variant={currentOffer === sal ? 'default' : 'outline'}
                          className="h-5 px-1.5 text-[9px]"
                          onClick={() => setSalaryOffers(prev => ({ ...prev, [player.id]: sal }))}
                        >
                          R${(sal / 1000).toFixed(0)}k
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1 ml-auto"
                        onClick={() => onSignFreeAgent(player, currentOffer)}
                      >
                        <UserPlus className="h-3 w-3" /> Assinar
                      </Button>
                    </div>

                    {report && (
                      <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                        {(Object.entries(report.estimatedAttributes) as [keyof PlayerAttributes, number][]).map(([key, val]) => (
                          <div key={key} className="text-center bg-muted/30 rounded px-1 py-0.5">
                            <p className="text-[8px] text-muted-foreground">{attrLabels[key]}</p>
                            <p className="text-[10px] font-bold">{val}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="sell" className="space-y-3">
          <h3 className="font-semibold text-sm sm:text-lg">Lista de Transferência</h3>
          {listedPlayers.length > 0 ? (
            <div className="space-y-1.5 sm:space-y-2">
              {listedPlayers.map(player => {
                const value = Math.floor(getPlayerValue(player) * 0.8);
                return (
                  <Card key={player.id} className="border-yellow-500/30">
                    <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                      <span className={`text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${posColors[player.position]}`}>{player.position}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs sm:text-sm truncate">{player.name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{player.age}a • OVR {player.overall} • 📄{player.contract}a</p>
                        <p className="text-[9px] text-primary">🏟️ {clubName}</p>
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
          ) : (
            <Card className="border-muted/30">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Nenhum jogador na lista de transferência.</p>
                <p className="text-[10px] text-muted-foreground mt-1">Use o ícone 🏷️ no Elenco para listar jogadores.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
