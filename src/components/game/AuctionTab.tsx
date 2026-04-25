import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Gavel, Crown, Clock, TrendingUp, AlertTriangle, User } from 'lucide-react';
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
  created_at: string;
  expires_at: string;
}

interface Props {
  userId: string;
  clubName: string;
  players: any[];
  budget: number;
  isPremium: boolean;
  onSellPlayer?: (playerId: string) => void;
}

export function AuctionTab({ userId, clubName, players, budget, isPremium, onSellPlayer: _onSellPlayer }: Props) {
  const { guard } = useLiveMatchGuard();
  const onSellPlayer = _onSellPlayer ? guard(_onSellPlayer) : undefined;
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAuctions = async () => {
    const { data } = await supabase
      .from('player_auctions')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (data) setAuctions(data as unknown as Auction[]);
  };

  useEffect(() => {
    loadAuctions();
    const channel = supabase
      .channel('auctions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_auctions' }, () => {
        loadAuctions();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Eligible players: 60+ overall, <= 35 age
  const eligiblePlayers = players.filter(p => p.overall >= 60 && (p.age || 25) <= 35);

  /**
   * Preço inicial automático baseado em OVR + idade.
   * Curva: OVR 60 → ~250k | 70 → ~1M | 80 → ~4M | 85 → ~7M | 90+ → ~12M+
   * Idade jovem (≤24) +20%; veterano (≥32) -25%.
   */
  const computeStartPrice = (player: any): number => {
    const ovr = Math.max(60, Math.min(99, player.overall || 60));
    // Crescimento exponencial suave
    const ovrFactor = Math.pow((ovr - 55) / 10, 2.4);
    let price = Math.round(150_000 * ovrFactor);

    const age = player.age || 25;
    if (age <= 24) price = Math.round(price * 1.2);
    else if (age >= 32) price = Math.round(price * 0.75);
    else if (age >= 30) price = Math.round(price * 0.9);

    // Piso e teto razoáveis
    return Math.max(100_000, Math.min(50_000_000, price));
  };

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
      toast.success(`${player.name} em leilão por R$ ${(startPrice / 1000000).toFixed(2)}M!`);
      if (onSellPlayer) onSellPlayer(player.id);
      loadAuctions();
    }
    setLoading(false);
  };

  const handleBid = async (auction: Auction) => {
    if (!isPremium) {
      toast.error('⭐ Apenas clubes Premium podem dar lances no leilão!');
      return;
    }
    if (auction.seller_id === userId) {
      toast.error('Você não pode dar lance no seu próprio jogador!');
      return;
    }

    const minBid = Math.ceil(auction.current_bid * 1.3); // +30% obrigatório
    if (budget < minBid) {
      toast.error(`Orçamento insuficiente! Lance mínimo: R$ ${(minBid / 1000000).toFixed(2)}M`);
      return;
    }

    setLoading(true);
    // Garantia anti-duplicação: só atualiza se current_bid ainda for o esperado
    const { data: updated, error } = await supabase
      .from('player_auctions')
      .update({
        current_bid: minBid,
        current_bidder_id: userId,
        current_bidder_name: clubName,
      })
      .eq('id', auction.id)
      .eq('status', 'active')
      .eq('current_bid', auction.current_bid) // optimistic lock
      .select();

    if (error) {
      toast.error('Erro ao dar lance');
    } else if (!updated || updated.length === 0) {
      toast.error('Outro lance foi feito antes do seu. Tente novamente!');
      loadAuctions();
    } else {
      toast.success(`Lance de R$ ${(minBid / 1000000).toFixed(2)}M registrado! (+30%)`);
      loadAuctions();
    }
    setLoading(false);
  };

  const getTimeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Encerrado';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

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
            Leiloe jogadores 60+ OVR (até 35 anos). Preço inicial calculado por OVR e idade. Apenas clubes Premium podem dar lances, e cada lance deve ser 30% maior que o anterior.
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
          <p className="text-[10px] text-muted-foreground">Jogadores elegíveis: 65+ OVR, até 35 anos. Valor inicial = metade do valor de mercado.</p>
        </CardHeader>
        <CardContent>
          {eligiblePlayers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum jogador elegível (65+ OVR, ≤35 anos)</p>
          ) : (
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1.5">
                {eligiblePlayers.map(p => {
                  const halfValue = Math.floor((p.value || 500000) / 2);
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
                        <span className="text-[9px] text-muted-foreground">R$ {(halfValue / 1000000).toFixed(2)}M</span>
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
                const minNextBid = Math.ceil(a.current_bid * 1.2);
                const isMyAuction = a.seller_id === userId;
                const isMyBid = a.current_bidder_id === userId;
                return (
                  <Card key={a.id} className={`border-border/50 ${isMyBid ? 'border-green-500/30' : isMyAuction ? 'border-purple-500/30' : ''}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Badge className="text-[8px] px-1 py-0 h-4 bg-purple-500/20 text-purple-300 border-purple-500/30">
                              {a.player_overall} OVR
                            </Badge>
                            <span className="text-xs font-bold truncate">{a.player_name}</span>
                            <span className="text-[9px] text-muted-foreground">({a.player_age} anos)</span>
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                            <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" /> {a.seller_club_name}</span>
                            <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {getTimeLeft(a.expires_at)}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-[9px] text-muted-foreground">Lance atual</p>
                          <p className="text-sm font-black text-purple-400">R$ {(a.current_bid / 1000000).toFixed(2)}M</p>
                          {a.current_bidder_name && (
                            <p className="text-[8px] text-muted-foreground">por {a.current_bidder_name}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                        <p className="text-[9px] text-muted-foreground">
                          Próximo lance mín: <span className="font-bold text-foreground">R$ {(minNextBid / 1000000).toFixed(2)}M</span> (+20%)
                        </p>
                        {!isMyAuction && (
                          <Button
                            size="sm"
                            className="h-6 px-3 text-[9px] font-bold bg-purple-500 hover:bg-purple-600 text-white"
                            onClick={() => handleBid(a)}
                            disabled={loading || !isPremium}
                          >
                            {isPremium ? (
                              <>
                                <Gavel className="h-3 w-3 mr-1" /> Dar Lance
                              </>
                            ) : (
                              <>
                                <Crown className="h-3 w-3 mr-1" /> Premium Only
                              </>
                            )}
                          </Button>
                        )}
                        {isMyAuction && (
                          <Badge variant="outline" className="text-[8px] text-purple-400 border-purple-500/30">Seu leilão</Badge>
                        )}
                        {isMyBid && !isMyAuction && (
                          <Badge className="text-[8px] bg-green-500/20 text-green-400 border-green-500/30 ml-1">Seu lance</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
