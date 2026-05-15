import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  ShoppingBag, Sparkles, DollarSign, Users, Building2, 
  Stethoscope, Crown, Package, Star, TrendingUp, 
  CheckCircle2, Lock, ArrowRight, Zap, Gem, Trophy,
  ChevronRight, HeartPulse, HardHat, Rocket, Loader2, History, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LojaProps {
  club: any;
  infrastructure: any;
  userId: string;
  onUpgradeFacility?: (facility: string) => void;
  onAcceptSponsor?: (offer: any) => void;
}

const CATEGORIES = [
  { id: 'patrocinios', name: 'Patrocínios', icon: DollarSign },
  { id: 'marketing', name: 'Marketing', icon: Rocket },
  { id: 'packs', name: 'Pacotes', icon: Package },
  { id: 'history', name: 'Histórico', icon: History },
];

export function LojaFLM({ club, infrastructure, userId }: LojaProps) {
  const [activeCategory, setActiveCategory] = useState('patrocinios');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [showPremium, setShowPremium] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchItems();
    if (userId) fetchHistory();
  }, [userId]);

  async function fetchItems() {
    setLoading(true);
    const { data } = await supabase.from('shop_items').select('*');
    if (data) setItems(data);
    setLoading(false);
  }

  async function fetchHistory() {
    const { data } = await supabase
      .from('payment_orders')
      .select('*, shop_items(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setPurchaseHistory(data);
  }

  const handlePurchase = async (item: any) => {
    const isBlocked = (club.fans || 0) < (item.min_fans || 0);
    if (isBlocked) {
      toast.error(`Torcida insuficiente! Você precisa de ${item.min_fans.toLocaleString()} torcedores.`);
      return;
    }

    if (item.price_cents > 0 && club.budget < (item.price_cents / 100)) {
      toast.error('Saldo insuficiente!');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
        body: { item_id: item.id }
      });

      if (error) throw error;

      if (data?.init_point) {
        window.location.href = data.init_point;
      } else if (data?.status === 'approved' || item.price_cents === 0) {
        setShowPremium(true);
        toast.success(`Compra concluída: ${item.name}! Premium ativado.`);
        const audio = new Audio('https://www.myinstants.com/media/sounds/level-up-6.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
        fetchHistory();
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao processar compra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500 bg-[#050810] min-h-screen text-white p-4">
      {/* HEADER */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#0a2e0a] to-[#050810] p-6 border border-emerald-500/20 shadow-2xl">
        <div className="absolute top-4 right-6 opacity-10">
          <ShoppingBag className="h-24 w-24 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter">Loja <span className="text-emerald-500">FLM 26</span></h1>
        <p className="text-emerald-100/60 text-xs font-medium">Overhaul completo: estratégia, torcida e Premium.</p>
        
        <div className="flex gap-4 mt-6">
          <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex items-center gap-3">
            <DollarSign className="text-emerald-400 h-5 w-5" />
            <p className="font-black">R$ {(club.budget || 0).toLocaleString()}</p>
          </div>
          <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex items-center gap-3">
            <Users className="text-emerald-400 h-5 w-5" />
            <p className="font-black">{(club.fans || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <ScrollArea className="w-full whitespace-nowrap pb-2">
          <TabsList className="bg-transparent gap-2">
            {CATEGORIES.map(cat => (
              <TabsTrigger 
                key={cat.id} value={cat.id}
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-full bg-black/40 border border-white/5 px-6"
              >
                <div className="flex items-center gap-2">
                   <cat.icon className="h-3 w-3" />
                   {cat.name}
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        {CATEGORIES.filter(cat => cat.id !== 'history').map(cat => (
          <TabsContent key={cat.id} value={cat.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.filter(i => i.category === (cat.id === 'patrocinios' ? 'sponsorship' : cat.id)).map(item => (
              <StoreCard key={item.id} item={item} clubFans={club.fans || 0} onPurchase={() => handlePurchase(item)} />
            ))}
          </TabsContent>
        ))}

        <TabsContent value="history" className="space-y-4">
          <Card className="bg-black/40 border border-white/5">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase">Últimas Transações</CardTitle>
            </CardHeader>
            <CardContent>
              {purchaseHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground py-10 text-center italic">Nenhuma transação registrada.</p>
              ) : (
                <div className="space-y-2">
                  {purchaseHistory.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${p.status === 'approved' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                          {p.status === 'approved' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Info className="h-4 w-4 text-red-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{p.shop_items?.name || 'Item desconhecido'}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString('pt-BR')} às {new Date(p.created_at).toLocaleTimeString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black">R$ {(p.amount_cents / 100).toLocaleString()}</p>
                        <Badge className={`text-[9px] uppercase ${p.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'} border-none`}>
                          {p.status}
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

      {/* SUCCESS MODAL */}
      <AnimatePresence>
        {showPremium && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="bg-[#050810] border border-emerald-500/30 p-8 rounded-3xl text-center space-y-4 max-w-sm w-full"
            >
              <Crown className="w-20 h-20 text-amber-500 mx-auto animate-pulse" />
              <h2 className="text-2xl font-black italic uppercase text-emerald-400 tracking-tighter">Premium FLM Ativado</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">Você recebeu 30 dias de benefícios exclusivos: obras rápidas e bônus financeiros!</p>
              <Button onClick={() => setShowPremium(false)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase w-full rounded-xl py-6">Continuar</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StoreCard({ item, clubFans, onPurchase }: any) {
  const isBlocked = (clubFans || 0) < (item.min_fans || 0);
  const price = item.price_cents / 100;

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${isBlocked ? 'border-white/5 bg-black/40 grayscale' : `border-emerald-500/20 bg-[#0A0D14] hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]`} transition-all duration-300 flex flex-col h-full`}>
      {item.image_url && (
        <div className="relative aspect-video overflow-hidden">
           <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
           <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D14] to-transparent" />
        </div>
      )}
      <div className="relative z-10 space-y-3 p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-none uppercase font-black text-[9px]">{item.rarity}</Badge>
          {isBlocked && <Lock className="h-4 w-4 text-red-500" />}
        </div>
        <h3 className="text-lg font-black uppercase italic tracking-tight">{item.name}</h3>
        <p className="text-[10px] text-muted-foreground leading-relaxed flex-1">{item.description}</p>
        
        {isBlocked && (
          <div className="text-[9px] font-bold text-red-400 bg-red-400/10 p-2 rounded-lg">
            Requer {item.min_fans.toLocaleString()} torcedores
          </div>
        )}

        {item.category === 'sponsorship' && !isBlocked && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-white/5 p-2 rounded-lg text-center border border-white/5">
               <p className="text-[8px] text-muted-foreground uppercase font-black">Imediato</p>
               <p className="text-xs font-black text-emerald-400">R$ {((item.bonus_data?.immediate_cash || 0)/1000).toLocaleString()}k</p>
            </div>
            <div className="bg-white/5 p-2 rounded-lg text-center border border-white/5">
               <p className="text-[8px] text-muted-foreground uppercase font-black">Diário</p>
               <p className="text-xs font-black text-emerald-400">R$ {((item.bonus_data?.daily_cash || 0)/1000).toLocaleString()}k</p>
            </div>
          </div>
        )}

        <Button 
          disabled={isBlocked} 
          onClick={onPurchase}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase italic mt-auto rounded-xl"
        >
          {item.price_cents === 0 ? 'Assinar Contrato' : `Comprar · R$ ${price.toLocaleString()}`}
        </Button>
      </div>
      
      {!isBlocked && <div className="absolute inset-0 bg-emerald-500/5 -z-0 opacity-0 hover:opacity-100 transition-opacity" />}
    </div>
  );
}
