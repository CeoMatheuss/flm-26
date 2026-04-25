import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Gavel, Crown, Clock, TrendingUp, User, History, Sparkles } from 'lucide-react';
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

// Tiered minimum increment (mirrors SQL `place_auction_bid`)
function minIncrement(currentBid: number): number {
  if (currentBid < 200_000) return 10_000;
  if (currentBid < 500_000) return 25_000;
  if (currentBid < 1_000_000) return 50_000;
  if (currentBid < 5_000_000) return 100_000;
  if (currentBid < 20_000_000) return 250_000;
  return 500_000;
}

function fmtMoney(v: number): string {
  // Formato compacto: <1M -> "K" inteiro; >=1M -> "M" com 1 casa só se necessário
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    const formatted = m % 1 === 0 ? m.toFixed(0) : m.toFixed(1).replace('.', ',');
    return `R$ ${formatted}M`;
  }
  if (v >= 1_000) return `R$ ${Math.round(v / 1_000)}K`;
  return `R$ ${v}`;
}

function fmtDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

/**
 * Lance mínimo padronizado por faixa de OVR (espelha a validação do servidor):
 *   <60  -> 100K
 *   60-69 -> 200K
 *   70-79 -> 300K
 *   80+   -> 500K
 */
function startPriceByOverall(overall: number): number {
  const ovr = Math.max(40, Math.min(99, overall || 60));
  if (ovr >= 80) return 500_000;
  if (ovr >= 70) return 300_000;
  if (ovr >= 60) return 200_000;
  return 100_000;
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

  // Eligible players: 60+ overall, <= 35 age
  const eligiblePlayers = players.filter(p => p.overall >= 60 && (p.age || 25) <= 35);

  const computeStartPrice = (player: any): number => startPriceByOverall(player.overall || 60);

  const handleCreateAuction = async (player: any) => {
    const startPrice = computeStartPrice(player);
    setLoading(true);
    const { error } = await supabase.from('player_auctions').insert([{
      seller_id: userId,
      seller_club_name: clubName,
      player_data: player,
      player_name: player.name,
      player_overall: player.overall,
      player_age: player.age || 25,
      min_price: startPrice,
      current_bid: startPrice,
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
      {/* Header */}
      <Card className="border-purple-500/30 bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-blue-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gavel className="h-5 w-5 text-purple-400" />
            Leilão de Jogadores
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Encerramento sempre <strong>domingo às 17:00</strong>. Lance mínimo escalonado (10k a 500k+ por incremento). Lances nos últimos 5 minutos estendem o leilão em +10 min (anti-snipe).
          </p>
        </CardHeader>
        {!isPremium && (
          <CardContent className="pt-0 pb-3">
            <div className="bg-yellow-500/10 rounded-lg p-2 flex items-center gap-2 text-[10px] text-yellow-400">
              <Crown className="h-3.5 w-3.5 shrink-0" />
              <span>Você pode colocar jogadores em leilão, mas precisa ser <strong>Premium</strong> para dar lances.</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Create Auction */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Colocar Jogador em Leilão</CardTitle>
          <p className="text-[10px] text-muted-foreground">Jogadores elegíveis: 60+ OVR, até 35 anos. Preço inicial calculado automaticamente.</p>
        </CardHeader>
        <CardContent>
          {eligiblePlayers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum jogador elegível (60+ OVR, ≤35 anos)</p>
          ) : (
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1.5">
                {eligiblePlayers.map(p => {
                  const startPrice = computeStartPrice(p);
                  return (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-[9px] px-1.5 shrink-0">{p.overall} OVR</Badge>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{p.name}</p>
                          <p className="text-[9px] text-muted-foreground">{p.position} • {p.age || 25} anos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] text-muted-foreground">início {fmtMoney(startPrice)}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[9px]"
                          onClick={() => handleCreateAuction(p)}
                          disabled={loading}
                        >
                          Leiloar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Active Auctions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-400" />
            Leilões Ativos ({auctions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auctions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum leilão ativo no momento.</p>
          ) : (
            <div className="space-y-2">
              {auctions.map(a => {
                const inc = minIncrement(a.current_bid);
                const minNextBid = a.current_bidder_id ? a.current_bid + inc : a.min_price;
                const isMyAuction = a.seller_id === userId && !a.is_system;
                const isMyBid = a.current_bidder_id === userId;
                const closing = isCloseToEnd(a.expires_at);
                return (
                  <Card key={a.id} className={`border-border/50 ${isMyBid ? 'border-green-500/30' : isMyAuction ? 'border-purple-500/30' : ''} ${closing ? 'ring-1 ring-orange-500/40' : ''}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <Badge className="text-[8px] px-1 py-0 h-4 bg-purple-500/20 text-purple-300 border-purple-500/30">
                              {a.player_overall} OVR
                            </Badge>
                            <span className="text-xs font-bold truncate">{a.player_name}</span>
                            <span className="text-[9px] text-muted-foreground">({a.player_age} anos)</span>
                            {a.is_system && (
                              <Badge className="text-[8px] px-1 py-0 h-4 bg-amber-500/15 text-amber-300 border-amber-500/30">
                                <Sparkles className="h-2.5 w-2.5 mr-0.5" /> ADM
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" /> {a.seller_club_name}</span>
                            <span className={`flex items-center gap-0.5 ${closing ? 'text-orange-400 font-semibold' : ''}`}>
                              <Clock className="h-2.5 w-2.5" /> {getTimeLeft(a.expires_at)}
                            </span>
                            <span className="text-[8px] opacity-70">fim {fmtDateShort(a.expires_at)}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-[9px] text-muted-foreground">Lance atual</p>
                          <p className="text-sm font-black text-purple-400">{fmtMoney(a.current_bid)}</p>
                          {a.current_bidder_name && (
                            <p className="text-[8px] text-muted-foreground">por {a.current_bidder_name}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30 gap-2 flex-wrap">
                        <p className="text-[9px] text-muted-foreground">
                          Próximo mín: <span className="font-bold text-foreground">{fmtMoney(minNextBid)}</span> (+{fmtMoney(inc)})
                        </p>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[9px]"
                            onClick={() => {
                              setHistoryOpenId(a.id);
                              loadHistory(a.id);
                            }}
                          >
                            <History className="h-3 w-3 mr-1" /> Histórico
                          </Button>
                          {!isMyAuction && (
                            <Button
                              size="sm"
                              className="h-6 px-3 text-[9px] font-bold bg-purple-500 hover:bg-purple-600 text-white"
                              onClick={() => openBidDialog(a)}
                              disabled={loading || !isPremium}
                            >
                              {isPremium ? (<><Gavel className="h-3 w-3 mr-1" /> Dar Lance</>) : (<><Crown className="h-3 w-3 mr-1" /> Premium</>)}
                            </Button>
                          )}
                          {isMyAuction && (
                            <Badge variant="outline" className="text-[8px] text-purple-400 border-purple-500/30">Seu leilão</Badge>
                          )}
                          {isMyBid && !isMyAuction && (
                            <Badge className="text-[8px] bg-green-500/20 text-green-400 border-green-500/30 ml-1">Seu lance</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bid Dialog */}
      <Dialog open={!!bidDialogId} onOpenChange={(v) => { if (!v) setBidDialogId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Gavel className="h-4 w-4 text-purple-400" /> Dar lance em {dialogAuction?.player_name}
            </DialogTitle>
          </DialogHeader>
          {dialogAuction && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Lance atual: <span className="font-bold text-foreground">{fmtMoney(dialogAuction.current_bid)}</span><br />
                Mínimo permitido: <span className="font-bold text-purple-400">{fmtMoney(dialogMinBid)}</span> (incremento: {fmtMoney(dialogIncrement)})
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Seu lance (R$)</label>
                <Input
                  type="number"
                  step={dialogIncrement}
                  min={dialogMinBid}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(parseInt(e.target.value || '0', 10))}
                  className="h-9"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Equivalente a {fmtMoney(bidAmount)}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {[1, 2, 3, 5].map(m => {
                  const v = dialogMinBid + (m - 1) * dialogIncrement;
                  return (
                    <Button key={m} size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setBidAmount(v)}>
                      {fmtMoney(v)}
                    </Button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">Seu orçamento: {fmtMoney(budget)}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setBidDialogId(null)} disabled={loading}>Cancelar</Button>
            <Button size="sm" className="bg-purple-500 hover:bg-purple-600" onClick={submitBid} disabled={loading}>
              <Gavel className="h-3 w-3 mr-1" /> Confirmar Lance
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
