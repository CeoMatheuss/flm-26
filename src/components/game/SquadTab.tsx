import { Player, PlayerAttributes, personalityLabels } from '@/types/game';
import { ShieldCrest } from './ShieldCrest';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { BedDouble, TrendingUp, TrendingDown, Minus, X, CheckCircle, Tag, HeartPulse, ArrowLeft, Hash, ArrowLeftRight, Gavel, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { getPlayerBaseValue, getPlayerVariableBonus, getPlayerValue } from '@/utils/playerGenerator';

interface Props {
  players: Player[];
  budget: number;
  trainingLevel: number;
  clubName: string;
  onRest: (id: string) => void;
  onRenewContract: (playerId: string, newSalary: number, newDuration: number) => void;
  onListForSale: (playerId: string) => void;
  onLoanOut: (playerId: string) => void;
  onAuction: (player: Player) => void;
  onChangeNumber: (playerId: string, number: number) => void;
  canLoanOut: boolean;
  userId: string;
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

const attrLabels: Record<string, { label: string; icon: string }> = {
  speed: { label: 'Velocidade', icon: '⚡' },
  shooting: { label: 'Finalização', icon: '🎯' },
  passing: { label: 'Passe', icon: '📐' },
  defending: { label: 'Defesa', icon: '🛡️' },
  physical: { label: 'Físico', icon: '💪' },
  dribbling: { label: 'Drible', icon: '🎨' },
  setPieces: { label: 'Bola Parada', icon: '🎱' },
  positioning: { label: 'Posicionamento', icon: '📍' },
  heading: { label: 'Cabeceio', icon: '🗣️' },
  marking: { label: 'Marcação', icon: '🔒' },
  vision: { label: 'Visão de Jogo', icon: '👁️' },
  crossing: { label: 'Cruzamento', icon: '🎯' },
  longShots: { label: 'Chute de Longe', icon: '🚀' },
  workRate: { label: 'Intensidade', icon: '🔥' },
  composure: { label: 'Compostura', icon: '🧠' },
  aggression: { label: 'Agressividade', icon: '⚔️' },
};

function getAttrColor(val: number): string {
  if (val >= 80) return 'text-emerald-400';
  if (val >= 60) return 'text-primary';
  if (val >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

export function SquadTab({ players, budget, clubName, trainingLevel, onRest, onRenewContract, onListForSale, onLoanOut, onAuction, onChangeNumber, canLoanOut, userId }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [offerSalary, setOfferSalary] = useState<Record<string, number>>({});
  const [offerDuration, setOfferDuration] = useState<Record<string, number>>({});
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);
  const [shirtNumber, setShirtNumber] = useState<number>(0);
  const [editingNumber, setEditingNumber] = useState(false);

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

  // Full-page player profile view
  if (viewingPlayer) {
    const player = viewingPlayer;
    const avgRating = player.seasonRatings && player.seasonRatings.length > 0
      ? (player.seasonRatings.reduce((a, b) => a + b, 0) / player.seasonRatings.length)
      : null;
    const auctionEligible = player.overall >= 65 && player.age <= 35;

    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setViewingPlayer(null)}>
          <ArrowLeft className="h-3 w-3" /> Voltar ao Elenco
        </Button>

        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono px-2 py-0.5 rounded ${posColors[player.position]}`}>{player.position}</span>
              {player.shirtNumber != null && player.shirtNumber > 0 && (
                <span className="text-[10px] font-mono bg-muted/50 px-1.5 py-0.5 rounded">#{player.shirtNumber}</span>
              )}
              <h2 className="text-lg font-bold">{player.name}</h2>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              {onListForSale && (
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => onListForSale(player.id)}>
                  <Tag className="h-3 w-3" /> Lista de Transferência
                </Button>
              )}
              {onLoanOut && (
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => onLoanOut(player.id)} disabled={!canLoanOut || (players.length <= 11)}>
                  <ArrowLeftRight className="h-3 w-3" /> Emprestar
                </Button>
              )}
              {onAuction && (
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => onAuction(player)} disabled={!auctionEligible}>
                  <Gavel className="h-3 w-3" /> Leilão
                  {!auctionEligible && <span className="text-[8px] text-muted-foreground">(OVR 65+ / ≤35a)</span>}
                </Button>
              )}
              {onChangeNumber && (
                <div className="flex items-center gap-1">
                  {editingNumber ? (
                    <>
                      <Input type="number" min={1} max={99} value={shirtNumber}
                        onChange={(e) => setShirtNumber(Math.min(99, Math.max(1, Number(e.target.value) || 1)))}
                        className="h-7 w-16 text-[10px] px-1.5" />
                      <Button size="sm" variant="default" className="h-7 px-2 text-[10px]" onClick={() => { onChangeNumber(player.id, shirtNumber); setEditingNumber(false); }}>OK</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setEditingNumber(false)}>✕</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 w-full" onClick={() => { setShirtNumber(player.shirtNumber || 1); setEditingNumber(true); }}>
                      <Hash className="h-3 w-3" /> Nº {player.shirtNumber || '—'}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-muted/30 rounded p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Posição</p>
                <p className="font-semibold">{posLabels[player.position]}</p>
              </div>
              <div className="bg-muted/30 rounded p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Overall</p>
                <p className="font-bold text-lg text-primary">{player.overall}</p>
              </div>
              <div className="bg-muted/30 rounded p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Idade</p>
                <p className="font-semibold">{player.age} anos</p>
              </div>
            </div>

            {/* Personality */}
            {player.personality && personalityLabels[player.personality] && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-lg">{personalityLabels[player.personality].emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{personalityLabels[player.personality].label}</p>
                  <p className="text-[10px] text-muted-foreground">{personalityLabels[player.personality].desc}</p>
                </div>
              </div>
            )}

            {/* Contract & Salary */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/30 rounded p-2">
                <p className="text-[10px] text-muted-foreground">📄 Contrato</p>
                <p className="font-semibold">{player.contract} {player.contract === 1 ? 'ano' : 'anos'}{player.contract <= 1 ? ' ⚠️' : ''}</p>
              </div>
              <div className="bg-muted/30 rounded p-2">
                <p className="text-[10px] text-muted-foreground">💰 Salário</p>
                <p className="font-semibold text-primary">R$ {(player.salary / 1000).toFixed(0)}k/mês</p>
              </div>
            </div>

            {/* Tabs: Atributos / Estatísticas */}
            <Tabs defaultValue="attributes" className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="attributes" className="text-[10px]">📊 Atributos</TabsTrigger>
                <TabsTrigger value="stats" className="text-[10px]">📈 Estatísticas</TabsTrigger>
              </TabsList>

              <TabsContent value="attributes" className="space-y-3 mt-2">
                {player.position === 'GOL' && player.attributes.goalkeeping != null && (
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">🧤 Defesa de Goleiro</span>
                      <span className={`text-sm font-bold ${getAttrColor(player.attributes.goalkeeping)}`}>{player.attributes.goalkeeping}</span>
                    </div>
                    <Progress value={player.attributes.goalkeeping} className="h-1.5 mt-1" />
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {Object.entries(player.attributes).filter(([key, val]) => val != null && !(player.position === 'GOL' && key === 'goalkeeping')).map(([key, val]) => (
                    <div key={key} className="bg-muted/30 rounded p-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground">{attrLabels[key]?.icon} {attrLabels[key]?.label || key}</span>
                        <span className={`text-[10px] font-bold ${getAttrColor(val as number)}`}>{val}</span>
                      </div>
                      <Progress value={val as number} className="h-1 mt-0.5" />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="stats" className="space-y-3 mt-2">
                <div>
                  <p className="text-xs font-semibold mb-1.5">🏆 Números da Carreira</p>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    <div className="bg-muted/30 rounded p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Jogos</p>
                      <p className="font-bold text-lg">{player.gamesPlayed}</p>
                    </div>
                    <div className="bg-muted/30 rounded p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">⚽ Gols</p>
                      <p className="font-bold text-lg">{player.goals}</p>
                    </div>
                    <div className="bg-muted/30 rounded p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">🅰️ Assist.</p>
                      <p className="font-bold text-lg">{player.assists}</p>
                    </div>
                    <div className="bg-muted/30 rounded p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">★ Média</p>
                      <p className={`font-bold text-lg ${avgRating && avgRating >= 7 ? 'text-emerald-400' : avgRating && avgRating >= 5.5 ? 'text-primary' : 'text-destructive'}`}>
                        {avgRating ? avgRating.toFixed(1) : '—'}
                      </p>
                    </div>
                  </div>
                  {player.gamesPlayed > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 mt-1.5 text-[10px]">
                      <div className="bg-muted/20 rounded p-1.5 text-center">
                        <span className="text-muted-foreground">Gols/Jogo: </span>
                        <span className="font-bold">{(player.goals / player.gamesPlayed).toFixed(2)}</span>
                      </div>
                      <div className="bg-muted/20 rounded p-1.5 text-center">
                        <span className="text-muted-foreground">Assist/Jogo: </span>
                        <span className="font-bold">{(player.assists / player.gamesPlayed).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {player.matchRating != null && (
                  <div className="flex items-center gap-2 text-xs bg-muted/20 rounded p-2">
                    <span className="text-muted-foreground">Nota última partida:</span>
                    <span className={`font-bold text-sm ${player.matchRating >= 7 ? 'text-emerald-400' : player.matchRating >= 5.5 ? 'text-primary' : 'text-destructive'}`}>
                      ★ {player.matchRating.toFixed(1)}
                    </span>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold mb-1.5">📜 Histórico de Clubes</p>
                  {player.history && player.history.length > 0 ? (
                    <div className="space-y-1.5">
                      {player.history.map((h, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] bg-muted/20 rounded-lg px-2.5 py-2 border border-border/30">
                          <div className="shrink-0"><ShieldCrest primaryColor="#4a5568" secondaryColor="#a0aec0" pattern="classic" shape="classic" size={24} /></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs truncate">{h.club}</p>
                            <p className="text-[9px] text-muted-foreground">
                              Temporada {h.seasonStart}{h.seasonEnd ? ` – ${h.seasonEnd}` : ' (atual)'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-[10px]">
                            <span>{h.games}j</span>
                            <span>⚽{h.goals}</span>
                            <span>🅰️{h.assists}</span>
                            {h.avgRating > 0 && <span className="font-bold text-primary">★{h.avgRating.toFixed(1)}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground bg-muted/20 rounded px-2 py-1.5">Sem histórico de clubes anteriores.</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold mb-1.5">💰 Valor de Mercado</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-muted/30 rounded p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Valor Fixo (atributos)</p>
                      <p className="font-bold text-sm text-emerald-400">R${(getPlayerBaseValue(player) / 1000).toFixed(0)}k</p>
                    </div>
                    <div className="bg-muted/30 rounded p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Valor Total (estimado)</p>
                      <p className="font-bold text-sm text-primary">R${(getPlayerValue(player) / 1000).toFixed(0)}k</p>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1">O valor variável (±10%) depende da sequência de vitórias/derrotas e colocação na liga.</p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Injury */}
            {player.injury && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-destructive">🏥 LESIONADO</span>
                  <Badge variant="destructive" className="text-[9px] ml-auto">{player.injury.severity}</Badge>
                </div>
                <p className="text-[11px] font-semibold">{player.injury.type}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Progress value={((player.injury.originalWeeks - player.injury.weeksRemaining) / player.injury.originalWeeks) * 100} className="h-1.5 flex-1" />
                  <span className="text-[10px] text-muted-foreground">{player.injury.weeksRemaining}/{player.injury.originalWeeks} partidas</span>
                </div>
              </div>
            )}

            {/* Energy & Morale */}
            <div className="grid grid-cols-2 gap-2">
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
          </CardContent>
        </Card>
      </div>
    );
  }

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

                {selectedPlayer.injury && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <HeartPulse className="h-4 w-4 text-destructive" />
                      <span className="text-xs font-bold text-destructive">LESIONADO</span>
                      <Badge variant="destructive" className="text-[9px] ml-auto">{selectedPlayer.injury.severity}</Badge>
                    </div>
                    <p className="text-[11px] font-semibold">{selectedPlayer.injury.type}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Progress value={((selectedPlayer.injury.originalWeeks - selectedPlayer.injury.weeksRemaining) / selectedPlayer.injury.originalWeeks) * 100} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground">{selectedPlayer.injury.weeksRemaining}/{selectedPlayer.injury.originalWeeks} partidas</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {Object.entries(selectedPlayer.attributes).filter(([_, val]) => val != null).map(([key, val]) => (
                    <div key={key} className="bg-muted/30 rounded p-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground">{attrLabels[key]?.icon} {attrLabels[key]?.label || key}</span>
                        <span className={`text-xs font-bold ${getAttrColor(val as number)}`}>{val}</span>
                      </div>
                      <Progress value={val as number} className="h-1" />
                    </div>
                  ))}
                </div>

                {/* Player History */}
                {selectedPlayer.history && selectedPlayer.history.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">📜 Histórico</p>
                    <div className="space-y-1">
                      {selectedPlayer.history.map((h, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] bg-muted/20 rounded px-2 py-1.5">
                          <div className="shrink-0"><ShieldCrest primaryColor="#4a5568" secondaryColor="#a0aec0" pattern="classic" shape="classic" size={18} /></div>
                          <span className="font-semibold">{h.club}</span>
                          <span className="text-muted-foreground">T{h.seasonStart}{h.seasonEnd ? `-T${h.seasonEnd}` : ''}</span>
                          <span className="ml-auto">{h.games}j</span>
                          <span>⚽{h.goals}</span>
                          <span>🅰️{h.assists}</span>
                          <span className="font-bold text-primary">★{h.avgRating.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Season Rating */}
                {selectedPlayer.matchRating != null && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">Nota última partida:</span>
                    <span className={`text-sm font-bold ${selectedPlayer.matchRating >= 7 ? 'text-emerald-400' : selectedPlayer.matchRating >= 5.5 ? 'text-primary' : 'text-destructive'}`}>
                      ★ {selectedPlayer.matchRating.toFixed(1)}
                    </span>
                  </div>
                )}

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

          <div className="grid gap-2">
            {sorted.map(player => {
              const avgRating = player.seasonRatings && player.seasonRatings.length > 0
                ? (player.seasonRatings.reduce((a: number, b: number) => a + b, 0) / player.seasonRatings.length)
                : null;
              return (
                <Card key={player.id} className={`overflow-hidden hover:border-primary/30 transition-colors cursor-pointer ${player.injury ? 'border-red-500/40 bg-red-500/5' : player.contract <= 1 ? 'border-destructive/30' : ''}`} onClick={() => setSelectedPlayer(player)}>
                  <CardContent className="p-2.5 sm:p-3">
                    <div className="flex items-center gap-2">
                      {/* OVR circle */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm border-2 ${
                        player.overall >= 80 ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' :
                        player.overall >= 70 ? 'border-primary bg-primary/10 text-primary' :
                        player.overall >= 60 ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' :
                        'border-muted-foreground bg-muted/20 text-muted-foreground'
                      }`}>
                        {player.overall}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${posColors[player.position]}`}>{player.position}</span>
                          <Button variant="link" size="sm" className="h-auto p-0 font-semibold text-xs sm:text-sm truncate text-left hover:text-primary" onClick={(e) => { e.stopPropagation(); setViewingPlayer(player); }}>
                            {player.name}
                          </Button>
                          {player.personality && personalityLabels[player.personality] && (
                            <span className="text-xs shrink-0" title={personalityLabels[player.personality].label}>{personalityLabels[player.personality].emoji}</span>
                          )}
                          {player.injury && (
                            <Badge variant="destructive" className="text-[8px] px-1 h-4 gap-0.5 shrink-0">
                              <HeartPulse className="h-2.5 w-2.5" />
                              {player.injury.weeksRemaining}j
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                          <span>{player.age}a</span>
                          <span>💰{(player.salary / 1000).toFixed(0)}k</span>
                          <span className={player.contract <= 1 ? 'text-destructive font-bold' : ''}>📄{player.contract}a</span>
                          {player.gamesPlayed > 0 && <span>⚽{player.goals} 🅰️{player.assists}</span>}
                          {avgRating && <span className={avgRating >= 7 ? 'text-emerald-400 font-bold' : avgRating >= 5.5 ? 'text-primary' : 'text-destructive'}>★{avgRating.toFixed(1)}</span>}
                          {!player.injury && getDevIcon(player)}
                        </div>
                      </div>

                      {/* Energy bar */}
                      <div className="w-8 shrink-0 flex flex-col items-center gap-0.5">
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${player.stamina >= 70 ? 'bg-emerald-500' : player.stamina >= 40 ? 'bg-yellow-500' : 'bg-destructive'}`} style={{ width: `${player.stamina}%` }} />
                        </div>
                        <span className="text-[8px] text-muted-foreground">{player.stamina}%</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); onListForSale(player.id); }} title="Transferir">
                          <Tag className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-3">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-primary">📄 Gestão de Contratos</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Você define o salário e a duração. O salário deve ser igual ou maior que o atual do jogador.
              </p>
            </CardContent>
          </Card>

          {expiringPlayers.length > 0 && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-3 flex items-center gap-2">
                <span className="text-destructive text-sm">⚠️</span>
                <p className="text-[11px] text-destructive font-medium">
                  {expiringPlayers.length} jogador(es) com contrato expirando! Renove ou eles sairão no fim da temporada.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {sorted.map(player => {
              const isExpiring = player.contract <= 1;
              const salary = offerSalary[player.id] ?? player.salary;
              const duration = offerDuration[player.id] ?? 1;
              const renewalCost = salary * duration * 12;
              const canAfford = budget >= renewalCost;
              const salaryValid = salary >= player.salary;

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

                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">Salário (R$/mês) — mín: {(player.salary / 1000).toFixed(0)}k</label>
                        <Input
                          type="number"
                          className="h-7 text-xs"
                          min={player.salary}
                          step={1000}
                          value={salary}
                          onChange={(e) => setOfferSalary(prev => ({ ...prev, [player.id]: Math.max(player.salary, Number(e.target.value) || player.salary) }))}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">Duração (anos)</label>
                        <Input
                          type="number"
                          className="h-7 text-xs"
                          min={1}
                          max={5}
                          value={duration}
                          onChange={(e) => setOfferDuration(prev => ({ ...prev, [player.id]: Math.min(5, Math.max(1, Number(e.target.value) || 1)) }))}
                        />
                      </div>
                    </div>

                    <p className="text-[9px] text-muted-foreground mb-2">
                      Custo total: R${(renewalCost / 1000).toFixed(0)}k
                    </p>

                    <Button
                      size="sm"
                      className="h-6 px-3 text-[10px] gap-1 w-full"
                      disabled={!canAfford || !salaryValid}
                      onClick={() => onRenewContract(player.id, salary, duration)}
                    >
                      <CheckCircle className="h-3 w-3" /> Renovar Contrato
                    </Button>
                    {!canAfford && <p className="text-[8px] text-destructive mt-1">Orçamento insuficiente!</p>}
                    {!salaryValid && <p className="text-[8px] text-destructive mt-1">Salário deve ser ≥ ao atual!</p>}
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
