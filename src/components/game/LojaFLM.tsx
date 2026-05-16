import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  ShoppingBag, DollarSign, Users, Crown, Package, 
  CheckCircle2, Lock, Zap, ChevronRight, Rocket, 
  Loader2, History, Info, TrendingUp, Building2, 
  Stethoscope, HardHat, UserCog, AlertCircle, RefreshCw,
  Eye, QrCode, Copy, Check, X, CreditCard, Mail, Star,
  LineChart, LayoutDashboard, ArrowUpRight, Shirt
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShopItemDetails } from './ShopItemDetails';
import { ShopFinanceDashboard } from './ShopFinanceDashboard';

interface LojaProps {
  club: any;
  infrastructure: any;
  userId: string;
  isPremium?: boolean;
  onUpgradeFacility?: (facility: string) => void;
  onAcceptSponsor?: (offer: any) => void;
}

const CATEGORIES = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, db: 'dashboard' },
  { id: 'uniform', name: 'Uniformes', icon: Shirt, db: 'uniform' },
  { id: 'patrocinios', name: 'Patrocínios', icon: DollarSign, db: 'sponsorship' },
  { id: 'marketing', name: 'Marketing', icon: Rocket, db: 'marketing' },
  { id: 'stickers', name: 'Figurinhas', icon: Package, db: 'stickers' },
  { id: 'infra', name: 'Estrutura', icon: Building2, db: 'infrastructure' },
  { id: 'staff', name: 'Equipe', icon: UserCog, db: 'staff' },
  { id: 'history', name: 'Histórico', icon: History, db: 'history' },
];

export function LojaFLM({ club, infrastructure, userId, isPremium }: LojaProps) {
  const [activeCategory, setActiveCategory] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [showPremium, setShowPremium] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string; orderId: string } | null>(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutMethod, setCheckoutMethod] = useState<'pix' | 'card'>('pix');
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutFullName, setCheckoutFullName] = useState('');
  const [checkoutCpf, setCheckoutCpf] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [shopStats, setShopStats] = useState<any>(null);
  const [shopProducts, setShopProducts] = useState<any[]>([]);
  const [upgrading, setUpgrading] = useState(false);


  useEffect(() => {
    fetchItems();
    if (userId) {
      fetchHistory();
      
    const channel = supabase
      .channel('public:payment_orders_history')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'payment_orders',
        filter: `user_id=eq.${userId}`
      }, (payload: any) => {
        fetchHistory();
        // Se o status mudou para 'approved' e for o pedido atual (ou do PIX)
        if (payload.new.status === 'approved' && 
           (payload.new.id === currentOrderId || (pixData && payload.new.id === pixData.orderId))) {
          
          setShowPixModal(false);
          setShowPremium(true);
          
          const audio = new Audio('https://www.myinstants.com/media/sounds/level-up-6.mp3');
          audio.volume = 0.3;
          audio.play().catch(() => {});
          
          window.dispatchEvent(new CustomEvent('flm:purchase-success', { 
            detail: { item_name: payload.new.metadata?.item_name || 'Seu Item' } 
          }));
          
          // Dispara um evento para atualizar o estado global do clube (orçamento, torcida, etc)
          window.dispatchEvent(new CustomEvent('flm:refresh-club-data'));
          
          toast.success(`Pagamento confirmado! Seu item "${payload.new.metadata?.item_name || 'Premium'}" já foi entregue.`);
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
    }
  }, [userId, currentOrderId, pixData]);

  // Polling de 5s enquanto o modal do PIX está aberto: verifica status do pagamento
  // e redireciona o jogador para o início assim que for aprovado.
  useEffect(() => {
    if (!showPixModal || !pixData?.orderId) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('payment_orders')
          .select('status, metadata')
          .eq('id', pixData.orderId)
          .maybeSingle();
        if (cancelled || error || !data) return;
        if (data.status === 'approved') {
          clearInterval(interval);
          setShowPixModal(false);
          const itemName = (data.metadata as any)?.item_name || 'Premium';
          toast.success(`Pagamento confirmado! Seu item "${itemName}" foi entregue. Redirecionando...`);
          window.dispatchEvent(new CustomEvent('flm:refresh-club-data'));
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        } else if (['rejected', 'cancelled', 'expired'].includes(data.status)) {
          clearInterval(interval);
          setShowPixModal(false);
          toast.error('Pagamento não concluído. Tente novamente.');
        }
      } catch (_) {
        // silencioso: tentaremos novamente no próximo ciclo
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [showPixModal, pixData?.orderId]);

  async function fetchItems() {
    try {
      setLoading(true);
      setError(null);
      
      const [itemsRes, statsRes, productsRes] = await Promise.all([
        supabase.from('shop_items').select('*').order('price_cents', { ascending: true }),
        supabase.from('club_shop_stats').select('*').eq('club_id', club.id).single(),
        supabase.from('club_shop_products').select('*').order('min_level', { ascending: true })
      ]);
        
      if (itemsRes.error) throw itemsRes.error;
      if (itemsRes.data) setItems(itemsRes.data);
      if (statsRes.data) setShopStats(statsRes.data);
      if (productsRes.data) setShopProducts(productsRes.data);
    } catch (e: any) {
      console.error('Error fetching shop items:', e);
      setError('Erro ao carregar itens da loja. Tente novamente.');
      toast.error('Erro de conexão com a loja');
    } finally {
      setLoading(false);
    }
  }

  const handleUpgrade = async () => {
    try {
      setUpgrading(true);
      const { data, error } = await supabase.rpc('upgrade_club_shop', { p_club_id: club.id });
      if (error) throw error;
      
      const result = data as any;
      if (result?.success) {
        toast.success(`Loja evoluída para o Nível ${result.new_level}!`);
        fetchItems();
        window.dispatchEvent(new CustomEvent('flm:refresh-club-data'));
      } else {
        toast.error(result?.error || 'Erro ao realizar upgrade.');
      }
    } catch (e: any) {
      toast.error('Erro ao processar upgrade.');
    } finally {
      setUpgrading(false);
    }
  };

  async function fetchHistory() {
    try {
      const { data, error: histErr } = await supabase
        .from('payment_orders')
        .select('*, shop_items(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (histErr) throw histErr;
      if (data) setPurchaseHistory(data);
    } catch (e) {
      console.error('Error fetching history:', e);
    }
  }

  const handlePurchase = async (item: any) => {
    if (!item) return;
    const isBlocked = (club.fans || 0) < (item.min_fans || 0);
    if (isBlocked) {
      toast.error(`Torcida insuficiente! Você precisa de ${item.min_fans.toLocaleString()} torcedores.`);
      return;
    }

    if (item.price_cents > 0 && club.budget < (item.price_cents / 100)) {
      toast.error('Saldo insuficiente!');
      return;
    }

    setSelectedItem(item);
    setShowCheckoutModal(true);
  };

  const executePayment = async () => {
    if (!selectedItem) return;
    
    if (!checkoutEmail.includes('@')) {
      toast.error('Por favor, insira um e-mail válido para receber o comprovante.');
      return;
    }

    if (checkoutMethod === 'card') {
      if (!checkoutFullName || checkoutFullName.trim().split(' ').length < 2) {
        toast.error('Por favor, insira seu nome completo.');
        return;
      }
      if (!checkoutCpf || checkoutCpf.replace(/\D/g, '').length !== 11) {
        toast.error('Por favor, insira um CPF válido (11 dígitos).');
        return;
      }
    }


    setLoading(true);
    setShowCheckoutModal(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
        body: { 
          item_id: selectedItem.id,
          method: checkoutMethod,
          email: checkoutEmail,
          full_name: checkoutFullName,
          cpf: checkoutCpf.replace(/\D/g, '')
        }
      });


      if (error) throw error;

      if (data?.pix_qr_code) {
        setPixData({
          qrCode: data.pix_qr_code_base64,
          copyPaste: data.pix_qr_code,
          orderId: data.order_id
        });
        setShowPixModal(true);
      } else if (data?.init_point) {
        setCurrentOrderId(data.order_id);
        window.location.href = data.init_point;
      } else if (data?.status === 'approved' || selectedItem.price_cents === 0) {

        setShowPremium(true);
        toast.success(`Compra concluída: ${selectedItem.name}!`);
        const audio = new Audio('https://www.myinstants.com/media/sounds/level-up-6.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
        fetchHistory();
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao processar compra. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const openDetails = (item: any) => {
    setSelectedItem(item);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500 bg-[#050810] min-h-screen text-white p-4 overflow-y-auto scrollbar-hide">
      <div className="relative rounded-3xl bg-gradient-to-br from-[#0a2e0a] to-[#050810] p-6 border border-emerald-500/20 shadow-2xl overflow-hidden">
        <div className="absolute top-4 right-6 opacity-10">
          <ShoppingBag className="h-24 w-24 text-emerald-400" />
        </div>
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-emerald-500/10 blur-[80px] rounded-full" />
        
        <div className="flex items-center justify-between mb-4 relative z-10">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => (window as any).dispatchEvent(new CustomEvent('flm:navigate-to-tab', { detail: { tab: 'dashboard' } }))} 
            className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl gap-2 h-9"
          >
             <ChevronRight className="h-4 w-4 rotate-180" /> Voltar ao Clube
          </Button>
          <div className="flex gap-2">
            {isPremium && (
              <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase font-black text-[10px] tracking-widest px-3 py-1 gap-1">
                <Crown className="h-3 w-3" /> Membro Premium
              </Badge>
            )}
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 uppercase font-black text-[10px] tracking-widest px-3 py-1">Professional Store</Badge>
          </div>
        </div>
        
        <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-1 relative z-10">
          Loja <span className="text-emerald-500">FLM 26</span>
        </h1>
        <p className="text-emerald-100/60 text-xs font-medium relative z-10">Overhaul completo: estratégia, torcida e benefícios exclusivos.</p>
        
        <div className="flex flex-wrap gap-4 mt-8 relative z-10">
          <div className="bg-black/40 backdrop-blur-md p-3 px-5 rounded-2xl border border-white/5 flex items-center gap-3 shadow-inner">
            <div className="bg-emerald-500/20 p-2 rounded-lg">
              <DollarSign className="text-emerald-400 h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-400/60 font-black uppercase tracking-wider">Orçamento</p>
              <p className="font-black text-lg">R$ {(club.budget || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-black/40 backdrop-blur-md p-3 px-5 rounded-2xl border border-white/5 flex items-center gap-3 shadow-inner">
            <div className="bg-emerald-500/20 p-2 rounded-lg">
              <Users className="text-emerald-400 h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-400/60 font-black uppercase tracking-wider">Torcedores</p>
              <p className="font-black text-lg">{(club.fans || 0).toLocaleString()}</p>
            </div>
          </div>
          {shopStats && (
            <div className="bg-black/40 backdrop-blur-md p-3 px-5 rounded-2xl border border-emerald-500/20 flex items-center gap-3 shadow-inner">
              <div className="bg-emerald-500/20 p-2 rounded-lg">
                <TrendingUp className="text-emerald-400 h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-400/60 font-black uppercase tracking-wider">Ganhos Diários (Loja)</p>
                <p className="font-black text-lg text-emerald-400">R$ {(shopStats.daily_revenue / 100).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {shopStats && (
        <div className="flex flex-col md:flex-row gap-4 mb-2">
          <Button 
            onClick={handleUpgrade}
            disabled={upgrading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl h-14 px-8 font-black uppercase italic tracking-tighter shadow-lg shadow-emerald-900/20 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all flex-1"
          >
            {upgrading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ArrowUpRight className="mr-2 h-5 w-5" />
                Upgrade da Loja (Nível {shopStats.level} → {shopStats.level + 1})
                <Badge className="ml-3 bg-black/30 border-none">R$ {(500 * Math.pow(3, shopStats.level - 1)).toLocaleString()}</Badge>
              </>
            )}
          </Button>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl flex items-center gap-3 md:w-80">
            <div className="bg-emerald-500/20 p-2 rounded-lg">
              <Star className="text-emerald-400 h-4 w-4" />
            </div>
            <p className="text-[10px] text-emerald-100 font-bold leading-tight">
              Aumentar o nível da loja desbloqueia novos produtos e melhora a taxa de conversão dos torcedores.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <div className="bg-black/20 p-1.5 rounded-2xl border border-white/5 mb-6">
            <ScrollArea className="w-full whitespace-nowrap">
              <TabsList className="bg-transparent gap-2 h-auto p-0">
                {CATEGORIES.map(cat => (
                  <TabsTrigger 
                    key={cat.id} value={cat.id}
                    className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-xl bg-transparent text-white/60 border border-transparent data-[state=active]:border-emerald-400/30 px-5 py-2.5 transition-all"
                  >
                    <div className="flex items-center gap-2">
                       <cat.icon className="h-4 w-4" />
                       <span className="text-xs font-black uppercase italic">{cat.name}</span>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
              <ScrollBar orientation="horizontal" className="opacity-0" />
            </ScrollArea>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 text-emerald-500 animate-spin" />
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl animate-pulse" />
              </div>
              <p className="text-sm font-bold text-emerald-500/70 animate-pulse">Sincronizando com o servidor...</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-3xl text-center space-y-4 my-10">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h3 className="text-lg font-black uppercase italic">Ops! Algo deu errado</h3>
              <p className="text-sm text-red-400/80 max-w-xs mx-auto">{error}</p>
              <Button onClick={fetchItems} className="bg-red-600 hover:bg-red-500 text-white rounded-xl gap-2 font-black uppercase italic">
                <RefreshCw className="h-4 w-4" /> Tentar Novamente
              </Button>
            </div>
          )}

          {!loading && !error && (
            <>
              <TabsContent value="dashboard" className="outline-none">
                {shopStats && (
                  <ShopFinanceDashboard 
                    stats={shopStats} 
                    club={club} 
                    products={shopProducts} 
                  />
                )}
              </TabsContent>

              {CATEGORIES.filter(cat => cat.id !== 'history' && cat.id !== 'dashboard').map(cat => (
                <TabsContent key={cat.id} value={cat.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 outline-none">
                  <AnimatePresence mode="popLayout">
                    {items
                      .filter(i => i.category === cat.db)
                      .map((item, idx) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <StoreCard 
                            item={item} 
                            clubFans={club.fans || 0} 
                            isPremium={isPremium}
                            onPurchase={() => handlePurchase(item)} 
                            onViewDetails={() => openDetails(item)}
                          />
                        </motion.div>
                      ))}
                  </AnimatePresence>
                  
                  {items.filter(i => i.category === cat.db).length === 0 && (
                    <div className="col-span-full py-20 text-center">
                       <Package className="h-12 w-12 text-white/10 mx-auto mb-3" />
                       <p className="text-sm text-white/40 font-medium italic">Nenhum item disponível nesta categoria no momento.</p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </>
          )}

          <TabsContent value="history" className="space-y-4 outline-none">
            <Card className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
              <CardHeader className="border-b border-white/5 bg-white/5 px-6 py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2">
                    <History className="h-4 w-4 text-emerald-400" /> Histórico de Compras
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={fetchHistory} className="h-8 text-[10px] font-black uppercase italic text-emerald-400">
                    Atualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {purchaseHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="bg-white/5 p-4 rounded-full">
                      <History className="h-8 w-8 text-white/10" />
                    </div>
                    <p className="text-xs text-muted-foreground italic">Nenhuma transação registrada em sua conta.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchaseHistory.map((p: any) => (
                      <div key={p.id} className="group flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${p.status === 'approved' ? 'bg-emerald-500/10' : 'bg-red-500/10'} border border-white/5`}>
                            {p.status === 'approved' ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <AlertCircle className="h-5 w-5 text-red-400" />}
                          </div>
                          <div>
                            <p className="text-sm font-black uppercase italic">{p.shop_items?.name || 'Item do Sistema'}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                              <span>{new Date(p.created_at).toLocaleDateString('pt-BR')}</span>
                              <span className="w-1 h-1 rounded-full bg-white/10" />
                              <span>{new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-white">R$ {(p.amount_cents / 100).toLocaleString()}</p>
                          <Badge className={`text-[8px] uppercase tracking-wider font-black ${p.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'} border-none rounded-md px-1.5`}>
                            {p.status === 'approved' ? 'Concluído' : p.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AnimatePresence>
        {showPremium && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-[#050810] border border-emerald-500/30 p-8 rounded-[2.5rem] text-center space-y-6 max-w-sm w-full shadow-[0_0_50px_rgba(16,185,129,0.2)]"
            >
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 bg-amber-500/20 blur-2xl animate-pulse rounded-full" />
                <Crown className="w-full h-full text-amber-500 relative z-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black italic uppercase text-emerald-400 tracking-tighter">Pedido Confirmado!</h2>
                <p className="text-sm text-muted-foreground leading-relaxed px-4">Sua compra foi processada com sucesso. Os benefícios já foram aplicados à sua conta!</p>
              </div>
              <Button onClick={() => setShowPremium(false)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase italic w-full rounded-2xl py-7 text-lg shadow-lg shadow-emerald-900/20">
                Acessar Clube
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ShopItemDetails 
        item={selectedItem}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onPurchase={() => handlePurchase(selectedItem)}
        clubFans={club.fans || 0}
      />

      <AnimatePresence>
        {showCheckoutModal && selectedItem && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[115] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-[#0A0D14] border border-emerald-500/30 p-8 rounded-[2.5rem] space-y-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-none uppercase font-black text-[10px]">Finalizar Pedido</Badge>
                <Button variant="ghost" size="icon" onClick={() => setShowCheckoutModal(false)} className="h-8 w-8 rounded-full hover:bg-white/5">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] text-emerald-400/60 font-black uppercase tracking-widest text-left">Item Selecionado</p>
                  <p className="text-xl font-black italic uppercase text-white tracking-tighter text-left">{selectedItem.name}</p>
                  <p className="text-lg font-black text-emerald-400 text-left">R$ {(selectedItem.price_cents / 100).toLocaleString()}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] text-emerald-400/60 font-black uppercase tracking-widest text-left">Seu E-mail (Receber Comprovante)</p>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                    <input 
                      type="email" 
                      placeholder="exemplo@gmail.com"
                      value={checkoutEmail}
                      onChange={(e) => setCheckoutEmail(e.target.value)}
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                </div>

                {checkoutMethod === 'card' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <p className="text-[10px] text-emerald-400/60 font-black uppercase tracking-widest text-left">Nome Completo</p>
                      <div className="relative">
                        <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                        <input 
                          type="text" 
                          placeholder="Como no cartão"
                          value={checkoutFullName}
                          onChange={(e) => setCheckoutFullName(e.target.value)}
                          className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] text-emerald-400/60 font-black uppercase tracking-widest text-left">CPF</p>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                        <input 
                          type="text" 
                          placeholder="000.000.000-00"
                          value={checkoutCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                            setCheckoutCpf(val);
                          }}

                          className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-2">

                  <p className="text-[10px] text-emerald-400/60 font-black uppercase tracking-widest text-left">Forma de Pagamento</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setCheckoutMethod('pix')}
                      className={`h-12 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                        checkoutMethod === 'pix' 
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                          : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      <QrCode className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic">PIX</span>
                    </button>
                    <button 
                      onClick={() => setCheckoutMethod('card')}
                      className={`h-12 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                        checkoutMethod === 'card' 
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                          : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest italic">CARTÃO</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  onClick={executePayment}
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase italic rounded-2xl shadow-xl shadow-emerald-900/20 group transition-all duration-300 active:scale-95"
                >
                  <span className="flex items-center gap-2">
                    {checkoutMethod === 'pix' ? 'Gerar PIX para Pagamento' : 'Prosseguir para o Cartão'}
                    <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </div>

              <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest">
                Segurança Mercado Pago • Processamento Instantâneo
              </p>
            </motion.div>
          </motion.div>
        )}

        {showPixModal && pixData && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-[#0A0D14] border border-emerald-500/30 p-8 rounded-[2.5rem] text-center space-y-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-2">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-none uppercase font-black text-[10px]">Pagamento via PIX</Badge>
                <Button variant="ghost" size="icon" onClick={() => setShowPixModal(false)} className="h-8 w-8 rounded-full hover:bg-white/5">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="bg-white p-4 rounded-3xl mx-auto w-fit shadow-inner">
                  <img src={`data:image/jpeg;base64,${pixData.qrCode}`} alt="QR Code PIX" className="w-48 h-48" />
                </div>
                
                <div className="space-y-2 text-center">
                  <h3 className="text-xl font-black italic uppercase text-white tracking-tighter">Escaneie o QR Code</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Ou use a chave copia e cola abaixo</p>
                </div>

                <div className="bg-black/40 border border-white/5 p-3 rounded-2xl flex items-center gap-3 group">
                  <div className="bg-emerald-500/10 p-2 rounded-xl">
                    <QrCode className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[9px] text-emerald-400/60 font-black uppercase tracking-widest mb-0.5 text-left">Chave Copia e Cola</p>
                    <p className="text-xs text-white truncate font-mono text-left">{pixData.copyPaste}</p>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => {
                      navigator.clipboard.writeText(pixData.copyPaste);
                      setCopied(true);
                      toast.success('Chave PIX copiada!');
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="h-10 w-10 shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex items-center gap-3">
                  <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider text-left">
                    Aguardando confirmação do pagamento... O item será liberado automaticamente.
                  </p>
                </div>
              </div>

              <Button onClick={() => setShowPixModal(false)} variant="outline" className="w-full h-12 border-white/10 hover:bg-white/5 text-white/60 font-black uppercase italic rounded-xl">
                Fechar Janela
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StoreCard({ item, clubFans, isPremium, onPurchase, onViewDetails }: any) {
  const isBlocked = (clubFans || 0) < (item.min_fans || 0);
  const price = item.price_cents / 100;
  const isFree = item.price_cents === 0;

  return (
    <div 
      onClick={onViewDetails}
      className={`group relative overflow-hidden rounded-[2rem] border transition-all duration-500 flex flex-col h-full cursor-pointer ${
      isBlocked 
        ? 'border-white/5 bg-black/40 grayscale' 
        : `border-white/10 bg-[#0A0D14] hover:border-emerald-500/50 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_20px_rgba(16,185,129,0.1)]`
    }`}>
      {item.image_url && (
        <div className="relative aspect-[16/10] overflow-hidden">
           <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
           <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D14] via-[#0A0D14]/20 to-transparent" />
        </div>
      )}
      
      {!item.image_url && (
        <div className="h-24 bg-gradient-to-br from-emerald-500/10 to-transparent flex items-center justify-center">
          <Package className="h-10 w-10 text-emerald-500/20" />
        </div>
      )}

      <div className="relative z-10 space-y-4 p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-center">
          <Badge className={`border-none uppercase font-black text-[9px] px-2.5 py-1 ${
            item.rarity === 'legendary' ? 'bg-amber-500/20 text-amber-400' :
            item.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
            'bg-emerald-500/10 text-emerald-400'
          }`}>
            {item.rarity || 'Comum'}
          </Badge>
          {isBlocked ? (
            <div className="bg-red-500/20 p-1.5 rounded-lg border border-red-500/20">
              <Lock className="h-3.5 w-3.5 text-red-400" />
            </div>
          ) : (
            isPremium && item.id === 'premium-pass' ? (
              <Badge className="bg-emerald-500 text-white font-black text-[8px] uppercase">Ativo</Badge>
            ) : null
          )}
        </div>
        
        <div className="space-y-1">
          <h3 className="text-xl font-black uppercase italic tracking-tighter leading-tight group-hover:text-emerald-400 transition-colors">
            {item.name}
          </h3>
          <p className="text-[11px] text-muted-foreground/80 leading-relaxed font-medium line-clamp-3">
            {item.description}
          </p>
        </div>
        
        {isBlocked && (
          <div className="flex items-center gap-2 text-[10px] font-bold text-red-400 bg-red-400/10 p-2.5 rounded-xl border border-red-500/10">
            <Users className="h-3 w-3" />
            Requer {item.min_fans.toLocaleString()} torcedores
          </div>
        )}

        {!isBlocked && (
          <div className="space-y-2">
            {/* Benefício Principal Simples */}
            {item.bonus_data?.torcidaPorDia && (
              <div className="flex items-center gap-2 text-[11px] font-black text-blue-400 uppercase italic">
                <Users className="h-3 w-3" />
                +{item.bonus_data.torcidaPorDia.toLocaleString()} torcedores/dia
              </div>
            )}
            {item.bonus_data?.dinheiroSemanal && (
              <div className="flex items-center gap-2 text-[11px] font-black text-emerald-400 uppercase italic">
                <DollarSign className="h-3 w-3" />
                +R$ {(item.bonus_data.dinheiroSemanal/1000).toLocaleString()}k/semana
              </div>
            )}
            {item.bonus_data?.daily_cash && !item.bonus_data?.dinheiroSemanal && (
              <div className="flex items-center gap-2 text-[11px] font-black text-emerald-400 uppercase italic">
                <DollarSign className="h-3 w-3" />
                +R$ {(item.bonus_data.daily_cash * 7 / 1000).toLocaleString()}k/semana
              </div>
            )}
            {item.bonus_data?.desbloqueiaJogador && (
              <div className="flex items-center gap-2 text-[11px] font-black text-amber-400 uppercase italic">
                <Star className="h-3 w-3" />
                Desbloqueia Jogador
              </div>
            )}
            {item.bonus_data?.aumentaVendas && (
              <div className="flex items-center gap-2 text-[11px] font-black text-purple-400 uppercase italic">
                <Shirt className="h-3 w-3" />
                Aumenta Vendas da Loja
              </div>
            )}
          </div>
        )}

        <div className="pt-2 mt-auto flex gap-2">
          <Button 
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            className="flex-none w-12 h-12 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-white p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            disabled={isBlocked} 
            onClick={(e) => {
              e.stopPropagation();
              onPurchase();
            }}
            className={`flex-1 font-black uppercase italic h-12 rounded-2xl transition-all duration-300 shadow-lg ${
              isBlocked 
                ? 'bg-white/5 text-white/40 border border-white/5' 
                : isFree 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 group-hover:scale-[1.02] active:scale-95'
            }`}
          >
            {isFree ? 'Assinar' : (
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm">R$ {price.toLocaleString()}</span>
              </div>
            )}
          </Button>
        </div>
      </div>
      
      {!isBlocked && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full -mr-16 -mt-16 pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
      )}
    </div>
  );
}
