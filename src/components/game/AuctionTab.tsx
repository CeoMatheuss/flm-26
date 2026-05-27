import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Gavel, Crown, Clock, TrendingUp, User, History, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useLiveMatchGuard } from './LiveMatchGuard';

interface Auction {
  id: string;
  seller_id: string;
  seller_club_name: string;
  player_data: any;
  player_name: string;
  player_overall: number;
  player_age: number;
  min_price: number;
  current_bid: number;
  current_bidder_id: string | null;
  current_bidder_name: string | null;
  status: string;
  is_system: boolean;
  rarity: 'comum' | 'raro' | 'epico' | 'lendario';
  created_at: string;
  expires_at: string;
}

interface Bid {
  id: string;
  auction_id: string;
  bidder_id: string;
  bidder_name: string;
  amount: number;
  created_at: string;
}

interface Props {
  userId: string;
  clubName: string;
  players: any[];
  budget: number;
  isPremium: boolean;
  onSellPlayer?: (playerId: string) => void;
}

// Tiered minimum increment
function minIncrement(currentBid: number): number {
  if (currentBid < 500_000) return 10_000;
  if (currentBid < 1_000_000) return 50_000;
  return 100_000;
}

function fmtMoney(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR')}`;
}

function fmtDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

/**
 * Preço inicial baseado em OVR:
 * OVR 50 = 50K, 55 = 75K, 60 = 100K, 65 = 150K, 70 = 200K, 75 = 350K, 80 = 600K, 85 = 1M, 90 = 3M, 95 = 8M
 */
function startPriceByOverall(overall: number): number {
  const ovr = overall || 60;
  if (ovr >= 95) return 8_000_000;
  if (ovr >= 90) return 3_000_000;
  if (ovr >= 85) return 1_000_000;
  if (ovr >= 80) return 600_000;
  if (ovr >= 75) return 350_000;
  if (ovr >= 70) return 200_000;
  if (ovr >= 65) return 150_000;
  if (ovr >= 60) return 100_000;
  if (ovr >= 55) return 75_000;
  return 50_000;
}

function getRarityByOverall(overall: number): 'comum' | 'raro' | 'epico' | 'lendario' {
  if (overall >= 90) return 'lendario';
  if (overall >= 80) return 'epico';
  if (overall >= 70) return 'raro';
  return 'comum';
}

function getRarityStyles(rarity: string): string {
  switch (rarity) {
    case 'lendario': return 'border-amber-400/25 shadow-[0_0_15px_rgba(251,191,36,0.3)] bg-gradient-to-br from-amber-500/10 via-card to-amber-900/20';
    case 'epico': return 'border-purple-400/25 shadow-[0_0_10px_rgba(168,85,247,0.2)] bg-gradient-to-br from-purple-500/10 via-card to-purple-900/20';
    case 'raro': return 'border-blue-400/25 shadow-[0_0_8px_rgba(59,130,246,0.1)] bg-gradient-to-br from-blue-500/10 via-card to-blue-900/20';
    default: return 'border-border/50 bg-card';
  }
}

export function AuctionTab({ userId, clubName, players, budget, isPremium, onSellPlayer: _onSellPlayer }: Props) {
  const { guard } = useLiveMatchGuard();
  const onSellPlayer = _onSellPlayer ? guard(_onSellPlayer) : undefined;
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(false);
  const [bidDialogId, setBidDialogId] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [historyOpenId, setHistoryOpenId] = useState<string | null>(null);
  const [historyByAuction, setHistoryByAuction] = useState<Record<string, Bid[]>>({});

  const loadAuctions = async () => {
    const { data } = await supabase
      .from('player_auctions')
      .select('*')
      .eq('status', 'active')
      .order('expires_at', { ascending: true });
    if (data) setAuctions(data as unknown as Auction[]);
  };

  const loadHistory = async (auctionId: string) => {
    const { data } = await supabase
      .from('auction_bids' as any)
      .select('*')
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false });
    if (data) setHistoryByAuction(prev => ({ ...prev, [auctionId]: data as unknown as Bid[] }));
  };

  useEffect(() => {
    loadAuctions();
    const channel = supabase
      .channel('auctions-and-bids')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_auctions' }, () => loadAuctions())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'auction_bids' }, (payload: any) => {
        const aid = payload?.new?.auction_id;
        if (aid) loadHistory(aid);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Eligible players: 60+ overall, <= 35 age, AND not already in active auctions
  const activeAuctionPlayerIds = useMemo(() => auctions.map(a => a.player_data?.id).filter(Boolean), [auctions]);
  const eligiblePlayers = players.filter(p => 
    p.overall >= 60 && 
    (p.age || 25) <= 35 && 
    !activeAuctionPlayerIds.includes(p.id)
  );

  const computeStartPrice = (player: any): number => startPriceByOverall(player.overall || 60);

  const handleCreateAuction = async (player: any) => {
    const startPrice = computeStartPrice(player);
    setLoading(true);
    const { error } = await supabase.from('player_auctions').insert([{
      seller_id: userId,
      seller_club_name: clubName,
      player_data: player,
      player_id: player.id.includes('-') ? player.id : null, // Only set player_id if it's a valid UUID
      player_name: player.name,
      player_overall: player.overall,
      player_age: player.age || 25,
      min_price: startPrice,
      current_bid: startPrice,
      current_bidder_id: null, // Ensure seller is not the initial bidder
      current_bidder_name: null,
      rarity: getRarityByOverall(player.overall),
    }]);
    if (error) {
      toast.error('Erro ao criar leilão: ' + error.message);
    } else {
      toast.success(`${player.name} em leilão por ${fmtMoney(startPrice)}!`);
      if (onSellPlayer) onSellPlayer(player.id);
      loadAuctions();
    }
    setLoading(false);
  };

  const openBidDialog = (auction: Auction) => {
    const minBid = auction.current_bidder_id ? auction.current_bid + minIncrement(auction.current_bid) : auction.min_price;
    setBidAmount(minBid);
    setBidDialogId(auction.id);
  };

  const submitBid = async () => {
    const auction = auctions.find(a => a.id === bidDialogId);
    if (!auction) return;
    if (!isPremium) {
      toast.error('⭐ Apenas clubes Premium podem dar lances no leilão!');
      return;
    }
    if (budget < bidAmount) {
      toast.error(`Orçamento insuficiente! Necessário: ${fmtMoney(bidAmount)}`);
      return;
    }
    const maxAllowed = Math.floor(budget * 0.8);
    if (bidAmount > maxAllowed) {
      toast.error(`Lance máximo permitido: 80% do seu orçamento (${fmtMoney(maxAllowed)})`);
      return;
    }
    const minBid = auction.current_bidder_id ? auction.current_bid + minIncrement(auction.current_bid) : auction.min_price;
    if (bidAmount < minBid) {
      toast.error(`Lance mínimo: ${fmtMoney(minBid)}`);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('place_auction_bid', { _auction_id: auction.id, _amount: bidAmount });
    setLoading(false);
    if (error) {
      const msg = error.message || '';
      if (msg.includes('CANNOT_BID_OWN_AUCTION')) toast.error('Você não pode dar lance em seu próprio leilão.');
      else if (msg.includes('BID_TOO_LOW')) toast.error('Lance abaixo do mínimo permitido.');
      else if (msg.includes('BID_OVER_BUDGET_LIMIT')) toast.error('Lance acima do limite de 80% do seu orçamento.');
      else if (msg.includes('AUCTION_EXPIRED')) toast.error('Leilão já encerrado.');
      else if (msg.includes('AUCTION_CLOSED')) toast.error('Leilão fechado.');
      else toast.error('Erro ao dar lance: ' + msg);
      return;
    }
    const extended = (data as any)?.extended;
    toast.success(`Lance de ${fmtMoney(bidAmount)} registrado!${extended ? ' ⏱️ Leilão estendido em +10 min.' : ''}`);
    setBidDialogId(null);
    loadAuctions();
    loadHistory(auction.id);
  };

  const getTimeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Encerrado';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const isCloseToEnd = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return diff > 0 && diff <= 5 * 60 * 1000;
  };

  const dialogAuction = useMemo(() => auctions.find(a => a.id === bidDialogId), [bidDialogId, auctions]);
  const dialogMinBid = dialogAuction
    ? (dialogAuction.current_bidder_id ? dialogAuction.current_bid + minIncrement(dialogAuction.current_bid) : dialogAuction.min_price)
    : 0;
  const dialogIncrement = dialogAuction ? minIncrement(dialogAuction.current_bid) : 10000;

  return (
    <div className="space-y-4">
      {/* ── PREMIUM HERO ── */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 backdrop-blur-xl"
        style={{ background: 'linear-gradient(135deg, hsl(270 50% 10% / 0.7), hsl(220 45% 8% / 0.85), hsl(150 50% 10% / 0.5))' }}>
        <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-purple-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 14px, white 14px 15px)' }} />

        <div className="relative p-4">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-purple-500/30 blur-lg" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/15 to-purple-700/5 border border-purple-400/20 flex items-center justify-center">
                <Gavel className="h-6 w-6 text-purple-200" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black tracking-tight">Leilão Global</h2>
                <Badge variant="outline" className="text-[9px] gap-1 border-purple-500/30 bg-purple-500/10 text-purple-300">
                  <Sparkles className="h-2.5 w-2.5" /> AO VIVO
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                Encerramento <strong className="text-purple-300">Domingo às 17:00</strong>. Anti-snipe +10min nos minutos finais. Limite: <strong className="text-amber-300">80% do saldo</strong>.
              </p>
            </div>
          </div>

          {!isPremium && (
            <div className="mt-3 flex items-center gap-2 rounded-xl p-2.5 border border-amber-500/25 bg-amber-500/[0.06]">
              <Crown className="h-4 w-4 text-amber-300 shrink-0" />
              <p className="text-[10px] text-amber-200/90">
                Você pode <strong>leiloar jogadores</strong>, mas precisa ser <strong className="text-amber-300">Premium</strong> para dar lances.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── CREATE AUCTION ── */}
      <div className="rounded-2xl border border-white/5 bg-black/30 backdrop-blur-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-500/15 border border-teal-500/25 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-teal-300" />
            </div>
            <div>
              <h3 className="text-xs font-black">Colocar em Leilão</h3>
              <p className="text-[9px] text-muted-foreground">60+ OVR · até 35 anos · preço auto</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] border-white/10 bg-white/5">{eligiblePlayers.length} elegíveis</Badge>
        </div>
        <div className="p-3">
          {eligiblePlayers.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-6">Nenhum jogador elegível</p>
          ) : (
            <ScrollArea className="max-h-[220px]">
              <div className="space-y-1.5 pr-2">
                {eligiblePlayers.map(p => {
                  const startPrice = computeStartPrice(p);
                  const rarity = getRarityByOverall(p.overall);
                  const rarityRing = rarity === 'lendario' ? 'ring-amber-400/40' : rarity === 'epico' ? 'ring-purple-400/40' : rarity === 'raro' ? 'ring-blue-400/40' : 'ring-white/10';
                  return (
                    <div key={p.id} className={`group flex items-center justify-between gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5 hover:border-white/15 hover:bg-black/50 transition ring-1 ${rarityRing}`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-700/5 border border-purple-500/25 flex items-center justify-center shrink-0">
                          <span className="text-xs font-black text-purple-200">{p.overall}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{p.name}</p>
                          <p className="text-[9px] text-muted-foreground">{p.position} • {p.age || 25}a</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Início</p>
                          <p className="text-[10px] font-black text-teal-300 leading-none">{fmtMoney(startPrice)}</p>
                        </div>
                        <Button size="sm" className="h-7 px-2.5 text-[10px] rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white font-bold gap-1"
                          onClick={() => handleCreateAuction(p)} disabled={loading}>
                          <Gavel className="h-3 w-3" /> Leiloar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* ── ACTIVE AUCTIONS ── */}
      <div className="rounded-2xl border border-white/5 bg-black/30 backdrop-blur-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-purple-300" />
            </div>
            <h3 className="text-xs font-black">Leilões Ativos</h3>
          </div>
          <Badge variant="outline" className="text-[9px] border-purple-500/25 bg-purple-500/10 text-purple-300">{auctions.length}</Badge>
        </div>
        <div className="p-3">
          {auctions.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-8">Nenhum leilão ativo no momento.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
              {auctions.map(a => {
                const inc = minIncrement(a.current_bid);
                const minNextBid = a.current_bidder_id ? a.current_bid + inc : a.min_price;
                const isMyAuction = a.seller_id === userId && !a.is_system;
                const isMyBid = a.current_bidder_id === userId;
                const closing = isCloseToEnd(a.expires_at);
                const rarityStyle = getRarityStyles(a.rarity);
                const rarityLabel = a.rarity.charAt(0).toUpperCase() + a.rarity.slice(1);
                const rarityBadge = a.rarity === 'lendario' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : a.rarity === 'epico' ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' : a.rarity === 'raro' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'bg-white/5 text-muted-foreground border-white/10';
                return (
                  <div key={a.id} className={`relative overflow-hidden rounded-xl border p-3 transition-all ${rarityStyle} ${isMyBid ? 'ring-2 ring-teal-500/50' : isMyAuction ? 'ring-2 ring-purple-500/50' : ''} ${closing ? 'ring-2 ring-red-500/30' : ''}`}>
                    {closing && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge className="text-[8px] h-4 px-1.5 bg-red-500 text-white animate-pulse border-0">🔥 FINALIZANDO</Badge>
                      </div>
                    )}

                    <div className="flex items-start gap-2.5">
                      {/* OVR badge */}
                      <div className="relative shrink-0">
                        <div className="absolute inset-0 rounded-xl bg-purple-500/30 blur-md opacity-50" />
                        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/15 to-purple-700/5 border border-purple-400/20 flex flex-col items-center justify-center">
                          <span className="text-base font-black text-purple-100 leading-none">{a.player_overall}</span>
                          <span className="text-[8px] text-purple-300/80 font-bold mt-0.5">OVR</span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-black truncate">{a.player_name}</span>
                          {a.is_system && (
                            <Badge className="text-[8px] h-4 px-1 bg-amber-500/15 text-amber-300 border-amber-500/30">
                              <Sparkles className="h-2 w-2 mr-0.5" /> ADM
                            </Badge>
                          )}
                          <Badge variant="outline" className={`text-[8px] h-4 px-1 ${rarityBadge}`}>{rarityLabel}</Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mt-1 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-white/5">{a.player_age}a</span>
                          <span className="flex items-center gap-0.5 truncate"><User className="h-2.5 w-2.5" /> {a.seller_club_name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Current bid + timer */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg p-2 bg-black/40 border border-purple-500/20">
                        <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Lance atual</p>
                        <p className="text-sm font-black bg-gradient-to-r from-purple-300 to-purple-400 bg-clip-text text-transparent leading-none mt-0.5">{fmtMoney(a.current_bid)}</p>
                        {a.current_bidder_name && (
                          <p className="text-[8px] text-muted-foreground mt-1 truncate">por {a.current_bidder_name}</p>
                        )}
                      </div>
                      <div className={`rounded-lg p-2 bg-black/40 border ${closing ? 'border-red-500/20' : 'border-white/10'}`}>
                        <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Termina em</p>
                        <p className={`text-sm font-black leading-none mt-0.5 flex items-center gap-1 ${closing ? 'text-red-300 animate-pulse' : 'text-foreground'}`}>
                          <Clock className="h-3 w-3" /> {getTimeLeft(a.expires_at)}
                        </p>
                        <p className="text-[8px] text-muted-foreground mt-1 truncate">fim {fmtDateShort(a.expires_at)}</p>
                      </div>
                    </div>

                    {/* Footer actions */}
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[9px] text-muted-foreground">
                        Próx. mín: <span className="font-black text-foreground">{fmtMoney(minNextBid)}</span>
                        <span className="text-teal-400"> (+{fmtMoney(inc)})</span>
                      </p>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[9px] rounded-lg hover:bg-white/5"
                          onClick={() => { setHistoryOpenId(a.id); loadHistory(a.id); }}>
                          <History className="h-3 w-3 mr-1" /> Histórico
                        </Button>
                        {!isMyAuction && (
                          <Button size="sm"
                            className={`h-7 px-3 text-[10px] rounded-lg font-black gap-1 ${
                              isPremium
                                ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white shadow-[0_0_15px_-4px_rgb(168_85_247)]'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                            }`}
                            onClick={() => openBidDialog(a)} disabled={loading || !isPremium}>
                            {isPremium ? (<><Gavel className="h-3 w-3" /> Dar Lance</>) : (<><Crown className="h-3 w-3" /> Premium</>)}
                          </Button>
                        )}
                        {isMyAuction && (
                          <Badge variant="outline" className="text-[8px] text-purple-300 border-purple-500/30 bg-purple-500/5">Seu leilão</Badge>
                        )}
                        {isMyBid && !isMyAuction && (
                          <Badge className="text-[8px] bg-teal-500/20 text-teal-300 border-teal-500/30">Seu lance</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bid Dialog */}
      <Dialog open={!!bidDialogId} onOpenChange={(v) => { if (!v) setBidDialogId(null); }}>
        <DialogContent className="max-w-sm border-purple-500/20 bg-gradient-to-br from-[hsl(270_45%_8%)] to-[hsl(220_45%_6%)] backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Gavel className="h-3.5 w-3.5 text-purple-300" />
              </div>
              Dar lance em <span className="text-purple-300">{dialogAuction?.player_name}</span>
            </DialogTitle>
          </DialogHeader>
          {dialogAuction && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg p-2.5 bg-black/40 border border-white/10">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Lance atual</p>
                  <p className="text-sm font-black mt-0.5">{fmtMoney(dialogAuction.current_bid)}</p>
                </div>
                <div className="rounded-lg p-2.5 bg-purple-500/10 border border-purple-500/25">
                  <p className="text-[9px] text-purple-300/80 uppercase tracking-wider">Mín. permitido</p>
                  <p className="text-sm font-black text-purple-200 mt-0.5">{fmtMoney(dialogMinBid)}</p>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold flex items-center justify-between mb-1.5">
                  <span>Seu lance</span>
                  <span className="text-[9px] text-muted-foreground">incremento {fmtMoney(dialogIncrement)}</span>
                </label>
                <Input type="number" step={dialogIncrement} min={dialogMinBid} value={bidAmount}
                  onChange={(e) => setBidAmount(parseInt(e.target.value || '0', 10))}
                  className="h-11 text-base font-black rounded-lg bg-black/40 border-white/10 focus-visible:border-purple-500/25 text-purple-200" />
              </div>

              <div className="flex flex-wrap gap-1">
                {[1, 2, 3, 5].map(m => {
                  const v = dialogMinBid + (m - 1) * dialogIncrement;
                  return (
                    <button key={m} onClick={() => setBidAmount(v)}
                      className={`flex-1 h-8 text-[10px] rounded-md border font-bold transition ${
                        bidAmount === v ? 'bg-purple-500/20 border-purple-500/25 text-purple-200' : 'bg-white/[0.03] border-white/10 text-muted-foreground hover:bg-white/10'
                      }`}>
                      {fmtMoney(v)}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-lg p-2 bg-black/30 border border-white/5 text-[10px] text-muted-foreground flex items-center justify-between">
                <span>Orçamento: <strong className="text-foreground">{fmtMoney(budget)}</strong></span>
                <span>Máx (80%): <strong className="text-amber-300">{fmtMoney(Math.floor(budget * 0.8))}</strong></span>
              </div>

              {bidAmount > Math.floor(budget * 0.8) && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-[10px] text-red-300 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Lance excede o limite de 80% do orçamento.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setBidDialogId(null)} disabled={loading}>Cancelar</Button>
            <Button size="sm" onClick={submitBid} disabled={loading}
              className="rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white font-black gap-1.5 shadow-[0_0_20px_-5px_rgb(168_85_247)]">
              <Gavel className="h-3.5 w-3.5" /> Confirmar Lance
              <Sparkles className="h-3 w-3" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyOpenId} onOpenChange={(v) => { if (!v) setHistoryOpenId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-purple-400" /> Histórico de Lances
            </DialogTitle>
          </DialogHeader>
          {historyOpenId && (
            <ScrollArea className="max-h-[320px]">
              {(historyByAuction[historyOpenId] || []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum lance registrado ainda.</p>
              ) : (
                <div className="space-y-1.5">
                  {(historyByAuction[historyOpenId] || []).map((b, idx) => (
                    <div key={b.id} className={`flex items-center justify-between p-2 rounded-lg ${idx === 0 ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-muted/30'}`}>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate flex items-center gap-1">
                          {idx === 0 && <Sparkles className="h-3 w-3 text-purple-400 shrink-0" />}
                          {b.bidder_name}
                        </p>
                        <p className="text-[9px] text-muted-foreground">{fmtDateShort(b.created_at)}</p>
                      </div>
                      <p className={`text-sm font-black ${idx === 0 ? 'text-purple-400' : 'text-foreground'}`}>
                        {fmtMoney(b.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
