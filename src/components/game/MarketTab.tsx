import { Player, PlayerAttributes, ScoutReport } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPlayerValue } from '@/utils/playerGenerator';
import { ShoppingCart, Banknote, UserPlus, Search, EyeOff, RefreshCw, DollarSign, ArrowLeftRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { LoanedPlayer } from '@/hooks/useGame';

interface Props {
  marketPlayers: Player[];
  freeAgents: Player[];
  clubPlayers: Player[];
  budget: number;
  clubName: string;
  listedForSale: string[];
  scoutReports: ScoutReport[];
  loanedPlayers: LoanedPlayer[];
  onBuy: (player: Player) => void;
  onSell: (player: Player) => void;
  onSignFreeAgent: (player: Player, offeredSalary: number) => void;
  onRefresh: () => void;
  onRefreshFreeAgents: () => void;
  onLoanOut: (playerId: string) => void;
  onLoanIn: (player: Player) => void;
}

const posColors: Record<string, string> = {
  GOL: 'bg-primary/15 text-primary',
  ZAG: 'bg-blue-500/15 text-blue-400',
  LAT: 'bg-cyan-500/15 text-cyan-400',
  VOL: 'bg-emerald-500/15 text-emerald-400',
  MEI: 'bg-purple-500/15 text-purple-400',
  ATA: 'bg-red-500/15 text-red-400',
};

const attrLabels: Record<string, string> = {
  speed: '⚡ Vel',
  shooting: '🎯 Fin',
  passing: '📐 Pas',
  defending: '🛡️ Def',
  physical: '💪 Fís',
  dribbling: '🎨 Dri',
  setPieces: '🎱 BP',
  positioning: '📍 Pos',
  heading: '🗣️ Cab',
  marking: '🔒 Mar',
  vision: '👁️ Vis',
  crossing: '🎯 Cru',
  longShots: '🚀 CL',
  workRate: '🔥 Int',
  composure: '🧠 Com',
  aggression: '⚔️ Agr',
};

function getPlayerExpectedSalary(player: Player): number {
  // Base salary expectation based on overall
  return Math.floor(player.overall * 200 + player.age * 100);
}

export function MarketTab({ marketPlayers, freeAgents, clubPlayers, budget, clubName, listedForSale, scoutReports, loanedPlayers, onBuy, onSell, onSignFreeAgent, onRefresh, onRefreshFreeAgents, onLoanOut, onLoanIn }: Props) {
  const [salaryOffers, setSalaryOffers] = useState<Record<string, number>>({});
  const listedPlayers = clubPlayers.filter(p => listedForSale.includes(p.id));
  const loansOut = loanedPlayers.filter(l => l.direction === 'out');
  const loansIn = loanedPlayers.filter(l => l.direction === 'in');
  const loanedPlayerIds = loanedPlayers.map(l => l.player.id);
  const loanableClubPlayers = clubPlayers.filter(p => !loanedPlayerIds.includes(p.id) && !listedForSale.includes(p.id));

  return (
    <div className="space-y-4 sm:space-y-6">
      <Tabs defaultValue="market" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="market" className="text-[10px] sm:text-xs">🛒 Mercado</TabsTrigger>
          <TabsTrigger value="free" className="text-[10px] sm:text-xs">📋 Livres</TabsTrigger>
          <TabsTrigger value="loans" className="text-[10px] sm:text-xs">🔄 Empréstimos</TabsTrigger>
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
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-[9px] text-muted-foreground shrink-0">Salário mensal:</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
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
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-muted-foreground">Valor personalizado: R$</span>
                        <Input
                          type="number"
                          min={1000}
                          step={1000}
                          value={currentOffer}
                          onChange={e => setSalaryOffers(prev => ({ ...prev, [player.id]: Math.max(1000, Number(e.target.value)) }))}
                          className="h-6 w-24 text-[10px] px-1.5"
                        />
                        <span className="text-[9px] text-muted-foreground">/mês</span>
                        <Button
                          size="sm"
                          className="h-6 px-2 text-[10px] gap-1 ml-auto"
                          onClick={() => onSignFreeAgent(player, currentOffer)}
                        >
                          <UserPlus className="h-3 w-3" /> Assinar
                        </Button>
                      </div>
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

        {/* Loans Tab */}
        <TabsContent value="loans" className="space-y-3">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-semibold text-primary">🔄 Empréstimos</p>
                  <p className="text-[10px] text-muted-foreground">Máx. 3 empréstimos (entrada ou saída). Duração: 1 temporada. Receptor paga salário.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active loans */}
          {(loansOut.length > 0 || loansIn.length > 0) && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">Empréstimos Ativos</p>
              {loansOut.map(loan => (
                <Card key={loan.player.id} className="border-orange-500/30 bg-orange-500/5">
                  <CardContent className="p-2 sm:p-3 flex items-center gap-2">
                    <Badge variant="outline" className="text-[8px] border-orange-500/30 text-orange-400 shrink-0">SAÍDA</Badge>
                    <span className={`text-[9px] font-mono px-1 py-0.5 rounded shrink-0 ${posColors[loan.player.position]}`}>{loan.player.position}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">{loan.player.name}</p>
                      <p className="text-[10px] text-muted-foreground">OVR {loan.player.overall} • Desde T{loan.seasonStart}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {loansIn.map(loan => (
                <Card key={loan.player.id} className="border-blue-500/30 bg-blue-500/5">
                  <CardContent className="p-2 sm:p-3 flex items-center gap-2">
                    <Badge variant="outline" className="text-[8px] border-blue-500/30 text-blue-400 shrink-0">ENTRADA</Badge>
                    <span className={`text-[9px] font-mono px-1 py-0.5 rounded shrink-0 ${posColors[loan.player.position]}`}>{loan.player.position}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">{loan.player.name}</p>
                      <p className="text-[10px] text-muted-foreground">OVR {loan.player.overall} • Sal: R${(loan.player.salary / 1000).toFixed(0)}k/mês</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Loan out own players */}
          <div>
            <p className="text-xs font-semibold mb-1.5">Emprestar Jogadores ({loansOut.length}/3)</p>
            {loansOut.length >= 3 ? (
              <p className="text-[10px] text-muted-foreground">Limite de empréstimos de saída atingido.</p>
            ) : (
              <div className="space-y-1">
                {loanableClubPlayers.map(player => (
                  <Card key={player.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-2 sm:p-3 flex items-center gap-2">
                      <span className={`text-[9px] font-mono px-1 py-0.5 rounded shrink-0 ${posColors[player.position]}`}>{player.position}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{player.name}</p>
                        <p className="text-[10px] text-muted-foreground">{player.age}a • OVR {player.overall}</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-1" onClick={() => onLoanOut(player.id)} disabled={clubPlayers.length <= 11}>
                        <ArrowLeftRight className="h-3 w-3" /> Emprestar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Loan in from market */}
          <div>
            <p className="text-xs font-semibold mb-1.5">Pegar Emprestado do Mercado ({loansIn.length}/3)</p>
            {loansIn.length >= 3 ? (
              <p className="text-[10px] text-muted-foreground">Limite de empréstimos de entrada atingido.</p>
            ) : (
              <div className="space-y-1">
                {marketPlayers.slice(0, 5).map(player => (
                  <Card key={player.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-2 sm:p-3 flex items-center gap-2">
                      <span className={`text-[9px] font-mono px-1 py-0.5 rounded shrink-0 ${posColors[player.position]}`}>{player.position}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{player.name}</p>
                        <p className="text-[10px] text-muted-foreground">{player.age}a • OVR {player.overall} • Sal: R${(player.salary / 1000).toFixed(0)}k/mês</p>
                      </div>
                      <Button size="sm" variant="default" className="h-6 px-2 text-[10px] gap-1" onClick={() => onLoanIn(player)}>
                        <ArrowLeftRight className="h-3 w-3" /> Pegar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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
