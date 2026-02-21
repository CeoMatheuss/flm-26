import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Users, Loader2, ShoppingCart, Send, DollarSign, Gift, Eye } from 'lucide-react';
import { ShieldCrest } from './ShieldCrest';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SquadPlayer {
  id: string;
  name: string;
  position: string;
  age: number;
  isLoanedOut: boolean;
  isLoanedIn: boolean;
  overall?: number;
  goals?: number;
  assists?: number;
  gamesPlayed?: number;
}

interface TransferListing {
  id: string;
  seller_id: string;
  seller_club_name: string;
  player_name: string;
  player_position: string;
  player_overall: number;
  player_age: number;
  player_data: any;
  asking_price: number;
  status: string;
}

interface LoanListing {
  id: string;
  player_name: string;
  salary: number;
}

interface Props {
  sellerId: string;
  sellerClubName: string;
  sellerShield?: { primaryColor: string; secondaryColor: string; pattern: string; shape?: string } | null;
  onBack: () => void;
  // For buying
  budget?: number;
  clubName?: string;
}

const posColors: Record<string, string> = {
  GOL: 'bg-primary/15 text-primary',
  ZAG: 'bg-blue-500/15 text-blue-400',
  LAT: 'bg-cyan-500/15 text-cyan-400',
  VOL: 'bg-emerald-500/15 text-emerald-400',
  MEI: 'bg-purple-500/15 text-purple-400',
  ATA: 'bg-red-500/15 text-red-400',
};
const posOrder = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
const posLabels: Record<string, string> = {
  GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', VOL: 'Volante', MEI: 'Meia', ATA: 'Atacante',
};

export function SellerTeamView({ sellerId, sellerClubName, sellerShield, onBack, budget, clubName }: Props) {
  const [squad, setSquad] = useState<SquadPlayer[]>([]);
  const [teamName, setTeamName] = useState(sellerClubName);
  const [shield, setShield] = useState(sellerShield);
  const [loading, setLoading] = useState(true);
  const [transferListings, setTransferListings] = useState<TransferListing[]>([]);
  const [loanListings, setLoanListings] = useState<LoanListing[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [negotiatingListing, setNegotiatingListing] = useState<TransferListing | null>(null);

  const canBuy = budget != null && clubName != null;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await supabase.functions.invoke('get-seller-squad', {
        body: { sellerId },
      });

      if (res.error || res.data?.error) {
        toast.error(res.data?.error || 'Erro ao carregar time');
        setLoading(false);
        return;
      }

      setSquad(res.data.squad || []);
      setTeamName(res.data.clubName || sellerClubName);
      if (res.data.shield) setShield(res.data.shield);

      // Fetch transfer/loan listings
      const { data: transfers } = await supabase
        .from('transfer_listings')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('status', 'active');
      if (transfers) setTransferListings(transfers as unknown as TransferListing[]);

      const { data: loans } = await supabase
        .from('loan_listings')
        .select('id, player_name, salary')
        .eq('seller_id', sellerId)
        .eq('status', 'active');
      if (loans) setLoanListings(loans as unknown as LoanListing[]);

      setLoading(false);
    };
    load();
  }, [sellerId, sellerClubName]);

  const transferNames = useMemo(() => new Set(transferListings.map(t => t.player_name)), [transferListings]);
  const loanNames = useMemo(() => new Set(loanListings.map(l => l.player_name)), [loanListings]);

  const sortedSquad = [...squad].sort((a, b) => {
    const posA = posOrder.indexOf(a.position);
    const posB = posOrder.indexOf(b.position);
    if (posA !== posB) return posA - posB;
    return a.name.localeCompare(b.name);
  });

  const starterIds = useMemo(() => {
    const ids = new Set<string>();
    const byPos: Record<string, number> = {};
    const maxStarters: Record<string, number> = { GOL: 1, ZAG: 2, LAT: 2, VOL: 2, MEI: 2, ATA: 2 };
    for (const p of sortedSquad) {
      const current = byPos[p.position] || 0;
      if (current < (maxStarters[p.position] || 2)) {
        byPos[p.position] = current + 1;
        ids.add(p.id);
      }
    }
    return ids;
  }, [sortedSquad]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Carregando elenco...</p>
      </div>
    );
  }

  // Negotiation view
  if (negotiatingListing) {
    return (
      <NegotiationView
        listing={negotiatingListing}
        budget={budget || 0}
        clubName={clubName || ''}
        onBack={() => setNegotiatingListing(null)}
        onSuccess={() => {
          setNegotiatingListing(null);
          supabase.from('transfer_listings').select('*').eq('seller_id', sellerId).eq('status', 'active')
            .then(({ data }) => { if (data) setTransferListings(data as unknown as TransferListing[]); });
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-xs">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Mercado
      </Button>

      {/* Team Header */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {shield ? (
              <ShieldCrest primaryColor={shield.primaryColor} secondaryColor={shield.secondaryColor} pattern={shield.pattern} shape={(shield.shape as any) || 'classic'} size={56} />
            ) : (
              <span className="text-4xl">⚽</span>
            )}
            <div>
              <h2 className="text-xl font-bold">{teamName}</h2>
              <p className="text-xs text-muted-foreground">{squad.length} jogadores</p>
              {transferListings.length > 0 && (
                <p className="text-[10px] text-amber-400 mt-0.5">🏷️ {transferListings.length} jogador{transferListings.length > 1 ? 'es' : ''} à venda</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Squad */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" /> Elenco Completo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {sortedSquad.map((p, i) => {
              const isStarter = starterIds.has(p.id);
              const isOnTransfer = transferNames.has(p.name);
              const isOnLoan = loanNames.has(p.name);
              const listing = isOnTransfer ? transferListings.find(t => t.player_name === p.name) : null;
              const loan = isOnLoan ? loanListings.find(l => l.player_name === p.name) : null;

              return (
                <button
                  key={p.id}
                  className={`w-full flex items-center gap-2 py-2 px-2.5 rounded transition-colors text-left ${
                    isOnTransfer ? 'bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15' :
                    isOnLoan ? 'bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15' :
                    'bg-muted/20 hover:bg-muted/40'
                  }`}
                  onClick={() => setSelectedPlayer({ ...p, listing, loan })}
                >
                  <span className="text-[10px] text-muted-foreground w-4">{i + 1}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${posColors[p.position] || 'bg-muted'}`}>{p.position}</span>
                  <span className="text-xs font-medium flex-1 truncate">{p.name}</span>
                  {isOnTransfer && (
                    <Badge variant="outline" className="text-[8px] px-1 h-4 border-amber-500/50 text-amber-400 gap-0.5">
                      <ShoppingCart className="h-2.5 w-2.5" /> À Venda
                    </Badge>
                  )}
                  {isOnLoan && (
                    <Badge variant="outline" className="text-[8px] px-1 h-4 border-blue-500/50 text-blue-400">
                      🔄 Empréstimo
                    </Badge>
                  )}
                  {p.isLoanedIn && (
                    <Badge variant="outline" className="text-[7px] border-blue-500/30 text-blue-400 px-1 py-0">EMPRESTADO</Badge>
                  )}
                  {p.isLoanedOut && (
                    <Badge variant="outline" className="text-[7px] border-orange-500/30 text-orange-400 px-1 py-0">CEDIDO</Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">{p.age} anos</span>
                  <Badge variant={isStarter ? 'default' : 'outline'} className="text-[8px] px-1.5 h-4">
                    {isStarter ? 'Titular' : 'Reserva'}
                  </Badge>
                  <Eye className="h-3 w-3 text-muted-foreground/50" />
                </button>
              );
            })}
          </div>
          {squad.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum jogador encontrado.</p>
          )}
        </CardContent>
      </Card>

      {/* Player Detail Dialog */}
      <Dialog open={!!selectedPlayer} onOpenChange={(v) => { if (!v) setSelectedPlayer(null); }}>
        <DialogContent className="max-w-sm">
          {selectedPlayer && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${posColors[selectedPlayer.position]}`}>{selectedPlayer.position}</span>
                  {selectedPlayer.name}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-muted/30 rounded p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">Posição</p>
                  <p className="font-semibold">{posLabels[selectedPlayer.position] || selectedPlayer.position}</p>
                </div>
                <div className="bg-muted/30 rounded p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">Idade</p>
                  <p className="font-semibold">{selectedPlayer.age} anos</p>
                </div>
                <div className="bg-muted/30 rounded p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">Status</p>
                  <p className="font-semibold">{starterIds.has(selectedPlayer.id) ? 'Titular' : 'Reserva'}</p>
                </div>
              </div>

              {selectedPlayer.listing && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingCart className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">À VENDA</span>
                  </div>
                  <p className="text-xs">Preço: <span className="font-bold text-emerald-400">R${(selectedPlayer.listing.asking_price / 1000).toFixed(0)}k</span></p>
                  <p className="text-[10px] text-muted-foreground">OVR {selectedPlayer.listing.player_overall} • {selectedPlayer.listing.player_age} anos</p>
                  {canBuy && (
                    <Button size="sm" className="w-full mt-2 gap-1.5" onClick={() => { setSelectedPlayer(null); setNegotiatingListing(selectedPlayer.listing); }}>
                      <Send className="h-3.5 w-3.5" /> Fazer Proposta
                    </Button>
                  )}
                </div>
              )}

              {selectedPlayer.loan && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <span className="text-xs font-bold text-blue-400">🔄 DISPONÍVEL PARA EMPRÉSTIMO</span>
                  <p className="text-xs mt-1">Salário: R${(selectedPlayer.loan.salary / 1000).toFixed(0)}k/mês</p>
                </div>
              )}

              {!selectedPlayer.listing && !selectedPlayer.loan && (
                <p className="text-[10px] text-muted-foreground text-center py-2">Este jogador não está disponível para transferência.</p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// === Negotiation View (same pattern as ClubProfilePage) ===
function NegotiationView({ listing, budget, clubName, onBack, onSuccess }: {
  listing: TransferListing; budget: number; clubName: string; onBack: () => void; onSuccess: () => void;
}) {
  const [offerSalary, setOfferSalary] = useState(listing.player_data?.salary || 500);
  const [offerYears, setOfferYears] = useState(2);
  const [signingBonus, setSigningBonus] = useState(0);
  const [bonusGoals, setBonusGoals] = useState(0);
  const [bonusAssists, setBonusAssists] = useState(0);
  const [bonusGames, setBonusGames] = useState(0);
  const [bonusTitles, setBonusTitles] = useState(0);
  const [loading, setLoading] = useState(false);

  const currentSalary = listing.player_data?.salary || 500;

  const makeOffer = async () => {
    if (budget < listing.asking_price) { toast.error('Orçamento insuficiente!'); return; }
    setLoading(true);
    const res = await supabase.functions.invoke('process-transfer', {
      body: {
        action: 'offer',
        listingId: listing.id,
        offeredPrice: listing.asking_price,
        offeredSalary: offerSalary,
        contractYears: offerYears,
        bonusGoals, bonusAssists, bonusGames, bonusTitles, signingBonus,
        clubName,
      },
    });
    if (res.error || res.data?.error) {
      toast.error(res.data?.error || 'Erro ao enviar proposta');
    } else {
      toast.success(`Proposta enviada para ${listing.player_name}!`);
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={onBack}>
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Perfil
      </Button>

      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" /> Negociar — {listing.player_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-3">
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${posColors[listing.player_position] || 'bg-muted'}`}>{listing.player_position}</span>
            <div>
              <p className="text-sm font-bold">{listing.player_name}</p>
              <p className="text-xs text-muted-foreground">{listing.player_age}a • OVR {listing.player_overall} • {listing.seller_club_name}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] text-muted-foreground">Preço</p>
              <p className="font-bold text-sm text-emerald-400">R${(listing.asking_price / 1000).toFixed(0)}k</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Valor (R$)</label>
            <p className="text-lg font-bold text-emerald-400 mt-1">R${(listing.asking_price / 1000).toFixed(0)}k</p>
            <p className="text-[9px] text-muted-foreground">Preço fixo</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">💰 Salário (R$) — atual: R${currentSalary}</label>
            <Input type="number" value={offerSalary} onChange={e => setOfferSalary(Math.max(100, Number(e.target.value)))} className="h-9 text-xs mt-1" />
            {offerSalary < currentSalary && <p className="text-[10px] text-orange-400 mt-0.5">⚠️ Salário inferior ao atual</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">📄 Contrato</label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map(y => (
                <Button key={y} size="sm" variant={offerYears === y ? 'default' : 'outline'} className="h-7 px-3 text-xs" onClick={() => setOfferYears(y)}>
                  {y}a
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Gift className="h-3.5 w-3.5" /> Luvas (R$)</label>
            <Input type="number" value={signingBonus} onChange={e => setSigningBonus(Math.max(0, Number(e.target.value)))} className="h-9 text-xs mt-1" />
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">🎯 Bônus (R$)</p>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-muted-foreground">⚽ Gol</label><Input type="number" value={bonusGoals} onChange={e => setBonusGoals(Math.max(0, Number(e.target.value)))} className="h-8 text-xs" /></div>
              <div><label className="text-[10px] text-muted-foreground">🅰️ Assist.</label><Input type="number" value={bonusAssists} onChange={e => setBonusAssists(Math.max(0, Number(e.target.value)))} className="h-8 text-xs" /></div>
              <div><label className="text-[10px] text-muted-foreground">🏟️ Jogo</label><Input type="number" value={bonusGames} onChange={e => setBonusGames(Math.max(0, Number(e.target.value)))} className="h-8 text-xs" /></div>
              <div><label className="text-[10px] text-muted-foreground">🏆 Título</label><Input type="number" value={bonusTitles} onChange={e => setBonusTitles(Math.max(0, Number(e.target.value)))} className="h-8 text-xs" /></div>
            </div>
          </div>

          <div className="bg-primary/10 rounded-lg p-3 text-xs">
            <p className="font-bold text-primary mb-1">📊 Resumo:</p>
            <p>💵 R${(listing.asking_price / 1000).toFixed(0)}k • 💰 R${offerSalary}/mês • 📄 {offerYears}a</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-10 text-xs" onClick={onBack}>Cancelar</Button>
            <Button className="flex-1 h-10 text-xs" onClick={makeOffer} disabled={loading || budget < listing.asking_price}>
              <Send className="h-3.5 w-3.5 mr-1.5" /> Enviar Proposta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
