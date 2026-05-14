import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  ShoppingBag, Star, ShieldCheck, Zap, Sparkles, 
  Clock, Users, TrendingUp, DollarSign, Lock, 
  CheckCircle2, Loader2, AlertCircle, History, Package,
  CreditCard, QrCode, ArrowRight, Wallet, Gem, Trophy, Ticket, 
  Layout, Palette, Flag, Building2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface Product {
  id: string;
  category: string;
  name: string;
  description: string;
  price_cents: number;
  duration_days: number | null;
  min_fans: number;
  bonus_data: any;
  image_url: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface Purchase {
  id: string;
  item_id: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  item: Product;
}

export function ShopTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [myInventory, setMyInventory] = useState<any[]>([]);
  const [myPurchases, setMyPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [checkoutModal, setCheckoutModal] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const [clubData, setClubData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('marketing');
  const bricksBuilderRef = useRef<any>(null);
  const mpRef = useRef<any>(null);

  useEffect(() => {
    fetchData();
    initMP();
  }, []);

  async function initMP() {
    // We would need a PUBLIC KEY here. I'll use a placeholder or check if it exists in DB/Settings.
    // For now, I'll assume the user will provide it or I'll use a generic one if possible (though v2 needs a real key).
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'mercadopago_public_key').maybeSingle();
    const publicKey = (data?.value as any)?.key || 'TEST-APP-KEY-PLACEHOLDER';
    
    if (window.MercadoPago) {
      mpRef.current = new window.MercadoPago(publicKey, {
        locale: 'pt-BR'
      });
      bricksBuilderRef.current = mpRef.current.bricks();
    }
  }

  async function fetchData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [productsRes, inventoryRes, purchasesRes, clubRes] = await Promise.all([
        supabase.from('shop_items').select('*').eq('active', true),
        supabase.from('shop_inventory').select('*').eq('user_id', user.id),
        supabase.from('payment_orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('clubs').select('*').eq('user_id', user.id).maybeSingle()
      ]);

      if (productsRes.data) setProducts(productsRes.data as any);
      if (inventoryRes.data) setMyInventory(inventoryRes.data);
      if (purchasesRes.data) {
        // Map items to purchases
        const mapped = purchasesRes.data.map(p => ({
          ...p,
          item: productsRes.data?.find(i => i.id === p.item_id)
        })).filter(p => p.item);
        setMyPurchases(mapped as any);
      }
      if (clubRes.data) setClubData(clubRes.data);
    } catch (error) {
      console.error('Error fetching shop data:', error);
      toast.error('Erro ao carregar dados da loja');
    } finally {
      setLoading(false);
    }
  }

  const handleStartCheckout = (product: Product) => {
    setCheckoutModal({ open: true, product });
    
    // Initialize Brick after modal opens
    setTimeout(() => {
      renderCardPaymentBrick(product);
    }, 500);
  };

  const renderCardPaymentBrick = async (product: Product) => {
    if (!bricksBuilderRef.current || !document.getElementById('cardPaymentBrick_container')) return;

    const settings = {
      initialization: {
        amount: product.price_cents / 100,
        payer: {
          email: '', // will be filled by user
        },
      },
      customization: {
        visual: {
          style: {
            theme: 'default', // 'default' | 'dark' | 'bootstrap' | 'flat'
          },
        },
        paymentMethods: {
          maxInstallments: 1,
        },
      },
      callbacks: {
        onReady: () => {
          console.log('Brick ready');
        },
        onSubmit: async (formData: any) => {
          return new Promise((resolve, reject) => {
            handleTransparentPayment(product.id, formData)
              .then(() => resolve(true))
              .catch((error) => {
                console.error(error);
                reject();
              });
          });
        },
        onError: (error: any) => {
          console.error('Brick error:', error);
        },
      },
    };

    await bricksBuilderRef.current.create('cardPayment', 'cardPaymentBrick_container', settings);
  };

  const handleTransparentPayment = async (itemId: string, formData: any) => {
    try {
      setPurchasingId(itemId);
      
      const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
        body: {
          item_id: itemId,
          token: formData.token,
          issuer_id: formData.issuer_id,
          payment_method_id: formData.payment_method_id,
          installments: formData.installments,
          email: formData.payer.email
        }
      });

      if (error || data.error) throw new Error(data?.error || 'Erro no pagamento');

      if (data.status === 'approved') {
        toast.success('Pagamento aprovado! Item entregue.');
        setCheckoutModal({ open: false, product: null });
        fetchData();
        // Play success animation
        const event = new CustomEvent('flm:purchase-success', { detail: { item_id: itemId } });
        window.dispatchEvent(event);
      } else {
        toast.info(`Status do pagamento: ${data.status}`);
      }
    } catch (e: any) {
      toast.error(e.message);
      throw e;
    } finally {
      setPurchasingId(null);
    }
  };

  const categories = [
    { id: 'marketing', name: 'Marketing', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'memberships', name: 'Plano de Sócios', icon: <Users className="h-4 w-4" /> },
    { id: 'sponsorships', name: 'Patrocínios', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'personalization', name: 'Personalização', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'currencies', name: 'Moedas & Cash', icon: <Wallet className="h-4 w-4" /> },
    { id: 'inventory', name: 'Meus Itens', icon: <Package className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        <p className="text-muted-foreground animate-pulse font-medium">Carregando Mercado FLM...</p>
      </div>
    );
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-slate-500/10 text-slate-600 border-slate-200';
      case 'rare': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'epic': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'legendary': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      default: return 'bg-slate-500/10 text-slate-600';
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a2e0a] to-[#1a4a1a] p-8 text-white shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150">
          <ShoppingBag className="h-32 w-32" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Ofertas Exclusivas</span>
            </div>
            <h2 className="text-4xl font-black tracking-tighter leading-none uppercase">
              Loja <span className="text-emerald-400">FLM</span>
            </h2>
            <p className="text-emerald-100/70 text-sm max-w-md font-medium">
              Evolua seu clube com itens premium, bônus de treino e personalizações exclusivas.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-black/40 backdrop-blur-xl p-4 rounded-2xl border border-white/10 flex items-center gap-4 min-w-[140px]">
              <div className="bg-emerald-500/20 p-2.5 rounded-xl">
                <Wallet className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-black text-emerald-400/80">Coins</p>
                <p className="text-xl font-black tabular-nums">R$ {(clubData?.budget || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-black/40 backdrop-blur-xl p-4 rounded-2xl border border-white/10 flex items-center gap-4 min-w-[140px]">
              <div className="bg-amber-500/20 p-2.5 rounded-xl">
                <Gem className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-black text-amber-400/80">Cash</p>
                <p className="text-xl font-black tabular-nums">{clubData?.cash || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea className="w-full whitespace-nowrap rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-1">
          <TabsList className="bg-transparent flex w-max gap-1">
            {categories.map(cat => (
              <TabsTrigger 
                key={cat.id} 
                value={cat.id}
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all duration-300 px-6 py-2.5 rounded-xl text-xs font-bold gap-2"
              >
                {cat.icon}
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        {/* Inventory View */}
        <TabsContent value="inventory" className="mt-8 space-y-6">
          {myInventory.length === 0 ? (
            <div className="text-center py-24 bg-card/20 rounded-3xl border border-dashed border-border/40 flex flex-col items-center justify-center gap-4">
              <Package className="h-16 w-16 text-muted-foreground opacity-10" />
              <div className="space-y-1">
                <h3 className="text-xl font-black tracking-tight">Inventário Vazio</h3>
                <p className="text-sm text-muted-foreground font-medium">Você ainda não possui itens especiais.</p>
              </div>
              <Button onClick={() => setActiveTab('marketing')} variant="outline" className="mt-4 rounded-full px-8">
                Ir para a Loja <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {myInventory.map(inv => {
                const product = products.find(p => p.id === inv.item_id);
                if (!product) return null;
                return (
                  <Card key={inv.id} className="bg-card/60 backdrop-blur-sm border-border/40 hover:border-emerald-500/30 transition-all group overflow-hidden rounded-2xl">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <Badge className={`${getRarityColor(product.rarity)} font-black uppercase text-[10px] px-2 py-0.5 rounded-full border`}>
                          {product.rarity}
                        </Badge>
                        <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                          Qtd: {inv.quantity}
                        </span>
                      </div>
                      <CardTitle className="text-lg font-black mt-2 group-hover:text-emerald-600 transition-colors">{product.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="aspect-square rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden relative">
                         <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                         <div className="absolute inset-0 bg-black/5" />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/10">
                        Equipar / Usar
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Shop Content */}
        {categories.slice(0, 5).map(cat => (
          <TabsContent key={cat.id} value={cat.id} className="mt-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {products.filter(p => {
                if (cat.id === 'currencies') return p.category === 'coins' || p.category === 'cash';
                if (cat.id === 'memberships') return p.category === 'personalization' && p.id.includes('pass');
                return p.category === cat.id;
              }).map(product => {
                const isBlocked = (clubData?.fans || 0) < product.min_fans;
                const isPurchasing = purchasingId === product.id;

                return (
                  <Card key={product.id} className={`group relative flex flex-col overflow-hidden rounded-3xl border-border/40 bg-card/60 backdrop-blur-sm hover:border-emerald-500/30 transition-all duration-500 ${isBlocked ? 'opacity-80 grayscale' : ''}`}>
                    {/* Rarity Glow */}
                    <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[60px] opacity-20 transition-opacity group-hover:opacity-40 
                      ${product.rarity === 'legendary' ? 'bg-amber-500' : 
                        product.rarity === 'epic' ? 'bg-purple-500' : 
                        product.rarity === 'rare' ? 'bg-blue-500' : 'bg-slate-500'}`} 
                    />

                    <div className="relative aspect-[4/5] overflow-hidden">
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <Badge className={`${getRarityColor(product.rarity)} font-black uppercase text-[10px] px-3 py-1 rounded-full border-none shadow-xl backdrop-blur-md`}>
                          {product.rarity}
                        </Badge>
                      </div>

                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <p className="text-2xl font-black tracking-tighter uppercase leading-tight drop-shadow-md">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-emerald-400">R$ {(product.price_cents / 100).toFixed(2)}</span>
                          {product.duration_days && (
                            <span className="text-[10px] opacity-70 bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-md">
                              {product.duration_days} dias
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <CardContent className="flex-1 p-6 space-y-4">
                      <p className="text-xs text-muted-foreground font-medium leading-relaxed line-clamp-2">
                        {product.description}
                      </p>

                      <div className="space-y-2">
                         {isBlocked && (
                           <div className="flex items-center gap-2 text-red-500 bg-red-500/5 p-2 rounded-xl border border-red-500/10">
                             <Lock className="h-3 w-3" />
                             <span className="text-[10px] font-black uppercase tracking-tight">Faltam {product.min_fans - (clubData?.fans || 0)} torcedores</span>
                           </div>
                         )}
                         <div className="flex items-center gap-2 text-emerald-600 bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10">
                            <CheckCircle2 className="h-3 w-3" />
                            <span className="text-[10px] font-black uppercase tracking-tight">Entrega Instantânea</span>
                         </div>
                      </div>
                    </CardContent>

                    <CardFooter className="p-6 pt-0">
                      <Button 
                        onClick={() => handleStartCheckout(product)} 
                        disabled={isBlocked || isPurchasing}
                        className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-xl shadow-emerald-500/20 group-hover:translate-y-[-2px] transition-transform"
                      >
                        {isPurchasing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>Comprar Agora <ArrowRight className="h-4 w-4 ml-2" /></>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Checkout Modal */}
      <Dialog open={checkoutModal.open} onOpenChange={(open) => setCheckoutModal({ open, product: checkoutModal.product })}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-[#0a2e0a] p-8 text-white relative">
             <div className="absolute top-0 right-0 p-8 opacity-10">
               <CreditCard className="h-20 w-20" />
             </div>
             <DialogHeader className="relative z-10">
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Finalizar Compra</DialogTitle>
                <DialogDescription className="text-emerald-100/70 font-medium">
                  {checkoutModal.product?.name} • R$ {(checkoutModal.product?.price_cents || 0) / 100}
                </DialogDescription>
             </DialogHeader>
          </div>

          <div className="p-8 space-y-6 bg-white">
            <div id="cardPaymentBrick_container" className="min-h-[300px]"></div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground bg-slate-50 p-4 rounded-2xl border border-slate-100">
               <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
               <p className="font-medium">Pagamento processado com segurança via <strong>Mercado Pago</strong>. Seus dados estão criptografados.</p>
            </div>
          </div>
          
          <DialogFooter className="p-8 pt-0 bg-white">
            <Button variant="ghost" onClick={() => setCheckoutModal({ open: false, product: null })} className="rounded-xl font-bold">
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
