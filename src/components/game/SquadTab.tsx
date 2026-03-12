import { Player, PlayerAttributes, personalityLabels } from '@/types/game';
import { ShieldCrest } from './ShieldCrest';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, Minus, X, CheckCircle, Tag, HeartPulse, ArrowLeft, Hash, ArrowLeftRight, Gavel, Users, FileText, ChevronRight, Zap, Heart, Star, Shield } from 'lucide-react';
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
  GOL: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  ZAG: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  LAT: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  VOL: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  MEI: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ATA: 'bg-red-500/20 text-red-400 border-red-500/30',
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

function getOvrColor(val: number) {
  if (val >= 80) return { text: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', glow: 'shadow-emerald-500/20' };
  if (val >= 70) return { text: 'text-primary', bg: 'bg-primary/15', border: 'border-primary/40', glow: 'shadow-primary/20' };
  if (val >= 60) return { text: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/40', glow: 'shadow-amber-500/20' };
  return { text: 'text-muted-foreground', bg: 'bg-muted/30', border: 'border-border', glow: '' };
}

function getAttrColor(val: number): string {
  if (val >= 80) return 'text-emerald-400';
  if (val >= 60) return 'text-primary';
  if (val >= 40) return 'text-amber-400';
  return 'text-red-400';
}

function getAttrBarColor(val: number): string {
  if (val >= 80) return 'bg-emerald-500';
  if (val >= 60) return 'bg-primary';
  if (val >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function getStaminaColor(val: number): string {
  if (val >= 70) return 'bg-emerald-500';
  if (val >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

export function SquadTab({ players, budget, clubName, trainingLevel, onRest, onRenewContract, onListForSale, onLoanOut, onAuction, onChangeNumber, canLoanOut, userId }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [offerSalary, setOfferSalary] = useState<Record<string, number>>({});
  const [offerDuration, setOfferDuration] = useState<Record<string, number>>({});
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);
  const [shirtNumber, setShirtNumber] = useState<number>(0);
  const [editingNumber, setEditingNumber] = useState(false);
  const [filterPos, setFilterPos] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'position' | 'overall' | 'age' | 'salary'>('position');

  const posOrder = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
  const sorted = [...players]
    .filter(p => !filterPos || p.position === filterPos)
    .sort((a, b) => {
      if (sortBy === 'overall') return b.overall - a.overall;
      if (sortBy === 'age') return a.age - b.age;
      if (sortBy === 'salary') return b.salary - a.salary;
      return posOrder.indexOf(a.position) - posOrder.indexOf(b.position);
    });

  const expiringPlayers = players.filter(p => p.contract <= 1);
  const avgOvr = players.length > 0 ? Math.round(players.reduce((s, p) => s + p.overall, 0) / players.length) : 0;
  const totalSalary = players.reduce((s, p) => s + p.salary, 0);
  const injuredCount = players.filter(p => p.injury).length;

  // ─── Full-page player profile ───
  if (viewingPlayer) {
    const player = viewingPlayer;
    const avgRating = player.seasonRatings && player.seasonRatings.length > 0
      ? (player.seasonRatings.reduce((a, b) => a + b, 0) / player.seasonRatings.length) : null;
    const auctionEligible = player.overall >= 65 && player.age <= 35;
    const ovr = getOvrColor(player.overall);

    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={() => setViewingPlayer(null)}>
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Elenco
        </Button>

        {/* Player Header Card */}
        <div className={`relative rounded-xl border ${ovr.border} ${ovr.bg} p-4 overflow-hidden`}>
          <div className="flex items-center gap-4">
            {/* OVR Circle */}
            <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center ${ovr.bg} border-2 ${ovr.border} shadow-lg ${ovr.glow}`}>
              <span className={`text-2xl font-black ${ovr.text}`}>{player.overall}</span>
              <span className="text-[8px] text-muted-foreground font-medium -mt-0.5">OVR</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={`text-[10px] font-bold border ${posColors[player.position]}`} variant="outline">{player.position}</Badge>
                {player.shirtNumber != null && player.shirtNumber > 0 && (
                  <span className="text-[10px] font-mono text-muted-foreground">#{player.shirtNumber}</span>
                )}
                {player.personality && personalityLabels[player.personality] && (
                  <span className="text-sm" title={personalityLabels[player.personality].label}>{personalityLabels[player.personality].emoji}</span>
                )}
              </div>
              <h2 className="text-lg font-black text-foreground leading-tight">{player.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{posLabels[player.position]} • {player.age} anos</p>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="text-center">
              <p className="text-[9px] text-muted-foreground">Contrato</p>
              <p className={`text-sm font-bold ${player.contract <= 1 ? 'text-red-400' : 'text-foreground'}`}>{player.contract}a</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-muted-foreground">Salário</p>
              <p className="text-sm font-bold text-primary">R${(player.salary / 1000).toFixed(0)}k</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-muted-foreground">Energia</p>
              <p className={`text-sm font-bold ${player.stamina >= 70 ? 'text-emerald-400' : player.stamina >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{player.stamina}%</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-muted-foreground">Moral</p>
              <p className={`text-sm font-bold ${player.morale >= 70 ? 'text-emerald-400' : player.morale >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{player.morale}%</p>
            </div>
          </div>
        </div>

        {/* Injury Alert */}
        {player.injury && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
            <HeartPulse className="h-5 w-5 text-red-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-red-400">LESIONADO — {player.injury.type}</p>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={((player.injury.originalWeeks - player.injury.weeksRemaining) / player.injury.originalWeeks) * 100} className="h-1.5 flex-1" />
                <span className="text-[10px] text-muted-foreground shrink-0">{player.injury.weeksRemaining}/{player.injury.originalWeeks} jogos</span>
              </div>
            </div>
            <Badge variant="destructive" className="text-[9px] shrink-0">{player.injury.severity}</Badge>
          </div>
        )}

        {/* Personality */}
        {player.personality && personalityLabels[player.personality] && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/50 border border-border/30">
            <span className="text-xl">{personalityLabels[player.personality].emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold">{personalityLabels[player.personality].label}</p>
              <p className="text-[10px] text-muted-foreground">{personalityLabels[player.personality].desc}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5 rounded-xl border-border/50 hover:border-primary/50 hover:bg-primary/5" onClick={() => onListForSale(player.id)}>
            <Tag className="h-3.5 w-3.5" /> Listar no Mercado
          </Button>
          <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5 rounded-xl border-border/50 hover:border-cyan-500/50 hover:bg-cyan-500/5" onClick={() => onLoanOut(player.id)} disabled={!canLoanOut || (players.length <= 11)}>
            <ArrowLeftRight className="h-3.5 w-3.5" /> Emprestar
          </Button>
          <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5 rounded-xl border-border/50 hover:border-amber-500/50 hover:bg-amber-500/5" onClick={() => onAuction(player)} disabled={!auctionEligible}>
            <Gavel className="h-3.5 w-3.5" /> Leilão {!auctionEligible && <span className="text-[8px] text-muted-foreground">(65+)</span>}
          </Button>
          <div className="flex items-center gap-1.5">
            {editingNumber ? (
              <div className="flex items-center gap-1 w-full">
                <Input type="number" min={1} max={99} value={shirtNumber}
                  onChange={(e) => setShirtNumber(Math.min(99, Math.max(1, Number(e.target.value) || 1)))}
                  className="h-9 w-16 text-xs rounded-xl" />
                <Button size="sm" className="h-9 px-3 text-xs rounded-xl" onClick={() => { onChangeNumber(player.id, shirtNumber); setEditingNumber(false); }}>OK</Button>
                <Button size="sm" variant="ghost" className="h-9 px-2 text-xs" onClick={() => setEditingNumber(false)}>✕</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5 rounded-xl border-border/50 w-full" onClick={() => { setShirtNumber(player.shirtNumber || 1); setEditingNumber(true); }}>
                <Hash className="h-3.5 w-3.5" /> Camisa {player.shirtNumber || '—'}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs: Atributos / Estatísticas */}
        <Tabs defaultValue="attributes" className="w-full">
          <TabsList className="grid grid-cols-2 w-full rounded-xl h-9">
            <TabsTrigger value="attributes" className="text-xs rounded-lg">📊 Atributos</TabsTrigger>
            <TabsTrigger value="stats" className="text-xs rounded-lg">📈 Estatísticas</TabsTrigger>
          </TabsList>

          <TabsContent value="attributes" className="space-y-2 mt-3">
            {player.position === 'GOL' && player.attributes.goalkeeping != null && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold">🧤 Defesa de Goleiro</span>
                  <span className={`text-base font-black ${getAttrColor(player.attributes.goalkeeping)}`}>{player.attributes.goalkeeping}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${getAttrBarColor(player.attributes.goalkeeping)} transition-all`} style={{ width: `${player.attributes.goalkeeping}%` }} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(player.attributes).filter(([key, val]) => val != null && !(player.position === 'GOL' && key === 'goalkeeping')).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-accent/40 border border-border/20">
                  <span className="text-xs shrink-0">{attrLabels[key]?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-muted-foreground truncate">{attrLabels[key]?.label || key}</span>
                      <span className={`text-xs font-bold ${getAttrColor(val as number)}`}>{val}</span>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${getAttrBarColor(val as number)} transition-all`} style={{ width: `${val}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-3 mt-3">
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Jogos', value: player.gamesPlayed, icon: '🏟️' },
                { label: 'Gols', value: player.goals, icon: '⚽' },
                { label: 'Assist.', value: player.assists, icon: '🅰️' },
                { label: 'Média', value: avgRating ? avgRating.toFixed(1) : '—', icon: '⭐' },
              ].map((s, i) => (
                <div key={i} className="text-center p-2.5 rounded-xl bg-accent/40 border border-border/20">
                  <p className="text-sm mb-0.5">{s.icon}</p>
                  <p className="text-base font-black text-foreground">{s.value}</p>
                  <p className="text-[9px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {player.matchRating != null && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-accent/40 border border-border/20">
                <span className="text-xs text-muted-foreground">Nota última partida</span>
                <span className={`text-lg font-black ${player.matchRating >= 7 ? 'text-emerald-400' : player.matchRating >= 5.5 ? 'text-primary' : 'text-red-400'}`}>
                  ★ {player.matchRating.toFixed(1)}
                </span>
              </div>
            )}

            {/* History */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2">📜 Histórico de Clubes</p>
              {player.history && player.history.length > 0 ? (
                <div className="space-y-1.5">
                  {player.history.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] p-2.5 rounded-xl bg-accent/30 border border-border/20">
                      <div className="shrink-0"><ShieldCrest primaryColor="#4a5568" secondaryColor="#a0aec0" pattern="solid" shape="classic" size={22} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs truncate">{h.club}</p>
                        <p className="text-[9px] text-muted-foreground">T{h.seasonStart}{h.seasonEnd ? `–T${h.seasonEnd}` : ' (atual)'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span>{h.games}j</span>
                        <span>⚽{h.goals}</span>
                        <span>🅰️{h.assists}</span>
                        {h.avgRating > 0 && <span className="font-bold text-primary">★{h.avgRating.toFixed(1)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground p-2.5 rounded-xl bg-accent/30">Sem histórico de clubes anteriores.</p>
              )}
            </div>

            {/* Market Value */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2">💰 Valor de Mercado</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-[9px] text-muted-foreground">Base</p>
                  <p className="text-sm font-black text-emerald-400">R${(getPlayerBaseValue(player) / 1000).toFixed(0)}k</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
                  <p className="text-[9px] text-muted-foreground">Total</p>
                  <p className="text-sm font-black text-primary">R${(getPlayerValue(player) / 1000).toFixed(0)}k</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ─── Main Squad View ───
  return (
    <div className="space-y-3">
      <Tabs defaultValue="squad" className="w-full">
        <TabsList className="grid grid-cols-2 w-full rounded-xl h-9">
          <TabsTrigger value="squad" className="text-xs gap-1.5 rounded-lg">
            <Users className="h-3.5 w-3.5" /> Elenco ({players.length})
          </TabsTrigger>
          <TabsTrigger value="contracts" className="text-xs gap-1.5 rounded-lg">
            <FileText className="h-3.5 w-3.5" /> Contratos
            {expiringPlayers.length > 0 && <Badge variant="destructive" className="ml-1 h-4 px-1 text-[8px]">{expiringPlayers.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="squad" className="space-y-3 mt-3">
          {/* Squad Overview */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2.5 rounded-xl bg-accent/50 border border-border/20">
              <p className="text-base font-black text-foreground">{players.length}</p>
              <p className="text-[9px] text-muted-foreground">Jogadores</p>
            </div>
            <div className="text-center p-2.5 rounded-xl bg-accent/50 border border-border/20">
              <p className="text-base font-black text-primary">{avgOvr}</p>
              <p className="text-[9px] text-muted-foreground">Média OVR</p>
            </div>
            <div className="text-center p-2.5 rounded-xl bg-accent/50 border border-border/20">
              <p className="text-base font-black text-foreground">R${(totalSalary / 1000).toFixed(0)}k</p>
              <p className="text-[9px] text-muted-foreground">Folha/mês</p>
            </div>
            <div className="text-center p-2.5 rounded-xl bg-accent/50 border border-border/20">
              <p className={`text-base font-black ${injuredCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{injuredCount}</p>
              <p className="text-[9px] text-muted-foreground">Lesionados</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 smooth-scroll">
            <button
              className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${!filterPos ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-accent/30 text-muted-foreground border border-transparent hover:bg-accent/50'}`}
              onClick={() => setFilterPos(null)}
            >
              Todos
            </button>
            {posOrder.map(pos => {
              const count = players.filter(p => p.position === pos).length;
              return (
                <button
                  key={pos}
                  className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${filterPos === pos ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-accent/30 text-muted-foreground border border-transparent hover:bg-accent/50'}`}
                  onClick={() => setFilterPos(filterPos === pos ? null : pos)}
                >
                  {pos} ({count})
                </button>
              );
            })}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground shrink-0">Ordenar:</span>
            {(['position', 'overall', 'age', 'salary'] as const).map(s => (
              <button
                key={s}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${sortBy === s ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setSortBy(s)}
              >
                {s === 'position' ? 'Posição' : s === 'overall' ? 'OVR' : s === 'age' ? 'Idade' : 'Salário'}
              </button>
            ))}
          </div>

          {/* Player List */}
          <div className="space-y-1.5">
            {sorted.map(player => {
              const avgRating = player.seasonRatings && player.seasonRatings.length > 0
                ? (player.seasonRatings.reduce((a: number, b: number) => a + b, 0) / player.seasonRatings.length) : null;
              const ovr = getOvrColor(player.overall);

              return (
                <div
                  key={player.id}
                  className={`
                    group flex items-center gap-2.5 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer
                    ${player.injury ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10' :
                      player.contract <= 1 ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10' :
                      'border-border/20 bg-card/50 hover:bg-accent/50 hover:border-border/40'}
                  `}
                  onClick={() => setViewingPlayer(player)}
                >
                  {/* OVR */}
                  <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 border ${ovr.border} ${ovr.bg}`}>
                    <span className={`text-sm font-black leading-none ${ovr.text}`}>{player.overall}</span>
                    <span className="text-[7px] text-muted-foreground">OVR</span>
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Badge className={`text-[8px] px-1 py-0 h-4 font-bold border ${posColors[player.position]}`} variant="outline">{player.position}</Badge>
                      <span className="font-semibold text-xs text-foreground truncate">{player.name}</span>
                      {player.personality && personalityLabels[player.personality] && (
                        <span className="text-xs shrink-0">{personalityLabels[player.personality].emoji}</span>
                      )}
                      {player.injury && (
                        <Badge className="text-[8px] px-1 h-4 gap-0.5 bg-red-500/20 text-red-400 border-red-500/30 shrink-0" variant="outline">
                          <HeartPulse className="h-2.5 w-2.5" />{player.injury.weeksRemaining}j
                        </Badge>
                      )}
                      {player.contract <= 1 && !player.injury && (
                        <span className="text-[9px] text-amber-400 font-bold shrink-0">⚠️</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{player.age}a</span>
                      <span className="text-primary font-medium">R${(player.salary / 1000).toFixed(0)}k</span>
                      <span>📄{player.contract}a</span>
                      {player.goals > 0 && <span>⚽{player.goals}</span>}
                      {player.assists > 0 && <span>🅰️{player.assists}</span>}
                      {avgRating && (
                        <span className={`font-bold ${avgRating >= 7 ? 'text-emerald-400' : avgRating >= 5.5 ? 'text-primary' : 'text-red-400'}`}>
                          ★{avgRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stamina mini bar */}
                  <div className="w-7 shrink-0 flex flex-col items-center gap-0.5">
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${getStaminaColor(player.stamina)}`} style={{ width: `${player.stamina}%` }} />
                    </div>
                    <span className="text-[8px] text-muted-foreground">{player.stamina}%</span>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground/60 shrink-0 transition-colors" />
                </div>
              );
            })}
          </div>

          {sorted.length === 0 && filterPos && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Nenhum jogador na posição {filterPos}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="contracts" className="space-y-3 mt-3">
          {expiringPlayers.length > 0 && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
              <span className="text-lg">⚠️</span>
              <p className="text-xs text-red-400 font-medium">
                {expiringPlayers.length} jogador(es) com contrato expirando! Renove ou eles sairão.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {[...players].sort((a, b) => a.contract - b.contract).map(player => {
              const isExpiring = player.contract <= 1;
              const salary = offerSalary[player.id] ?? player.salary;
              const duration = offerDuration[player.id] ?? 1;
              const renewalCost = salary * duration * 12;
              const canAfford = budget >= renewalCost;
              const salaryValid = salary >= player.salary;

              return (
                <div key={player.id} className={`p-3 rounded-xl border ${isExpiring ? 'border-red-500/30 bg-red-500/5' : 'border-border/20 bg-card/50'}`}>
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className={`text-[9px] font-bold border ${posColors[player.position]}`} variant="outline">{player.position}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs truncate">{player.name}</p>
                      <p className="text-[10px] text-muted-foreground">{player.age}a • OVR {player.overall}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-black ${isExpiring ? 'text-red-400' : 'text-foreground'}`}>
                        {player.contract}a {isExpiring && '⚠️'}
                      </p>
                      <p className="text-[9px] text-muted-foreground">R${(player.salary / 1000).toFixed(0)}k/mês</p>
                    </div>
                  </div>

                  {/* Renewal Controls */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Salário (mín: R${(player.salary / 1000).toFixed(0)}k)</label>
                      <Input
                        type="number"
                        className="h-8 text-xs rounded-lg"
                        min={player.salary}
                        step={1000}
                        value={salary}
                        onChange={(e) => setOfferSalary(prev => ({ ...prev, [player.id]: Math.max(player.salary, Number(e.target.value) || player.salary) }))}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Duração (1–5 anos)</label>
                      <Input
                        type="number"
                        className="h-8 text-xs rounded-lg"
                        min={1}
                        max={5}
                        value={duration}
                        onChange={(e) => setOfferDuration(prev => ({ ...prev, [player.id]: Math.min(5, Math.max(1, Number(e.target.value) || 1)) }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      Custo: <span className="font-bold text-foreground">R${(renewalCost / 1000).toFixed(0)}k</span>
                    </p>
                    <Button
                      size="sm"
                      className="h-8 px-4 text-xs gap-1.5 rounded-lg"
                      disabled={!canAfford || !salaryValid}
                      onClick={() => onRenewContract(player.id, salary, duration)}
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Renovar
                    </Button>
                  </div>
                  {!canAfford && <p className="text-[9px] text-red-400 mt-1">Orçamento insuficiente!</p>}
                  {!salaryValid && <p className="text-[9px] text-red-400 mt-1">Salário deve ser ≥ ao atual!</p>}
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
