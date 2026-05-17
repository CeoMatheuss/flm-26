import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  ShoppingBag, DollarSign, Users, Crown, Package, 
  CheckCircle2, Lock, Zap, ChevronRight, Rocket, 
  Loader2, History, Info, TrendingUp, Building2, 
  UserCog, AlertCircle, RefreshCw, Star, Shirt,
  LayoutDashboard, ArrowUpRight, X, Mail, QrCode, CreditCard,
  Check, Copy, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShopItemDetails } from './ShopItemDetails';
import { StoreDashboard } from './shop/StoreDashboard';
import { PainelFLM } from './shop/PainelFLM';
import { useStoreManager } from '@/hooks/useStoreManager';
import { useMarketingDelivery } from '@/hooks/useMarketingDelivery';
import { formatMoney } from '@/lib/formatMoney';
import { PacotinhosTab } from './PacotinhosTab';

interface LojaProps {
  club: any;
  infrastructure: any;
  userId: string;
  isPremium?: boolean;
  onUpgradeFacility?: (facility: string) => void;
  onAcceptSponsor?: (offer: any) => void;
}

const CATEGORIES = [
  { id: 'uniform', name: 'Uniformes', icon: Shirt, db: 'uniform' },
  { id: 'patrocinios', name: 'Patrocínios', icon: DollarSign, db: 'sponsorship' },
  { id: 'marketing', name: 'Marketing', icon: Rocket, db: 'marketing' },
  { id: 'stickers', name: 'Pacotinhos', icon: Package, db: 'stickers' },
  { id: 'socio', name: 'Sócios', icon: Crown, db: 'members' },
  { id: 'all', name: 'Todos', icon: ShoppingBag, db: 'all' },
  { id: 'painel', name: 'Painel', icon: LayoutDashboard, db: 'painel' },
];

export function LojaFLM({ club, infrastructure, userId, isPremium }: LojaProps) {
  const [activeCategory, setActiveCategory] = useState('uniform');
  const storeManager = useStoreManager(club, userId);
  useMarketingDelivery(club?.id, userId);
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
        event: '*', 
        schema: 'public', 
        table: 'payment_orders',
        filter: `user_id=eq.${userId}`
      }, (payload: any) => {
        fetchHistory();
        // Se o status mudou para 'approved' e for o pedido atual (ou do PIX)
        if (payload.new?.status === 'approved' && 
           (payload.new?.id === currentOrderId || (pixData && payload.new?.id === pixData.orderId))) {
          
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
      
    const handleOpenCheckout = (e: any) => {
      const { item } = e.detail;
      if (item) {
        setSelectedItem(item);
        setShowCheckoutModal(true);
      }
    };

    window.addEventListener('flm:open-checkout', handleOpenCheckout);
      
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('flm:open-checkout', handleOpenCheckout);
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
          .select('status, metadata, delivered')
          .eq('id', pixData.orderId)
          .maybeSingle();
        if (cancelled || error || !data) return;
        if (data.status === 'approved' || data.delivered) {
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
        // silencioso
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
        .select('*, shop_items(name, category)')
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
    
    // Para itens grátis (ex: renovação básica ou promoções 0,00)
    if (selectedItem.price_cents === 0) {
      setLoading(true);
      try {
        await storeManager.activateItem(selectedItem);
        setShowCheckoutModal(false);
        toast.success(`Item "${selectedItem.name}" ativado com sucesso!`);
        fetchHistory();
      } catch (e) {
        toast.error('Erro ao ativar item gratuito.');
      } finally {
        setLoading(false);
      }
      return;
    }

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

  const isActive = (itemId: string) => {
    return storeManager.stats.activeEffects.some(e => e.itemId === itemId);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 animate-in fade-in duration-500 bg-[#050810] min-h-screen text-white p-2 sm:p-4 overflow-y-auto scrollbar-hide">
      <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0a2e0a] to-[#050810] p-3 sm:p-6 border border-emerald-500/20 shadow-2xl overflow-hidden">
        <div className="absolute top-4 right-6 opacity-10">
          <ShoppingBag className="h-24 w-24 text-emerald-400" />
        </div>
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-emerald-500/10 blur-[80px] rounded-full" />
        
        <div className="flex items-center justify-between mb-4 relative z-10">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => (window as any).dispatchEvent(new CustomEvent('flm:navigate-to-tab', { detail: { tab: 'dashboard' } }))} 
            className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl gap-2 h-8 sm:h-9 text-[10px] sm:text-xs"
          >
             <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 rotate-180" /> <span className="hidden sm:inline">Voltar ao Clube</span><span className="sm:hidden">Voltar</span>
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
        
        <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tighter leading-none mb-1 relative z-10">
          Loja <span className="text-emerald-500">FLM 26</span>
        </h1>
        <p className="text-emerald-100/60 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] relative z-10 opacity-70">Official Club Provider</p>
        
        <div className="flex flex-wrap gap-2 sm:gap-4 mt-6 sm:mt-8 relative z-10">
          <div className={`bg-black/40 backdrop-blur-md p-2 sm:p-3 px-4 sm:px-5 rounded-2xl border flex items-center gap-2 sm:gap-3 shadow-inner flex-1 min-w-[140px] ${club.budget >= 0 ? 'border-white/5' : 'border-red-500/30'}`}>
            <div className={`p-1.5 sm:p-2 rounded-lg ${club.budget >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
              <DollarSign className={`h-4 w-4 sm:h-5 sm:w-5 ${club.budget >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
            </div>
            <div>
              <p className={`text-[8px] sm:text-[10px] font-black uppercase tracking-wider ${club.budget >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>Orçamento</p>
              <p className={`font-black text-sm sm:text-lg italic ${club.budget >= 0 ? 'text-white' : 'text-red-400'}`}>R$ {(club.budget || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-black/40 backdrop-blur-md p-2 sm:p-3 px-4 sm:px-5 rounded-2xl border border-white/5 flex items-center gap-2 sm:gap-3 shadow-inner flex-1 min-w-[140px]">
            <div className="bg-emerald-500/20 p-1.5 sm:p-2 rounded-lg">
              <Users className="text-emerald-400 h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="text-[8px] sm:text-[10px] text-emerald-400/60 font-black uppercase tracking-wider">Torcedores</p>
              <p className="font-black text-sm sm:text-lg italic">{(club.fans || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Upgrade e stats da loja removidos conforme solicitado */}

      <div className="flex flex-col gap-6">
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <div className="bg-black/20 p-1 rounded-2xl border border-white/5 mb-4 sm:mb-6">
            <ScrollArea className="w-full whitespace-nowrap">
              <TabsList className="bg-transparent gap-1 sm:gap-2 h-auto p-0 flex">
                {CATEGORIES.map(cat => (
                  <TabsTrigger 
                    key={cat.id} value={cat.id}
                    className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-xl bg-transparent text-white/60 border border-transparent data-[state=active]:border-emerald-400/30 px-3 sm:px-5 py-2 sm:py-2.5 transition-all flex-1 min-w-[100px]"
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2">
                       <cat.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                       <span className="text-[9px] sm:text-xs font-black uppercase italic">{cat.name}</span>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
              <ScrollBar orientation="horizontal" className="opacity-0" />
            </ScrollArea>
          </div>

          {/* Dashboard removido conforme solicitado */}

          <TabsContent value="stickers" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PacotinhosTab 
              budget={club.budget} 
              userId={userId}
              onBuyPack={(players, cost) => {
                // Already handles in PacotinhosTab, but we sync budget
                window.dispatchEvent(new CustomEvent('flm:refresh-club-data'));
              }} 
            />
          </TabsContent>

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

              {CATEGORIES.filter(cat => cat.id !== 'history').map(cat => (
                <TabsContent key={cat.id} value={cat.id} className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 outline-none">
                  <AnimatePresence mode="popLayout">
                    {items
                      .filter(i => cat.id === 'all' ? true : i.category === cat.db)
                      .map((item, idx) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          {item.category === 'sponsorship' ? (
                            <SponsorshipCard
                              item={item}
                              clubFans={club.fans || 0}
                              isActive={isActive(item.id)}
                              onPurchase={() => handlePurchase(item)}
                              onViewDetails={() => openDetails(item)}
                            />
                          ) : (
                            <StoreCard 
                              item={item} 
                              clubFans={club.fans || 0} 
                              isPremium={isPremium}
                              isActive={isActive(item.id)}
                              onPurchase={() => handlePurchase(item)} 
                              onViewDetails={() => openDetails(item)}
                            />
                          )}
                        </motion.div>
                      ))}
                  </AnimatePresence>
                  
                  {items.filter(i => cat.id === 'all' ? items.length > 0 : i.category === cat.db).length === 0 && (
                    <div className="col-span-full py-20 text-center">
                       <Package className="h-12 w-12 text-white/10 mx-auto mb-3" />
                       <p className="text-sm text-white/40 font-medium italic">Nenhum item disponível nesta categoria no momento.</p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </>
          )}

          <TabsContent value="socio" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-slate-900/40 border border-amber-500/20 rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
              <CardHeader className="p-8 pb-0">
                <CardTitle className="text-2xl font-black uppercase italic flex items-center gap-3 text-amber-400">
                  <Crown className="h-6 w-6" /> Planos de Sócio Torcedor
                </CardTitle>
                <p className="text-white/60 text-sm">Aumente sua receita recorrente e o engajamento da torcida com planos exclusivos.</p>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {items.filter(i => i.category === 'members' || i.id.includes('socio')).map((plan, idx) => (
                    <motion.div 
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col hover:border-amber-500/30 transition-all group"
                    >
                      <div className="bg-amber-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Crown className="h-6 w-6 text-amber-400" />
                      </div>
                      <h3 className="text-xl font-black uppercase italic mb-2">{plan.name}</h3>
                      <p className="text-xs text-white/40 mb-6 flex-1">{plan.description}</p>
                      
                      <div className="space-y-3 mb-6">
                         <div className="flex justify-between text-[10px] uppercase font-black">
                            <span className="text-white/40">Mensalidade</span>
                            <span className="text-emerald-400">{formatMoney(plan.price_cents / 100)}</span>
                         </div>
                         <div className="flex justify-between text-[10px] uppercase font-black">
                            <span className="text-white/40">Bônus Hype</span>
                            <span className="text-amber-400">+{plan.bonus_data?.hype_bonus || 5}%</span>
                         </div>
                      </div>

                      <Button 
                        onClick={() => handlePurchase(plan)}
                        disabled={isActive(plan.id)}
                        className={`w-full rounded-2xl font-black uppercase italic ${isActive(plan.id) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500 hover:bg-amber-400 text-black'}`}
                      >
                        {isActive(plan.id) ? 'Plano Ativo' : 'Assinar Plano'}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ganhos" className="space-y-4 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            {(() => {
              const approved = purchaseHistory.filter((p: any) => p.status === 'approved' || p.delivered);
              const totalSpent = approved.reduce((s: number, p: any) => s + (p.amount_cents || 0), 0) / 100;
              const totalCount = approved.length;

              const CATEGORY_META: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
                sponsorship:    { label: 'Patrocínios',  icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
                marketing:      { label: 'Marketing',    icon: Rocket,     color: 'text-pink-400',    bg: 'bg-pink-500/10',    border: 'border-pink-500/30' },
                stickers:       { label: 'Pacotinhos',   icon: Package,    color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30' },
                members:        { label: 'Sócios',       icon: Crown,      color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30' },
                uniform:        { label: 'Uniformes',    icon: Shirt,      color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30' },
                infrastructure: { label: 'Infraestrutura', icon: Building2, color: 'text-cyan-400',   bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30' },
                staff:          { label: 'Equipe',       icon: UserCog,    color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/30' },
                physio:         { label: 'Fisioterapia', icon: Star,       color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/30' },
                other:          { label: 'Outros',       icon: ShoppingBag, color: 'text-white/70',   bg: 'bg-white/5',        border: 'border-white/10' },
              };

              const byCategory = approved.reduce((acc: Record<string, { count: number; total: number; last: string }>, p: any) => {
                const cat = p.shop_items?.category || (p.metadata as any)?.category || 'other';
                const key = CATEGORY_META[cat] ? cat : 'other';
                if (!acc[key]) acc[key] = { count: 0, total: 0, last: p.created_at };
                acc[key].count += 1;
                acc[key].total += (p.amount_cents || 0) / 100;
                if (new Date(p.created_at) > new Date(acc[key].last)) acc[key].last = p.created_at;
                return acc;
              }, {});
              const categoryEntries = Object.entries(byCategory).sort((a: any, b: any) => b[1].total - a[1].total);

              const byItem = approved.reduce((acc: Record<string, { name: string; category: string; count: number; total: number; last: string }>, p: any) => {
                const name = p.shop_items?.name || (p.metadata as any)?.item_name || 'Item';
                const cat = p.shop_items?.category || (p.metadata as any)?.category || 'other';
                if (!acc[name]) acc[name] = { name, category: cat, count: 0, total: 0, last: p.created_at };
                acc[name].count += 1;
                acc[name].total += (p.amount_cents || 0) / 100;
                if (new Date(p.created_at) > new Date(acc[name].last)) acc[name].last = p.created_at;
                return acc;
              }, {});
              const items = Object.values(byItem).sort((a: any, b: any) => b.total - a.total);

              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Card className="bg-emerald-500/10 border-emerald-500/30 rounded-2xl">
                      <CardContent className="p-4">
                        <p className="text-[10px] font-black uppercase italic text-emerald-400/80">Total Investido</p>
                        <p className="text-xl sm:text-2xl font-black italic text-white mt-1">R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-amber-500/10 border-amber-500/30 rounded-2xl">
                      <CardContent className="p-4">
                        <p className="text-[10px] font-black uppercase italic text-amber-400/80">Compras Aprovadas</p>
                        <p className="text-xl sm:text-2xl font-black italic text-white mt-1">{totalCount}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-500/10 border-blue-500/30 rounded-2xl">
                      <CardContent className="p-4">
                        <p className="text-[10px] font-black uppercase italic text-blue-400/80">Categorias</p>
                        <p className="text-xl sm:text-2xl font-black italic text-white mt-1">{categoryEntries.length}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                    <CardHeader className="border-b border-white/5 bg-white/5 px-4 sm:px-6 py-4">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2">
                          <LayoutDashboard className="h-4 w-4 text-emerald-400" /> Investimento por Categoria
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={fetchHistory} className="h-8 text-[10px] font-black uppercase italic text-emerald-400">
                          <RefreshCw className="h-3 w-3 mr-1" /> Atualizar
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      {categoryEntries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                          <div className="bg-white/5 p-4 rounded-full">
                            <TrendingUp className="h-8 w-8 text-white/10" />
                          </div>
                          <p className="text-xs text-muted-foreground italic">Nenhuma compra aprovada ainda.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {categoryEntries.map(([key, data]: any) => {
                            const meta = CATEGORY_META[key] || CATEGORY_META.other;
                            const Icon = meta.icon;
                            const pct = totalSpent > 0 ? (data.total / totalSpent) * 100 : 0;
                            return (
                              <div key={key} className={`p-4 rounded-2xl ${meta.bg} border ${meta.border}`}>
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded-lg bg-black/30`}>
                                      <Icon className={`h-4 w-4 ${meta.color}`} />
                                    </div>
                                    <p className={`text-xs font-black uppercase italic ${meta.color}`}>{meta.label}</p>
                                  </div>
                                  <Badge className="bg-black/30 text-white/70 border-none text-[9px] font-black">{data.count}x</Badge>
                                </div>
                                <p className="text-lg sm:text-xl font-black italic text-white">R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <div className="mt-2 h-1.5 rounded-full bg-black/40 overflow-hidden">
                                  <div className={`h-full ${meta.color.replace('text-', 'bg-')}`} style={{ width: `${pct}%` }} />
                                </div>
                                <p className="text-[9px] text-white/40 mt-1 font-medium">{pct.toFixed(1)}% do total · última {new Date(data.last).toLocaleDateString('pt-BR')}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                    <CardHeader className="border-b border-white/5 bg-white/5 px-4 sm:px-6 py-4">
                      <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-400" /> Ganhos por Produto
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                          <div className="bg-white/5 p-4 rounded-full">
                            <Star className="h-8 w-8 text-white/10" />
                          </div>
                          <p className="text-xs text-muted-foreground italic">Nenhum produto adquirido ainda.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 sm:space-y-3">
                          {items.map((it: any) => {
                            const meta = CATEGORY_META[it.category] || CATEGORY_META.other;
                            const Icon = meta.icon;
                            return (
                              <div key={it.name} className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/5">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`p-2 sm:p-3 rounded-xl ${meta.bg} border ${meta.border} flex-shrink-0`}>
                                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${meta.color}`} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs sm:text-sm font-black uppercase italic truncate">{it.name}</p>
                                    <p className="text-[9px] sm:text-[10px] text-white/40 font-medium">
                                      <span className={meta.color}>{meta.label}</span> · {it.count}x · última {new Date(it.last).toLocaleDateString('pt-BR')}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm sm:text-base font-black text-emerald-400">R$ {it.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                  <p className="text-[9px] text-white/40 uppercase font-black tracking-wider">Investido</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </TabsContent>


          <TabsContent value="history" className="space-y-4 outline-none">
            <Card className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
              <CardHeader className="border-b border-white/5 bg-white/5 px-3 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-black uppercase italic flex items-center gap-2">
                    <History className="h-4 w-4 text-emerald-400" /> Histórico de Compras
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={fetchHistory} className="h-8 text-[10px] font-black uppercase italic text-emerald-400">
                    Atualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
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
                  disabled={loading}
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase italic rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.4)] group transition-all duration-300 active:scale-95 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
                  <span className="flex items-center justify-center gap-2 relative z-10">
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Processando pagamento...</span>
                      </>
                    ) : (
                      <>
                        {checkoutMethod === 'pix' ? 'GERAR PIX PARA PAGAMENTO' : 'REALIZAR PAGAMENTO'}
                        <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
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

function StoreCard({ item, clubFans, isPremium, isActive, onPurchase, onViewDetails }: any) {
  const isBlocked = (clubFans || 0) < (item.min_fans || 0);
  const price = item.price_cents / 100;
  const isFree = item.price_cents === 0;

  return (
    <div 
      onClick={onViewDetails}
      className={`group relative overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] border transition-all duration-500 flex flex-col h-full cursor-pointer ${
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

      <div className="relative z-10 space-y-3 sm:space-y-4 p-4 sm:p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-center">
          <Badge className={`border-none uppercase font-black text-[8px] sm:text-[9px] px-2 py-0.5 sm:px-2.5 sm:py-1 ${
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
            (isPremium && item.id === 'premium-pass') || isActive ? (
              <Badge className="bg-emerald-500 text-white border-none font-black text-[8px] uppercase tracking-wider px-2 py-0.5 animate-pulse">Ativo</Badge>
            ) : null
          )}
        </div>
        
        <div className="space-y-1">
          <h3 className="text-lg sm:text-xl font-black uppercase italic tracking-tighter leading-tight group-hover:text-emerald-400 transition-colors">
            {item.name}
          </h3>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground/80 leading-relaxed font-medium line-clamp-2 sm:line-clamp-3">
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

        <div className="pt-2 mt-auto flex gap-1.5 sm:gap-2">
          <Button 
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            className="flex-none w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-white p-0"
          >
            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <Button 
            disabled={isBlocked || isActive} 
            onClick={(e) => {
              e.stopPropagation();
              onPurchase();
            }}
            className={`flex-1 font-black uppercase italic h-10 sm:h-12 rounded-xl sm:rounded-2xl transition-all duration-300 shadow-lg text-xs sm:text-sm relative overflow-hidden group ${
              isBlocked 
                ? 'bg-white/5 text-white/40 border border-white/5' 
                : isActive 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] group-hover:scale-[1.02] active:scale-95'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 relative z-10">
              {isActive ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>CONCLUÍDO</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>{isFree ? 'RESGATAR' : `R$ ${price.toLocaleString()}`}</span>
                </>
              )}
            </div>
          </Button>
        </div>
      </div>
      
      {!isBlocked && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full -mr-16 -mt-16 pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card de Patrocínio Premium — Contrato corporativo elegante
// ─────────────────────────────────────────────────────────────────────────────
function SponsorshipCard({ item, clubFans, isActive, onPurchase, onViewDetails }: any) {
  const isBlocked = (clubFans || 0) < (item.min_fans || 0);
  const price = (item.price_cents || 0) / 100;
  const isFree = (item.price_cents || 0) === 0;

  const rarity = (item.rarity || 'common').toLowerCase();
  const rarityTheme: Record<string, { ring: string; glow: string; chip: string; accent: string; label: string }> = {
    legendary: { ring: 'border-amber-400/40',  glow: 'from-amber-500/20 via-amber-500/5 to-transparent',  chip: 'bg-amber-500/15 text-amber-300 border-amber-400/30',   accent: 'text-amber-300',  label: 'LENDÁRIO' },
    epic:      { ring: 'border-purple-400/40', glow: 'from-purple-500/20 via-purple-500/5 to-transparent', chip: 'bg-purple-500/15 text-purple-300 border-purple-400/30', accent: 'text-purple-300', label: 'ÉPICO' },
    rare:      { ring: 'border-sky-400/40',    glow: 'from-sky-500/20 via-sky-500/5 to-transparent',       chip: 'bg-sky-500/15 text-sky-300 border-sky-400/30',          accent: 'text-sky-300',    label: 'RARO' },
    common:    { ring: 'border-emerald-400/30',glow: 'from-emerald-500/15 via-emerald-500/5 to-transparent',chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',accent: 'text-emerald-300', label: 'COMUM' },
  };
  const t = rarityTheme[rarity] || rarityTheme.common;

  const weekly = item.bonus_data?.dinheiroSemanal || (item.bonus_data?.daily_cash ? item.bonus_data.daily_cash * 7 : 0);
  const winBonus = item.bonus_data?.winBonus || item.bonus_data?.bonusVitoria || 0;
  const titleBonus = item.bonus_data?.titleBonus || item.bonus_data?.bonusTitulo || 0;
  const duration = item.bonus_data?.duration || item.duration_days || null;
  const torcidaPorDia = item.bonus_data?.torcidaPorDia || 0;

  const progress = Math.min(100, Math.round(((clubFans || 0) / Math.max(1, item.min_fans || 1)) * 100));

  return (
    <div
      onClick={onViewDetails}
      className={`group relative overflow-hidden rounded-[1.75rem] border-2 transition-all duration-500 flex flex-col h-full cursor-pointer backdrop-blur-sm ${
        isBlocked
          ? 'border-white/5 bg-gradient-to-b from-zinc-950 to-black grayscale opacity-80'
          : `${t.ring} bg-gradient-to-b from-zinc-950 via-[#0A0D14] to-black hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] hover:-translate-y-1`
      }`}
    >
      {/* Glow superior por raridade */}
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${t.glow} opacity-80`} />

      {/* Pattern sutil estilo contrato */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 1px, transparent 12px)',
      }} />

      {/* Header — Logo + Raridade */}
      <div className="relative z-10 px-5 pt-5 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`relative w-14 h-14 rounded-2xl border-2 ${t.ring} bg-black/60 flex items-center justify-center shadow-xl shrink-0 overflow-hidden`}>
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <DollarSign className={`h-6 w-6 ${t.accent}`} />
            )}
          </div>
          <div className="min-w-0">
            <Badge className={`border uppercase font-black text-[9px] tracking-widest px-2 py-0.5 ${t.chip}`}>
              {t.label}
            </Badge>
            <h3 className="mt-1 text-base sm:text-lg font-black uppercase italic tracking-tighter leading-none truncate">
              {item.name}
            </h3>
          </div>
        </div>
        {isBlocked ? (
          <div className="bg-red-500/20 p-1.5 rounded-lg border border-red-500/30 shrink-0">
            <Lock className="h-3.5 w-3.5 text-red-400" />
          </div>
        ) : isActive ? (
          <Badge className="bg-emerald-500 text-white border-none font-black text-[9px] uppercase tracking-widest px-2 py-1 shrink-0 animate-pulse">
            Vigente
          </Badge>
        ) : null}
      </div>

      {/* Descrição */}
      <p className="relative z-10 px-5 text-[11px] text-white/55 leading-relaxed font-medium line-clamp-2">
        {item.description}
      </p>

      {/* Cláusulas do contrato */}
      <div className="relative z-10 px-5 mt-4 space-y-1.5">
        {weekly > 0 && (
          <ContractRow icon={<DollarSign className="h-3.5 w-3.5" />} label="Pagamento" value={`R$ ${(weekly/1000).toLocaleString('pt-BR')}k`} suffix="/semana" accent="text-emerald-300" />
        )}
        {winBonus > 0 && (
          <ContractRow icon={<TrendingUp className="h-3.5 w-3.5" />} label="Bônus vitória" value={`+R$ ${winBonus.toLocaleString('pt-BR')}`} accent="text-sky-300" />
        )}
        {titleBonus > 0 && (
          <ContractRow icon={<Crown className="h-3.5 w-3.5" />} label="Bônus título" value={`+R$ ${titleBonus.toLocaleString('pt-BR')}`} accent="text-amber-300" />
        )}
        {torcidaPorDia > 0 && (
          <ContractRow icon={<Users className="h-3.5 w-3.5" />} label="Torcedores" value={`+${torcidaPorDia.toLocaleString('pt-BR')}`} suffix="/dia" accent="text-blue-300" />
        )}
        {duration && (
          <ContractRow icon={<History className="h-3.5 w-3.5" />} label="Duração" value={`${duration}${typeof duration === 'number' && duration < 10 ? ' temp.' : ' dias'}`} accent="text-white/70" />
        )}
      </div>

      {/* Requisito de torcida + barra de progresso */}
      <div className="relative z-10 mt-4 mx-5 mb-3 p-3 rounded-2xl border border-white/5 bg-black/40">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
          <span className={isBlocked ? 'text-red-300' : 'text-white/60'}>
            <Users className="inline h-3 w-3 mr-1 -mt-0.5" />
            {(item.min_fans || 0).toLocaleString('pt-BR')} torcedores
          </span>
          <span className={isBlocked ? 'text-red-300' : 'text-emerald-300'}>
            {(clubFans || 0).toLocaleString('pt-BR')}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ${isBlocked ? 'bg-red-400/60' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Ações */}
      <div className="relative z-10 px-5 pb-5 mt-auto flex gap-2">
        <Button
          variant="outline"
          onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
          className="w-11 h-11 shrink-0 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 text-white p-0"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          disabled={isBlocked || isActive}
          onClick={(e) => { e.stopPropagation(); onPurchase(); }}
          className={`flex-1 h-11 rounded-xl font-black uppercase italic text-xs sm:text-sm tracking-wider transition-all duration-300 shadow-lg ${
            isBlocked
              ? 'bg-white/5 text-white/40 border border-white/5'
              : isActive
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.35)]'
          }`}
        >
          {isActive ? (
            <span className="flex items-center justify-center gap-2"><CheckCircle2 className="h-4 w-4" /> Contrato Ativo</span>
          ) : isBlocked ? (
            <span className="flex items-center justify-center gap-2"><Lock className="h-3.5 w-3.5" /> Bloqueado</span>
          ) : isFree ? (
            <span className="flex items-center justify-center gap-2"><CheckCircle2 className="h-4 w-4" /> Assinar Contrato</span>
          ) : (
            <span className="flex items-center justify-center gap-2"><CreditCard className="h-4 w-4" /> R$ {price.toLocaleString('pt-BR')}</span>
          )}
        </Button>
      </div>
    </div>
  );
}

function ContractRow({ icon, label, value, suffix, accent }: { icon: React.ReactNode; label: string; value: string; suffix?: string; accent: string }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/[0.025] border border-white/5">
      <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-white/50">
        <span className={accent}>{icon}</span>
        {label}
      </div>
      <div className={`text-[12px] font-black tracking-tight ${accent}`}>
        {value}{suffix && <span className="text-white/40 font-bold ml-0.5">{suffix}</span>}
      </div>
    </div>
  );
}
