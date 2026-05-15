import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  ShoppingBag, Sparkles, DollarSign, Users, Building2, 
  Stethoscope, Crown, Package, Star, TrendingUp, 
  CheckCircle2, Lock, ArrowRight, Zap, Gem, Trophy,
  ChevronRight, HeartPulse, HardHat, Info, History, Rocket
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FLM_SPONSOR_CATALOG } from '@/data/flmSponsors';

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
  { id: 'infra', name: 'Infraestrutura', icon: Building2 },
  { id: 'staff', name: 'Staff Especialista', icon: HardHat },
  { id: 'fisio', name: 'Fisioterapia', icon: HeartPulse },
  { id: 'pacotes', name: 'Pacotes Especiais', icon: Package },
];

const RARITY_CONFIG = {
  common: { color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20', glow: 'shadow-slate-400/5' },
  rare: { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', glow: 'shadow-blue-400/10' },
  epic: { color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', glow: 'shadow-purple-400/15' },
  legendary: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30', glow: 'shadow-amber-400/25' },
};

export function LojaFLM({ club, infrastructure, userId, onUpgradeFacility, onAcceptSponsor }: LojaProps) {
  const [activeCategory, setActiveCategory] = useState('patrocinios');
  const [loading, setLoading] = useState(false);
  const [dbItems, setDbItems] = useState<any[]>([]);
  const [showSuccess, setShowSuccess] = useState<{ open: boolean; itemName: string; isPremium?: boolean }>({ open: false, itemName: '', isPremium: false });

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    const { data } = await supabase.from('shop_items').select('*').eq('active', true);
    if (data) setDbItems(data);
  }

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const handlePurchase = async (item: any) => {
    const price = item.price_cents / 100;
    if (club.budget < price) {
      toast.error('Saldo insuficiente!');
      return;
    }

    setLoading(true);
    try {
      // Registrar transação local simulada para feedback visual imediato
      // Em produção, isso seria via Edge Function + Webhook
      await new Promise(r => setTimeout(r, 1000));
      
      setShowSuccess({ open: true, itemName: item.name, isPremium: true });
      toast.success(`${item.name} adquirido com sucesso! Premium ativado por 30 dias.`);
      
      setTimeout(() => setShowSuccess(prev => ({ ...prev, open: false })), 4000);
      fetchItems();
    } catch (e) {
      toast.error('Erro ao processar compra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-10 animate-in fade-in duration-500">
      {/* HEADER PROFESSIONAL */}
      <div className="relative overflow-hidden rounded-2xl bg-[#050810] border border-emerald-500/20 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 scale-150">
          <ShoppingBag className="h-32 w-32 text-emerald-500" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <Zap className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">FLM Professional Store</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">
              Loja <span className="text-emerald-500">FLM 26</span>
            </h1>
            <p className="text-muted-foreground text-xs font-medium max-w-xs">
              Estratégia e crescimento. Qualquer compra ativa <span className="text-amber-400 font-bold">Premium FLM</span> por 30 dias.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="bg-black/60 backdrop-blur-md px-4 py-3 rounded-xl border border-white/5 flex items-center gap-3 min-w-[140px]">
              <div className="bg-emerald-500/20 p-2 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[8px] uppercase font-black text-emerald-400/80 tracking-tighter">Saldo</p>
                <p className="text-lg font-black tabular-nums">{formatMoney(club.budget)}</p>
              </div>
            </div>
            <div className="bg-black/60 backdrop-blur-md px-4 py-3 rounded-xl border border-white/5 flex items-center gap-3 min-w-[140px]">
              <div className="bg-emerald-500/20 p-2 rounded-lg">
                <Users className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[8px] uppercase font-black text-emerald-400/80 tracking-tighter">Torcida</p>
                <p className="text-lg font-black tabular-nums">{(club.fans || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <ScrollArea className="w-full whitespace-nowrap rounded-xl bg-black/40 border border-white/5 p-1">
          <TabsList className="bg-transparent flex w-max gap-1">
            {CATEGORIES.map(cat => (
              <TabsTrigger 
                key={cat.id} 
                value={cat.id}
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white transition-all duration-300 px-5 py-2 rounded-lg text-xs font-black gap-2 uppercase tracking-tighter"
              >
                <cat.icon className="h-3.5 w-3.5" />
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>

        <div className="mt-6">
          {/* PATROCÍNIOS - SISTEMA BASEADO EM TORCIDA */}
          <TabsContent value="patrocinios" className="space-y-6">
             <div className="flex items-center justify-between">
                <h2 className="text-lg font-black uppercase italic text-emerald-500">Contratos de Patrocínio</h2>
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">BASEADO EM TORCIDA</Badge>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {FLM_SPONSOR_CATALOG.map(s => (
                  <SponsorCard 
                    key={s.id}
                    sponsor={s}
                    clubFans={club.fans || 0}
                    onAccept={() => onAcceptSponsor?.(s)}
                    onGoToMarketing={() => setActiveCategory('marketing')}
                  />
                ))}
             </div>
          </TabsContent>

          {/* DEMAIS CATEGORIAS - ITENS DO BANCO */}
          {CATEGORIES.slice(1).map(cat => (
            <TabsContent key={cat.id} value={cat.id} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {dbItems.filter(i => i.category === cat.id).map(item => (
                  <StoreItemCard 
                    key={item.id}
                    item={item}
                    clubFans={club.fans || 0}
                    onPurchase={() => handlePurchase(item)}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </div>
      </Tabs>

      {/* ANIMAÇÃO DE SUCESSO / PREMIUM */}
      <AnimatePresence>
        {showSuccess.open && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#050810] border border-amber-500/40 p-8 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.3)] text-center space-y-6 max-w-sm w-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
              
              <div className="w-24 h-24 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/30">
                <Crown className="h-12 w-12 text-amber-500 animate-bounce" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Premium Ativado!</h3>
                <p className="text-amber-500 font-bold uppercase text-xs tracking-widest">30 dias de benefícios FLM</p>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
                <p className="text-[10px] text-muted-foreground uppercase font-black">Item Adquirido</p>
                <p className="text-lg font-black text-white">{showSuccess.itemName}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase">
                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/5 p-2 rounded-lg">
                  <Zap className="h-3 w-3" /> Obras Rápidas
                </div>
                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/5 p-2 rounded-lg">
                  <TrendingUp className="h-3 w-3" /> Bônus Renda
                </div>
              </div>

              <Button onClick={() => setShowSuccess({ ...showSuccess, open: false })} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black uppercase italic">
                Continuar
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SponsorCard({ sponsor, clubFans, onAccept, onGoToMarketing }: any) {
  const isBlocked = clubFans < sponsor.minFans;
  
  return (
    <motion.div
      whileHover={!isBlocked ? { y: -5 } : {}}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 flex flex-col h-full
        ${isBlocked ? 'border-white/5 bg-black/40 grayscale' : 'border-emerald-500/20 bg-[#0A0D14] hover:border-emerald-500/40 shadow-xl'}
      `}
    >
      <div className="p-5 space-y-4 flex-1">
        <div className="flex justify-between items-start">
          <div className={`p-3 rounded-xl ${isBlocked ? 'bg-white/5' : 'bg-emerald-500/10'}`}>
            <DollarSign className={`h-6 w-6 ${isBlocked ? 'text-muted-foreground' : 'text-emerald-400'}`} />
          </div>
          {isBlocked ? (
             <Badge variant="outline" className="text-[9px] border-red-500/30 text-red-400 bg-red-500/5">BLOQUEADO</Badge>
          ) : (
             <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400 bg-emerald-500/5">DISPONÍVEL</Badge>
          )}
        </div>

        <div>
          <h3 className="text-lg font-black text-white uppercase tracking-tight">{sponsor.name}</h3>
          <p className="text-[10px] text-muted-foreground font-medium">Contrato de {sponsor.duration} temporada(s)</p>
        </div>

        <div className="space-y-2">
           <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Mensal:</span>
              <span className="font-black text-emerald-400">R$ {(sponsor.monthlyPay / 1000).toLocaleString()}k</span>
           </div>
           <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Bônus Vitória:</span>
              <span className="font-black text-emerald-400">R$ {(sponsor.winBonus / 1000).toLocaleString()}k</span>
           </div>
           <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Bônus Título:</span>
              <span className="font-black text-amber-400">R$ {(sponsor.titleBonus / 1000).toLocaleString()}k</span>
           </div>
        </div>

        {isBlocked && (
          <div className="pt-2 space-y-3">
             <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                <Lock className="h-3 w-3 text-red-400" />
                <p className="text-[9px] text-red-400 leading-tight">
                  Para desbloquear, você precisa de pelo menos <strong>{sponsor.minFans.toLocaleString()}</strong> torcedores.
                </p>
             </div>
             <Button 
               variant="outline" 
               size="sm" 
               onClick={onGoToMarketing}
               className="w-full h-8 text-[10px] font-black uppercase border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
             >
               Comprar campanha de marketing
             </Button>
          </div>
        )}
      </div>

      {!isBlocked && (
        <CardFooter className="p-4 pt-0">
          <Button onClick={onAccept} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase italic text-xs h-10 rounded-xl transition-all">
            Assinar Contrato
          </Button>
        </CardFooter>
      )}
    </motion.div>
  );
}

function StoreItemCard({ item, clubFans, onPurchase }: any) {
  const isBlocked = clubFans < (item.min_fans || 0);
  const cfg = RARITY_CONFIG[item.rarity as keyof typeof RARITY_CONFIG] || RARITY_CONFIG.common;
  const price = item.price_cents / 100;

  return (
    <motion.div
      whileHover={!isBlocked ? { y: -5 } : {}}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 flex flex-col h-full
        ${isBlocked ? 'border-white/5 bg-black/40 grayscale' : `bg-[#0A0D14] ${cfg.border} hover:shadow-2xl`}
      `}
    >
      {!isBlocked && (
         <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[40px] opacity-10 ${cfg.bg}`} />
      )}
      
      <div className="p-5 space-y-4 flex-1">
        <div className="flex justify-between items-start">
          <Badge className={`${cfg.bg} ${cfg.color} border-none font-black text-[9px] uppercase`}>{item.rarity}</Badge>
          {item.duration_days && <span className="text-[9px] font-bold text-muted-foreground">{item.duration_days} DIAS</span>}
        </div>

        <div>
          <h3 className="text-base font-black text-white uppercase tracking-tight">{item.name}</h3>
          <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
            {item.description}
          </p>
        </div>

        {isBlocked && (
           <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
              <Lock className="h-3 w-3 text-red-400" />
              <p className="text-[9px] text-red-400 font-bold uppercase tracking-tighter">
                Requer {item.min_fans.toLocaleString()} torcedores
              </p>
           </div>
        )}
      </div>

      <CardFooter className="p-4 pt-0">
        <Button 
          disabled={isBlocked}
          onClick={onPurchase}
          className={`w-full h-10 rounded-xl font-black uppercase italic text-xs transition-all
            ${item.rarity === 'legendary' ? 'bg-amber-500 text-black hover:bg-amber-400' :
              item.rarity === 'epic' ? 'bg-purple-600 text-white hover:bg-purple-500' :
              'bg-white/5 text-white hover:bg-white/10 border border-white/10'}
          `}
        >
          {`Comprar · R$ ${price.toLocaleString()}`}
        </Button>
      </CardFooter>
    </motion.div>
  );
}
