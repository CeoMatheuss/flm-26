import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShoppingCart, Tag, Send, Check, X, Clock, DollarSign, Gift, Trophy, Target, Swords, AlertTriangle, ArrowLeftRight, RefreshCw, Users, HelpCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Player } from '@/types/game';
import { LoanedPlayer } from '@/hooks/useGame';
import { getPlayerValue } from '@/utils/playerGenerator';

interface TransferListing {
  id: string;
  seller_id: string;
  seller_club_name: string;
  player_data: any;
  player_name: string;
  player_position: string;
  player_overall: number;
  player_age: number;
  asking_price: number;
  status: string;
  listed_at: string;
  transfer_count: number;
}

interface TransferOffer {
  id: string;
  listing_id: string;
  buyer_id: string;
  buyer_club_name: string;
  offered_price: number;
  offered_salary: number;
  offered_contract_years: number;
  bonus_goals: number;
  bonus_assists: number;
  bonus_games: number;
  bonus_titles: number;
  signing_bonus: number;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

const posColors: Record<string, string> = {
  GOL: 'bg-primary/15 text-primary',
  ZAG: 'bg-blue-500/15 text-blue-400',
  LAT: 'bg-cyan-500/15 text-cyan-400',
  VOL: 'bg-emerald-500/15 text-emerald-400',
  MEI: 'bg-purple-500/15 text-purple-400',
  ATA: 'bg-red-500/15 text-red-400',
};

interface Props {
  userId: string;
  clubName: string;
  players: Player[];
  budget: number;
  onPlayerSold: (playerId: string, price: number) => void;
  onPlayerBought: (playerData: any, price: number, salary: number, contractYears: number) => void;
  loanedPlayers?: LoanedPlayer[];
  onLoanOut?: (playerId: string) => void;
  onLoanIn?: (player: Player) => void;
}

export function OnlineMarketTab({ userId, clubName, players, budget, onPlayerSold, onPlayerBought, loanedPlayers = [], onLoanOut, onLoanIn }: Props) {
  const [listings, setListings] = useState<TransferListing[]>([]);
  const [myOffers, setMyOffers] = useState<TransferOffer[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<TransferOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [offerDialogId, setOfferDialogId] = useState<string | null>(null);

  // Offer form state
  const [offerPrice, setOfferPrice] = useState(0);
  const [offerSalary, setOfferSalary] = useState(500);
  const [offerYears, setOfferYears] = useState(2);
  const [bonusGoals, setBonusGoals] = useState(0);
  const [bonusAssists, setBonusAssists] = useState(0);
  const [bonusGames, setBonusGames] = useState(0);
  const [bonusTitles, setBonusTitles] = useState(0);
  const [signingBonus, setSigningBonus] = useState(0);

  const loadListings = useCallback(async () => {
    const { data } = await supabase
      .from('transfer_listings')
      .select('*')
      .eq('status', 'active')
      .order('listed_at', { ascending: false });
    if (data) setListings(data as unknown as TransferListing[]);
  }, []);

  const loadMyOffers = useCallback(async () => {
    const { data } = await supabase
      .from('transfer_offers')
      .select('*')
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setMyOffers(data as unknown as TransferOffer[]);
  }, [userId]);

  const loadIncomingOffers = useCallback(async () => {
    // Get my listing IDs first
    const { data: myListings } = await supabase
      .from('transfer_listings')
      .select('id')
      .eq('seller_id', userId)
      .eq('status', 'active');

    if (myListings && myListings.length > 0) {
      const ids = myListings.map(l => l.id);
      const { data } = await supabase
        .from('transfer_offers')
        .select('*')
        .in('listing_id', ids)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (data) setIncomingOffers(data as unknown as TransferOffer[]);
    } else {
      setIncomingOffers([]);
    }
  }, [userId]);

  useEffect(() => {
    loadListings();
    loadMyOffers();
    loadIncomingOffers();

    const ch1 = supabase.channel('transfer-listings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfer_listings' }, () => { loadListings(); loadIncomingOffers(); })
      .subscribe();

    const ch2 = supabase.channel('transfer-offers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfer_offers' }, () => { loadMyOffers(); loadIncomingOffers(); })
      .subscribe();

    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [loadListings, loadMyOffers, loadIncomingOffers]);

  const listPlayer = async (player: Player) => {
    setLoading(true);
    const askingPrice = getPlayerValue(player);

    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) { toast.error('Sessão expirada'); setLoading(false); return; }

    const res = await supabase.functions.invoke('process-transfer', {
      body: {
        action: 'list',
        playerData: player,
        playerName: player.name,
        playerPosition: player.position,
        playerOverall: player.overall,
        playerAge: player.age,
        askingPrice,
        clubName,
      },
    });

    if (res.error || res.data?.error) {
      toast.error(res.data?.error || 'Erro ao listar jogador');
    } else {
      toast.success(`${player.name} listado no mercado por R$${(askingPrice / 1000).toFixed(0)}k!`);
      loadListings();
    }
    setLoading(false);
  };

  const delistPlayer = async (listingId: string) => {
    setLoading(true);
    const res = await supabase.functions.invoke('process-transfer', {
      body: { action: 'delist', listingId },
    });
    if (res.error || res.data?.error) {
      toast.error(res.data?.error || 'Erro ao retirar jogador');
    } else {
      toast.success('Jogador retirado do mercado.');
      loadListings();
    }
    setLoading(false);
  };

  const makeOffer = async (listing: TransferListing) => {
    if (offerPrice <= 0) { toast.error('Defina um valor de proposta'); return; }
    if (offerSalary <= 0) { toast.error('Defina um salário'); return; }
    if (budget < offerPrice) { toast.error('Orçamento insuficiente!'); return; }

    setLoading(true);
    const res = await supabase.functions.invoke('process-transfer', {
      body: {
        action: 'offer',
        listingId: listing.id,
        offeredPrice: offerPrice,
        offeredSalary: offerSalary,
        contractYears: offerYears,
        bonusGoals,
        bonusAssists,
        bonusGames,
        bonusTitles,
        signingBonus,
        clubName,
      },
    });

    if (res.error || res.data?.error) {
      toast.error(res.data?.error || 'Erro ao enviar proposta');
    } else {
      toast.success(`Proposta enviada para ${listing.player_name}!`);
      setOfferDialogId(null);
      loadMyOffers();
    }
    setLoading(false);
  };

  const respondOffer = async (offerId: string, accept: boolean, listing?: TransferListing) => {
    setLoading(true);
    const res = await supabase.functions.invoke('process-transfer', {
      body: {
        action: 'respond',
        offerId,
        response: accept ? 'accepted' : 'rejected',
        rejectionReason: accept ? null : 'Recusada pelo clube vendedor.',
      },
    });

    if (res.error || res.data?.error) {
      toast.error(res.data?.error || 'Erro ao responder proposta');
    } else if (res.data?.playerAccepted === false) {
      toast.warning(res.data.reason || 'Jogador recusou a proposta.');
    } else if (res.data?.playerAccepted === true) {
      toast.success(res.data.message || 'Transferência concluída!');
      // Seller: remove player from squad, add money
      if (listing) {
        const offer = incomingOffers.find(o => o.id === offerId);
        if (offer) {
          onPlayerSold(listing.player_data?.id, offer.offered_price);
        }
      }
    } else {
      toast.success(accept ? 'Proposta aceita!' : 'Proposta recusada.');
    }

    loadListings();
    loadMyOffers();
    loadIncomingOffers();
    setLoading(false);
  };

  const openOfferDialog = (listing: TransferListing) => {
    setOfferPrice(listing.asking_price);
    setOfferSalary(listing.player_data?.salary || 500);
    setOfferYears(2);
    setBonusGoals(0);
    setBonusAssists(0);
    setBonusGames(0);
    setBonusTitles(0);
    setSigningBonus(0);
    setOfferDialogId(listing.id);
  };

  const myListings = listings.filter(l => l.seller_id === userId);
  const otherListings = listings.filter(l => l.seller_id !== userId);
  const listablePlayers = players.filter(p => !myListings.some(l => l.player_data?.id === p.id));

  // If negotiating, show full negotiation page
  if (offerDialogId) {
    const listing = listings.find(l => l.id === offerDialogId);
    if (!listing) { setOfferDialogId(null); return null; }
    const currentSalary = listing.player_data?.salary || 500;

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setOfferDialogId(null)}>
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Mercado
        </Button>

        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Negociar — {listing.player_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Player info */}
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${posColors[listing.player_position] || 'bg-muted'}`}>{listing.player_position}</span>
                <div>
                  <p className="text-sm font-bold">{listing.player_name}</p>
                  <p className="text-xs text-muted-foreground">{listing.player_age}a • OVR {listing.player_overall} • {listing.seller_club_name}</p>
                </div>
              </div>
              <p className="text-xs mt-2">Preço pedido: <span className="font-bold text-emerald-400">R${(listing.asking_price / 1000).toFixed(0)}k</span> • Salário atual: <span className="font-bold">R${currentSalary}/mês</span></p>
            </div>

            {/* Price */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Valor oferecido ao clube (R$)</label>
              <Input type="number" value={offerPrice} onChange={e => setOfferPrice(Math.max(0, Number(e.target.value)))} className="h-9 text-xs mt-1" />
              <div className="flex gap-1 mt-1.5">
                {[0.8, 1.0, 1.2, 1.5].map(mult => (
                  <Button key={mult} size="sm" variant="outline" className="h-6 px-2 text-[9px]" onClick={() => setOfferPrice(Math.floor(listing.asking_price * mult))}>
                    {mult === 1 ? '100%' : `${Math.round(mult * 100)}%`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Salary */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">💰 Salário mensal (R$) — atual: R${currentSalary}</label>
              <Input type="number" value={offerSalary} onChange={e => setOfferSalary(Math.max(100, Number(e.target.value)))} className="h-9 text-xs mt-1" />
              {offerSalary < currentSalary && (
                <p className="text-[10px] text-orange-400 mt-0.5">⚠️ Salário inferior ao atual — menor chance de aceite</p>
              )}
            </div>

            {/* Contract */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">📄 Duração do contrato</label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(y => (
                  <Button key={y} size="sm" variant={offerYears === y ? 'default' : 'outline'} className="h-7 px-3 text-xs" onClick={() => setOfferYears(y)}>
                    {y} ano{y > 1 ? 's' : ''}
                  </Button>
                ))}
              </div>
            </div>

            {/* Signing Bonus */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Gift className="h-3.5 w-3.5" /> Luvas / Bônus de assinatura (R$)</label>
              <Input type="number" value={signingBonus} onChange={e => setSigningBonus(Math.max(0, Number(e.target.value)))} className="h-9 text-xs mt-1" />
            </div>

            {/* Performance Bonuses */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <p className="text-xs font-semibold text-muted-foreground">🎯 Bônus por desempenho (R$ por ocorrência)</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px] text-[10px] leading-relaxed p-3">
                      <p className="font-bold mb-1">📖 Como funcionam os bônus?</p>
                      <p>• <strong>Luvas:</strong> Pagamento único na assinatura. Aumenta a chance de aceite se o salário for menor que o atual.</p>
                      <p>• <strong>Bônus por gol/assist:</strong> Aumentam motivação e desempenho individual. Valores altos podem tornar o jogador "fominha" (tenta finalizar mais, prejudicando o coletivo).</p>
                      <p>• <strong>Bônus por jogo:</strong> Motivação equilibrada, sem efeito fominha.</p>
                      <p>• <strong>Bônus por título:</strong> Grande motivação, sem efeito fominha.</p>
                      <p className="mt-1 text-muted-foreground">Bônus compensam salários menores e influenciam o comportamento em campo!</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">⚽ Por gol</label>
                  <Input type="number" value={bonusGoals} onChange={e => setBonusGoals(Math.max(0, Number(e.target.value)))} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">🅰️ Por assistência</label>
                  <Input type="number" value={bonusAssists} onChange={e => setBonusAssists(Math.max(0, Number(e.target.value)))} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">🏟️ Por jogo</label>
                  <Input type="number" value={bonusGames} onChange={e => setBonusGames(Math.max(0, Number(e.target.value)))} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">🏆 Por título</label>
                  <Input type="number" value={bonusTitles} onChange={e => setBonusTitles(Math.max(0, Number(e.target.value)))} className="h-8 text-xs" />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-primary/10 rounded-lg p-3 text-xs">
              <p className="font-bold text-primary mb-1">📊 Resumo da proposta:</p>
              <p>💵 Valor ao clube: R${(offerPrice / 1000).toFixed(0)}k</p>
              <p>💰 Salário: R${offerSalary}/mês ({offerSalary >= currentSalary ? '✅ ≥ atual' : '⚠️ < atual'})</p>
              <p>📄 Contrato: {offerYears} ano{offerYears > 1 ? 's' : ''}</p>
              {signingBonus > 0 && <p>🎁 Luvas: R${(signingBonus / 1000).toFixed(0)}k</p>}
              {(bonusGoals + bonusAssists + bonusGames + bonusTitles) > 0 && (
                <p>🎯 Bônus: {[bonusGoals > 0 && `⚽R$${bonusGoals}`, bonusAssists > 0 && `🅰️R$${bonusAssists}`, bonusGames > 0 && `🏟️R$${bonusGames}`, bonusTitles > 0 && `🏆R$${(bonusTitles / 1000).toFixed(0)}k`].filter(Boolean).join(' • ')}</p>
              )}
              {bonusGoals > 50000 && (
                <p className="text-orange-400 mt-1">⚠️ Bônus por gol elevado pode tornar o jogador "fominha"</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-10 text-xs" onClick={() => setOfferDialogId(null)}>
                Cancelar
              </Button>
              <Button className="flex-1 h-10 text-xs" onClick={() => makeOffer(listing)} disabled={loading || offerPrice <= 0 || budget < offerPrice}>
                <Send className="h-3.5 w-3.5 mr-1.5" /> Enviar Proposta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="browse" className="text-[10px] sm:text-xs">🌐 Mercado</TabsTrigger>
          <TabsTrigger value="list" className="text-[10px] sm:text-xs">📋 Listar</TabsTrigger>
          <TabsTrigger value="loans" className="text-[10px] sm:text-xs">🔄 Emprestar</TabsTrigger>
          <TabsTrigger value="offers" className="text-[10px] sm:text-xs">
            📩 Propostas {incomingOffers.length > 0 && <Badge variant="destructive" className="ml-1 text-[8px] h-4 px-1">{incomingOffers.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sent" className="text-[10px] sm:text-xs">📤 Enviadas</TabsTrigger>
        </TabsList>

        {/* BROWSE MARKET */}
        <TabsContent value="browse" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Mercado Online ({otherListings.length} jogadores)</h3>
            <Button variant="outline" size="sm" onClick={loadListings} className="text-xs gap-1">
              <RefreshCw className="h-3 w-3" /> Atualizar
            </Button>
          </div>

          {otherListings.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">Nenhum jogador disponível no mercado online.</CardContent></Card>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-1.5">
                {otherListings.map(listing => (
                  <Card key={listing.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-2 sm:p-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${posColors[listing.player_position] || 'bg-muted'}`}>{listing.player_position}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{listing.player_name}</p>
                          <p className="text-[10px] text-muted-foreground">{listing.player_age}a • OVR {listing.player_overall} • {listing.seller_club_name}</p>
                        </div>
                        {listing.transfer_count > 2 && (
                          <Badge variant="outline" className="text-[8px] border-yellow-500/30 text-yellow-400 shrink-0">
                            <ArrowLeftRight className="h-2.5 w-2.5 mr-0.5" /> {listing.transfer_count}x
                          </Badge>
                        )}
                        <div className="text-right shrink-0">
                          <p className="text-[9px] text-muted-foreground">Preço</p>
                          <p className="text-xs font-bold text-emerald-400">R${(listing.asking_price / 1000).toFixed(0)}k</p>
                        </div>
                        <Button
                          size="sm"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => openOfferDialog(listing)}
                          disabled={loading || budget < listing.asking_price * 0.5}
                        >
                          <Send className="h-3 w-3 mr-1" /> Proposta
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* LIST PLAYERS */}
        <TabsContent value="list" className="space-y-3">
          <h3 className="font-semibold text-sm">Listar Jogadores ({myListings.length}/5)</h3>

          {myListings.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground">Seus jogadores no mercado:</p>
              {myListings.map(l => (
                <Card key={l.id} className="border-primary/30">
                  <CardContent className="p-2 flex items-center gap-2">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${posColors[l.player_position] || 'bg-muted'}`}>{l.player_position}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{l.player_name}</p>
                      <p className="text-[10px] text-muted-foreground">OVR {l.player_overall} • R${(l.asking_price / 1000).toFixed(0)}k</p>
                    </div>
                    <Button size="sm" variant="destructive" className="h-6 px-2 text-[9px]" onClick={() => delistPlayer(l.id)} disabled={loading}>
                      <X className="h-3 w-3 mr-0.5" /> Retirar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {myListings.length < 5 && (
            <ScrollArea className="max-h-[40vh]">
              <div className="space-y-1">
                {listablePlayers.map(player => {
                  const value = getPlayerValue(player);
                  return (
                    <Card key={player.id} className="hover:border-primary/30 transition-colors">
                      <CardContent className="p-2 flex items-center gap-2">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${posColors[player.position]}`}>{player.position}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{player.name}</p>
                          <p className="text-[10px] text-muted-foreground">{player.age}a • OVR {player.overall}</p>
                        </div>
                        <p className="text-[10px] text-emerald-400 font-bold shrink-0">R${(value / 1000).toFixed(0)}k</p>
                        <Button size="sm" variant="outline" className="h-6 px-2 text-[9px]" onClick={() => listPlayer(player)} disabled={loading || players.length <= 11}>
                          <Tag className="h-3 w-3 mr-0.5" /> Listar
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* LOANS */}
        <TabsContent value="loans" className="space-y-3">
          <h3 className="font-semibold text-sm">🔄 Empréstimos</h3>

          {loanedPlayers.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground">Empréstimos ativos:</p>
              {loanedPlayers.map((loan, i) => (
                <Card key={i} className="border-cyan-500/20">
                  <CardContent className="p-2 flex items-center gap-2">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${posColors[loan.player.position] || 'bg-muted'}`}>{loan.player.position}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{loan.player.name}</p>
                      <p className="text-[10px] text-muted-foreground">OVR {loan.player.overall} • {loan.player.age}a</p>
                    </div>
                    <Badge variant={loan.direction === 'out' ? 'destructive' : 'default'} className="text-[8px]">
                      {loan.direction === 'out' ? '↗ Cedido' : '↙ Recebido'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {onLoanOut && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground">Emprestar jogador (máx 3 cedidos):</p>
              <ScrollArea className="max-h-[40vh]">
                <div className="space-y-1">
                  {players.filter(p => !loanedPlayers.some(l => l.player.id === p.id)).map(player => (
                    <Card key={player.id} className="hover:border-cyan-500/30 transition-colors">
                      <CardContent className="p-2 flex items-center gap-2">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 ${posColors[player.position]}`}>{player.position}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{player.name}</p>
                          <p className="text-[10px] text-muted-foreground">{player.age}a • OVR {player.overall}</p>
                        </div>
                        <Button size="sm" variant="outline" className="h-6 px-2 text-[9px]" onClick={() => onLoanOut(player.id)} disabled={players.length <= 11 || loanedPlayers.filter(l => l.direction === 'out').length >= 3}>
                          <ArrowLeftRight className="h-3 w-3 mr-0.5" /> Emprestar
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {loanedPlayers.length === 0 && (
            <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">Nenhum empréstimo ativo.</CardContent></Card>
          )}
        </TabsContent>

        {/* INCOMING OFFERS */}
        <TabsContent value="offers" className="space-y-3">
          <h3 className="font-semibold text-sm">Propostas Recebidas ({incomingOffers.length})</h3>

          {incomingOffers.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">Nenhuma proposta pendente.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {incomingOffers.map(offer => {
                const listing = myListings.find(l => l.id === offer.listing_id);
                return (
                  <Card key={offer.id} className="border-yellow-500/30">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold">{listing?.player_name || 'Jogador'}</p>
                          <p className="text-[10px] text-muted-foreground">De: {offer.buyer_club_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-400">R${(offer.offered_price / 1000).toFixed(0)}k</p>
                          <p className="text-[9px] text-muted-foreground">pedido: R${((listing?.asking_price || 0) / 1000).toFixed(0)}k</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[9px]">
                        <div className="bg-muted/30 rounded p-1">💰 Salário: R${offer.offered_salary}/mês</div>
                        <div className="bg-muted/30 rounded p-1">📄 Contrato: {offer.offered_contract_years}a</div>
                        {offer.signing_bonus > 0 && <div className="bg-muted/30 rounded p-1">🎁 Luvas: R${(offer.signing_bonus / 1000).toFixed(0)}k</div>}
                        {offer.bonus_goals > 0 && <div className="bg-muted/30 rounded p-1">⚽ Bônus/gol: R${offer.bonus_goals}</div>}
                        {offer.bonus_assists > 0 && <div className="bg-muted/30 rounded p-1">🅰️ Bônus/assist: R${offer.bonus_assists}</div>}
                        {offer.bonus_games > 0 && <div className="bg-muted/30 rounded p-1">🏟️ Bônus/jogo: R${offer.bonus_games}</div>}
                        {offer.bonus_titles > 0 && <div className="bg-muted/30 rounded p-1">🏆 Bônus/título: R${(offer.bonus_titles / 1000).toFixed(0)}k</div>}
                      </div>

                      <div className="flex gap-1.5">
                        <Button size="sm" className="flex-1 h-7 text-[10px] gap-1" onClick={() => respondOffer(offer.id, true, listing)}>
                          <Check className="h-3 w-3" /> Aceitar
                        </Button>
                        <Button size="sm" variant="destructive" className="flex-1 h-7 text-[10px] gap-1" onClick={() => respondOffer(offer.id, false)}>
                          <X className="h-3 w-3" /> Recusar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* SENT OFFERS */}
        <TabsContent value="sent" className="space-y-3">
          <h3 className="font-semibold text-sm">Propostas Enviadas ({myOffers.length})</h3>

          {myOffers.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-xs text-muted-foreground">Nenhuma proposta enviada.</CardContent></Card>
          ) : (
            <div className="space-y-1.5">
              {myOffers.slice(0, 20).map(offer => {
                const listing = listings.find(l => l.id === offer.listing_id);
                const statusColors: Record<string, string> = {
                  pending: 'bg-yellow-500/15 text-yellow-400',
                  accepted: 'bg-emerald-500/15 text-emerald-400',
                  rejected: 'bg-red-500/15 text-red-400',
                  player_rejected: 'bg-orange-500/15 text-orange-400',
                };
                const statusLabels: Record<string, string> = {
                  pending: 'Pendente',
                  accepted: 'Aceita ✓',
                  rejected: 'Recusada',
                  player_rejected: 'Jogador recusou',
                };
                return (
                  <Card key={offer.id}>
                    <CardContent className="p-2 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{listing?.player_name || 'Jogador'}</p>
                        <p className="text-[10px] text-muted-foreground">R${(offer.offered_price / 1000).toFixed(0)}k • Sal: R${offer.offered_salary}/mês</p>
                        {offer.rejection_reason && (
                          <p className="text-[9px] text-orange-400 mt-0.5">💬 {offer.rejection_reason}</p>
                        )}
                      </div>
                      <Badge className={`text-[8px] ${statusColors[offer.status] || 'bg-muted'}`}>
                        {statusLabels[offer.status] || offer.status}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
