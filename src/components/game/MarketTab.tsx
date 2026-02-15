import { Player, PlayerAttributes, ScoutReport } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getPlayerValue } from '@/utils/playerGenerator';
import { ShoppingCart, Banknote, UserPlus, Search, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  marketPlayers: Player[];
  freeAgents: Player[];
  clubPlayers: Player[];
  budget: number;
  scoutReports: ScoutReport[];
  matchesSinceLastScout: number;
  onBuy: (player: Player) => void;
  onSell: (player: Player) => void;
  onSignFreeAgent: (player: Player) => void;
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

export function MarketTab({ marketPlayers, freeAgents, clubPlayers, budget, scoutReports, matchesSinceLastScout, onBuy, onSell, onSignFreeAgent, onRefresh, onRefreshFreeAgents }: Props) {
  const [selectedReport, setSelectedReport] = useState<ScoutReport | null>(null);

  return (
    <div className="space-y-4 sm:space-y-6">
      <Tabs defaultValue="market" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="market" className="text-[10px] sm:text-xs">🛒 Mercado</TabsTrigger>
          <TabsTrigger value="free" className="text-[10px] sm:text-xs">📋 Livres</TabsTrigger>
          <TabsTrigger value="scouts" className="text-[10px] sm:text-xs">🔍 Olheiros</TabsTrigger>
          <TabsTrigger value="sell" className="text-[10px] sm:text-xs">💰 Vender</TabsTrigger>
        </TabsList>

        {/* Regular Market */}
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

        {/* Free Agents - OVR Hidden */}
        <TabsContent value="free" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm sm:text-lg">Jogadores Livres</h3>
              <p className="text-[10px] text-muted-foreground">Overall oculto — use olheiros para avaliar</p>
            </div>
            <Button variant="outline" size="sm" onClick={onRefreshFreeAgents} className="text-xs sm:text-sm gap-1">
              <RefreshCw className="h-3 w-3" /> Atualizar
            </Button>
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            {freeAgents.map(player => {
              const signingFee = Math.floor(player.overall * 5000);
              const report = scoutReports.find(r => r.player.id === player.id);
              return (
                <Card key={player.id} className={report ? 'border-primary/30' : ''}>
                  <CardContent className="p-2 sm:p-3">
                    <div className="flex items-center gap-2 sm:gap-3">
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
                      <p className="text-xs sm:text-sm font-bold text-yellow-400 shrink-0">R${(signingFee / 1000).toFixed(0)}k</p>
                      <Button size="sm" onClick={() => onSignFreeAgent(player)} disabled={budget < signingFee} className="h-6 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs">
                        <UserPlus className="h-3 w-3 sm:mr-1" /> <span className="hidden sm:inline">Assinar</span>
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

        {/* Scout Reports */}
        <TabsContent value="scouts" className="space-y-3">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-primary">🔍 Departamento de Olheiros</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Relatórios chegam a cada 5 partidas disputadas. Melhore a infraestrutura para relatórios mais precisos.
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-[10px] text-muted-foreground">Próximo relatório</p>
                  <p className="text-sm font-bold text-primary">{5 - matchesSinceLastScout} jogos</p>
                </div>
              </div>
              <Progress value={(matchesSinceLastScout / 5) * 100} className="h-1.5 mt-2" />
            </CardContent>
          </Card>

          {scoutReports.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhum relatório ainda. Dispute partidas para receber avaliações!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {scoutReports.map(report => (
                <Card key={report.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}>
                  <CardContent className="p-2 sm:p-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${posColors[report.player.position]}`}>{report.player.position}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs sm:text-sm truncate">{report.player.name}</p>
                        <p className="text-[10px] text-muted-foreground">{report.player.age}a • Precisão: {report.accuracy}%</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">~OVR {report.estimatedOverall}</Badge>
                    </div>
                    {selectedReport?.id === report.id && (
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
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sell Players */}
        <TabsContent value="sell" className="space-y-3">
          <h3 className="font-semibold text-sm sm:text-lg">Vender Jogadores</h3>
          <div className="space-y-1.5 sm:space-y-2">
            {clubPlayers.map(player => {
              const value = Math.floor(getPlayerValue(player) * 0.8);
              return (
                <Card key={player.id}>
                  <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                    <span className={`text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${posColors[player.position]}`}>{player.position}</span>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
