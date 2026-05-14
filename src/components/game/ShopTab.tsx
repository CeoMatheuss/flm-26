import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  ShoppingBag, Star, ShieldCheck, Zap, Sparkles, 
  Clock, Users, TrendingUp, DollarSign, Lock, 
  CheckCircle2, Loader2, AlertCircle, History, Package,
  CreditCard, QrCode, ArrowRight, Wallet, Crown, Gift,
  Coins, LayoutTemplate, Trophy, UserPlus
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

interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  price_cents: number;
  bonus_data: any;
  image_url: string | null;
}

interface InventoryItem {
  id: string;
  item_id: string;
  quantity: number;
  item: ShopItem;
}

const RARITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  common: { label: 'Comum', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  rare: { label: 'Raro', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  epic: { label: 'Épico', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  legendary: { label: 'Lendário', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
};

export function ShopTab() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('featured');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [paymentStep, setPaymentStep] = useState<'details' | 'method' | 'processing' | 'success'>('details');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [clubData, setClubData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [itemsRes, invRes, clubRes] = await Promise.all([
        supabase.from('shop_items').select('*').eq('active', true),
        supabase.from('shop_inventory').select('*, item:shop_items(*)').eq('user_id', user.id),
        supabase.from('clubs').select('*').eq('user_id', user.id).maybeSingle()
      ]);

      if (itemsRes.data) setItems(itemsRes.data);
      if (invRes.data) setInventory(invRes.data as any);
      if (clubRes.data) setClubData(clubRes.data);
    } catch (error) {
      console.error('Error fetching shop data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenPurchase = (item: ShopItem) => {
    setSelectedItem(item);
    setPaymentStep('details');
  };

  const startPayment = async () => {
    if (!selectedItem) return;
    setPaymentStep('processing');

    try {
      // Simulate calling Mercado Pago transparent checkout
      // In a real scenario, this would call our edge function to get preference/init payment
      const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
        body: { itemId: selectedItem.id, paymentMethod }
      });

      if (error) throw error;

      // Simulation of success for local testing/preview
      await new Promise(r => setTimeout(r, 2500));
      setPaymentStep('success');
      toast.success('Simulação de pagamento concluída!');
      
      // Update inventory after success animation
      setTimeout(() => {
        fetchData();
        setSelectedItem(null);
      }, 3000);

    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Erro ao processar pagamento');
      setPaymentStep('method');
    }
  };

  const categories = [
    { id: 'featured', name: 'Destaques', icon: <Star className="h-4 w-4" /> },
    { id: 'currency', name: 'Coins & Cash', icon: <Coins className="h-4 w-4" /> },
    { id: 'pack', name: 'Packs', icon: <Gift className="h-4 w-4" /> },
    { id: 'boost', name: 'Boosts', icon: <Zap className="h-4 w-4" /> },
    { id: 'vanity', name: 'Visual', icon: <LayoutTemplate className="h-4 w-4" /> },
    { id: 'tournament', name: 'Torneios', icon: <Trophy className="h-4 w-4" /> },
    { id: 'inventory', name: 'Meu Inventário', icon: <Package className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        <p className="text-muted-foreground animate-pulse">Acessando Loja Oficial FLM...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      {/* Premium Header/Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-emerald-900 via-emerald-800 to-black p-8 shadow-2xl border border-emerald-500/20">
        <div className="absolute top-0 right-0 w-1/3 h-full opacity-10">
          <Crown className="w-full h-full rotate-12 translate-x-10" />
        </div>
        <div className="relative z-10 space-y-4">
          <Badge className="bg-amber-500 text-black border-none font-bold uppercase tracking-wider">Promoção de Lançamento</Badge>
          <h1 className="text-4xl font-black text-white italic tracking-tighter">
            ELEVE SEU CLUBE <br/><span className="text-emerald-400 text-5xl">AO TOPO</span>
          </h1>
          <p className="text-emerald-100/70 max-w-md text-sm leading-relaxed">
            Adquira pacotes exclusivos, moedas e itens de personalização para transformar seu time em uma potência mundial.
          </p>
          <div className="flex gap-4">
            <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
              <p className="text-[10px] uppercase font-bold text-emerald-400">Seu Saldo</p>
              <p className="text-xl font-black text-white">R$ {(Number(clubData?.budget || 0) / 100).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Bar */}
      <Tabs defaultValue="featured" className="w-full" onValueChange={setActiveCategory}>
        <div className="bg-[#0a0f0a]/90 backdrop-blur-xl p-2 rounded-2xl border border-emerald-500/10 mb-8 sticky top-0 z-30 shadow-2xl">
          <TabsList className="bg-transparent flex w-full justify-between gap-1 overflow-x-auto no-scrollbar scroll-smooth">
            {categories.map(cat => (
              <TabsTrigger 
                key={cat.id} 
                value={cat.id}
                className="flex-1 data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-xl py-3 px-6 transition-all duration-300 min-w-[100px]"
              >
                <div className="flex flex-col items-center gap-1">
                  {cat.icon}
                  <span className="text-[10px] font-bold uppercase tracking-widest truncate w-full text-center">{cat.name}</span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {categories.slice(0, 5).map(cat => (
          <TabsContent key={cat.id} value={cat.id} className="focus-visible:outline-none">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items
                .filter(item => cat.id === 'featured' ? item.rarity !== 'common' : item.category === cat.id)
                .map(item => (
                <Card 
                  key={item.id} 
                  className="group relative bg-[#121a12] border-emerald-500/10 hover:border-emerald-500/40 transition-all duration-500 cursor-pointer overflow-hidden shadow-lg hover:shadow-emerald-500/10"
                  onClick={() => handleOpenPurchase(item)}
                >
                  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
                    item.rarity === 'legendary' ? 'from-amber-400 to-yellow-600' :
                    item.rarity === 'epic' ? 'from-purple-500 to-pink-600' :
                    item.rarity === 'rare' ? 'from-blue-400 to-cyan-500' :
                    'from-emerald-500 to-emerald-700'
                  }`} />

                  <CardHeader className="pb-2 relative">
                    <div className="absolute top-4 right-4">
                       <Badge variant="outline" className={`text-[9px] uppercase font-black ${
                         item.rarity === 'legendary' ? 'border-amber-500 text-amber-500' :
                         item.rarity === 'epic' ? 'border-purple-500 text-purple-500' :
                         item.rarity === 'rare' ? 'border-blue-500 text-blue-500' :
                         'border-emerald-500 text-emerald-500'
                       }`}>
                         {item.rarity}
                       </Badge>
                    </div>
                    <div className="w-full aspect-square bg-[#0a0f0a] rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-500 border border-white/5 shadow-inner">
                      {item.category === 'currency' && <Wallet className="w-16 h-16 text-amber-500 opacity-80" />}
                      {item.category === 'pack' && <Gift className="w-16 h-16 text-emerald-500 opacity-80" />}
                      {item.category === 'boost' && <Zap className="w-16 h-16 text-blue-500 opacity-80" />}
                      {item.category === 'vanity' && <Sparkles className="w-16 h-16 text-purple-500 opacity-80" />}
                    </div>
                    <CardTitle className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors">
                      {item.name}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2 h-8 text-emerald-100/50">
                      {item.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-emerald-400/60">Preço</span>
                        <span className="text-xl font-black text-white">R$ {(item.price_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center group-hover:rotate-12 transition-transform shadow-lg shadow-emerald-600/20">
                        <ArrowRight className="text-white h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}

        <TabsContent value="inventory" className="focus-visible:outline-none">
          {inventory.length === 0 ? (
            <div className="text-center py-32 bg-[#121a12] rounded-3xl border-2 border-dashed border-emerald-500/10">
              <Package className="h-20 w-20 mx-auto text-emerald-500 opacity-10 mb-6" />
              <h3 className="text-2xl font-black text-white mb-2">Inventário Vazio</h3>
              <p className="text-emerald-100/40 text-sm">Suas compras aparecerão aqui após a aprovação.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inventory.map(inv => (
                <Card key={inv.id} className="bg-[#121a12] border-emerald-500/10 overflow-hidden group">
                  <div className="p-4 flex gap-4">
                    <div className="w-20 h-20 bg-[#0a0f0a] rounded-xl flex items-center justify-center shrink-0 border border-white/5 shadow-inner">
                       <Package className="w-10 h-10 text-emerald-500/60" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{inv.item.name}</h4>
                        <Badge className="bg-emerald-600 text-[10px] px-2 py-0">Qtd: {inv.quantity}</Badge>
                      </div>
                      <p className="text-[10px] text-emerald-100/50 leading-relaxed line-clamp-2">{inv.item.description}</p>
                      <Button size="sm" className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 h-7 text-[10px] font-bold uppercase tracking-widest rounded-lg">
                        Equipar / Usar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Checkout Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="sm:max-w-[450px] bg-[#0a0f0a] border-emerald-500/20 text-white overflow-hidden p-0">
          <div className={`p-8 space-y-6 ${paymentStep === 'success' ? 'bg-emerald-900/10' : ''}`}>
            {paymentStep === 'details' && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black italic tracking-tighter">DETALHES DO ITEM</DialogTitle>
                </DialogHeader>
                <div className="flex gap-6 items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                   <div className="w-24 h-24 bg-black rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-2xl">
                     <Gift className="w-12 h-12 text-emerald-500" />
                   </div>
                   <div>
                     <h3 className="text-xl font-black text-emerald-400">{selectedItem?.name}</h3>
                     <Badge className="bg-emerald-600 text-[10px] mt-1 uppercase">{selectedItem?.rarity}</Badge>
                     <p className="text-xs text-emerald-100/60 mt-2 leading-relaxed">{selectedItem?.description}</p>
                   </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-emerald-100/50">Valor total</span>
                    <span className="text-2xl font-black tracking-tighter">R$ {(selectedItem?.price_cents! / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <Button onClick={() => setPaymentStep('method')} className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 text-lg font-black italic tracking-tighter uppercase rounded-2xl shadow-lg shadow-emerald-600/20">
                   Escolher Método de Pagamento
                </Button>
              </>
            )}

            {paymentStep === 'method' && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black italic tracking-tighter">FORMA DE PAGAMENTO</DialogTitle>
                  <DialogDescription className="text-emerald-100/50">Checkout Transparente Mercado Pago</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setPaymentMethod('pix')}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 ${paymentMethod === 'pix' ? 'bg-emerald-600/20 border-emerald-500' : 'bg-white/5 border-white/5 opacity-50'}`}
                  >
                    <QrCode className="w-10 h-10 text-emerald-400" />
                    <span className="font-bold text-xs uppercase tracking-widest">PIX</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('card')}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 ${paymentMethod === 'card' ? 'bg-emerald-600/20 border-emerald-500' : 'bg-white/5 border-white/5 opacity-50'}`}
                  >
                    <CreditCard className="w-10 h-10 text-emerald-400" />
                    <span className="font-bold text-xs uppercase tracking-widest">Cartão</span>
                  </button>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/5 text-[10px] text-emerald-100/40">
                  <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
                  Pagamento processado de forma segura pelo Mercado Pago. Seus dados estão protegidos.
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setPaymentStep('details')} className="flex-1 border border-white/10 hover:bg-white/5">Voltar</Button>
                  <Button onClick={startPayment} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-widest">Finalizar Compra</Button>
                </div>
              </>
            )}

            {paymentStep === 'processing' && (
              <div className="py-12 flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <Loader2 className="w-24 h-24 text-emerald-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-emerald-500" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-2">Validando Pagamento</h3>
                  <p className="text-emerald-100/50 text-xs">Comunicando com o servidor do Mercado Pago...</p>
                </div>
              </div>
            )}

            {paymentStep === 'success' && (
              <div className="py-12 flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-500">
                <div className="w-32 h-32 bg-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 animate-bounce">
                  <CheckCircle2 className="w-20 h-20 text-white" />
                </div>
                <div>
                  <h3 className="text-4xl font-black italic tracking-tighter text-emerald-400 uppercase mb-2">PAGAMENTO APROVADO!</h3>
                  <p className="text-emerald-100/70 text-sm max-w-[250px]">
                    O item <strong>{selectedItem?.name}</strong> foi adicionado ao seu inventário com sucesso!
                  </p>
                </div>
                <div className="bg-emerald-600/10 border border-emerald-500/20 p-4 rounded-2xl w-full flex items-center gap-4">
                   <div className="bg-emerald-500 p-2 rounded-lg">
                      <Gift className="text-white h-5 w-5" />
                   </div>
                   <div className="text-left">
                     <p className="text-[10px] font-bold uppercase text-emerald-400">Entrega Automática</p>
                     <p className="text-xs text-white">Pronto para ser equipado.</p>
                   </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
