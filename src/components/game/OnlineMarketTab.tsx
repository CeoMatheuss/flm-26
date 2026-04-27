import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

import { ShoppingCart, Tag, Send, Check, X, Clock, DollarSign, Gift, Trophy, Target, Swords, AlertTriangle, ArrowLeftRight, RefreshCw, Users, HelpCircle, ArrowLeft, Eye, Search, TrendingUp, Sparkles, Globe, FileText, Timer, EyeOff } from 'lucide-react';
import { ShieldCrest } from './ShieldCrest';
import { SellerTeamView } from './SellerTeamView';
import { FreeAgentMarketPanel } from './FreeAgentMarketPanel';
import { AuctionTab } from './AuctionTab';
import { toast } from 'sonner';
import { Player } from '@/types/game';
import { LoanedPlayer } from '@/hooks/useGame';
import { getPlayerValue } from '@/utils/playerGenerator';
import { formatMoney } from '@/lib/formatMoney';
import { useLiveMatchGuard } from './LiveMatchGuard';
import { LoanNegotiationModal, type LoanTerms } from './LoanNegotiationModal';

interface TransferListing {
  id: string;
  seller_id: string;
  seller_club_name: string;
  seller_shield?: any;
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
  decision_deadline: string | null;
  decision_status: string | null;
}

const posColors: Record<string, { bg: string; text: string; border: string }> = {
  GOL: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  ZAG: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  LAT: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  VOL: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  MEI: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  ATA: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
};

function getOvrColor(ovr: number) {
  if (ovr >= 85) return 'text-amber-400';
  if (ovr >= 75) return 'text-emerald-400';
  if (ovr >= 65) return 'text-blue-400';
  return 'text-muted-foreground';
}

function getOvrBg(ovr: number) {
  if (ovr >= 85) return 'from-amber-500/20 to-amber-500/5';
  if (ovr >= 75) return 'from-emerald-500/20 to-emerald-500/5';
  if (ovr >= 65) return 'from-blue-500/20 to-blue-500/5';
  return 'from-muted/30 to-muted/10';
}

interface Props {
  userId: string;
  clubName: string;
  players: Player[];
  budget: number;
  transferBudget?: number;
  salaryBudget?: number;
  currentMonthlyPayroll?: number;
  clubShield?: { primaryColor: string; secondaryColor: string; pattern: string; shape?: string } | null;
  isPremium?: boolean;
  onPlayerSold: (playerId: string, price: number) => void;
  onPlayerBought: (playerData: any, price: number, salary: number, contractYears: number) => void;
  loanedPlayers?: LoanedPlayer[];
  onLoanOut?: (playerId: string) => void;
  onLoanIn?: (player: Player) => void;
  onListedPlayer?: () => void;
  onAuction?: (player: Player) => void;
  activeMarketTab?: string;
  onMarketTabChange?: (tab: string) => void;
}

export function OnlineMarketTab({ userId, clubName, players, budget, transferBudget, salaryBudget, currentMonthlyPayroll = 0, clubShield, isPremium = false, onPlayerSold: _onPlayerSold, onPlayerBought: _onPlayerBought, loanedPlayers = [], onLoanOut: _onLoanOut, onLoanIn: _onLoanIn, onListedPlayer, onAuction: _onAuction, activeMarketTab: activeMarketTabProp, onMarketTabChange }: Props) {
  const { guard } = useLiveMatchGuard();
  const onPlayerSold = guard(_onPlayerSold);
  const onPlayerBought = guard(_onPlayerBought);
  const onLoanOut = _onLoanOut ? guard(_onLoanOut) : undefined;
  const onLoanIn = _onLoanIn ? guard(_onLoanIn) : undefined;
  const onAuction = _onAuction ? guard(_onAuction) : undefined;
  // Derive budgets if not provided (backwards-compat with old saves)
  const tBudget = transferBudget ?? Math.floor(budget * 0.4);
  const sBudget = salaryBudget ?? Math.floor(budget * 0.4);
  const salaryRemaining = Math.max(0, sBudget - currentMonthlyPayroll * 12);
  const [listings, setListings] = useState<TransferListing[]>([]);
  const [internalTab, setInternalTab] = useState('browse');
  const activeMarketTab = activeMarketTabProp ?? internalTab;
  const setActiveMarketTab = (t: string) => { onMarketTabChange ? onMarketTabChange(t) : setInternalTab(t); };
  const [myOffers, setMyOffers] = useState<TransferOffer[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<TransferOffer[]>([]);
  const [loanListings, setLoanListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [offerDialogId, setOfferDialogId] = useState<string | null>(null);
  const [viewingSellerId, setViewingSellerId] = useState<{ id: string; name: string; shield?: any } | null>(null);
  const [posFilter, setPosFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [ovrMinFilter, setOvrMinFilter] = useState('');
  const [ovrMaxFilter, setOvrMaxFilter] = useState('');
  const [ageMinFilter, setAgeMinFilter] = useState('');
  const [ageMaxFilter, setAgeMaxFilter] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Loan marketplace filters
  const [loanPosFilter, setLoanPosFilter] = useState('all');
  const [loanOvrMin, setLoanOvrMin] = useState('');
  const [loanOvrMax, setLoanOvrMax] = useState('');
  const [loanAgeMin, setLoanAgeMin] = useState('');
  const [loanAgeMax, setLoanAgeMax] = useState('');
  const [loanSalaryMax, setLoanSalaryMax] = useState('');
  const [negotiateLoan, setNegotiateLoan] = useState<any | null>(null);

  // Offer form state
  const [offerPrice, setOfferPrice] = useState(0);
  const [offerSalary, setOfferSalary] = useState(500);
  const [offerYears, setOfferYears] = useState(2);
  const [bonusGoals, setBonusGoals] = useState(0);
  const [bonusAssists, setBonusAssists] = useState(0);
  const [bonusGames, setBonusGames] = useState(0);
  const [bonusTitles, setBonusTitles] = useState(0);
  const [signingBonus, setSigningBonus] = useState(0);
  const [showBonusHelp, setShowBonusHelp] = useState(false);

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

  const loadLoanListings = useCallback(async () => {
    const { data } = await supabase
      .from('loan_listings')
      .select('*')
      .eq('status', 'active')
      .order('listed_at', { ascending: false });
    if (data) setLoanListings(data);
  }, []);

  // Resolve pending 6h decisions on load
  const resolveDecisions = useCallback(async () => {
    await supabase.functions.invoke('process-transfer', { body: { action: 'resolve-decisions' } });
  }, []);

  useEffect(() => {
    resolveDecisions().then(() => {
      loadListings();
      loadMyOffers();
      loadIncomingOffers();
      loadLoanListings();
    });

    const ch1 = supabase.channel('transfer-listings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfer_listings' }, () => { loadListings(); loadIncomingOffers(); })
      .subscribe();

    const ch2 = supabase.channel('transfer-offers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfer_offers' }, () => { loadMyOffers(); loadIncomingOffers(); })
      .subscribe();

    const ch3 = supabase.channel('loan-listings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loan_listings' }, () => { loadLoanListings(); })
      .subscribe();

    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3); };
  }, [loadListings, loadMyOffers, loadIncomingOffers, loadLoanListings, resolveDecisions]);

  const listPlayer = async (player: Player) => {
    setLoading(true);
    const askingPrice = getPlayerValue(player);
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) { toast.error('Sessão expirada'); setLoading(false); return; }

    const res = await supabase.functions.invoke('process-transfer', {
      body: {
        action: 'list', playerData: player, playerName: player.name, playerPosition: player.position,
        playerOverall: player.overall, playerAge: player.age, askingPrice, clubName, sellerShield: clubShield || null,
      },
    });

    if (res.error || res.data?.error) {
      toast.error(res.data?.error || 'Erro ao anunciar jogador');
    } else {
      toast.success(`${player.name} anunciado no mercado por R$${(askingPrice / 1000).toFixed(0)}k!`);
      loadListings();
      setActiveMarketTab('browse');
      onListedPlayer?.();
    }
    setLoading(false);
  };

  const delistPlayer = async (listingId: string) => {
    setLoading(true);
    const res = await supabase.functions.invoke('process-transfer', { body: { action: 'delist', listingId } });
    if (res.error || res.data?.error) toast.error(res.data?.error || 'Erro ao retirar jogador');
    else { toast.success('Jogador retirado do mercado.'); loadListings(); }
    setLoading(false);
  };

  const makeOffer = async (listing: TransferListing) => {
    if (offerPrice <= 0) { toast.error('Defina um valor de proposta'); return; }
    if (offerSalary <= 0) { toast.error('Defina um salário'); return; }

    // 40/40 trava rígida
    const transferCost = offerPrice + signingBonus;
    if (transferCost > tBudget) {
      toast.error(`Verba de transferências insuficiente! Disponível: ${formatMoney(tBudget)}, necessário: ${formatMoney(transferCost)}.`);
      return;
    }
    const annualSalary = offerSalary * 12;
    if (annualSalary > salaryRemaining) {
      toast.error(`Verba de salários insuficiente! Disponível: ${formatMoney(salaryRemaining)}/ano, este contrato custa: ${formatMoney(annualSalary)}/ano.`);
      return;
    }

    setLoading(true);
    const res = await supabase.functions.invoke('process-transfer', {
      body: {
        action: 'offer', listingId: listing.id, offeredPrice: offerPrice, offeredSalary: offerSalary,
        contractYears: offerYears, bonusGoals, bonusAssists, bonusGames, bonusTitles, signingBonus, clubName,
      },
    });

    if (res.error || res.data?.error) toast.error(res.data?.error || 'Erro ao enviar proposta');
    else { toast.success(`Proposta enviada para ${listing.player_name}!`); setOfferDialogId(null); loadMyOffers(); }
    setLoading(false);
  };

  const respondOffer = async (offerId: string, accept: boolean, listing?: TransferListing) => {
    setLoading(true);
    let rejectionReason = 'Recusada pelo clube vendedor.';
    if (!accept && listing) {
      const offer = incomingOffers.find(o => o.id === offerId);
      if (offer) {
        const askingPrice = listing.asking_price;
        const offeredPrice = offer.offered_price;
        const minAcceptable = Math.round(askingPrice * 0.85);
        const suggestedSalary = Math.round((listing.player_data?.salary || 500) * 1.15);
        if (askingPrice - offeredPrice > 0) {
          rejectionReason = `Aqui é o empresário de ${listing.player_name}. Recusamos a proposta de R$${(offeredPrice / 1000).toFixed(0)}k. Talvez aceitemos por R$${(minAcceptable / 1000).toFixed(0)}k+ com salário de R$${suggestedSalary}/mês e contrato de 3+ anos.`;
        } else {
          rejectionReason = `Aqui é o empresário de ${listing.player_name}. Recusamos por condições insatisfatórias. Sugerimos: salário de R$${suggestedSalary}/mês, contrato de 3+ anos e bônus para fecharmos negócio.`;
        }
      }
    }

    const res = await supabase.functions.invoke('process-transfer', {
      body: { action: 'respond', offerId, response: accept ? 'accepted' : 'rejected', rejectionReason: accept ? null : rejectionReason },
    });

    if (res.error || res.data?.error) {
      toast.error(res.data?.error || 'Erro ao responder proposta');
    } else if (res.data?.awaitingDecision) {
      toast.success(res.data.message || `Proposta aceita! Jogador decidirá em 6 horas.`);
    } else if (res.data?.playerAccepted === false) {
      toast.warning(res.data.reason || 'Jogador recusou a proposta.');
    } else if (res.data?.playerAccepted === true) {
      toast.success(res.data.message || 'Transferência concluída!');
      if (listing) {
        const offer = incomingOffers.find(o => o.id === offerId);
        if (offer) onPlayerSold(listing.player_data?.id, offer.offered_price);
      }
    } else {
      toast.success(accept ? 'Proposta aceita! Jogador decidirá em 6h.' : 'Proposta recusada. Contraproposta enviada.');
    }
    loadListings(); loadMyOffers(); loadIncomingOffers();
    setLoading(false);
  };

  const openOfferDialog = (listing: TransferListing) => {
    setOfferPrice(listing.asking_price);
    setOfferSalary(listing.player_data?.salary || 500);
    setOfferYears(2);
    setBonusGoals(0); setBonusAssists(0); setBonusGames(0); setBonusTitles(0); setSigningBonus(0);
    setOfferDialogId(listing.id);
  };

  const myListings = listings.filter(l => l.seller_id === userId);
  const otherListings = listings.filter(l => l.seller_id !== userId);
  const listablePlayers = players.filter(p => !myListings.some(l => l.player_data?.id === p.id));

  const filterListings = (list: TransferListing[]) => {
    let filtered = list;
    if (posFilter !== 'all') filtered = filtered.filter(l => l.player_position === posFilter);
    if (searchText.trim()) filtered = filtered.filter(l => l.player_name.toLowerCase().includes(searchText.trim().toLowerCase()) || l.seller_club_name.toLowerCase().includes(searchText.trim().toLowerCase()));
    const ovrMin = Number(ovrMinFilter);
    const ovrMax = Number(ovrMaxFilter);
    const ageMin = Number(ageMinFilter);
    const ageMax = Number(ageMaxFilter);
    if (ovrMinFilter && !isNaN(ovrMin) && ovrMin > 0) filtered = filtered.filter(l => l.player_overall >= ovrMin);
    if (ovrMaxFilter && !isNaN(ovrMax) && ovrMax > 0) filtered = filtered.filter(l => l.player_overall <= ovrMax);
    if (ageMinFilter && !isNaN(ageMin) && ageMin > 0) filtered = filtered.filter(l => l.player_age >= ageMin);
    if (ageMaxFilter && !isNaN(ageMax) && ageMax > 0) filtered = filtered.filter(l => l.player_age <= ageMax);
    // Sort
    if (sortBy === 'ovr_desc') filtered = [...filtered].sort((a, b) => b.player_overall - a.player_overall);
    else if (sortBy === 'ovr_asc') filtered = [...filtered].sort((a, b) => a.player_overall - b.player_overall);
    else if (sortBy === 'price_asc') filtered = [...filtered].sort((a, b) => a.asking_price - b.asking_price);
    else if (sortBy === 'price_desc') filtered = [...filtered].sort((a, b) => b.asking_price - a.asking_price);
    else if (sortBy === 'age_asc') filtered = [...filtered].sort((a, b) => a.player_age - b.player_age);
    else if (sortBy === 'age_desc') filtered = [...filtered].sort((a, b) => b.player_age - a.player_age);
    return filtered;
  };

  // ── Seller Team View ──
  if (viewingSellerId) {
    return (
      <SellerTeamView
        sellerId={viewingSellerId.id} sellerClubName={viewingSellerId.name}
        sellerShield={viewingSellerId.shield} onBack={() => setViewingSellerId(null)}
        budget={budget} clubName={clubName}
      />
    );
  }

  // ── Negotiation View ──
  if (offerDialogId) {
    const listing = listings.find(l => l.id === offerDialogId);
    if (!listing) { setOfferDialogId(null); return null; }
    const currentSalary = listing.player_data?.salary || 500;
    const pd = listing.player_data as any;
    const pos = posColors[listing.player_position] || { bg: 'bg-muted/30', text: 'text-muted-foreground', border: 'border-border/30' };

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setOfferDialogId(null)}>
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Mercado
        </Button>

        {/* Player Hero Card */}
        <div className="rounded-xl overflow-hidden border border-primary/20" style={{ background: 'hsl(var(--card))' }}>
          <div className={`p-4 bg-gradient-to-r ${getOvrBg(listing.player_overall)}`}>
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center ${pos.bg} border-2 ${pos.border}`}>
                <span className={`text-lg font-black ${getOvrColor(listing.player_overall)}`}>{listing.player_overall}</span>
                <span className={`text-[8px] font-bold ${pos.text}`}>{listing.player_position}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-black">{listing.player_name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{listing.player_age} anos</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <button className="text-xs text-primary hover:underline" onClick={() => { setOfferDialogId(null); setViewingSellerId({ id: listing.seller_id, name: listing.seller_club_name, shield: listing.seller_shield }); }}>
                    {listing.seller_club_name}
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Preço</p>
                <p className="text-xl font-black text-emerald-400">R${(listing.asking_price / 1000).toFixed(0)}k</p>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-px" style={{ background: 'hsl(var(--border) / 0.15)' }}>
            {[
              { icon: '🏟️', label: 'Jogos', val: pd?.gamesPlayed ?? 0 },
              { icon: '⚽', label: 'Gols', val: pd?.goals ?? 0 },
              { icon: '🅰️', label: 'Assist.', val: pd?.assists ?? 0 },
              { icon: '★', label: 'Média', val: pd?.seasonRatings?.length > 0 ? (pd.seasonRatings.reduce((a: number, b: number) => a + b, 0) / pd.seasonRatings.length).toFixed(1) : '—' },
            ].map((s, i) => (
              <div key={i} className="text-center py-2.5" style={{ background: 'hsl(var(--card))' }}>
                <p className="text-lg font-black">{s.val}</p>
                <p className="text-[9px] text-muted-foreground">{s.icon} {s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Negotiation Form */}
        <Tabs defaultValue="negotiate" className="w-full">
          <TabsList className="grid grid-cols-2 w-full h-9 rounded-xl p-1" style={{ background: 'hsl(var(--accent) / 0.5)' }}>
            <TabsTrigger value="negotiate" className="text-[10px] rounded-lg gap-1"><DollarSign className="h-3 w-3" /> Negociação</TabsTrigger>
            <TabsTrigger value="history" className="text-[10px] rounded-lg gap-1"><FileText className="h-3 w-3" /> Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-3 mt-3">
            {pd?.history && pd.history.length > 0 ? (
              <div className="space-y-1.5">
                {pd.history.map((h: any, i: number) => (
                  <div key={i} className="flex items-center gap-2.5 rounded-xl p-2.5 border border-border/15" style={{ background: 'hsl(var(--card))' }}>
                    <ShieldCrest primaryColor="#4a5568" secondaryColor="#a0aec0" pattern="solid" shape="classic" size={24} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs truncate">{h.club}</p>
                      <p className="text-[9px] text-muted-foreground">T{h.seasonStart}{h.seasonEnd ? `–${h.seasonEnd}` : ' (atual)'}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] shrink-0">
                      <span>{h.games}j</span>
                      <span>⚽{h.goals}</span>
                      <span>🅰️{h.assists}</span>
                      {h.avgRating > 0 && <span className="font-bold text-primary">★{h.avgRating.toFixed(1)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">Sem histórico de clubes anteriores.</div>
            )}
          </TabsContent>

          <TabsContent value="negotiate" className="space-y-4 mt-3">
            {/* Price - fixed */}
            <div className="rounded-xl p-3 border border-border/15" style={{ background: 'hsl(var(--card))' }}>
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Valor da transferência</label>
              <p className="text-2xl font-black text-emerald-400 mt-1">R${(listing.asking_price / 1000).toFixed(0)}k</p>
              <p className="text-[9px] text-muted-foreground">Preço fixo baseado nos atributos</p>
            </div>

            {/* Salary */}
            <div className="rounded-xl p-3 border border-border/15 space-y-2" style={{ background: 'hsl(var(--card))' }}>
              <label className="text-xs font-bold text-muted-foreground">💰 Salário mensal — atual: R${currentSalary}</label>
              <Input type="number" value={offerSalary} onChange={e => setOfferSalary(Math.max(100, Number(e.target.value)))} className="h-9 text-xs rounded-lg" />
              {offerSalary < currentSalary && (
                <p className="text-[10px] text-orange-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Salário inferior ao atual — menor chance de aceite</p>
              )}
            </div>

            {/* Contract */}
            <div className="rounded-xl p-3 border border-border/15 space-y-2" style={{ background: 'hsl(var(--card))' }}>
              <label className="text-xs font-bold text-muted-foreground">📄 Duração do contrato</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(y => (
                  <Button key={y} size="sm" variant={offerYears === y ? 'default' : 'outline'} className="h-8 px-3.5 text-xs rounded-lg flex-1" onClick={() => setOfferYears(y)}>
                    {y}a
                  </Button>
                ))}
              </div>
            </div>

            {/* Signing Bonus */}
            <div className="rounded-xl p-3 border border-border/15 space-y-2" style={{ background: 'hsl(var(--card))' }}>
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><Gift className="h-3.5 w-3.5" /> Luvas (R$)</label>
              <Input type="number" value={signingBonus} onChange={e => setSigningBonus(Math.max(0, Number(e.target.value)))} className="h-9 text-xs rounded-lg" />
            </div>

            {/* Performance Bonuses */}
            <div className="rounded-xl p-3 border border-border/15 space-y-2" style={{ background: 'hsl(var(--card))' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-muted-foreground">🎯 Bônus por desempenho (R$/ocorrência)</p>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowBonusHelp(!showBonusHelp)}>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
              {showBonusHelp && (
                <div className="rounded-lg p-3 text-[10px] leading-relaxed border border-border/20" style={{ background: 'hsl(var(--accent) / 0.5)' }}>
                  <p className="font-bold mb-1">📖 Como funcionam os bônus?</p>
                  <p>• <strong>Luvas:</strong> Pagamento único na assinatura.</p>
                  <p>• <strong>Bônus por gol/assist:</strong> Aumentam motivação. Valores altos = jogador "fominha".</p>
                  <p>• <strong>Bônus por jogo:</strong> Motivação equilibrada.</p>
                  <p>• <strong>Bônus por título:</strong> Grande motivação sem fominha.</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '⚽ Por gol', value: bonusGoals, set: setBonusGoals },
                  { label: '🅰️ Por assist.', value: bonusAssists, set: setBonusAssists },
                  { label: '🏟️ Por jogo', value: bonusGames, set: setBonusGames },
                  { label: '🏆 Por título', value: bonusTitles, set: setBonusTitles },
                ].map(b => (
                  <div key={b.label}>
                    <label className="text-[10px] text-muted-foreground">{b.label}</label>
                    <Input type="number" value={b.value} onChange={e => b.set(Math.max(0, Number(e.target.value)))} className="h-8 text-xs rounded-lg" />
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl p-4 border border-primary/20" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.02))' }}>
              <p className="font-black text-sm text-primary mb-2 flex items-center gap-1.5"><Sparkles className="h-4 w-4" /> Resumo da proposta</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Transferência</span><span className="font-bold text-emerald-400">R${(listing.asking_price / 1000).toFixed(0)}k</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Salário</span><span className={`font-bold ${offerSalary >= currentSalary ? 'text-emerald-400' : 'text-orange-400'}`}>R${offerSalary}/mês</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Contrato</span><span className="font-bold">{offerYears} ano{offerYears > 1 ? 's' : ''}</span></div>
                {signingBonus > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Luvas</span><span className="font-bold">R${(signingBonus / 1000).toFixed(0)}k</span></div>}
              </div>
              {bonusGoals > 50000 && <p className="text-[10px] text-orange-400 mt-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Bônus por gol elevado pode tornar o jogador fominha</p>}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-11 text-xs rounded-xl" onClick={() => setOfferDialogId(null)}>Cancelar</Button>
              <Button className="flex-1 h-11 text-xs rounded-xl gap-1.5" onClick={() => makeOffer(listing)} disabled={loading || budget < offerPrice}>
                <Send className="h-4 w-4" /> Enviar Proposta
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ── Main Market View ──
  return (
    <div className="space-y-4">
      {/* Budget Hero — 40/40 split */}
      <div className="rounded-xl p-4 border border-border/20" style={{ background: 'linear-gradient(135deg, hsl(var(--card)), hsl(var(--accent) / 0.5))' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">💸 Verba Transferências</p>
            <p className="text-lg font-black text-emerald-400">{formatMoney(tBudget)}</p>
            <p className="text-[9px] text-muted-foreground">40% do orçamento</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">🧾 Verba Salários (anual)</p>
            <p className="text-lg font-black text-blue-400">{formatMoney(salaryRemaining)}</p>
            <p className="text-[9px] text-muted-foreground">de {formatMoney(sBudget)} disponível</p>
          </div>
          <div className="flex items-center justify-end gap-3 text-[10px] text-muted-foreground">
            <div className="text-center">
              <p className="font-bold text-foreground text-lg">{otherListings.length}</p>
              <p>No mercado</p>
            </div>
            <div className="h-8 w-px bg-border/30" />
            <div className="text-center">
              <p className="font-bold text-foreground text-lg">{myListings.length}</p>
              <p>Anunciados</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeMarketTab} onValueChange={setActiveMarketTab} className="w-full">
        <div>

        {/* ── AUCTION (embedded) ── */}
        <TabsContent value="auction" className="space-y-3 mt-3">
          <AuctionTab
            userId={userId}
            clubName={clubName}
            players={players}
            budget={budget}
            isPremium={isPremium}
            onSellPlayer={(playerId) => onPlayerSold(playerId, 0)}
          />
        </TabsContent>

        {/* ── FREE AGENTS (Mercado Livre) ── */}
        <TabsContent value="freeagents" className="space-y-3 mt-3">
          <FreeAgentMarketPanel
            userId={userId}
            clubName={clubName}
            transferBudget={tBudget}
            salaryBudgetRemaining={salaryRemaining}
            onPlayerSigned={(playerData, salary, contractYears) => {
              onPlayerBought(playerData, 0, salary, contractYears);
            }}
          />
        </TabsContent>


        {/* ── BROWSE ── */}
        <TabsContent value="browse" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> Mercado Online
              <Badge variant="outline" className="text-[9px]">{otherListings.length}</Badge>
            </h3>
            <Button variant="outline" size="sm" onClick={loadListings} className="text-xs gap-1.5 h-8 rounded-lg">
              <RefreshCw className="h-3 w-3" /> Atualizar
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[120px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar jogador ou clube..." value={searchText} onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }} className="h-8 pl-8 text-xs rounded-lg" />
            </div>
             <Select value={posFilter} onValueChange={v => { setPosFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 w-[80px] text-[10px] rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={v => { setSortBy(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 w-[100px] text-[10px] rounded-lg"><SelectValue placeholder="Ordenar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recente</SelectItem>
                <SelectItem value="ovr_desc">OVR ↓</SelectItem>
                <SelectItem value="ovr_asc">OVR ↑</SelectItem>
                <SelectItem value="price_asc">Preço ↑</SelectItem>
                <SelectItem value="price_desc">Preço ↓</SelectItem>
                <SelectItem value="age_asc">Idade ↑</SelectItem>
                <SelectItem value="age_desc">Idade ↓</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Input placeholder="OVR min" type="number" value={ovrMinFilter} onChange={e => { setOvrMinFilter(e.target.value); setCurrentPage(1); }} className="h-7 w-[65px] text-[10px] rounded-lg" />
            <Input placeholder="OVR max" type="number" value={ovrMaxFilter} onChange={e => { setOvrMaxFilter(e.target.value); setCurrentPage(1); }} className="h-7 w-[65px] text-[10px] rounded-lg" />
            <Input placeholder="Idade min" type="number" value={ageMinFilter} onChange={e => { setAgeMinFilter(e.target.value); setCurrentPage(1); }} className="h-7 w-[70px] text-[10px] rounded-lg" />
            <Input placeholder="Idade max" type="number" value={ageMaxFilter} onChange={e => { setAgeMaxFilter(e.target.value); setCurrentPage(1); }} className="h-7 w-[70px] text-[10px] rounded-lg" />
            {(searchText || posFilter !== 'all' || ovrMinFilter || ovrMaxFilter || ageMinFilter || ageMaxFilter || sortBy !== 'recent') && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[9px] text-destructive" onClick={() => {
                setSearchText(''); setPosFilter('all'); setOvrMinFilter(''); setOvrMaxFilter('');
                setAgeMinFilter(''); setAgeMaxFilter(''); setSortBy('recent'); setCurrentPage(1);
              }}>
                <X className="h-3 w-3 mr-0.5" /> Limpar
              </Button>
            )}
          </div>

          {(() => {
            const filtered = filterListings(otherListings);
            const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
            const safePage = Math.min(currentPage, totalPages || 1);
            const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

            if (filtered.length === 0) return (
              <div className="text-center py-10 text-xs text-muted-foreground rounded-xl border border-border/15" style={{ background: 'hsl(var(--card))' }}>
                <Globe className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Nenhum jogador disponível no mercado online.
              </div>
            );

            return (
              <>
                <div className="space-y-2">
                  {paginated.map(listing => {
                    const pd = listing.player_data;
                    const shield = listing.seller_shield as any;
                    const pos = posColors[listing.player_position] || { bg: 'bg-muted/30', text: 'text-muted-foreground', border: 'border-border/30' };

                    return (
                      <div key={listing.id} className="rounded-xl border border-border/15 hover:border-primary/25 transition-all duration-300 overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
                        <div className={`flex items-center gap-2.5 p-3 bg-gradient-to-r ${getOvrBg(listing.player_overall)}`}>
                          <div className="shrink-0">
                            {shield ? (
                              <ShieldCrest primaryColor={shield.primaryColor} secondaryColor={shield.secondaryColor} pattern={shield.pattern} shape={shield.shape || 'classic'} size={28} />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-muted/30 flex items-center justify-center text-xs">⚽</div>
                            )}
                          </div>
                          <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center ${pos.bg} border ${pos.border} shrink-0`}>
                            <span className={`text-sm font-black ${getOvrColor(listing.player_overall)}`}>{listing.player_overall}</span>
                            <span className={`text-[7px] font-bold ${pos.text} leading-none`}>{listing.player_position}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs truncate">{listing.player_name}</p>
                            <button className="text-[10px] text-primary hover:underline cursor-pointer truncate block" onClick={() => setViewingSellerId({ id: listing.seller_id, name: listing.seller_club_name, shield })}>
                              {listing.seller_club_name}
                            </button>
                            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mt-0.5">
                              <span>{listing.player_age}a</span>
                              <span>•</span>
                              <span>{pd?.gamesPlayed ?? 0}j</span>
                              <span>⚽{pd?.goals ?? 0}</span>
                              <span>🅰️{pd?.assists ?? 0}</span>
                            </div>
                          </div>
                          {listing.transfer_count > 2 && (
                            <Badge variant="outline" className="text-[8px] border-amber-500/30 text-amber-400 shrink-0 gap-0.5">
                              <ArrowLeftRight className="h-2.5 w-2.5" /> {listing.transfer_count}x
                            </Badge>
                          )}
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-black text-emerald-400">R${(listing.asking_price / 1000).toFixed(0)}k</p>
                            <div className="flex gap-1 mt-1.5">
                              <Button size="sm" className="h-7 px-2.5 text-[9px] rounded-lg gap-1" onClick={() => openOfferDialog(listing)} disabled={loading || budget < listing.asking_price * 0.5}>
                                <Send className="h-3 w-3" /> Proposta
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-[9px] rounded-lg" onClick={() => setViewingSellerId({ id: listing.seller_id, name: listing.seller_club_name, shield })}>
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Pagination className="mt-3">
                    <PaginationContent>
                      {safePage > 1 && (
                        <PaginationItem>
                          <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="h-8 text-[10px] cursor-pointer" />
                        </PaginationItem>
                      )}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
                        const page = start + i;
                        if (page > totalPages) return null;
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink isActive={page === safePage} onClick={() => setCurrentPage(page)} className="h-8 w-8 text-[10px] cursor-pointer">
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      {safePage < totalPages && (
                        <PaginationItem>
                          <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="h-8 text-[10px] cursor-pointer" />
                        </PaginationItem>
                      )}
                    </PaginationContent>
                  </Pagination>
                )}

                <p className="text-[9px] text-muted-foreground text-center">
                  Mostrando {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} de {filtered.length} jogadores
                </p>
              </>
            );
          })()}
        </TabsContent>

        {/* ── LOANS ── */}
        <TabsContent value="loans" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2"><ArrowLeftRight className="h-4 w-4 text-primary" /> Empréstimos Online</h3>
            <Button variant="outline" size="sm" onClick={loadLoanListings} className="text-xs gap-1.5 h-8 rounded-lg">
              <RefreshCw className="h-3 w-3" /> Atualizar
            </Button>
          </div>

          {/* Public loan marketplace */}
          {(() => {
            const publicLoans = loanListings.filter(l => l.seller_id !== userId);
            const ovrMin = Number(loanOvrMin);
            const ovrMax = Number(loanOvrMax);
            const ageMin = Number(loanAgeMin);
            const ageMax = Number(loanAgeMax);
            const salMax = Number(loanSalaryMax);
            const filtered = publicLoans.filter(l => {
              if (loanPosFilter !== 'all' && l.player_position !== loanPosFilter) return false;
              if (loanOvrMin && !isNaN(ovrMin) && l.player_overall < ovrMin) return false;
              if (loanOvrMax && !isNaN(ovrMax) && l.player_overall > ovrMax) return false;
              if (loanAgeMin && !isNaN(ageMin) && l.player_age < ageMin) return false;
              if (loanAgeMax && !isNaN(ageMax) && l.player_age > ageMax) return false;
              if (loanSalaryMax && !isNaN(salMax) && (l.salary || 0) > salMax * 1000) return false;
              return true;
            });
            const hasFilters = loanPosFilter !== 'all' || loanOvrMin || loanOvrMax || loanAgeMin || loanAgeMax || loanSalaryMax;
            return (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Jogadores disponíveis para empréstimo</p>
                <div className="flex flex-wrap gap-1.5 items-center rounded-lg p-2" style={{ background: 'hsl(var(--card))' }}>
                  <Select value={loanPosFilter} onValueChange={setLoanPosFilter}>
                    <SelectTrigger className="h-7 w-[80px] text-[10px] rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas pos.</SelectItem>
                      <SelectItem value="GOL">GOL</SelectItem>
                      <SelectItem value="ZAG">ZAG</SelectItem>
                      <SelectItem value="LAT">LAT</SelectItem>
                      <SelectItem value="VOL">VOL</SelectItem>
                      <SelectItem value="MEI">MEI</SelectItem>
                      <SelectItem value="ATA">ATA</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="OVR min" type="number" value={loanOvrMin} onChange={e => setLoanOvrMin(e.target.value)} className="h-7 w-[65px] text-[10px] rounded-lg" />
                  <Input placeholder="OVR max" type="number" value={loanOvrMax} onChange={e => setLoanOvrMax(e.target.value)} className="h-7 w-[65px] text-[10px] rounded-lg" />
                  <Input placeholder="Idade min" type="number" value={loanAgeMin} onChange={e => setLoanAgeMin(e.target.value)} className="h-7 w-[70px] text-[10px] rounded-lg" />
                  <Input placeholder="Idade max" type="number" value={loanAgeMax} onChange={e => setLoanAgeMax(e.target.value)} className="h-7 w-[70px] text-[10px] rounded-lg" />
                  <Input placeholder="Sal. max (k)" type="number" value={loanSalaryMax} onChange={e => setLoanSalaryMax(e.target.value)} className="h-7 w-[90px] text-[10px] rounded-lg" />
                  {hasFilters && (
                    <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => {
                      setLoanPosFilter('all'); setLoanOvrMin(''); setLoanOvrMax(''); setLoanAgeMin(''); setLoanAgeMax(''); setLoanSalaryMax('');
                    }}>
                      <X className="h-3 w-3 mr-1" /> Limpar
                    </Button>
                  )}
                </div>

                {filtered.length === 0 ? (
                  <div className="text-center py-6 text-[11px] text-muted-foreground rounded-xl border border-border/15" style={{ background: 'hsl(var(--card))' }}>
                    Nenhum jogador disponível {hasFilters ? 'com esses filtros.' : 'no momento.'}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filtered.map(l => {
                      const pos = posColors[l.player_position] || { bg: 'bg-muted/30', text: 'text-muted-foreground', border: 'border-border/30' };
                      return (
                        <div key={l.id} className="rounded-xl border border-cyan-500/15 p-3 flex items-center gap-2.5" style={{ background: 'hsl(var(--card))' }}>
                          <div className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center ${pos.bg} border ${pos.border}`}>
                            <span className={`text-xs font-black ${getOvrColor(l.player_overall)}`}>{l.player_overall}</span>
                            <span className={`text-[7px] font-bold ${pos.text}`}>{l.player_position}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{l.player_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {l.player_age} anos • {l.seller_club_name}
                            </p>
                            <p className="text-[10px] text-cyan-400 font-semibold">
                              💰 R$ {((l.salary || 0) / 1000).toFixed(0)}k/mês • ⏳ 1 temporada
                            </p>
                          </div>
                          <Button size="sm" className="h-8 px-2.5 text-[10px] rounded-lg gap-1" disabled={loading} onClick={() => setNegotiateLoan(l)}>
                            <ArrowLeftRight className="h-3 w-3" /> Negociar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {loanListings.filter(l => l.seller_id === userId).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Seus jogadores no mercado de empréstimo</p>
              {loanListings.filter(l => l.seller_id === userId).map(l => (
                <div key={l.id} className="rounded-xl border border-cyan-500/20 p-3 flex items-center gap-2.5" style={{ background: 'hsl(var(--card))' }}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${posColors[l.player_position]?.bg || 'bg-muted/30'} ${posColors[l.player_position]?.text || ''}`}>{l.player_position}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{l.player_name}</p>
                    <p className="text-[10px] text-muted-foreground">OVR {l.player_overall} • {l.player_age}a • R${((l.salary || 0) / 1000).toFixed(0)}k/mês</p>
                  </div>
                  <Button size="sm" variant="destructive" className="h-7 px-2.5 text-[9px] rounded-lg" onClick={async () => {
                    const res = await supabase.functions.invoke('process-transfer', { body: { action: 'loan-delist', listingId: l.id } });
                    if (res.error || res.data?.error) toast.error(res.data?.error || 'Erro');
                    else { toast.success('Retirado!'); loadLoanListings(); }
                  }}>
                    <X className="h-3 w-3 mr-0.5" /> Retirar
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Active loans (only outgoing) */}
          {loanedPlayers.filter(l => l.direction === 'out').length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Empréstimos cedidos ativos</p>
              {loanedPlayers.filter(l => l.direction === 'out').map((loan, i) => (
                <div key={i} className="rounded-xl border border-cyan-500/15 p-3 flex items-center gap-2.5" style={{ background: 'hsl(var(--card))' }}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${posColors[loan.player.position]?.bg || 'bg-muted/30'} ${posColors[loan.player.position]?.text || ''}`}>{loan.player.position}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{loan.player.name}</p>
                    <p className="text-[10px] text-muted-foreground">OVR {loan.player.overall} • {loan.player.age}a</p>
                  </div>
                  <Badge className="text-[8px] bg-orange-500/15 text-orange-400 border-orange-500/30">↗ Cedido</Badge>
                </div>
              ))}
            </div>
          )}

          {loanListings.filter(l => l.seller_id === userId).length === 0 && loanedPlayers.filter(l => l.direction === 'out').length === 0 && (
            <div className="text-center py-10 text-xs text-muted-foreground rounded-xl border border-border/15" style={{ background: 'hsl(var(--card))' }}>
              <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Você ainda não cedeu nenhum jogador. Vá em <span className="text-foreground font-semibold">Elenco</span> para emprestar.
            </div>
          )}
        </TabsContent>

        {/* ── PROPOSTAS (recebidas + enviadas) ── */}
        <TabsContent value="offers" className="space-y-4 mt-3">
          {/* Recebidas */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm flex items-center gap-2">
              📩 Recebidas
              {incomingOffers.length > 0 && <Badge className="bg-destructive/15 text-destructive text-[9px]">{incomingOffers.length}</Badge>}
            </h3>

            {incomingOffers.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground rounded-xl border border-border/15" style={{ background: 'hsl(var(--card))' }}>
                Nenhuma proposta pendente.
              </div>
            ) : (
              <div className="space-y-2.5">
                {incomingOffers.map(offer => {
                  const listing = myListings.find(l => l.id === offer.listing_id);
                  const pos = posColors[listing?.player_position || ''] || { bg: 'bg-muted/30', text: 'text-muted-foreground', border: 'border-border/30' };
                  return (
                    <div key={offer.id} className="rounded-xl border border-amber-500/20 overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
                      <div className="p-3 bg-gradient-to-r from-amber-500/10 to-transparent">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center ${pos.bg} border ${pos.border}`}>
                              <span className={`text-xs font-black ${getOvrColor(listing?.player_overall || 0)}`}>{listing?.player_overall}</span>
                              <span className={`text-[7px] font-bold ${pos.text}`}>{listing?.player_position}</span>
                            </div>
                            <div>
                              <p className="text-xs font-black">{listing?.player_name || 'Jogador'}</p>
                              <p className="text-[10px] text-muted-foreground">De: <span className="text-primary">{offer.buyer_club_name}</span></p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-emerald-400">R${(offer.offered_price / 1000).toFixed(0)}k</p>
                            <p className="text-[9px] text-muted-foreground">pedido: R${((listing?.asking_price || 0) / 1000).toFixed(0)}k</p>
                          </div>
                        </div>
                      </div>

                      <div className="px-3 pb-3">
                        <div className="grid grid-cols-2 gap-1.5 mb-3 mt-2">
                          <div className="rounded-lg p-1.5 text-[9px] text-center" style={{ background: 'hsl(var(--accent) / 0.5)' }}>💰 Sal: R${offer.offered_salary}/mês</div>
                          <div className="rounded-lg p-1.5 text-[9px] text-center" style={{ background: 'hsl(var(--accent) / 0.5)' }}>📄 Contrato: {offer.offered_contract_years}a</div>
                          {offer.signing_bonus > 0 && <div className="rounded-lg p-1.5 text-[9px] text-center" style={{ background: 'hsl(var(--accent) / 0.5)' }}>🎁 Luvas: R${(offer.signing_bonus / 1000).toFixed(0)}k</div>}
                          {offer.bonus_goals > 0 && <div className="rounded-lg p-1.5 text-[9px] text-center" style={{ background: 'hsl(var(--accent) / 0.5)' }}>⚽ Bônus/gol: R${offer.bonus_goals}</div>}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 h-9 text-xs rounded-lg gap-1.5" onClick={() => respondOffer(offer.id, true, listing)}>
                            <Check className="h-3.5 w-3.5" /> Aceitar
                          </Button>
                          <Button size="sm" variant="destructive" className="flex-1 h-9 text-xs rounded-lg gap-1.5" onClick={() => respondOffer(offer.id, false, listing)}>
                            <X className="h-3.5 w-3.5" /> Recusar
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border/20" />

          {/* Enviadas */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Enviadas
              <Badge variant="outline" className="text-[9px]">{myOffers.length}</Badge>
            </h3>

            {myOffers.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground rounded-xl border border-border/15" style={{ background: 'hsl(var(--card))' }}>
                Nenhuma proposta enviada.
              </div>
            ) : (
              <div className="space-y-1.5">
                {myOffers.slice(0, 20).map(offer => {
                  const listing = listings.find(l => l.id === offer.listing_id);
                  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
                    pending: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: '⏳ Pendente' },
                    accepted: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: '✅ Aceita' },
                    awaiting_decision: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: '⏳ Jogador decidindo...' },
                    rejected: { bg: 'bg-red-500/15', text: 'text-red-400', label: '❌ Recusada' },
                    player_rejected: { bg: 'bg-orange-500/15', text: 'text-orange-400', label: '🚫 Jogador recusou' },
                    player_accepted: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: '✅ Jogador aceitou!' },
                  };
                  const sc = statusConfig[offer.decision_status || offer.status] || statusConfig.pending;
                  const deadlineStr = offer.decision_deadline;
                  let timeLeft = '';
                  if (deadlineStr && (offer.decision_status === 'awaiting_decision' || offer.status === 'awaiting_decision')) {
                    const remaining = new Date(deadlineStr).getTime() - Date.now();
                    if (remaining > 0) {
                      const hours = Math.floor(remaining / 3600000);
                      const mins = Math.floor((remaining % 3600000) / 60000);
                      timeLeft = `⏱️ ${hours}h${mins}m restantes`;
                    } else {
                      timeLeft = '⏱️ Decisão pendente...';
                    }
                  }

                  return (
                    <div key={offer.id} className="rounded-xl border border-border/15 p-3 flex items-center gap-2.5" style={{ background: 'hsl(var(--card))' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{listing?.player_name || 'Jogador'}</p>
                        <p className="text-[10px] text-muted-foreground">R${(offer.offered_price / 1000).toFixed(0)}k • Sal: R${offer.offered_salary}/mês</p>
                        {timeLeft && <p className="text-[9px] text-blue-400 mt-0.5 flex items-center gap-1"><Timer className="h-3 w-3" /> {timeLeft}</p>}
                        {offer.rejection_reason && (
                          <p className="text-[9px] text-orange-400 mt-1 leading-relaxed">💬 {offer.rejection_reason}</p>
                        )}
                      </div>
                      <Badge className={`text-[8px] ${sc.bg} ${sc.text} border-0 shrink-0`}>{sc.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
