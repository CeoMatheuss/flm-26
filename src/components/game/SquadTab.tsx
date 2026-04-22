import { Player, personalityLabels } from '@/types/game';
import { ShieldCrest } from './ShieldCrest';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { X, CheckCircle, Tag, HeartPulse, ArrowLeft, Hash, ArrowLeftRight, Gavel, Users, FileText, ChevronRight, Trash2, Eye, ArrowUp, ArrowDown, Package, Shirt, Armchair, Repeat, Zap, Wand2, Target } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { getPlayerBaseValue, getPlayerValue, isPlayerGem, getValueTrend } from '@/utils/playerGenerator';
import { RescindModal } from './RescindModal';
import { formatMoney } from '@/lib/formatMoney';
import { toast } from 'sonner';
import type { TacticsConfig, Formation } from '@/types/tactics';
import { formationPositions } from '@/types/tactics';

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
  transferBudget?: number;
  onRescindPlayer?: (player: Player, fee: number) => Promise<void> | void;
  onReorderPlayers?: (newOrder: Player[]) => void;
  tactics?: TacticsConfig;
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

const STARTERS_END = 11; // 0-10 = titulares (11 jogadores)
const RESERVES_END = 18; // 11-17 = reservas (7 jogadores no banco)

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

function getMoraleColor(val: number): string {
  if (val >= 70) return 'bg-emerald-500';
  if (val >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function getMoraleEmoji(morale: number): string {
  if (morale >= 80) return '😄';
  if (morale >= 60) return '🙂';
  if (morale >= 40) return '😐';
  if (morale >= 20) return '😟';
  return '😡';
}

type Group = 'starters' | 'reserves' | 'out';

function getPlayerGroup(idx: number): Group {
  if (idx < STARTERS_END) return 'starters';
  if (idx < RESERVES_END) return 'reserves';
  return 'out';
}

export function SquadTab({ players, budget, clubName, trainingLevel, onRest, onRenewContract, onListForSale, onLoanOut, onAuction, onChangeNumber, canLoanOut, userId, transferBudget, onRescindPlayer, onReorderPlayers, tactics }: Props) {
  const [offerSalary, setOfferSalary] = useState<Record<string, number>>({});
  const [offerDuration, setOfferDuration] = useState<Record<string, number>>({});
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);
  const [shirtNumber, setShirtNumber] = useState<number>(0);
  const [editingNumber, setEditingNumber] = useState(false);
  const [filterPos, setFilterPos] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'position' | 'overall' | 'age' | 'salary' | 'value'>('position');
  const [rescindCandidate, setRescindCandidate] = useState<Player | null>(null);
  const [squadSubTab, setSquadSubTab] = useState<'starters' | 'reserves' | 'out'>('starters');
  const [pendingSwap, setPendingSwap] = useState<{ player: Player; from: Group } | null>(null);
  const effectiveTransferBudget = transferBudget ?? Math.floor(budget * 0.4);

  // Cancel pending swap with Esc
  useEffect(() => {
    if (!pendingSwap) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPendingSwap(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pendingSwap]);

  const posOrder = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

  const expiringPlayers = players.filter(p => p.contract <= 1);
  const avgOvr = players.length > 0 ? Math.round(players.reduce((s, p) => s + p.overall, 0) / players.length) : 0;
  const totalSalary = players.reduce((s, p) => s + p.salary, 0);
  const injuredCount = players.filter(p => p.injury).length;

  // Separate players into 3 groups by their original index in the array
  const groupedPlayers = useMemo(() => {
    const starters: { player: Player; idx: number }[] = [];
    const reserves: { player: Player; idx: number }[] = [];
    const out: { player: Player; idx: number }[] = [];
    players.forEach((p, idx) => {
      const entry = { player: p, idx };
      if (idx < STARTERS_END) starters.push(entry);
      else if (idx < RESERVES_END) reserves.push(entry);
      else out.push(entry);
    });
    return { starters, reserves, out };
  }, [players]);

  // Apply filter/sort to a group
  const processList = (list: { player: Player; idx: number }[]) => {
    return list
      .filter(({ player }) => !filterPos || player.position === filterPos)
      .sort((a, b) => {
        if (sortBy === 'overall') return b.player.overall - a.player.overall;
        if (sortBy === 'age') return a.player.age - b.player.age;
        if (sortBy === 'salary') return b.player.salary - a.player.salary;
        if (sortBy === 'value') return getPlayerValue(b.player) - getPlayerValue(a.player);
        return posOrder.indexOf(a.player.position) - posOrder.indexOf(b.player.position);
      });
  };

  // Move a player to the start of a target group while preserving overall order
  const moveToGroup = (playerId: string, target: Group) => {
    if (!onReorderPlayers) return;
    const idx = players.findIndex(p => p.id === playerId);
    if (idx < 0) return;
    const player = players[idx];
    const without = players.filter(p => p.id !== playerId);

    let insertAt = 0;
    if (target === 'starters') {
      insertAt = 0; // promote to top of starters
    } else if (target === 'reserves') {
      // Place right after the 11th starter (so it sits in reserves zone)
      insertAt = Math.min(without.length, STARTERS_END);
    } else {
      // 'out' — put it at position RESERVES_END so it falls outside both groups
      insertAt = Math.min(without.length, RESERVES_END);
    }
    const newOrder = [...without.slice(0, insertAt), player, ...without.slice(insertAt)];
    onReorderPlayers(newOrder);
  };

  // Swap two players' positions in the array (for substitutions)
  const swapPlayers = (playerAId: string, playerBId: string) => {
    if (!onReorderPlayers) return;
    const idxA = players.findIndex(p => p.id === playerAId);
    const idxB = players.findIndex(p => p.id === playerBId);
    if (idxA < 0 || idxB < 0) return;
    const newOrder = [...players];
    [newOrder[idxA], newOrder[idxB]] = [newOrder[idxB], newOrder[idxA]];
    const pA = players[idxA];
    const pB = players[idxB];
    const groupA = getPlayerGroup(idxA);
    const groupB = getPlayerGroup(idxB);
    if (groupA === 'starters' && groupB !== 'starters') {
      toast.success(`${pB.name} entrou no time titular no lugar de ${pA.name}`);
    } else if (groupB === 'starters' && groupA !== 'starters') {
      toast.success(`${pA.name} entrou no time titular no lugar de ${pB.name}`);
    } else {
      toast.success(`${pA.name} ↔ ${pB.name}`);
    }
    onReorderPlayers(newOrder);
  };

  // Start a swap: pre-select player and switch sub-tab to candidate group
  const startSwap = (player: Player, from: Group) => {
    setPendingSwap({ player, from });
    if (from === 'starters') {
      // Take this starter to the bench: open reserves tab
      setSquadSubTab('reserves');
    } else {
      // Promote a reserve/out: open starters tab
      setSquadSubTab('starters');
    }
  };

  // Complete a pending swap by clicking a candidate
  const completeSwap = (candidateId: string) => {
    if (!pendingSwap) return;
    swapPlayers(pendingSwap.player.id, candidateId);
    setPendingSwap(null);
    // Return to whichever tab the original player belongs to so user sees the result
    setSquadSubTab(pendingSwap.from);
  };

  // ─── Auto-Lineup: build best XI based on tactics formation ───
  const autoLineup = () => {
    if (!onReorderPlayers) {
      toast.error('Não disponível neste modo');
      return;
    }
    const formation: Formation = (tactics?.formation as Formation) || '4-4-2';
    const slots = formationPositions[formation] || formationPositions['4-4-2'];
    // Build flat slot list (e.g. [GOL, ZAG, ZAG, LAT, LAT, ...])
    const slotList: string[] = [];
    Object.entries(slots).forEach(([pos, count]) => {
      for (let i = 0; i < count; i++) slotList.push(pos);
    });
    // Pad to 11 (in case formation has 10) — fill with MEI
    while (slotList.length < 11) slotList.push('MEI');

    // Position groups for partial-match scoring
    const groupOf = (p: string): 'def' | 'mid' | 'atk' | 'gk' => {
      if (p === 'GOL') return 'gk';
      if (p === 'ZAG' || p === 'LAT') return 'def';
      if (p === 'VOL' || p === 'MEI') return 'mid';
      return 'atk';
    };

    const scorePlayer = (player: Player, slotPos: string) => {
      let score = (player.overall || 50) * 10 + (player.stamina || 50);
      if (player.position === slotPos) score += 1000;
      else if (groupOf(player.position) === groupOf(slotPos)) score += 500;
      if (player.injury) score -= 1000;
      return score;
    };

    const available = [...players];
    const starters: Player[] = [];

    for (const slot of slotList) {
      let bestIdx = -1;
      let bestScore = -Infinity;
      available.forEach((p, idx) => {
        const s = scorePlayer(p, slot);
        if (s > bestScore) { bestScore = s; bestIdx = idx; }
      });
      if (bestIdx >= 0) {
        starters.push(available[bestIdx]);
        available.splice(bestIdx, 1);
      }
    }

    // Reserves: sort remaining by OVR, take 7
    available.sort((a, b) => (b.overall || 0) - (a.overall || 0));
    const reserves = available.slice(0, 7);
    const rest = available.slice(7);

    const newOrder = [...starters, ...reserves, ...rest];
    onReorderPlayers(newOrder);
    const avgOvrStart = Math.round(starters.reduce((s, p) => s + (p.overall || 0), 0) / Math.max(1, starters.length));
    toast.success(`✅ Time montado: ${formation} • OVR médio ${avgOvrStart}`);
  };
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
                {isPlayerGem(player) && <span className="text-amber-400" title="Joia!">💎</span>}
              </div>
              <h2 className="text-lg font-black text-foreground leading-tight">{player.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{posLabels[player.position]} • {player.age} anos</p>
            </div>
          </div>

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

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5 rounded-xl border-border/50 hover:border-primary/50 hover:bg-primary/5" onClick={() => onListForSale(player.id)} disabled={players.length <= 11}>
            <Tag className="h-3.5 w-3.5" /> Anunciar no Mercado
          </Button>
          <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5 rounded-xl border-border/50 hover:border-cyan-500/50 hover:bg-cyan-500/5" onClick={() => onLoanOut(player.id)} disabled={!canLoanOut || (players.length <= 11)}>
            <ArrowLeftRight className="h-3.5 w-3.5" /> Emprestar
          </Button>
          <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5 rounded-xl border-border/50 hover:border-amber-500/50 hover:bg-amber-500/5" onClick={() => onAuction(player)} disabled={!auctionEligible}>
            <Gavel className="h-3.5 w-3.5" /> Leilão {!auctionEligible && <span className="text-[8px] text-muted-foreground">(65+)</span>}
          </Button>
          {onRescindPlayer && (
            <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => setRescindCandidate(player)} disabled={players.length <= 11}>
              <Trash2 className="h-3.5 w-3.5" /> Rescindir
            </Button>
          )}
          <div className="flex items-center gap-1.5 col-span-2">
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

            <div>
              <p className="text-xs font-bold text-muted-foreground mb-2">💰 Valor de Mercado</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-[9px] text-muted-foreground">Base</p>
                  <p className="text-sm font-black text-emerald-400">{formatMoney(getPlayerBaseValue(player))}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
                  <p className="text-[9px] text-muted-foreground">Total</p>
                  <p className="text-sm font-black text-primary">{formatMoney(getPlayerValue(player))}</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Rescind modal */}
        {onRescindPlayer && (
          <RescindModal
            player={rescindCandidate}
            transferBudgetAvailable={effectiveTransferBudget}
            onClose={() => setRescindCandidate(null)}
            onConfirm={async (p, fee) => { await onRescindPlayer(p, fee); setViewingPlayer(null); }}
          />
        )}
      </div>
    );
  }

  // ─── Compact Player Row (single line, scannable) ───
  const renderPlayerRow = (player: Player, currentGroup: Group) => {
    const avgRating = player.seasonRatings && player.seasonRatings.length > 0
      ? (player.seasonRatings.reduce((a: number, b: number) => a + b, 0) / player.seasonRatings.length) : null;
    const ovr = getOvrColor(player.overall);
    const value = getPlayerValue(player);
    const trend = getValueTrend(player);
    const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
    const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground';
    const auctionEligible = player.overall >= 65 && player.age <= 35;

    const stateBorder = player.injury
      ? 'border-l-red-500'
      : player.contract <= 1
      ? 'border-l-amber-500'
      : 'border-l-transparent';

    // Swap mode logic
    const isPendingSelf = pendingSwap?.player.id === player.id;
    const isCandidate = !!pendingSwap && !isPendingSelf && (
      (pendingSwap.from === 'starters' && currentGroup !== 'starters') ||
      (pendingSwap.from !== 'starters' && currentGroup === 'starters')
    );
    const samePosition = pendingSwap && pendingSwap.player.position === player.position;
    const swapHighlight = isPendingSelf
      ? 'ring-2 ring-primary/60 bg-primary/5'
      : isCandidate
        ? (samePosition ? 'ring-1 ring-emerald-500/50 bg-emerald-500/5 cursor-pointer hover:bg-emerald-500/10' : 'cursor-pointer hover:ring-1 hover:ring-primary/40')
        : '';

    const handleRowClick = () => {
      if (isCandidate) {
        completeSwap(player.id);
      } else {
        setViewingPlayer(player);
      }
    };

    return (
      <div
        key={player.id}
        className={`group rounded-xl border border-border/15 bg-card/40 hover:bg-card/70 hover:border-border/40 transition-all border-l-2 ${stateBorder} ${swapHighlight}`}
      >
        <div className="flex items-center gap-2 p-2">
          <button
            onClick={handleRowClick}
            className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 border ${ovr.border} ${ovr.bg} hover:scale-105 transition-transform`}
          >
            <span className={`text-sm font-black leading-none ${ovr.text}`}>{player.overall}</span>
            <span className="text-[7px] text-muted-foreground -mt-0.5">OVR</span>
          </button>

          <button
            onClick={handleRowClick}
            className="flex-1 min-w-0 text-left"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge className={`text-[9px] px-1 py-0 h-4 font-bold border ${posColors[player.position]}`} variant="outline">{player.position}</Badge>
              {player.shirtNumber != null && player.shirtNumber > 0 && (
                <span className="text-[9px] font-mono text-muted-foreground">#{player.shirtNumber}</span>
              )}
              <span className="font-semibold text-xs text-foreground truncate">{player.name}</span>
              {isPlayerGem(player) && <span className="text-amber-400 text-xs" title="Joia!">💎</span>}
              {player.personality && personalityLabels[player.personality] && (
                <span className="text-xs shrink-0" title={personalityLabels[player.personality].label}>{personalityLabels[player.personality].emoji}</span>
              )}
              {player.injury && (
                <Badge className="text-[8px] px-1 h-4 gap-0.5 bg-red-500/20 text-red-400 border-red-500/30" variant="outline">
                  <HeartPulse className="h-2.5 w-2.5" />{player.injury.weeksRemaining}j
                </Badge>
              )}
              {isCandidate && samePosition && (
                <Badge className="text-[8px] px-1 h-4 bg-emerald-500/20 text-emerald-400 border-emerald-500/30" variant="outline">
                  ✓ mesma posição
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
              <span>{player.age}a</span>
              <span className="text-primary font-medium">R${(player.salary / 1000).toFixed(0)}k/m</span>
              <span className={player.contract <= 1 ? 'text-amber-400 font-bold' : ''}>📄{player.contract}a</span>
              <span className={`font-bold ${trendColor}`} title={`Valor: ${formatMoney(value)}`}>
                💰{(value / 1000).toFixed(0)}k {trendIcon}
              </span>
              <span title="Jogos">🏟️{player.gamesPlayed ?? 0}</span>
              <span title="Gols">⚽{player.goals ?? 0}</span>
              <span title="Assistências">🅰️{player.assists ?? 0}</span>
              {avgRating != null && (
                <span className={`font-bold ${avgRating >= 7 ? 'text-emerald-400' : avgRating >= 5.5 ? 'text-primary' : 'text-red-400'}`}>
                  ★{avgRating.toFixed(1)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 flex-1 max-w-[110px]">
                <span className="text-[8px] text-muted-foreground">⚡</span>
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${getStaminaColor(player.stamina)}`} style={{ width: `${player.stamina}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-1 flex-1 max-w-[110px]">
                <span className="text-[8px]">{getMoraleEmoji(player.morale)}</span>
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${getMoraleColor(player.morale)}`} style={{ width: `${player.morale}%` }} />
                </div>
              </div>
            </div>
          </button>

          <div className="flex items-center gap-0.5 shrink-0">
            {!pendingSwap && (
              <>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => setViewingPlayer(player)} title="Ver perfil">
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                {onReorderPlayers && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-1.5 text-[10px] gap-1 text-primary hover:bg-primary/10"
                    title={currentGroup === 'starters' ? 'Tirar do time titular' : 'Subir ao time titular'}
                    onClick={() => startSwap(player, currentGroup)}
                  >
                    <Repeat className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{currentGroup === 'starters' ? 'Tirar' : 'Subir'}</span>
                  </Button>
                )}
                {auctionEligible && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-400 hover:bg-amber-500/10" onClick={() => onAuction(player)} title="Leilão">
                    <Gavel className="h-3.5 w-3.5" />
                  </Button>
                )}
              </>
            )}
            {isCandidate && (
              <Button
                size="sm"
                className="h-7 px-2 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={(e) => { e.stopPropagation(); completeSwap(player.id); }}
              >
                <CheckCircle className="h-3.5 w-3.5" /> Trocar
              </Button>
            )}
            {isPendingSelf && (
              <Badge className="text-[9px] bg-primary/15 text-primary border-primary/30" variant="outline">
                ⚡ Selecionado
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  const startersList = processList(groupedPlayers.starters);
  const reservesList = processList(groupedPlayers.reserves);
  const outList = processList(groupedPlayers.out);

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
          <div className="grid grid-cols-4 gap-1.5">
            <div className="text-center p-2 rounded-xl bg-gradient-to-br from-primary/10 to-card border border-primary/20">
              <p className="text-base font-black text-foreground leading-none">{players.length}</p>
              <p className="text-[9px] text-muted-foreground mt-1">Plantel</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-gradient-to-br from-emerald-500/10 to-card border border-emerald-500/20">
              <p className="text-base font-black text-emerald-400 leading-none">{avgOvr}</p>
              <p className="text-[9px] text-muted-foreground mt-1">OVR Médio</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-gradient-to-br from-amber-500/10 to-card border border-amber-500/20">
              <p className="text-base font-black text-amber-400 leading-none">R${(totalSalary / 1000).toFixed(0)}k</p>
              <p className="text-[9px] text-muted-foreground mt-1">Folha/mês</p>
            </div>
            <div className={`text-center p-2 rounded-xl bg-gradient-to-br ${injuredCount > 0 ? 'from-red-500/10 border-red-500/20' : 'from-muted/20 border-border/20'} to-card border`}>
              <p className={`text-base font-black leading-none ${injuredCount > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>{injuredCount}</p>
              <p className="text-[9px] text-muted-foreground mt-1">Lesionados</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${!filterPos ? 'bg-primary text-primary-foreground' : 'bg-accent/40 text-muted-foreground hover:bg-accent/70'}`}
              onClick={() => setFilterPos(null)}
            >
              Todos ({players.length})
            </button>
            {posOrder.map(pos => {
              const count = players.filter(p => p.position === pos).length;
              return (
                <button
                  key={pos}
                  className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${filterPos === pos ? 'bg-primary text-primary-foreground' : 'bg-accent/40 text-muted-foreground hover:bg-accent/70'}`}
                  onClick={() => setFilterPos(filterPos === pos ? null : pos)}
                >
                  {pos} ({count})
                </button>
              );
            })}
            <div className="shrink-0 ml-auto flex items-center gap-1 border-l border-border/30 pl-1.5">
              <span className="text-[9px] text-muted-foreground shrink-0">↕</span>
              {(['position', 'overall', 'age', 'value'] as const).map(s => (
                <button
                  key={s}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${sortBy === s ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setSortBy(s)}
                >
                  {s === 'position' ? 'Pos' : s === 'overall' ? 'OVR' : s === 'age' ? 'Idade' : 'Valor'}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-Lineup button */}
          <Button
            size="sm"
            variant="outline"
            className="w-full h-9 gap-1.5 text-[11px] rounded-xl border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50"
            onClick={autoLineup}
            disabled={!onReorderPlayers || players.length < 11}
            title={!onReorderPlayers ? 'Não disponível' : tactics?.formation ? `Monta o XI ideal para ${tactics.formation}` : 'Monta o XI ideal (4-4-2)'}
          >
            <Wand2 className="h-3.5 w-3.5 text-primary" />
            <span className="font-bold">Montar Time Automaticamente</span>
            {tactics?.formation && <Badge variant="outline" className="text-[9px] h-4 px-1 ml-1 border-primary/40 text-primary">{tactics.formation}</Badge>}
          </Button>

          {pendingSwap && (
            <div className="sticky top-0 z-30 rounded-xl border-2 border-primary/50 bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 backdrop-blur p-3 flex items-center gap-3 shadow-lg">
              <div className="shrink-0 w-9 h-9 rounded-lg flex flex-col items-center justify-center bg-primary/20 border border-primary/40">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-primary font-bold">⚡ Trocando</p>
                <p className="text-xs font-bold text-foreground truncate">
                  <Badge className={`text-[8px] px-1 mr-1 h-3.5 ${posColors[pendingSwap.player.position]}`} variant="outline">{pendingSwap.player.position}</Badge>
                  {pendingSwap.player.name} ({pendingSwap.player.overall})
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Toque em quem {pendingSwap.from === 'starters' ? 'entra no time' : 'sai do time'}
                </p>
              </div>
              <Button size="sm" variant="ghost" className="h-8 px-2 text-[10px] gap-1 text-muted-foreground hover:text-destructive shrink-0" onClick={() => setPendingSwap(null)}>
                <X className="h-3.5 w-3.5" /> Cancelar
              </Button>
            </div>
          )}

          <Tabs value={squadSubTab} onValueChange={(v) => setSquadSubTab(v as 'starters' | 'reserves' | 'out')} className="w-full">
            <TabsList className="grid grid-cols-3 w-full rounded-xl h-11 p-1">
              <TabsTrigger value="starters" className="text-[11px] gap-0.5 rounded-lg flex-col h-full data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400">
                <div className="flex items-center gap-1">
                  <Shirt className="h-3 w-3" /> <span className="font-bold">Titulares</span>
                </div>
                <span className="text-[9px] opacity-70">{groupedPlayers.starters.length}/11</span>
              </TabsTrigger>
              <TabsTrigger value="reserves" className="text-[11px] gap-0.5 rounded-lg flex-col h-full data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-400">
                <div className="flex items-center gap-1">
                  <Armchair className="h-3 w-3" /> <span className="font-bold">Banco</span>
                </div>
                <span className="text-[9px] opacity-70">{groupedPlayers.reserves.length} reservas</span>
              </TabsTrigger>
              <TabsTrigger value="out" className="text-[11px] gap-0.5 rounded-lg flex-col h-full data-[state=active]:bg-muted data-[state=active]:text-foreground">
                <div className="flex items-center gap-1">
                  <Package className="h-3 w-3" /> <span className="font-bold">Fora</span>
                </div>
                <span className="text-[9px] opacity-70">{groupedPlayers.out.length} jogadores</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="starters" className="mt-3 space-y-2">
              <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-2 flex items-start gap-2">
                <Shirt className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  <span className="text-emerald-400 font-bold">11 titulares</span> que começam as partidas. Listados primeiro na escalação tática.
                </p>
              </div>
              <div className="space-y-1.5">
                {startersList.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">Nenhum titular {filterPos && `na posição ${filterPos}`}.</div>
                ) : (
                  startersList.map(({ player }) => renderPlayerRow(player, 'starters'))
                )}
              </div>
            </TabsContent>

            <TabsContent value="reserves" className="mt-3 space-y-2">
              <div className="rounded-lg bg-blue-500/5 border border-blue-500/15 p-2 flex items-start gap-2">
                <Armchair className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  <span className="text-blue-400 font-bold">Banco de reservas</span> — disponíveis para substituições durante o jogo.
                </p>
              </div>
              <div className="space-y-1.5">
                {reservesList.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">Nenhum reserva {filterPos && `na posição ${filterPos}`}.</div>
                ) : (
                  reservesList.map(({ player }) => renderPlayerRow(player, 'reserves'))
                )}
              </div>
            </TabsContent>

            <TabsContent value="out" className="mt-3 space-y-2">
              <div className="rounded-lg bg-muted/30 border border-border/20 p-2 flex items-start gap-2">
                <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  <span className="text-foreground font-bold">Fora do elenco</span> — não convocados para os jogos. Treinam normalmente.
                </p>
              </div>
              <div className="space-y-1.5">
                {outList.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">Nenhum jogador fora do elenco {filterPos && `na posição ${filterPos}`}.</div>
                ) : (
                  outList.map(({ player }) => renderPlayerRow(player, 'out'))
                )}
              </div>
            </TabsContent>
          </Tabs>
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

      {/* Tactics summary widget */}
      <TacticsSummaryWidget tactics={tactics} players={players} avgOvr={avgOvr} />

      {/* Rescind modal */}
      {onRescindPlayer && (
        <RescindModal
          player={rescindCandidate}
          transferBudgetAvailable={effectiveTransferBudget}
          onClose={() => setRescindCandidate(null)}
          onConfirm={async (p, fee) => { await onRescindPlayer(p, fee); }}
        />
      )}
    </div>
  );
}
