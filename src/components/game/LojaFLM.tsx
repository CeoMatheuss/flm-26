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
  ChevronRight, HeartPulse, HardHat, Rocket, Loader2
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
  { id: 'infrastructure', name: 'Infraestrutura', icon: Building2 },
  { id: 'staff', name: 'Staff', icon: HardHat },
  { id: 'physio', name: 'Fisioterapia', icon: HeartPulse },
  { id: 'packs', name: 'Pacotes', icon: Package },
];

export function LojaFLM({ club, infrastructure, userId }: LojaProps) {
  const [activeCategory, setActiveCategory] = useState('patrocinios');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [showPremium, setShowPremium] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    const { data } = await supabase.from('shop_items').select('*');
    if (data) setItems(data);
    setLoading(false);
  }

  const handlePurchase = async (item: any) => {
    setLoading(true);
    // Simulação do checkout
    await new Promise(r => setTimeout(r, 1000));
    setShowPremium(true);
    toast.success(`Compra concluída: ${item.name}! Premium ativado.`);
    setLoading(false);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500 bg-[#050810] min-h-screen text-white p-4">
      {/* HEADER */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#0a2e0a] to-[#050810] p-6 border border-emerald-500/20 shadow-2xl">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter">Loja <span className="text-emerald-500">FLM 26</span></h1>
        <p className="text-emerald-100/60 text-xs font-medium">Evolua seu clube com padrão premium.</p>
        
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
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-full bg-black/40 border border-white/5"
              >
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        {CATEGORIES.map(cat => (
          <TabsContent key={cat.id} value={cat.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.filter(i => i.category === cat.id).map(item => (
              <StoreCard key={item.id} item={item} clubFans={club.fans || 0} onPurchase={() => handlePurchase(item)} />
            ))}
          </TabsContent>
        ))}
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
              className="bg-card border border-amber-500/30 p-8 rounded-3xl text-center space-y-4"
            >
              <Crown className="w-16 h-16 text-amber-500 mx-auto animate-bounce" />
              <h2 className="text-2xl font-black italic uppercase">Premium FLM Ativado</h2>
              <p className="text-sm text-muted-foreground">30 dias de obras rápidas e bônus ativos!</p>
              <Button onClick={() => setShowPremium(false)} className="bg-amber-500 text-black font-black uppercase w-full">Continuar</Button>
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
    <div className={`relative overflow-hidden rounded-2xl border ${isBlocked ? 'border-white/5 bg-black/40 grayscale' : 'border-emerald-500/20 bg-[#0A0D14] hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]'} p-4 transition-all duration-300`}>
      <div className="relative z-10 space-y-3">
        <div className="flex justify-between items-start">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-none uppercase font-black text-[9px]">{item.rarity}</Badge>
          {isBlocked && <Lock className="h-4 w-4 text-red-500" />}
        </div>
        <h3 className="text-lg font-black uppercase italic tracking-tight">{item.name}</h3>
        <p className="text-[10px] text-muted-foreground leading-relaxed h-10">{item.description}</p>
        
        {isBlocked && (
          <div className="text-[9px] font-bold text-red-400 bg-red-400/10 p-2 rounded-lg">
            Requer {item.min_fans.toLocaleString()} torcedores
          </div>
        )}

        <Button 
          disabled={isBlocked} 
          onClick={onPurchase}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase italic mt-4"
        >
          {item.price_cents === 0 ? 'Assinar Contrato' : `Comprar · R$ ${price.toLocaleString()}`}
        </Button>
      </div>
      
      {/* Background Glow */}
      {!isBlocked && <div className="absolute inset-0 bg-emerald-500/5 -z-0 opacity-0 hover:opacity-100 transition-opacity" />}
    </div>
  );
}
