import { Player, PlayerAttributes } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BedDouble, TrendingUp, TrendingDown, Minus, FileText, X, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface Props {
  players: Player[];
  budget: number;
  trainingLevel: number;
  onRest: (id: string) => void;
  onRenewContract: (playerId: string, newSalary: number) => void;
}

const posColors: Record<string, string> = {
  GOL: 'bg-primary/15 text-primary',
  ZAG: 'bg-blue-500/15 text-blue-400',
  LAT: 'bg-cyan-500/15 text-cyan-400',
  VOL: 'bg-emerald-500/15 text-emerald-400',
  MEI: 'bg-purple-500/15 text-purple-400',
  ATA: 'bg-red-500/15 text-red-400',
};

const posLabels: Record<string, string> = {
  GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', VOL: 'Volante', MEI: 'Meia', ATA: 'Atacante',
};

const attrLabels: Record<keyof PlayerAttributes, { label: string; icon: string }> = {
  speed: { label: 'Velocidade', icon: '⚡' },
  shooting: { label: 'Finalização', icon: '🎯' },
  passing: { label: 'Passe', icon: '📐' },
  defending: { label: 'Defesa', icon: '🛡️' },
  physical: { label: 'Físico', icon: '💪' },
  dribbling: { label: 'Drible', icon: '🎨' },
};

function getAttrColor(val: number): string {
  if (val >= 80) return 'text-emerald-400';
  if (val >= 60) return 'text-primary';
  if (val >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

function getMinRenewalSalary(player: Player): number {
  // Player demands at least 10-30% raise based on age/overall
  const raisePercent = player.overall >= 70 ? 0.30 : player.overall >= 55 ? 0.20 : 0.10;
  return Math.ceil(player.salary * (1 + raisePercent));
}

export function SquadTab({ players, budget, trainingLevel, onRest, onRenewContract }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [renewalOffers, setRenewalOffers] = useState<Record<string, number>>({});

  const sorted = [...players].sort((a, b) => {
    const order = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
    return order.indexOf(a.position) - order.indexOf(b.position);
  });

  const expiringPlayers = players.filter(p => p.contract <= 1);

  const getDevIcon = (player: Player) => {
    if (player.age <= 30) return <TrendingUp className="h-3 w-3 text-green-400" />;
    if (player.age <= 33) return <Minus className="h-3 w-3 text-yellow-400" />;
    return <TrendingDown className="h-3 w-3 text-red-400" />;
  };

  const handleSetOffer = (playerId: string, value: number) => {
    setRenewalOffers(prev => ({ ...prev, [playerId]: value }));
  };

  const handleRenew = (player: Player) => {
    const offer = renewalOffers[player.id] || getMinRenewalSalary(player);
    const minSalary = getMinRenewalSalary(player);
    if (offer < minSalary) return;
    onRenewContract(player.id, offer);
    setRenewalOffers(prev => {
      const n = { ...prev };
      delete n[player.id];
      return n;
    });
  };

  return (
    <div className="space-y-3">
      <Tabs defaultValue="squad" className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="squad" className="text-[10px] sm:text-xs">👥 Elenco ({players.length})</TabsTrigger>
          <TabsTrigger value="contracts" className="text-[10px] sm:text-xs">
            📄 Contratos {expiringPlayers.length > 0 && <Badge variant="destructive" className="ml-1 h-4 px-1 text-[8px]">{expiringPlayers.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="squad" className="space-y-3">
          {/* Training Info Banner */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-primary">🏋️ Centro de Treinamento — Nível {trainingLevel}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Jogadores evoluem automaticamente a cada 10 jogos.
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-[10px] text-muted-foreground">Chance base</p>
                  <p className="text-sm font-bold text-primary">{Math.round((0.5 + trainingLevel * 0.15) * 100)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Player Detail Modal */}
          {selectedPlayer && (
            <Card className="border-primary/30 bg-card">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${posColors[selectedPlayer.position]}`}>{selectedPlayer.position}</span>
                    <span className="font-bold text-sm">{selectedPlayer.name}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setSelectedPlayer(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                  <div><span className="text-muted-foreground">Posição</span><p className="font-semibold">{posLabels[selectedPlayer.position]}</p></div>
                  <div><span className="text-muted-foreground">Overall</span><p className="font-bold text-lg">{selectedPlayer.overall}</p></div>
                  <div><span className="text-muted-foreground">Idade</span><p className="font-semibold">{selectedPlayer.age} anos</p></div>
                  <div>
                    <span className="text-muted-foreground">Contrato</span>
                    <p className={`font-semibold ${selectedPlayer.contract <= 1 ? 'text-destructive' : ''}`}>
                      {selectedPlayer.contract} {selectedPlayer.contract === 1 ? 'ano' : 'anos'}
                      {selectedPlayer.contract <= 1 && ' ⚠️'}
                    </p>
                  </div>
                  <div><span className="text-muted-foreground">Salário</span><p className="font-semibold text-primary">R$ {(selectedPlayer.salary / 1000).toFixed(0)}k</p></div>
                  <div><span className="text-muted-foreground">Gols</span><p className="font-semibold">⚽ {selectedPlayer.goals}</p></div>
                  <div><span className="text-muted-foreground">Assistências</span><p className="font-semibold">🅰️ {selectedPlayer.assists}</p></div>
                  <div>
                    <span className="text-muted-foreground">Treino</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Progress value={(selectedPlayer.trainingProgress) * 10} className="h-1.5 flex-1" />
                      <span className="text-[10px] font-mono">{selectedPlayer.trainingProgress}/10</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedPlayer.attributes && (Object.entries(selectedPlayer.attributes) as [keyof PlayerAttributes, number][]).map(([key, val]) => (
                    <div key={key} className="bg-muted/30 rounded p-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-muted-foreground">{attrLabels[key]?.icon} {attrLabels[key]?.label}</span>
                        <span className={`text-xs font-bold ${getAttrColor(val)}`}>{val}</span>
                      </div>
                      <Progress value={val} className="h-1" />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                      <span>Energia</span>
                      <span className={selectedPlayer.stamina < 60 ? 'text-destructive' : ''}>{selectedPlayer.stamina}%</span>
                    </div>
                    <Progress value={selectedPlayer.stamina} className="h-1.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                      <span>Moral</span>
                      <span>{selectedPlayer.morale}%</span>
                    </div>
                    <Progress value={selectedPlayer.morale} className="h-1.5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Player List */}
          <div className="grid gap-1.5">
            {sorted.map(player => (
              <Card key={player.id} className={`overflow-hidden hover:border-primary/30 transition-colors cursor-pointer ${player.contract <= 1 ? 'border-destructive/30' : ''}`} onClick={() => setSelectedPlayer(player)}>
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className={`text-[9px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.5 rounded shrink-0 ${posColors[player.position]}`}>{player.position}</span>
                    <span className="flex-1 font-medium text-xs sm:text-sm truncate">{player.name}</span>
                    {getDevIcon(player)}
                    <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">{player.age}a</span>
                    <span className={`text-[10px] shrink-0 hidden sm:inline ${player.contract <= 1 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>📄{player.contract}a</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">💰{(player.salary / 1000).toFixed(0)}k</span>
                    <div className="w-10 shrink-0 hidden sm:block" title={`Treino: ${player.trainingProgress}/10 jogos`}>
                      <Progress value={player.trainingProgress * 10} className="h-1" />
                    </div>
                    <span className="text-sm sm:text-lg font-bold shrink-0">{player.overall}</span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={(e) => { e.stopPropagation(); onRest(player.id); }} title="Descansar">
                      <BedDouble className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={(e) => { e.stopPropagation(); setSelectedPlayer(player); }} title="Detalhes">
                      <FileText className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-3">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-primary">📄 Gestão de Contratos</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Renove contratos dos jogadores. Eles só aceitam salário maior que o atual. No fim da temporada, jogadores com contrato 0 saem do clube!
              </p>
            </CardContent>
          </Card>

          {expiringPlayers.length > 0 && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-[11px] text-destructive font-medium">
                  {expiringPlayers.length} jogador(es) com contrato expirando! Renove ou eles sairão no fim da temporada.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {sorted.map(player => {
              const minSalary = getMinRenewalSalary(player);
              const currentOffer = renewalOffers[player.id] ?? minSalary;
              const isExpiring = player.contract <= 1;
              const salarySteps = [
                minSalary,
                Math.ceil(minSalary * 1.1),
                Math.ceil(minSalary * 1.25),
                Math.ceil(minSalary * 1.5),
              ];

              return (
                <Card key={player.id} className={isExpiring ? 'border-destructive/30' : ''}>
                  <CardContent className="p-2 sm:p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${posColors[player.position]}`}>{player.position}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{player.name}</p>
                        <p className="text-[10px] text-muted-foreground">{player.age}a • OVR {player.overall}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-muted-foreground">Contrato</p>
                        <p className={`text-xs font-bold ${isExpiring ? 'text-destructive' : ''}`}>
                          {player.contract} {player.contract === 1 ? 'ano' : 'anos'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] text-muted-foreground shrink-0">Atual: R${(player.salary / 1000).toFixed(0)}k →</span>
                      {salarySteps.map(sal => (
                        <Button
                          key={sal}
                          size="sm"
                          variant={currentOffer === sal ? 'default' : 'outline'}
                          className="h-5 px-1.5 text-[9px]"
                          onClick={() => handleSetOffer(player.id, sal)}
                        >
                          R${(sal / 1000).toFixed(0)}k
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1 ml-auto"
                        disabled={budget < currentOffer * 12}
                        onClick={() => handleRenew(player)}
                      >
                        <CheckCircle className="h-3 w-3" /> Renovar
                      </Button>
                    </div>
                    <p className="text-[8px] text-muted-foreground mt-1">
                      Mínimo aceito: R${(minSalary / 1000).toFixed(0)}k/mês • Custo anual: R${(currentOffer * 12 / 1000).toFixed(0)}k
                    </p>
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
