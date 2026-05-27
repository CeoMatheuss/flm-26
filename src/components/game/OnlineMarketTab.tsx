import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';


import { ShoppingCart, Tag, Send, Check, X, Clock, DollarSign, Gift, Trophy, Target, Swords, AlertTriangle, ArrowLeftRight, RefreshCw, Users, HelpCircle, ArrowLeft, Eye, Search, TrendingUp, Sparkles, Globe, FileText, Timer, EyeOff, Zap, Crown, Handshake, SlidersHorizontal } from 'lucide-react';
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
import { LoanNegotiationModal } from './LoanNegotiationModal';
import { LoanTerms } from '@/types/loan';
import { PremiumListingCard } from './market/PremiumListingCard';

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
  VOL: { bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/30' },
  MEI: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  ATA: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
};

function getOvrColor(ovr: number) {
  if (ovr >= 85) return 'text-amber-400';
  if (ovr >= 75) return 'text-teal-400';
  if (ovr >= 65) return 'text-blue-400';
  return 'text-muted-foreground';
}

function getOvrBg(ovr: number) {
  if (ovr >= 85) return 'from-amber-500/10 to-amber-500/5';
  if (ovr >= 75) return 'from-teal-500/10 to-teal-500/5';
  if (ovr >= 65) return 'from-blue-500/10 to-blue-500/5';
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
  onLoanFinalizeOut?: (playerId: string, fromClubName?: string) => void;
  onLoanFinalizeIn?: (player: Player, fromClubName?: string) => void;
  onListedPlayer?: () => void;
  onAuction?: (player: Player) => void;
  activeMarketTab?: string;
  onMarketTabChange?: (tab: string) => void;
}

export function OnlineMarketTab({ userId, clubName, players, budget, transferBudget, salaryBudget, currentMonthlyPayroll = 0, clubShield, isPremium = false, onPlayerSold: _onPlayerSold, onPlayerBought: _onPlayerBought, loanedPlayers = [], onLoanOut: _onLoanOut, onLoanIn: _onLoanIn, onLoanFinalizeOut, onLoanFinalizeIn, onListedPlayer, onAuction: _onAuction, activeMarketTab: activeMarketTabProp, onMarketTabChange }: Props) {
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
  const [incomingLoanOffers, setIncomingLoanOffers] = useState<any[]>([]);
  const [myLoanOffers, setMyLoanOffers] = useState<any[]>([]);
  const [counterLoanOffer, setCounterLoanOffer] = useState<any | null>(null);
  const [myRenewals, setMyRenewals] = useState<any[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
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
    setIsLoadingListings(true);
    try {
      const { data, error } = await supabase
        .from('transfer_listings')
        .select('*')
        .eq('status', 'active')
        .order('listed_at', { ascending: false });
      
      if (error) {
        console.error('Error loading listings:', error);
      } else if (data) {
        setListings(data as unknown as TransferListing[]);
      }
    } finally {
      setIsLoadingListings(false);
    }
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

  // ── Sincronização de empréstimos finalizados ──
  // Idempotente: evita aplicar duas vezes. Atualiza estado local quando o servidor
  // confirma a transferência (status 'accepted'), tanto para vendedor quanto comprador.
  const processedLoansRef = useRef<Set<string>>(new Set());

  const processFinalizedLoan = useCallback((listing: any) => {
    if (!listing || !userId) return;
    if (listing.status !== 'accepted') return;
    if (processedLoansRef.current.has(listing.id)) return;
    processedLoansRef.current.add(listing.id);

    try {
      if (listing.seller_id === userId && listing.player_id) {
        console.log('[loan-sync] finalizando saída:', listing.player_name);
        onLoanFinalizeOut?.(listing.player_id, listing.buyer_club_name || undefined);
        toast.success(`${listing.player_name} foi emprestado para ${listing.buyer_club_name || 'outro clube'}.`);
      } else if (listing.buyer_id === userId && listing.player_data) {
        console.log('[loan-sync] finalizando entrada:', listing.player_name);
        onLoanFinalizeIn?.(listing.player_data as Player, listing.seller_club_name || undefined);
        toast.success(`✅ ${listing.player_name} chegou ao seu elenco por empréstimo!`);
      }
    } catch (err) {
      console.error('[loan-sync] erro ao processar empréstimo:', err);
      // Remove do set para permitir retry
      processedLoansRef.current.delete(listing.id);
    }
  }, [userId, onLoanFinalizeOut, onLoanFinalizeIn]);

  const syncFinalizedLoans = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('loan_listings')
      .select('*')
      .eq('status', 'accepted')
      .or(`seller_id.eq.${userId},buyer_id.eq.${userId}`);
    if (error) { console.warn('[loan-sync] load error', error); return; }
    (data || []).forEach(processFinalizedLoan);
  }, [userId, processFinalizedLoan]);


  const loadLoanOffers = useCallback(async () => {
    if (!userId) return;
    const [{ data: incoming }, { data: mine }] = await Promise.all([
      supabase.from('loan_offers').select('*').eq('seller_id', userId).in('status', ['pending', 'countered']).order('created_at', { ascending: false }),
      supabase.from('loan_offers').select('*').eq('buyer_id', userId).in('status', ['pending', 'countered', 'rejected', 'accepted']).order('created_at', { ascending: false }).limit(20),
    ]);
    setIncomingLoanOffers(incoming || []);
    setMyLoanOffers(mine || []);
  }, [userId]);

  const loadMyRenewals = useCallback(async () => {
    const { data } = await supabase
      .from('player_negotiations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setMyRenewals(data);
  }, [userId]);

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
      loadLoanOffers();
      loadMyRenewals();
      syncFinalizedLoans();
    });

    const ch1 = supabase.channel('transfer-listings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfer_listings' }, () => { loadListings(); loadIncomingOffers(); })
      .subscribe();

    const ch2 = supabase.channel('transfer-offers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfer_offers' }, () => { loadMyOffers(); loadIncomingOffers(); })
      .subscribe();

    const ch3 = supabase.channel('loan-listings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loan_listings' }, (payload: any) => {
        loadLoanListings();
        const row = payload?.new;
        if (row && row.status === 'accepted') processFinalizedLoan(row);
      })
      .subscribe();


    const ch4 = supabase.channel('player-negotiations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_negotiations', filter: `user_id=eq.${userId}` }, () => { loadMyRenewals(); })
      .subscribe();

    const ch5 = supabase.channel('loan-offers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loan_offers' }, () => { loadLoanOffers(); })
      .subscribe();

    const backupInterval = setInterval(loadListings, 30000);

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
      supabase.removeChannel(ch4);
      supabase.removeChannel(ch5);
      clearInterval(backupInterval);
    };

  }, [loadListings, loadMyOffers, loadIncomingOffers, loadLoanListings, loadLoanOffers, loadMyRenewals, resolveDecisions, userId, syncFinalizedLoans, processFinalizedLoan]);

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

  const buyNow = async (listing: TransferListing) => {
    const price = listing.asking_price;
    if (price > tBudget) {
      toast.error(`Verba de transferências insuficiente! Disponível: ${formatMoney(tBudget)}, necessário: ${formatMoney(price)}.`);
      return;
    }
    const playerSalary = listing.player_data?.salary || 500;
    const annualSalary = playerSalary * 12;
    if (annualSalary > salaryRemaining) {
      toast.error(`Verba de salários insuficiente! Disponível: ${formatMoney(salaryRemaining)}/ano, salário do jogador custa: ${formatMoney(annualSalary)}/ano.`);
      return;
    }
    if (!window.confirm(`Comprar ${listing.player_name} (OVR ${listing.player_overall}) por ${formatMoney(price)} agora?\n\nA transferência será concluída imediatamente.`)) return;

    setLoading(true);
    const res = await supabase.functions.invoke('process-transfer', {
      body: { action: 'buy-now', listingId: listing.id, clubName },
    });
    if (res.error || res.data?.error) {
      toast.error(res.data?.error || 'Erro ao concluir compra imediata');
    } else {
      toast.success(`⚡ ${listing.player_name} adquirido por ${formatMoney(price)}!`);
      loadListings(); loadMyOffers();
    }
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
  // No mercado global, mostramos TUDO, mas com badges e travas diferentes
  const allMarketListings = listings;

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

    const totalTransfer = listing.asking_price + signingBonus;
    const canAfford = budget >= totalTransfer;
    const salaryDelta = ((offerSalary - currentSalary) / Math.max(1, currentSalary)) * 100;
    const fominha = bonusGoals > 50000 || bonusAssists > 50000;

    return (
      <div className="space-y-4 pb-32">
        {/* Back bar */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs rounded-lg hover:bg-white/5" onClick={() => setOfferDialogId(null)}>
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Mercado
          </Button>
          <Badge variant="outline" className="text-[10px] gap-1 border-teal-500/30 bg-teal-500/10 text-teal-300">
            <Handshake className="h-3 w-3" /> Negociação Direta
          </Badge>
        </div>

        {/* ── PREMIUM HERO ── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 backdrop-blur-xl"
          style={{ background: 'linear-gradient(135deg, hsl(220 45% 9% / 0.85), hsl(150 50% 10% / 0.6))' }}>
          {/* Ambient glows */}
          <div className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-teal-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl" />
          {/* Stadium stripes */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 24px, white 24px 25px)' }} />

          <div className="relative p-4">
            <div className="flex items-center gap-3">
              {/* OVR badge with glow */}
              <div className="relative">
                <div className={`absolute inset-0 rounded-2xl blur-md opacity-50 bg-gradient-to-br ${getOvrBg(listing.player_overall)}`} />
                <div className={`relative w-16 h-16 rounded-2xl flex flex-col items-center justify-center ${pos.bg} border-2 ${pos.border} backdrop-blur-sm`}>
                  <span className={`text-xl font-black ${getOvrColor(listing.player_overall)} leading-none`}>{listing.player_overall}</span>
                  <span className={`text-[9px] font-bold ${pos.text} mt-0.5`}>{listing.player_position}</span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-base font-black tracking-tight truncate">{listing.player_name}</h2>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">{listing.player_age}a</span>
                  <span>•</span>
                  <button className="text-teal-300 hover:text-teal-200 hover:underline truncate" onClick={() => { setOfferDialogId(null); setViewingSellerId({ id: listing.seller_id, name: listing.seller_club_name, shield: listing.seller_shield }); }}>
                    {listing.seller_club_name}
                  </button>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Pedido</p>
                <p className="text-xl font-black bg-gradient-to-br from-teal-300 to-teal-500 bg-clip-text text-transparent leading-none">
                  {formatMoney(listing.asking_price)}
                </p>
              </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-4 gap-1.5 mt-4">
              {[
                { icon: '🏟️', label: 'Jogos', val: pd?.gamesPlayed ?? 0 },
                { icon: '⚽', label: 'Gols', val: pd?.goals ?? 0 },
                { icon: '🅰️', label: 'Assist', val: pd?.assists ?? 0 },
                { icon: '★', label: 'Média', val: pd?.seasonRatings?.length > 0 ? (pd.seasonRatings.reduce((a: number, b: number) => a + b, 0) / pd.seasonRatings.length).toFixed(1) : '—' },
              ].map((s, i) => (
                <div key={i} className="text-center py-2 rounded-lg bg-black/30 border border-white/5">
                  <p className="text-sm font-black leading-none">{s.val}</p>
                  <p className="text-[9px] text-muted-foreground mt-1">{s.icon} {s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="negotiate" className="w-full">
          <TabsList className="grid grid-cols-2 w-full h-10 rounded-xl p-1 bg-black/40 border border-white/5">
            <TabsTrigger value="negotiate" className="text-[11px] rounded-lg gap-1.5 data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-200 data-[state=active]:shadow-[0_0_20px_-5px_hsl(var(--primary))]">
              <DollarSign className="h-3.5 w-3.5" /> Negociação
            </TabsTrigger>
            <TabsTrigger value="history" className="text-[11px] rounded-lg gap-1.5 data-[state=active]:bg-white/10">
              <FileText className="h-3.5 w-3.5" /> Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-2 mt-3">
            {pd?.history && pd.history.length > 0 ? (
              <div className="space-y-1.5">
                {pd.history.map((h: any, i: number) => (
                  <div key={i} className="flex items-center gap-2.5 rounded-xl p-2.5 border border-white/5 bg-black/30 hover:bg-black/40 transition">
                    <ShieldCrest primaryColor="#4a5568" secondaryColor="#a0aec0" pattern="solid" shape="classic" size={24} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs truncate">{h.club}</p>
                      <p className="text-[9px] text-muted-foreground">T{h.seasonStart}{h.seasonEnd ? `–${h.seasonEnd}` : ' (atual)'}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] shrink-0">
                      <span>{h.games}j</span>
                      <span>⚽{h.goals}</span>
                      <span>🅰️{h.assists}</span>
                      {h.avgRating > 0 && <span className="font-bold text-teal-300">★{h.avgRating.toFixed(1)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-muted-foreground rounded-xl border border-white/5 bg-black/20">Sem histórico de clubes anteriores.</div>
            )}
          </TabsContent>

          <TabsContent value="negotiate" className="space-y-3 mt-3">
            {/* Transfer fee — fixed */}
            <div className="relative overflow-hidden rounded-xl p-3 border border-teal-500/20 bg-gradient-to-br from-teal-500/10 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-teal-300/80 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="h-3 w-3" /> Valor de Transferência
                  </p>
                  <p className="text-2xl font-black text-teal-300 mt-1 leading-none">{formatMoney(listing.asking_price)}</p>
                  <p className="text-[9px] text-muted-foreground mt-1">Preço fixo baseado nos atributos</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center">
                  <Tag className="h-5 w-5 text-teal-300" />
                </div>
              </div>
            </div>

            {/* Salary */}
            <div className="rounded-xl p-3 border border-white/5 bg-black/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <span>💰</span> Salário mensal
                </label>
                <span className="text-[9px] text-muted-foreground">Atual: R${currentSalary}</span>
              </div>
              <div className="flex items-center gap-2">
                <Input type="number" value={offerSalary} onChange={e => setOfferSalary(Math.max(100, Number(e.target.value)))} className="h-10 text-sm font-bold rounded-lg bg-black/40 border-white/10 focus-visible:border-teal-500/20" />
                <Badge variant="outline" className={cn(
                  "text-[10px] shrink-0 border",
                  salaryDelta >= 20 ? "border-teal-500/20 bg-teal-500/10 text-teal-300" :
                  salaryDelta >= 0 ? "border-blue-500/20 bg-blue-500/10 text-blue-300" :
                  "border-orange-500/20 bg-orange-500/10 text-orange-300"
                )}>
                  {salaryDelta >= 0 ? '+' : ''}{salaryDelta.toFixed(0)}%
                </Badge>
              </div>
              <div className="flex gap-1">
                {[1, 1.2, 1.5, 2].map(mult => (
                  <button key={mult} onClick={() => setOfferSalary(Math.round(currentSalary * mult))}
                    className="flex-1 h-7 text-[10px] rounded-md border border-white/5 bg-white/[0.03] hover:bg-white/10 hover:border-white/20 transition font-bold text-muted-foreground hover:text-foreground">
                    {mult === 1 ? 'Igual' : `${mult}x`}
                  </button>
                ))}
              </div>
              {offerSalary < currentSalary && (
                <p className="text-[10px] text-orange-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Salário inferior — menor chance de aceite</p>
              )}
            </div>

            {/* Contract */}
            <div className="rounded-xl p-3 border border-white/5 bg-black/30 space-y-2">
              <label className="text-[11px] font-bold flex items-center gap-1.5"><span>📄</span> Duração do contrato</label>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map(y => (
                  <button key={y} onClick={() => setOfferYears(y)}
                    className={cn(
                      "h-10 rounded-lg text-xs font-black transition border",
                      offerYears === y
                        ? "bg-gradient-to-br from-teal-500/15 to-teal-500/5 border-teal-500/25 text-teal-200 shadow-[0_0_20px_-8px_hsl(var(--primary))]"
                        : "bg-black/40 border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"
                    )}>
                    {y}a
                  </button>
                ))}
              </div>
            </div>

            {/* Signing bonus */}
            <div className="rounded-xl p-3 border border-white/5 bg-black/30 space-y-2">
              <label className="text-[11px] font-bold flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5 text-amber-300" /> Luvas (bônus de assinatura)
              </label>
              <Input type="number" value={signingBonus} onChange={e => setSigningBonus(Math.max(0, Number(e.target.value)))} className="h-10 text-sm font-bold rounded-lg bg-black/40 border-white/10 focus-visible:border-amber-500/20" />
              <div className="flex gap-1">
                {[0, 50000, 200000, 500000, 1000000].map(v => (
                  <button key={v} onClick={() => setSigningBonus(v)}
                    className={cn(
                      "flex-1 h-7 text-[10px] rounded-md border transition font-bold",
                      signingBonus === v ? "bg-amber-500/15 border-amber-500/20 text-amber-200" : "bg-white/[0.03] border-white/5 text-muted-foreground hover:bg-white/10"
                    )}>
                    {v === 0 ? '—' : formatMoney(v)}
                  </button>
                ))}
              </div>
            </div>

            {/* Performance Bonuses */}
            <div className="rounded-xl p-3 border border-white/5 bg-black/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-primary" /> Bônus por desempenho</p>
                <button onClick={() => setShowBonusHelp(!showBonusHelp)} className="h-6 w-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              {showBonusHelp && (
                <div className="rounded-lg p-3 text-[10px] leading-relaxed border border-teal-500/15 bg-teal-500/[0.04]">
                  <p className="font-bold mb-1.5 text-teal-300">📖 Como funcionam os bônus?</p>
                  <p className="text-muted-foreground">• <strong className="text-foreground">Luvas:</strong> Pagamento único na assinatura.</p>
                  <p className="text-muted-foreground">• <strong className="text-foreground">Por gol/assist:</strong> Aumentam motivação. Altos = jogador "fominha".</p>
                  <p className="text-muted-foreground">• <strong className="text-foreground">Por jogo:</strong> Motivação equilibrada.</p>
                  <p className="text-muted-foreground">• <strong className="text-foreground">Por título:</strong> Grande motivação sem fominha.</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Por gol', emoji: '⚽', value: bonusGoals, set: setBonusGoals, alert: bonusGoals > 50000 },
                  { label: 'Por assist.', emoji: '🅰️', value: bonusAssists, set: setBonusAssists, alert: bonusAssists > 50000 },
                  { label: 'Por jogo', emoji: '🏟️', value: bonusGames, set: setBonusGames, alert: false },
                  { label: 'Por título', emoji: '🏆', value: bonusTitles, set: setBonusTitles, alert: false },
                ].map(b => (
                  <div key={b.label} className="space-y-1">
                    <label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <span>{b.emoji}</span> {b.label}
                      {b.alert && <AlertTriangle className="h-2.5 w-2.5 text-orange-400" />}
                    </label>
                    <Input type="number" value={b.value} onChange={e => b.set(Math.max(0, Number(e.target.value)))}
                      className={cn("h-9 text-xs font-bold rounded-lg bg-black/40 border-white/10 focus-visible:border-primary/40", b.alert && "border-orange-500/20")} />
                  </div>
                ))}
              </div>
              {fominha && (
                <p className="text-[10px] text-orange-400 flex items-center gap-1 pt-1"><AlertTriangle className="h-3 w-3" /> Bônus elevados podem deixar o jogador "fominha"</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* ── STICKY SUMMARY + CTA ── */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-teal-500/20 backdrop-blur-2xl"
          style={{ background: 'linear-gradient(180deg, hsl(220 50% 6% / 0.85), hsl(220 50% 4% / 0.98))' }}>
          <div className="max-w-2xl mx-auto p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="rounded-lg p-2 bg-black/40 border border-white/5">
                <p className="text-muted-foreground">Custo total</p>
                <p className={cn("font-black text-sm leading-none mt-1", canAfford ? "text-teal-300" : "text-red-400")}>
                  {formatMoney(totalTransfer)}
                </p>
              </div>
              <div className="rounded-lg p-2 bg-black/40 border border-white/5">
                <p className="text-muted-foreground">Salário/mês</p>
                <p className={cn("font-black text-sm leading-none mt-1", offerSalary >= currentSalary ? "text-blue-300" : "text-orange-400")}>
                  R${offerSalary}
                </p>
              </div>
              <div className="rounded-lg p-2 bg-black/40 border border-white/5">
                <p className="text-muted-foreground">Contrato</p>
                <p className="font-black text-sm leading-none mt-1">{offerYears} ano{offerYears > 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="h-11 px-4 text-xs rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/10" onClick={() => setOfferDialogId(null)}>
                Cancelar
              </Button>
              <Button
                className={cn(
                  "flex-1 h-11 text-xs rounded-xl gap-1.5 font-black transition-all",
                  canAfford
                    ? "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white shadow-[0_0_30px_-5px_hsl(var(--primary))]"
                    : "bg-red-500/20 text-red-300 cursor-not-allowed"
                )}
                onClick={() => makeOffer(listing)}
                disabled={loading || !canAfford}>
                <Send className="h-4 w-4" />
                {canAfford ? 'Enviar Proposta Oficial' : 'Verba insuficiente'}
                {canAfford && <Sparkles className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>
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
            <p className="text-lg font-black text-teal-400">{formatMoney(tBudget)}</p>
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
          {/* Premium header */}
          <div className="relative overflow-hidden rounded-2xl border border-white/5 p-3 backdrop-blur-sm"
            style={{ background: 'linear-gradient(135deg, hsl(220 40% 9% / 0.7), hsl(150 50% 8% / 0.5))' }}>
            <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-teal-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="relative flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500/15 to-teal-500/5 border border-teal-500/30 flex items-center justify-center">
                  <Globe className="h-4 w-4 text-teal-300" />
                </div>
                <div>
                  <h3 className="font-black text-sm leading-none">Mercado Global</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{listings.length} jogadores disponíveis ao vivo</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={loadListings} className="text-xs gap-1.5 h-8 rounded-lg border-white/10 hover:border-white/20 hover:bg-white/5">
                <RefreshCw className={cn('h-3 w-3', isLoadingListings && 'animate-spin')} /> Atualizar
              </Button>
            </div>

            <div className="relative flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Buscar jogador ou clube..." value={searchText} onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }} className="h-9 pl-8 text-xs rounded-xl bg-black/30 border-white/10 focus-visible:border-teal-500/20" />
              </div>
              <Select value={posFilter} onValueChange={v => { setPosFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-9 w-[90px] text-[11px] rounded-xl bg-black/30 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas pos.</SelectItem>
                  {['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={v => { setSortBy(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-9 w-[120px] text-[11px] rounded-xl bg-black/30 border-white/10"><SlidersHorizontal className="h-3 w-3 mr-1" /><SelectValue placeholder="Ordenar" /></SelectTrigger>
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
            <div className="relative flex items-center gap-1.5 flex-wrap mt-2">
              <Input placeholder="OVR min" type="number" value={ovrMinFilter} onChange={e => { setOvrMinFilter(e.target.value); setCurrentPage(1); }} className="h-8 w-[72px] text-[10px] rounded-lg bg-black/30 border-white/10" />
              <Input placeholder="OVR max" type="number" value={ovrMaxFilter} onChange={e => { setOvrMaxFilter(e.target.value); setCurrentPage(1); }} className="h-8 w-[72px] text-[10px] rounded-lg bg-black/30 border-white/10" />
              <Input placeholder="Idade min" type="number" value={ageMinFilter} onChange={e => { setAgeMinFilter(e.target.value); setCurrentPage(1); }} className="h-8 w-[78px] text-[10px] rounded-lg bg-black/30 border-white/10" />
              <Input placeholder="Idade max" type="number" value={ageMaxFilter} onChange={e => { setAgeMaxFilter(e.target.value); setCurrentPage(1); }} className="h-8 w-[78px] text-[10px] rounded-lg bg-black/30 border-white/10" />
              {(searchText || posFilter !== 'all' || ovrMinFilter || ovrMaxFilter || ageMinFilter || ageMaxFilter || sortBy !== 'recent') && (
                <Button variant="ghost" size="sm" className="h-8 px-2 text-[10px] text-destructive hover:bg-destructive/10" onClick={() => {
                  setSearchText(''); setPosFilter('all'); setOvrMinFilter(''); setOvrMaxFilter('');
                  setAgeMinFilter(''); setAgeMaxFilter(''); setSortBy('recent'); setCurrentPage(1);
                }}>
                  <X className="h-3 w-3 mr-0.5" /> Limpar
                </Button>
              )}
            </div>
          </div>

          {isLoadingListings && listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-primary opacity-50" />
              <p className="text-xs text-muted-foreground animate-pulse">Sincronizando mercado...</p>
            </div>
          ) : (() => {
            const filtered = filterListings(allMarketListings);
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                  {paginated.map(listing => {
                    const shield = listing.seller_shield as any;
                    const isOwn = listing.seller_id === userId;
                    const canAfford = budget >= listing.asking_price * 0.5;
                    return (
                      <PremiumListingCard
                        key={listing.id}
                        listing={listing}
                        isOwn={isOwn}
                        canAfford={canAfford}
                        loading={loading}
                        onOffer={() => openOfferDialog(listing)}
                        onBuyNow={() => buyNow(listing)}
                        onViewSeller={() => setViewingSellerId({ id: listing.seller_id, name: listing.seller_club_name, shield })}
                      />
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
          {/* ── PREMIUM HEADER ── */}
          <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 backdrop-blur-xl"
            style={{ background: 'linear-gradient(135deg, hsl(190 50% 9% / 0.75), hsl(220 45% 8% / 0.85))' }}>
            <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-sky-500/10 blur-3xl" />
            <div className="relative p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-xl bg-cyan-500/30 blur-md" />
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/15 to-cyan-700/5 border border-cyan-400/20 flex items-center justify-center">
                    <Handshake className="h-5 w-5 text-cyan-200" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black tracking-tight">Empréstimos Online</h2>
                    <button onClick={() => setNegotiateLoan({ player_name: "Guia de Empréstimos", player_position: "?", player_age: 0, player_overall: 0, salary: 0, _isHelpOnly: true })}
                      className="w-5 h-5 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition">
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">1 temporada · receptor paga 100% do salário</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={loadLoanListings} className="h-8 text-[10px] gap-1.5 rounded-lg border-white/10 hover:border-cyan-500/20 hover:bg-cyan-500/5">
                <RefreshCw className="h-3 w-3" /> Atualizar
              </Button>
            </div>
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
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-cyan-300/80 uppercase tracking-wider">Disponíveis no Mercado</p>
                  <Badge variant="outline" className="text-[9px] border-cyan-500/25 bg-cyan-500/10 text-cyan-300">{filtered.length}</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 items-center rounded-xl p-2 border border-white/5 bg-black/30 backdrop-blur-sm">
                  <Select value={loanPosFilter} onValueChange={setLoanPosFilter}>
                    <SelectTrigger className="h-8 w-[85px] text-[10px] rounded-lg bg-black/40 border-white/10"><SelectValue /></SelectTrigger>
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
                  <Input placeholder="OVR min" type="number" value={loanOvrMin} onChange={e => setLoanOvrMin(e.target.value)} className="h-8 w-[70px] text-[10px] rounded-lg bg-black/40 border-white/10" />
                  <Input placeholder="OVR max" type="number" value={loanOvrMax} onChange={e => setLoanOvrMax(e.target.value)} className="h-8 w-[70px] text-[10px] rounded-lg bg-black/40 border-white/10" />
                  <Input placeholder="Idade min" type="number" value={loanAgeMin} onChange={e => setLoanAgeMin(e.target.value)} className="h-8 w-[75px] text-[10px] rounded-lg bg-black/40 border-white/10" />
                  <Input placeholder="Idade max" type="number" value={loanAgeMax} onChange={e => setLoanAgeMax(e.target.value)} className="h-8 w-[75px] text-[10px] rounded-lg bg-black/40 border-white/10" />
                  <Input placeholder="Sal. max (k)" type="number" value={loanSalaryMax} onChange={e => setLoanSalaryMax(e.target.value)} className="h-8 w-[95px] text-[10px] rounded-lg bg-black/40 border-white/10" />
                  {hasFilters && (
                    <Button size="sm" variant="ghost" className="h-8 text-[10px] rounded-lg hover:bg-white/5" onClick={() => {
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {filtered.map(l => {
                      const pos = posColors[l.player_position] || { bg: 'bg-muted/30', text: 'text-muted-foreground', border: 'border-border/30' };
                      return (
                        <div key={l.id}
                          className="group relative rounded-xl overflow-hidden border border-cyan-500/25 backdrop-blur-sm hover:border-cyan-400/30 hover:shadow-[0_0_25px_-8px_hsl(190_85%_55%/0.6)] hover:-translate-y-0.5 transition-all duration-300"
                          style={{ background: 'linear-gradient(135deg, hsl(190 40% 9% / 0.6), hsl(220 45% 8% / 0.85))' }}>
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-sky-600" />
                          <div className="absolute top-0 right-0 z-10">
                            <div className="px-2 py-0.5 text-[8px] font-black tracking-widest uppercase rounded-bl-lg bg-gradient-to-r from-cyan-500 to-sky-500 text-cyan-950 flex items-center gap-1 shadow-lg">
                              <Handshake className="h-2.5 w-2.5" /> Loan
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5 p-3">
                            <div className="relative shrink-0">
                              <div className="absolute inset-0 rounded-xl bg-cyan-500/20 blur-sm" />
                              <div className={`relative w-11 h-11 rounded-xl flex flex-col items-center justify-center ${pos.bg} border ${pos.border}`}>
                                <span className={`text-sm font-black ${getOvrColor(l.player_overall)} leading-none`}>{l.player_overall}</span>
                                <span className={`text-[7px] font-bold ${pos.text} mt-0.5`}>{l.player_position}</span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black truncate">{l.player_name}</p>
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                {l.player_age}a • <span className="text-cyan-300">{l.seller_club_name}</span>
                              </p>
                              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-[9px] font-black text-cyan-200">
                                  <DollarSign className="h-2.5 w-2.5" /> {((l.salary || 0) / 1000).toFixed(1)}k
                                </span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/30 text-[9px] font-bold text-sky-300">
                                  <Timer className="h-2.5 w-2.5" /> 1 temp
                                </span>
                              </div>
                            </div>
                            <Button size="sm" disabled={loading} onClick={() => setNegotiateLoan(l)}
                              className="h-9 px-3 text-[10px] rounded-lg gap-1.5 font-black bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-cyan-950 shadow-[0_0_15px_-5px_rgb(6_182_212)] shrink-0">
                              <Handshake className="h-3.5 w-3.5" /> Negociar
                            </Button>
                          </div>
                          <div className="px-3 pb-2.5 -mt-1 text-[9px] text-muted-foreground/80">
                            Salário 100% pago pelo cessionário durante o empréstimo
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {loanListings.filter(l => l.seller_id === userId).length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-amber-300/80 uppercase tracking-wider">Seus anúncios ativos</p>
              <div className="space-y-1.5">
                {loanListings.filter(l => l.seller_id === userId).map(l => (
                  <div key={l.id} className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/[0.06] to-transparent backdrop-blur-sm p-3 flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-black ${posColors[l.player_position]?.bg || 'bg-muted/30'} ${posColors[l.player_position]?.text || ''}`}>{l.player_position}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black truncate">{l.player_name}</p>
                      <p className="text-[10px] text-muted-foreground">OVR {l.player_overall} • {l.player_age}a • R${((l.salary || 0) / 1000).toFixed(0)}k/mês</p>
                    </div>
                    <Badge className="text-[8px] bg-amber-500/15 text-amber-300 border-amber-500/30">📣 Anunciado</Badge>
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-[9px] rounded-lg hover:bg-red-500/15 hover:text-red-300" onClick={async () => {
                      const res = await supabase.functions.invoke('process-transfer', { body: { action: 'loan-delist', listingId: l.id } });
                      if (res.error || res.data?.error) toast.error(res.data?.error || 'Erro');
                      else { toast.success('Retirado!'); loadLoanListings(); }
                    }}>
                      <X className="h-3 w-3 mr-0.5" /> Retirar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loanedPlayers.filter(l => l.direction === 'out').length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-orange-300/80 uppercase tracking-wider">Empréstimos cedidos ativos</p>
              <div className="space-y-1.5">
                {loanedPlayers.filter(l => l.direction === 'out').map((loan, i) => (
                  <div key={i} className="rounded-xl border border-orange-500/20 bg-gradient-to-r from-orange-500/[0.06] to-transparent backdrop-blur-sm p-3 flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-black ${posColors[loan.player.position]?.bg || 'bg-muted/30'} ${posColors[loan.player.position]?.text || ''}`}>{loan.player.position}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black truncate">{loan.player.name}</p>
                      <p className="text-[10px] text-muted-foreground">OVR {loan.player.overall} • {loan.player.age}a</p>
                    </div>
                    <Badge className="text-[8px] bg-orange-500/15 text-orange-300 border-orange-500/30">↗ Cedido</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loanListings.filter(l => l.seller_id === userId).length === 0 && loanedPlayers.filter(l => l.direction === 'out').length === 0 && (
            <div className="text-center py-10 text-xs text-muted-foreground rounded-2xl border border-white/5 bg-black/30">
              <ArrowLeftRight className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Você ainda não cedeu nenhum jogador.<br />
              <span className="text-foreground/80">Vá em <strong>Elenco</strong> para emprestar.</span>
            </div>
          )}
        </TabsContent>

        {/* ── PROPOSTAS (recebidas + enviadas) ── */}
        <TabsContent value="offers" className="space-y-4 mt-3">
          {/* ── PREMIUM HERO ── */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/15 backdrop-blur-xl"
            style={{ background: 'linear-gradient(135deg, hsl(40 50% 9% / 0.7), hsl(220 45% 8% / 0.85))' }}>
            <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-amber-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-teal-500/10 blur-3xl" />
            <div className="relative p-3 flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-xl bg-amber-500/30 blur-md" />
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-700/5 border border-amber-400/20 flex items-center justify-center">
                  <Send className="h-5 w-5 text-amber-200" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-black tracking-tight">Central de Propostas</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Recebidas · Enviadas · Renovas · Empréstimos</p>
              </div>
              <div className="flex items-center gap-1.5">
                {incomingOffers.length > 0 && (
                  <Badge className="text-[9px] bg-red-500/20 text-red-300 border-red-500/30 animate-pulse">{incomingOffers.length} novas</Badge>
                )}
                {incomingLoanOffers.length > 0 && (
                  <Badge className="text-[9px] bg-cyan-500/20 text-cyan-300 border-cyan-500/30">{incomingLoanOffers.length} empréstimo</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Recebidas */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                <span className="text-[11px]">📩</span>
              </div>
              <h3 className="font-black text-xs uppercase tracking-wider">Transferências Recebidas</h3>
              {incomingOffers.length > 0 && <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[9px]">{incomingOffers.length}</Badge>}
            </div>

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
                            <p className="text-lg font-black text-teal-400">R${(offer.offered_price / 1000).toFixed(0)}k</p>
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

          {/* Enviadas */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                <Send className="h-3.5 w-3.5 text-blue-300" />
              </div>
              <h3 className="font-black text-xs uppercase tracking-wider">Transferências Enviadas</h3>
              <Badge variant="outline" className="text-[9px] border-blue-500/25 bg-blue-500/10 text-blue-300">{myOffers.length}</Badge>
            </div>

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
                    accepted: { bg: 'bg-teal-500/15', text: 'text-teal-400', label: '✅ Aceita' },
                    awaiting_decision: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: '⏳ Jogador decidindo...' },
                    rejected: { bg: 'bg-red-500/15', text: 'text-red-400', label: '❌ Recusada' },
                    player_rejected: { bg: 'bg-orange-500/15', text: 'text-orange-400', label: '🚫 Jogador recusou' },
                    player_accepted: { bg: 'bg-teal-500/15', text: 'text-teal-400', label: '✅ Jogador aceitou!' },
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

          {/* Renovas (Próprios Jogadores) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-500/15 border border-teal-500/25 flex items-center justify-center">
                <RefreshCw className="h-3.5 w-3.5 text-teal-300" />
              </div>
              <h3 className="font-black text-xs uppercase tracking-wider">Renovas Oferecidas</h3>
              <Badge variant="outline" className="text-[9px] border-teal-500/25 bg-teal-500/10 text-teal-300">{myRenewals.length}</Badge>
            </div>

            {myRenewals.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground rounded-xl border border-border/15" style={{ background: 'hsl(var(--card))' }}>
                Nenhuma proposta de renovação ativa.
              </div>
            ) : (
              <div className="space-y-1.5">
                {myRenewals.map(negotiation => {
                  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
                    pending: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: '⏳ Analisando...' },
                    accepted: { bg: 'bg-teal-500/15', text: 'text-teal-400', label: '✅ Renovado!' },
                    rejected: { bg: 'bg-red-500/15', text: 'text-red-400', label: '❌ Recusada' },
                  };
                  const sc = statusConfig[negotiation.status] || statusConfig.pending;
                  
                  return (
                    <div key={negotiation.id} className="rounded-xl border border-border/15 p-3 flex items-center gap-2.5" style={{ background: 'hsl(var(--card))' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{negotiation.player_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Sal: R${negotiation.offered_salary}/mês • {negotiation.offered_duration} anos
                        </p>
                        {negotiation.status === 'pending' && negotiation.response_at && (
                          <p className="text-[9px] text-blue-400 mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> 
                            Resposta em: {new Date(negotiation.response_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                      <Badge className={`text-[8px] ${sc.bg} ${sc.text} border-0 shrink-0`}>{sc.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Empréstimos Recebidos */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
                <ArrowLeftRight className="h-3.5 w-3.5 text-cyan-300" />
              </div>
              <h3 className="font-black text-xs uppercase tracking-wider">Empréstimos Recebidos</h3>
              {incomingLoanOffers.length > 0 && <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[9px] animate-pulse">{incomingLoanOffers.length}</Badge>}
            </div>

            {incomingLoanOffers.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground rounded-xl border border-border/15" style={{ background: 'hsl(var(--card))' }}>
                Nenhuma proposta de empréstimo recebida.
              </div>
            ) : (
              <div className="space-y-2.5">
                {incomingLoanOffers.map(offer => {
                  const listing = loanListings.find(l => l.id === offer.listing_id);
                  const borrowerPct = offer.offered_salary_payer === 'buyer'
                    ? offer.offered_salary_split_pct || 100
                    : offer.offered_salary_payer === 'seller'
                      ? 100 - (offer.offered_salary_split_pct || 0)
                      : offer.offered_salary_split_pct || 50;
                  return (
                    <div key={offer.id} className="rounded-xl border border-cyan-500/20 overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
                      <div className="p-3 bg-gradient-to-r from-cyan-500/10 to-transparent">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-muted/30 text-[10px] font-black shrink-0">
                              {listing?.player_overall ?? '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black truncate">{listing?.player_name || 'Jogador'}</p>
                              <p className="text-[10px] text-muted-foreground truncate">De: <span className="text-primary">{offer.buyer_club_name}</span></p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-base font-black text-cyan-400">R${((offer.offered_loan_fee || 0) / 1000).toFixed(0)}k</p>
                            <p className="text-[9px] text-muted-foreground">taxa de empréstimo</p>
                          </div>
                        </div>
                      </div>

                      <div className="px-3 pb-3">
                        <div className="grid grid-cols-2 gap-1.5 mb-3 mt-2">
                          <div className="rounded-lg p-1.5 text-[9px] text-center" style={{ background: 'hsl(var(--accent) / 0.5)' }}>📅 1 Temporada</div>
                          <div className="rounded-lg p-1.5 text-[9px] text-center" style={{ background: 'hsl(var(--accent) / 0.5)' }}>💰 Receptor: {borrowerPct}%</div>
                        </div>
                        {offer.status === 'countered' && (
                          <div className="rounded-lg p-2 mb-2 text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-300">
                            ↩️ Contraproposta enviada — aguardando resposta do clube comprador.
                          </div>
                        )}
                        {offer.status === 'pending' && (
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" className="flex-1 min-w-[90px] h-9 text-xs rounded-lg gap-1.5 bg-teal-600 hover:bg-teal-500" disabled={loading} onClick={async () => {
                              setLoading(true);
                              const res = await supabase.functions.invoke('process-transfer', { body: { action: 'loan-offer-accept', offerId: offer.id } });
                              if (res.error || res.data?.error) toast.error(res.data?.error || 'Erro');
                              else toast.success('Empréstimo confirmado!');
                              setLoading(false); loadLoanOffers(); loadLoanListings();
                            }}>
                              <Check className="h-3.5 w-3.5" /> Aceitar
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 min-w-[90px] h-9 text-xs rounded-lg gap-1.5 border-amber-500/20 text-amber-400 hover:bg-amber-500/10" disabled={loading} onClick={() => setCounterLoanOffer({ ...offer, _listing: listing })}>
                              <RefreshCw className="h-3.5 w-3.5" /> Contraproposta
                            </Button>
                            <Button size="sm" variant="destructive" className="flex-1 min-w-[90px] h-9 text-xs rounded-lg gap-1.5" disabled={loading} onClick={async () => {
                              setLoading(true);
                              const res = await supabase.functions.invoke('process-transfer', { body: { action: 'loan-offer-reject', offerId: offer.id } });
                              if (res.error || res.data?.error) toast.error(res.data?.error || 'Erro');
                              else toast.success('Proposta recusada');
                              setLoading(false); loadLoanOffers();
                            }}>
                              <X className="h-3.5 w-3.5" /> Recusar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Empréstimos Enviados (status) */}
          {myLoanOffers.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Send className="h-4 w-4 text-cyan-400" /> Propostas de Empréstimo Enviadas
                <Badge variant="outline" className="text-[9px]">{myLoanOffers.length}</Badge>
              </h3>
              <div className="space-y-1.5">
                {myLoanOffers.map(offer => {
                  const listing = loanListings.find(l => l.id === offer.listing_id);
                  const sc: Record<string, { bg: string; text: string; label: string }> = {
                    pending: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: '⏳ Pendente' },
                    countered: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: '↩️ Contraproposta' },
                    accepted: { bg: 'bg-teal-500/15', text: 'text-teal-400', label: '✅ Aceita' },
                    rejected: { bg: 'bg-red-500/15', text: 'text-red-400', label: '❌ Recusada' },
                  };
                  const s = sc[offer.status] || sc.pending;
                  return (
                    <div key={offer.id} className="rounded-xl border border-border/15 p-3 flex items-center gap-2.5" style={{ background: 'hsl(var(--card))' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{listing?.player_name || 'Jogador'}</p>
                        <p className="text-[10px] text-muted-foreground">Taxa: R${((offer.offered_loan_fee || 0) / 1000).toFixed(0)}k</p>
                        {offer.status === 'countered' && offer.counter_message && (
                          <p className="text-[9px] text-amber-300 mt-1">💬 {offer.counter_message}</p>
                        )}
                      </div>
                      <Badge className={`text-[8px] ${s.bg} ${s.text} border-0 shrink-0`}>{s.label}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>



        {negotiateLoan && (
          <LoanNegotiationModal
            open={!!negotiateLoan}
            onOpenChange={(open) => {
              if (!open) setNegotiateLoan(null);
            }}
            mode="negotiate"
            player={{
              name: negotiateLoan.player_name,
              position: negotiateLoan.player_position,
              age: negotiateLoan.player_age,
              overall: negotiateLoan.player_overall,
              salary: negotiateLoan.salary || 0,
            }}
            initialTerms={negotiateLoan._isHelpOnly ? undefined : {
              duration: 12,
              loanFee: negotiateLoan.loan_fee || 0,
              salaryPercentageOwner: negotiateLoan.salary_split_pct ? (negotiateLoan.salary_payer === 'seller' ? negotiateLoan.salary_split_pct : 100 - negotiateLoan.salary_split_pct) : 0,
              salaryPercentageBorrower: negotiateLoan.salary_split_pct ? (negotiateLoan.salary_payer === 'buyer' ? negotiateLoan.salary_split_pct : 100 - negotiateLoan.salary_split_pct) : 100,
              obligatoryPurchase: false,
              allowTermination: true,
              minStayMonths: 0,
              terminationFee: 0,
              canPlayAgainstOwner: false,
              usagePriority: 'none',
              minMinutesRequired: 0,
              performanceBonus: 0,
            }}
            onSubmit={async (terms: LoanTerms) => {
              if (negotiateLoan._isHelpOnly) {
                setNegotiateLoan(null);
                return;
              }
              const borrowerPct = Math.min(100, Math.max(0, Number(terms.salaryPercentageBorrower) || 0));
              const offeredSalaryPayer = borrowerPct >= 100 ? 'buyer' : borrowerPct <= 0 ? 'seller' : 'split';
              const payload = {
                action: 'loan-offer-create',
                listingId: negotiateLoan.id,
                clubName,
                offeredSalaryPayer,
                offeredSalarySplitPct: borrowerPct,
                offeredLoanFee: Math.max(0, Number(terms.loanFee) || 0),
                message: '',
              };
              console.log('[loan-offer-create] payload', payload);
              const res = await supabase.functions.invoke('process-transfer', { body: payload });
              console.log('[loan-offer-create] response', res);
              if (res.error || res.data?.error) {
                const msg = res.data?.error || res.error?.message || 'Erro ao enviar proposta';
                console.error('[loan-offer-create] failed:', msg, res);
                toast.error(msg);
              } else {
                toast.success(`Proposta de empréstimo enviada para ${negotiateLoan.player_name}!`);
                setNegotiateLoan(null);
                loadLoanOffers();
              }
            }}
            loading={loading}
          />
        )}

        {counterLoanOffer && (
          <LoanNegotiationModal
            open={!!counterLoanOffer}
            onOpenChange={(open) => { if (!open) setCounterLoanOffer(null); }}
            mode="negotiate"
            player={{
              name: counterLoanOffer._listing?.player_name || 'Jogador',
              position: counterLoanOffer._listing?.player_position,
              age: counterLoanOffer._listing?.player_age,
              overall: counterLoanOffer._listing?.player_overall,
              salary: counterLoanOffer._listing?.salary || 0,
            }}
            initialTerms={{
              duration: 12,
              loanFee: counterLoanOffer.offered_loan_fee || 0,
              salaryPercentageOwner: counterLoanOffer.offered_salary_payer === 'seller' ? (counterLoanOffer.offered_salary_split_pct || 100) : 100 - (counterLoanOffer.offered_salary_split_pct || 100),
              salaryPercentageBorrower: counterLoanOffer.offered_salary_payer === 'buyer' ? (counterLoanOffer.offered_salary_split_pct || 100) : 100 - (counterLoanOffer.offered_salary_split_pct || 100),
              obligatoryPurchase: false,
              allowTermination: true,
              minStayMonths: 0,
              terminationFee: 0,
              canPlayAgainstOwner: false,
              usagePriority: 'none',
              minMinutesRequired: 0,
              performanceBonus: 0,
            }}
            onSubmit={async (terms: LoanTerms) => {
              setLoading(true);
              const res = await supabase.functions.invoke('process-transfer', {
                body: {
                  action: 'loan-offer-counter',
                  offerId: counterLoanOffer.id,
                  counterSalaryPayer: terms.salaryPercentageBorrower >= 100 ? 'buyer' : terms.salaryPercentageBorrower <= 0 ? 'seller' : 'split',
                  counterSalarySplitPct: terms.salaryPercentageBorrower,
                  counterLoanFee: terms.loanFee,
                  counterOfferedTerms: terms,
                }
              });
              if (res.error || res.data?.error) toast.error(res.data?.error || 'Erro ao enviar contraproposta');
              else toast.success('Contraproposta enviada!');
              setLoading(false);
              setCounterLoanOffer(null);
              loadLoanOffers();
            }}
            loading={loading}
          />
        )}

        </div>
      </Tabs>
    </div>
  );
}
