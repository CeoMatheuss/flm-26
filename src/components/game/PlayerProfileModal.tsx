import { Player, PlayerAttributes, personalityLabels } from '@/types/game';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScoutReport } from '@/types/game';
import { EyeOff, Tag, ArrowLeftRight, Gavel, Hash } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';
import { getPlayerBaseValue, getPlayerVariableBonus, getPlayerValue } from '@/utils/playerGenerator';

const posLabels: Record<string, string> = {
  GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', VOL: 'Volante', MEI: 'Meia', ATA: 'Atacante',
};

const posColors: Record<string, string> = {
  GOL: 'bg-primary/15 text-primary',
  ZAG: 'bg-blue-500/15 text-blue-400',
  LAT: 'bg-cyan-500/15 text-cyan-400',
  VOL: 'bg-emerald-500/15 text-emerald-400',
  MEI: 'bg-purple-500/15 text-purple-400',
  ATA: 'bg-red-500/15 text-red-400',
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
  goalkeeping: { label: 'Defesa de Goleiro', icon: '🧤' },
};

function getAttrColor(val: number): string {
  if (val >= 80) return 'text-emerald-400';
  if (val >= 60) return 'text-primary';
  if (val >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

interface Props {
  player: Player;
  children: React.ReactNode;
  isFreeAgent?: boolean;
  scoutReport?: ScoutReport;
  isOwnPlayer?: boolean;
  onListForSale?: (playerId: string) => void;
  onLoanOut?: (playerId: string) => void;
  onAuction?: (player: Player) => void;
  onChangeNumber?: (playerId: string, number: number) => void;
  canAuction?: boolean;
  canLoanOut?: boolean;
  playersCount?: number;
}

export function PlayerProfileModal({ player, children, isFreeAgent, scoutReport, isOwnPlayer, onListForSale, onLoanOut, onAuction, onChangeNumber, canAuction, canLoanOut, playersCount = 99 }: Props) {
  const [shirtNumber, setShirtNumber] = useState<number>(player.shirtNumber || 0);
  const [editingNumber, setEditingNumber] = useState(false);

  const avgRating = player.seasonRatings && player.seasonRatings.length > 0
    ? (player.seasonRatings.reduce((a, b) => a + b, 0) / player.seasonRatings.length)
    : null;

  const auctionEligible = player.overall >= 65 && player.age <= 35;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${posColors[player.position]}`}>{player.position}</span>
            {player.shirtNumber != null && player.shirtNumber > 0 && (
              <span className="text-[10px] font-mono bg-muted/50 px-1.5 py-0.5 rounded">#{player.shirtNumber}</span>
            )}
            {player.name}
          </DialogTitle>
        </DialogHeader>

        {/* Action Buttons for own players */}
        {isOwnPlayer && (
          <div className="grid grid-cols-2 gap-1.5">
            {onListForSale && (
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => onListForSale(player.id)}>
                <Tag className="h-3 w-3" /> Anunciar à venda
              </Button>
            )}
            {onLoanOut && (
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => onLoanOut(player.id)} disabled={!canLoanOut || (playersCount <= 11)}>
                <ArrowLeftRight className="h-3 w-3" /> Emprestar
              </Button>
            )}
            {onAuction && (
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => onAuction(player)} disabled={!auctionEligible || !canAuction}>
                <Gavel className="h-3 w-3" /> Leilão
                {!auctionEligible && <span className="text-[8px] text-muted-foreground">(OVR 65+ / ≤35a)</span>}
              </Button>
            )}
            {onChangeNumber && (
              <div className="flex items-center gap-1">
                {editingNumber ? (
                  <>
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      value={shirtNumber}
                      onChange={(e) => setShirtNumber(Math.min(99, Math.max(1, Number(e.target.value) || 1)))}
                      className="h-7 w-16 text-[10px] px-1.5"
                    />
                    <Button size="sm" variant="default" className="h-7 px-2 text-[10px]" onClick={() => { onChangeNumber(player.id, shirtNumber); setEditingNumber(false); }}>
                      OK
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setEditingNumber(false)}>
                      ✕
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 w-full" onClick={() => { setShirtNumber(player.shirtNumber || 1); setEditingNumber(true); }}>
                    <Hash className="h-3 w-3" /> Nº {player.shirtNumber || '—'}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Basic Info */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-muted/30 rounded p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Posição</p>
            <p className="font-semibold">{posLabels[player.position]}</p>
          </div>
          <div className="bg-muted/30 rounded p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Overall</p>
            {isFreeAgent ? (
              <p className="font-bold text-lg text-muted-foreground flex items-center justify-center gap-1"><EyeOff className="h-4 w-4" /> ???</p>
            ) : (
              <p className="font-bold text-lg text-primary">{player.overall}</p>
            )}
          </div>
          <div className="bg-muted/30 rounded p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Idade</p>
            <p className="font-semibold">{player.age} anos</p>
          </div>
        </div>

        {/* Scout Report Estimate */}
        {isFreeAgent && scoutReport && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-2">
            <p className="text-[10px] font-semibold text-primary mb-1">🔍 Relatório do Olheiro — OVR estimado: ~{scoutReport.estimatedOverall}</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
              {(Object.entries(scoutReport.estimatedAttributes) as [keyof PlayerAttributes, number][]).map(([key, val]) => (
                <div key={key} className="bg-muted/30 rounded p-1 text-center">
                  <p className="text-[8px] text-muted-foreground">{attrLabels[key]?.icon} {attrLabels[key]?.label || key}</p>
                  <p className={`text-[10px] font-bold ${getAttrColor(val)}`}>{val}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isFreeAgent && !scoutReport && (
          <div className="bg-muted/20 border border-muted/30 rounded-lg p-3 text-center">
            <EyeOff className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-[10px] text-muted-foreground">Contrate um olheiro para revelar os atributos deste jogador.</p>
          </div>
        )}

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
            <p className="font-semibold">{isFreeAgent ? 'Livre' : `${player.contract} ${player.contract === 1 ? 'ano' : 'anos'}${player.contract <= 1 ? ' ⚠️' : ''}`}</p>
          </div>
          <div className="bg-muted/30 rounded p-2">
            <p className="text-[10px] text-muted-foreground">💰 Salário</p>
            <p className="font-semibold text-primary">R$ {(player.salary / 1000).toFixed(0)}k/mês</p>
          </div>
        </div>


        {/* Tabs: Atributos / Estatísticas */}
        {!isFreeAgent && (
          <Tabs defaultValue="attributes" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="attributes" className="text-[10px]">📊 Atributos</TabsTrigger>
              <TabsTrigger value="stats" className="text-[10px]">📈 Estatísticas</TabsTrigger>
            </TabsList>

            <TabsContent value="attributes" className="space-y-3 mt-2">
              {/* Goalkeeping highlight */}
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
              {/* Career Stats */}
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

              {/* Match Rating */}
              {player.matchRating != null && (
                <div className="flex items-center gap-2 text-xs bg-muted/20 rounded p-2">
                  <span className="text-muted-foreground">Nota última partida:</span>
                  <span className={`font-bold text-sm ${player.matchRating >= 7 ? 'text-emerald-400' : player.matchRating >= 5.5 ? 'text-primary' : 'text-destructive'}`}>
                    ★ {player.matchRating.toFixed(1)}
                  </span>
                </div>
              )}

              {/* Transfer History */}
              <div>
                <p className="text-xs font-semibold mb-1.5">📜 Histórico de Clubes</p>
                {player.history && player.history.length > 0 ? (
                  <div className="space-y-1">
                    {player.history.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] bg-muted/20 rounded px-2 py-1.5">
                        <span className="font-semibold">{h.club}</span>
                        <span className="text-muted-foreground">
                          T{h.seasonStart}{h.seasonEnd ? `–T${h.seasonEnd}` : ' (atual)'}
                        </span>
                        <span className="ml-auto">{h.games}j</span>
                        <span>⚽{h.goals}</span>
                        <span>🅰️{h.assists}</span>
                        {h.avgRating > 0 && (
                          <span className="font-bold text-primary">★{h.avgRating.toFixed(1)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground bg-muted/20 rounded px-2 py-1.5">Sem histórico de clubes anteriores.</p>
                )}
              </div>

              {/* Player Value */}
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
        )}

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
      </DialogContent>
    </Dialog>
  );
}
