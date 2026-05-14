import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  ShoppingBag, Star, ShieldCheck, Zap, Sparkles, 
  Clock, Users, TrendingUp, DollarSign, Lock, 
  CheckCircle2, Loader2, AlertCircle, History, Package
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

interface Product {
  id: string;
  category: string;
  name: string;
  description: string;
  price_cents: number;
  duration_days: number | null;
  min_fans_required: number;
  bonus_data: any;
}

interface Purchase {
  id: string;
  product_id: string;
  status: string;
  activated_at: string;
  expires_at: string | null;
  product: Product;
}

export function ShopTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [myPurchases, setMyPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const [clubFans, setClubFans] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [productsRes, purchasesRes, clubRes] = await Promise.all([
        supabase.from('shop_products').select('*').eq('active', true),
        supabase.from('shop_purchases').select('*, product:shop_products(*)').eq('user_id', user.id).eq('status', 'completed'),
        supabase.from('clubs').select('fans').eq('user_id', user.id).maybeSingle()
      ]);

      if (productsRes.data) setProducts(productsRes.data);
      if (purchasesRes.data) setMyPurchases(purchasesRes.data as any);
      if (clubRes.data) setClubFans(clubRes.data.fans);
    } catch (error) {
      console.error('Error fetching shop data:', error);
      toast.error('Erro ao carregar dados da loja');
    } finally {
      setLoading(false);
    }
  }

  const handlePurchase = async (product: Product) => {
    setConfirmModal({ open: true, product });
  };

  const confirmPurchase = async () => {
    const product = confirmModal.product;
    if (!product) return;

    try {
      setPurchasingId(product.id);
      setConfirmModal({ open: false, product: null });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check restrictions (only 1 active marketing/sponsorship)
      if (product.category === 'marketing' || product.category === 'sponsorships') {
        const activeInCategory = myPurchases.find(p => p.product.category === product.category);
        if (activeInCategory) {
          toast.error(`Você já possui uma campanha de ${product.category === 'marketing' ? 'marketing' : 'patrocínio'} ativa.`);
          return;
        }
      }

      // Check requirements
      if (clubFans < product.min_fans_required) {
        toast.error(`Requisito mínimo não atingido: ${product.min_fans_required} torcedores.`);
        return;
      }

      // Simulate payment loading
      await new Promise(resolve => setTimeout(resolve, 2000));

      const expires_at = product.duration_days 
        ? new Date(Date.now() + product.duration_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error: purchaseError } = await supabase.from('shop_purchases').insert({
        user_id: user.id,
        product_id: product.id,
        status: 'completed',
        expires_at
      });

      if (purchaseError) throw purchaseError;

      // Handle immediate bonuses (like sponsorship cash)
      if (product.category === 'sponsorships' && product.bonus_data.immediate_cash) {
        const { data: club } = await supabase.from('clubs').select('budget').eq('user_id', user.id).single();
        if (club) {
          await supabase.from('clubs').update({ 
            budget: Number(club.budget) + Number(product.bonus_data.immediate_cash) 
          }).eq('user_id', user.id);
        }
      }

      toast.success(`${product.name} ativado com sucesso!`);
      fetchData();
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Erro ao processar compra');
    } finally {
      setPurchasingId(null);
    }
  };

  const categories = [
    { id: 'marketing', name: 'Marketing', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'memberships', name: 'Planos de Sócios', icon: <Users className="h-4 w-4" /> },
    { id: 'sponsorships', name: 'Patrocínios', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'customization', name: 'Personalização', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'my_items', name: 'Meus Produtos', icon: <Package className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Carregando Loja FLM...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#1a2e1a] text-white p-6 rounded-xl shadow-lg border border-emerald-900/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <ShoppingBag className="h-24 w-24" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tighter flex items-center gap-2">
              LOJA <span className="text-emerald-400">FLM</span>
            </h2>
            <p className="text-emerald-100/70 text-sm mt-1">
              Turbine seu clube com as melhores ferramentas de gestão e marketing do mercado.
            </p>
          </div>
          <div className="bg-black/20 backdrop-blur-md p-3 rounded-lg border border-white/10 flex items-center gap-3">
            <div className="bg-emerald-500/20 p-2 rounded-full">
              <Users className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-400/80">Sua Torcida</p>
              <p className="text-lg font-black leading-tight">{clubFans.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="marketing" className="w-full">
        <div className="bg-card/40 backdrop-blur-sm p-1 rounded-xl border border-border/40 sticky top-0 z-20">
          <TabsList className="bg-transparent grid grid-cols-2 md:grid-cols-5 gap-1">
            {categories.map(cat => (
              <TabsTrigger 
                key={cat.id} 
                value={cat.id}
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all py-2 text-xs md:text-sm"
              >
                <div className="flex items-center gap-2">
                  {cat.icon}
                  <span className="hidden md:inline">{cat.name}</span>
                  <span className="md:hidden">{cat.id === 'my_items' ? 'Meus' : cat.name.split(' ')[0]}</span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {categories.slice(0, 4).map(cat => (
          <TabsContent key={cat.id} value={cat.id} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.filter(p => p.category === cat.id).map(product => {
                const isBlocked = clubFans < product.min_fans_required;
                const isPurchasing = purchasingId === product.id;
                const hasActive = myPurchases.some(p => p.product_id === product.id);

                return (
                  <Card key={product.id} className={`group relative overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm hover:border-emerald-500/30 transition-all duration-300 ${isBlocked ? 'opacity-80 grayscale-[0.5]' : ''}`}>
                    <div className="absolute top-0 right-0 p-3 z-10">
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none font-bold">
                        R$ 0,01
                      </Badge>
                    </div>

                    <CardHeader className="pb-4 pt-8">
                      <div className="bg-emerald-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        {cat.id === 'marketing' && <TrendingUp className="h-6 w-6 text-emerald-600" />}
                        {cat.id === 'memberships' && <Users className="h-6 w-6 text-emerald-600" />}
                        {cat.id === 'sponsorships' && <DollarSign className="h-6 w-6 text-emerald-600" />}
                        {cat.id === 'customization' && <Sparkles className="h-6 w-6 text-emerald-600" />}
                      </div>
                      <CardTitle className="text-xl font-bold">{product.name}</CardTitle>
                      <CardDescription className="text-xs leading-relaxed">
                        {product.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-background/50 p-2 rounded-lg border border-border/20">
                          <p className="text-[9px] uppercase font-bold text-muted-foreground">Duração</p>
                          <p className="text-xs font-semibold">{product.duration_days ? `${product.duration_days} dias` : 'Permanente'}</p>
                        </div>
                        <div className={`bg-background/50 p-2 rounded-lg border border-border/20 ${isBlocked ? 'border-red-500/20' : ''}`}>
                          <p className="text-[9px] uppercase font-bold text-muted-foreground">Torcida Mínima</p>
                          <p className={`text-xs font-semibold ${isBlocked ? 'text-red-500' : ''}`}>
                            {product.min_fans_required.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                        <p className="text-[9px] uppercase font-bold text-emerald-600 mb-1">Benefícios</p>
                        <ul className="space-y-1">
                          {Object.entries(product.bonus_data).map(([key, val]: [string, any]) => (
                            <li key={key} className="text-xs flex items-center gap-2 text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              {key === 'min_daily_fans' && `+${val} a ${product.bonus_data.max_daily_fans} torcedores/dia`}
                              {key === 'daily_members' && `+${val} sócios/dia`}
                              {key === 'immediate_cash' && `+R$ ${val.toLocaleString()} imediatos`}
                              {key === 'daily_cash' && `+R$ ${val.toLocaleString()}/dia`}
                              {key === 'type' && (val === 'exclusive_badge' ? 'Badge Premium exclusiva' : 'Nome de clube colorido')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>

                    <CardFooter>
                      {isBlocked ? (
                        <Button disabled className="w-full gap-2 bg-muted text-muted-foreground">
                          <Lock className="h-4 w-4" />
                          Bloqueado
                        </Button>
                      ) : hasActive ? (
                        <Button disabled className="w-full gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <CheckCircle2 className="h-4 w-4" />
                          Ativo
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => handlePurchase(product)} 
                          className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
                          disabled={isPurchasing}
                        >
                          {isPurchasing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <ShoppingBag className="h-4 w-4" />
                              Ir para Pagamento
                            </>
                          )}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}

        <TabsContent value="my_items" className="mt-6">
          {myPurchases.length === 0 ? (
            <div className="text-center py-20 bg-card/20 rounded-xl border border-dashed border-border/40">
              <History className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <h3 className="text-lg font-bold">Nenhum item ativo</h3>
              <p className="text-sm text-muted-foreground">Você ainda não adquiriu nenhum produto na loja.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myPurchases.map(purchase => (
                <Card key={purchase.id} className="bg-card/40 border-emerald-500/10 hover:border-emerald-500/30 transition-all">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-500/10 p-2 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{purchase.product.name}</CardTitle>
                        <Badge variant="outline" className="text-[10px] uppercase">{purchase.product.category}</Badge>
                      </div>
                    </div>
                    {purchase.expires_at && (
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1 justify-end">
                          <Clock className="h-3 w-3" /> Expira em
                        </p>
                        <p className="text-xs font-bold text-emerald-600">
                          {formatDistanceToNow(new Date(purchase.expires_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="bg-background/40 p-3 rounded-lg border border-border/10">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Status</p>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-medium">Ativo e Gerando Bônus</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation Modal */}
      <Dialog open={confirmModal.open} onOpenChange={(open) => setConfirmModal({ open, product: confirmModal.product })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Ativação</DialogTitle>
            <DialogDescription>
              Você está prestes a ativar o item <strong>{confirmModal.product?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-emerald-700">Preço (Teste)</span>
              <span className="font-bold">R$ 0,01</span>
            </div>
            <div className="flex justify-between text-sm border-t border-emerald-200 pt-2">
              <span className="text-emerald-700">Duração</span>
              <span className="font-bold">{confirmModal.product?.duration_days ? `${confirmModal.product.duration_days} dias` : 'Permanente'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <p>O pagamento será simulado via PIX. Após a confirmação, o item será ativado automaticamente na sua conta.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmModal({ open: false, product: null })}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmPurchase}>
              Confirmar e Pagar via PIX
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
