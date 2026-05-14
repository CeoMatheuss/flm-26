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
  ChevronRight, HeartPulse, HardHat, Info, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClubShield } from './ClubShield';

interface LojaProps {
  club: any;
  infrastructure: any;
  userId: string;
  onUpgradeFacility?: (facility: string) => void;
}

const CATEGORIES = [
  { id: 'destaques', name: 'Destaques', icon: Sparkles },
  { id: 'patrocinios', name: 'Patrocínios', icon: DollarSign },
  { id: 'socios', name: 'Sócios', icon: Users },
  { id: 'infra', name: 'Infraestrutura', icon: Building2 },
  { id: 'staff', name: 'Staff', icon: HardHat },
  { id: 'fisio', name: 'Fisioterapia', icon: Stethoscope },
  { id: 'premium', name: 'Itens Premium', icon: Crown },
  { id: 'pacotes', name: 'Pacotes', icon: Package },
];

const RARITY_CONFIG = {
  comum: { color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20', glow: 'shadow-slate-400/5' },
  raro: { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', glow: 'shadow-blue-400/10' },
  epico: { color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', glow: 'shadow-purple-400/15' },
  lendario: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30', glow: 'shadow-amber-400/25' },
};

export function LojaFLM({ club, infrastructure, userId, onUpgradeFacility }: LojaProps) {
  const [activeCategory, setActiveCategory] = useState('destaques');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState<{ open: boolean; itemName: string; type: string }>({ open: false, itemName: '', type: '' });

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  const handleAction = async (item: any) => {
    if (club.budget < item.price) {
      toast.error('Saldo insuficiente!');
      return;
    }
    
    setLoading(true);
    // Simulação de compra
    await new Promise(r => setTimeout(r, 800));
    
    if (item.category === 'infra' && onUpgradeFacility) {
      onUpgradeFacility(item.facilityKey);
    } else {
      setShowSuccess({ open: true, itemName: item.name, type: item.id?.includes('plano') || item.category === 'socios' ? 'fans' : 'default' });
      toast.success(`${item.name} adquirido com sucesso!`);
      setTimeout(() => setShowSuccess(prev => ({ ...prev, open: false })), 4000);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4 pb-10 animate-in fade-in duration-500">
      {/* HEADER PREMIUM */}
      <div className="relative overflow-hidden rounded-2xl bg-[#050810] border border-amber-500/20 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 scale-150">
          <ShoppingBag className="h-32 w-32 text-amber-500" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Premium Experience</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">
              Loja <span className="text-amber-500">FLM</span>
            </h1>
            <p className="text-muted-foreground text-xs font-medium max-w-xs">
              O mercado oficial do Football Life Manager. Evolua seu clube ao nível de elite.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="bg-black/60 backdrop-blur-md px-4 py-3 rounded-xl border border-white/5 flex items-center gap-3 min-w-[140px]">
              <div className="bg-emerald-500/20 p-2 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[8px] uppercase font-black text-emerald-400/80 tracking-tighter">Saldo do Clube</p>
                <p className="text-lg font-black tabular-nums">{formatMoney(club.budget)}</p>
              </div>
            </div>
            <div className="bg-black/60 backdrop-blur-md px-4 py-3 rounded-xl border border-white/5 flex items-center gap-3 min-w-[140px]">
              <div className="bg-amber-500/20 p-2 rounded-lg">
                <Gem className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-[8px] uppercase font-black text-amber-400/80 tracking-tighter">FLM Cash</p>
                <p className="text-lg font-black tabular-nums">{club.cash || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORIAS SCROLL AREA */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <ScrollArea className="w-full whitespace-nowrap rounded-xl bg-black/40 border border-white/5 p-1">
          <TabsList className="bg-transparent flex w-max gap-1">
            {CATEGORIES.map(cat => (
              <TabsTrigger 
                key={cat.id} 
                value={cat.id}
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-black transition-all duration-300 px-5 py-2 rounded-lg text-xs font-black gap-2 uppercase tracking-tighter"
              >
                <cat.icon className="h-3.5 w-3.5" />
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>

        <div className="mt-6">
          <TabsContent value="destaques" className="space-y-6">
             <div className="flex items-center justify-between">
                <h2 className="text-lg font-black uppercase italic text-amber-500">Produtos em Destaque</h2>
                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/5">NOVIDADES</Badge>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StoreCard 
                  name="Pack Elite FLM"
                  description="Acesso total ao plano de sócios Elite + 500k de bônus imediato."
                  price={5000000}
                  rarity="lendario"
                  image="https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=500&auto=format&fit=crop&q=60"
                  badge="OFERTA"
                  onAction={() => handleAction({ name: 'Pack Elite', price: 5000000 })}
                />
                <StoreCard 
                  name="Novo CT Moderno"
                  description="Upgrade instantâneo para o seu Centro de Treinamento. Acelera evolução em 25%."
                  price={2500000}
                  rarity="epico"
                  image="https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=500&auto=format&fit=crop&q=60"
                  onAction={() => handleAction({ name: 'CT Moderno', price: 2500000 })}
                />
                <StoreCard 
                  name="Patrocínio BetGol"
                  description="Torne-se parceiro da maior casa de apostas. Bônus de R$ 100k por vitória."
                  price={0}
                  type="contract"
                  rarity="raro"
                  image="https://images.unsplash.com/photo-1518152006812-edab29b069ac?w=500&auto=format&fit=crop&q=60"
                  onAction={() => toast.success('Proposta enviada!')}
                />
             </div>
          </TabsContent>

          <TabsContent value="patrocinios" className="space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'BetGol', desc: 'Bônus por vitória agressivo.', value: 'R$ 150k/mês', rep: 40 },
                  { name: 'ArenaBank', desc: 'Pagamento mensal estável.', value: 'R$ 200k/mês', rep: 50 },
                  { name: 'Nitro Energy', desc: 'Bônus por título de liga.', value: 'R$ 100k/mês', rep: 30 },
                  { name: 'SportPay', desc: 'Bônus por artilharia.', value: 'R$ 120k/mês', rep: 35 },
                  { name: 'FlyAir', desc: 'Foco em competições mundiais.', value: 'R$ 300k/mês', rep: 70 },
                  { name: 'Max Cola', desc: 'Patrocínio de estádio.', value: 'R$ 180k/mês', rep: 45 },
                ].map(s => (
                  <StoreCard 
                    key={s.name}
                    name={s.name}
                    description={s.desc}
                    price={0}
                    type="contract"
                    rarity={s.rep > 60 ? 'lendario' : s.rep > 45 ? 'epico' : 'raro'}
                    footerInfo={s.value}
                    minRep={s.rep}
                    currentRep={club.reputation}
                    onAction={() => toast.success(`Proposta de ${s.name} analisada!`)}
                  />
                ))}
             </div>
          </TabsContent>

          <TabsContent value="socios" className="space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { id: 'bronze', name: 'Plano Bronze', price: 500000, color: 'comum' },
                  { id: 'prata', name: 'Plano Prata', price: 1200000, color: 'raro' },
                  { id: 'ouro', name: 'Plano Ouro', price: 3000000, color: 'epico' },
                  { id: 'diamante', name: 'Plano Diamante', price: 7500000, color: 'lendario' },
                  { id: 'elite', name: 'Elite FLM', price: 15000000, color: 'lendario', special: true },
                ].map(p => (
                  <StoreCard 
                    key={p.id}
                    name={p.name}
                    description={`Ative o plano ${p.name} para aumentar sua renda mensal e base de fãs.`}
                    price={p.price}
                    rarity={p.color as any}
                    badge={p.special ? 'EXCLUSIVE' : undefined}
                    onAction={() => handleAction(p)}
                  />
                ))}
             </div>
          </TabsContent>

          <TabsContent value="infra" className="space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StoreCard 
                  name="Reforma do Estádio"
                  description="Aumenta a capacidade em 5.000 lugares e moderniza os assentos."
                  price={10000000}
                  rarity="epico"
                  icon={Building2}
                  onAction={() => handleAction({ category: 'infra', facilityKey: 'stadium', price: 10000000 })}
                />
                <StoreCard 
                  name="Novo CT Moderno"
                  description="Upgrade instantâneo para o seu Centro de Treinamento. Acelera evolução em 25%."
                  price={2500000}
                  rarity="epico"
                  icon={Zap}
                  onAction={() => handleAction({ category: 'infra', facilityKey: 'trainingCenter', price: 2500000 })}
                />
                <StoreCard 
                  name="Academia de Base"
                  description="Gera jovens com maior potencial de OVR."
                  price={8000000}
                  rarity="epico"
                  icon={Trophy}
                  onAction={() => handleAction({ category: 'infra', facilityKey: 'youthAcademy', price: 8000000 })}
                />
                <StoreCard 
                  name="Modernização do Gramado"
                  description="Reduz o cansaço dos jogadores durante partidas em casa."
                  price={1200000}
                  rarity="raro"
                  icon={TrendingUp}
                  onAction={() => handleAction({ name: 'Gramado Moderno', price: 1200000 })}
                />
             </div>
          </TabsContent>

          <TabsContent value="staff" className="space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { name: 'Preparador Físico', desc: 'Melhora o ganho de stamina nos treinos.', price: 450000, rarity: 'comum' },
                  { name: 'Olheiro Internacional', desc: 'Encontra talentos raros em outros países.', price: 800000, rarity: 'raro' },
                  { name: 'Diretor Financeiro', desc: 'Reduz gastos fixos do clube em 10%.', price: 1500000, rarity: 'epico' },
                  { name: 'Psicólogo Esportivo', desc: 'Mantém a moral do elenco sempre em alta.', price: 600000, rarity: 'raro' },
                  { name: 'Médico Especialista', desc: 'Recuperação instantânea de lesões leves.', price: 1200000, rarity: 'epico' },
                  { name: 'Analista Tático', desc: 'Desbloqueia insights sobre o adversário.', price: 5000000, rarity: 'lendario' },
                ].map(s => (
                  <StoreCard 
                    key={s.name}
                    name={s.name}
                    description={s.desc}
                    price={s.price}
                    rarity={s.rarity as any}
                    icon={HardHat}
                    onAction={() => handleAction(s)}
                  />
                ))}
             </div>
          </TabsContent>

          <TabsContent value="fisio" className="space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { name: 'Câmara de Gelo', desc: 'Recuperação 2x mais rápida após jogos.', price: 350000, rarity: 'comum' },
                  { name: 'Equipamentos Modernos', desc: 'Reduz risco de lesões musculares.', price: 900000, rarity: 'raro' },
                  { name: 'Tratamento Intensivo', desc: 'Reduz tempo de lesão em 50%.', price: 2000000, rarity: 'epico' },
                  { name: 'Laboratório Esportivo', desc: 'Análise detalhada de fadiga.', price: 5000000, rarity: 'lendario' },
                  { name: 'Centro de Reabilitação', desc: 'Capacidade para 5 jogadores simultâneos.', price: 3000000, rarity: 'epico' },
                ].map(f => (
                  <StoreCard 
                    key={f.name}
                    name={f.name}
                    description={f.desc}
                    price={f.price}
                    rarity={f.rarity as any}
                    icon={HeartPulse}
                    onAction={() => handleAction(f)}
                  />
                ))}
             </div>
          </TabsContent>

          <TabsContent value="premium" className="space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'Escudo Animado', desc: 'Efeito visual de brilho no seu escudo.', price: 1500, type: 'cash', rarity: 'lendario' },
                  { name: 'Uniformes Exclusivos', desc: 'Template de uniforme lendário.', price: 800, type: 'cash', rarity: 'epico' },
                  { name: 'Nome Colorido', desc: 'Destaque-se no chat global.', price: 500, type: 'cash', rarity: 'raro' },
                  { name: 'Estádio Premium', desc: 'Visual 3D luxuoso para o seu estádio.', price: 2500, type: 'cash', rarity: 'lendario' },
                  { name: 'Efeito de Torcida', desc: 'Fumaça e bandeirões personalizados.', price: 400, type: 'cash', rarity: 'comum' },
                  { name: 'Molduras Especiais', desc: 'Borda dourada no perfil.', price: 300, type: 'cash', rarity: 'raro' },
                ].map(p => (
                  <StoreCard 
                    key={p.name}
                    name={p.name}
                    description={p.desc}
                    price={p.price}
                    rarity={p.rarity as any}
                    footerInfo={p.type === 'cash' ? `${p.price} Cash` : undefined}
                    onAction={() => toast.success(`${p.name} ativado!`)}
                  />
                ))}
             </div>
          </TabsContent>

          <TabsContent value="pacotes" className="space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { name: 'Pack Inicial', desc: 'Tudo o que você precisa para começar.', price: 50000, rarity: 'comum', badge: 'OFERTA' },
                  { name: 'Pack Campeão', desc: 'Itens de elite para quem quer títulos.', price: 5000000, rarity: 'lendario', badge: 'LIMITADO' },
                  { name: 'Pack Torcida', desc: 'Impulsione sua base de fãs.', price: 1000000, rarity: 'raro' },
                  { name: 'Pack Evolução', desc: 'Acelere o treino de todo o elenco.', price: 2000000, rarity: 'epico' },
                  { name: 'Pack Financeiro', desc: 'Injeção de 2M no orçamento.', price: 1000, type: 'cash', rarity: 'epico' },
                ].map(p => (
                  <StoreCard 
                    key={p.name}
                    name={p.name}
                    description={p.desc}
                    price={p.price}
                    rarity={p.rarity as any}
                    badge={p.badge}
                    footerInfo={p.type === 'cash' ? `${p.price} Cash` : undefined}
                    onAction={() => handleAction(p)}
                  />
                ))}
             </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* ANIMAÇÃO DE SUCESSO */}
      <AnimatePresence>
        {showSuccess.open && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4"
          >
            <div className="bg-[#050810]/95 backdrop-blur-xl border border-amber-500/30 p-8 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.3)] text-center space-y-4 max-w-xs w-full">
              <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto border border-amber-500/40">
                {showSuccess.type === 'fans' ? (
                  <Users className="h-10 w-10 text-amber-500 animate-bounce" />
                ) : (
                  <CheckCircle2 className="h-10 w-10 text-amber-500 animate-pulse" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white uppercase italic">Sucesso!</h3>
                <p className="text-sm text-amber-500/80 font-bold uppercase tracking-tighter">{showSuccess.itemName}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Adicionado ao seu clube</p>
              </div>
              
              {showSuccess.type === 'fans' && (
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className="h-1 bg-amber-500/20 rounded-full overflow-hidden"
                >
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="h-full w-1/3 bg-amber-500"
                  />
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StoreCard({ 
  name, description, price, rarity = 'comum', image, badge, type = 'buy', 
  onAction, icon: Icon, footerInfo, minRep, currentRep 
}: any) {
  const cfg = RARITY_CONFIG[rarity as keyof typeof RARITY_CONFIG];
  const isBlocked = minRep && currentRep < minRep;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className={`group relative overflow-hidden rounded-2xl border ${cfg.border} bg-[#0A0D14] flex flex-col ${isBlocked ? 'opacity-60 grayscale' : ''}`}
    >
      {/* Rarity Glow Effect */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[40px] opacity-10 transition-opacity group-hover:opacity-25 ${cfg.bg}`} />
      
      {/* Image / Icon Section */}
      <div className="relative aspect-video overflow-hidden bg-black/40">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        ) : Icon ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
            <Icon className={`h-12 w-12 ${cfg.color}`} />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
            <ShoppingBag className={`h-12 w-12 ${cfg.color} opacity-20`} />
          </div>
        )}
        
        {badge && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-amber-500 text-black font-black text-[9px] px-2 py-0 border-none animate-pulse">
              {badge}
            </Badge>
          </div>
        )}

        <div className="absolute bottom-3 right-3">
          <Badge variant="outline" className={`text-[9px] font-black uppercase ${cfg.bg} ${cfg.color} border-none backdrop-blur-md`}>
            {rarity}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="text-sm font-black text-white uppercase tracking-tight group-hover:text-amber-500 transition-colors">
          {name}
        </h3>
        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
          {description}
        </p>

        {isBlocked && (
          <div className="mt-1 flex items-center gap-1.5 text-[9px] font-bold text-red-400 bg-red-400/10 p-1.5 rounded-lg border border-red-400/20">
             <Lock className="h-3 w-3" /> REP. MÍNIMA: {minRep}
          </div>
        )}

        {footerInfo && (
          <div className="mt-auto pt-2 flex items-center gap-2">
             <div className="h-1 w-1 rounded-full bg-amber-500" />
             <span className="text-[10px] font-black text-amber-500/80 uppercase tracking-tighter">{footerInfo}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button 
          onClick={onAction}
          disabled={isBlocked}
          className={`w-full rounded-xl h-10 font-black uppercase tracking-tighter text-xs transition-all duration-300
            ${rarity === 'lendario' ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 
              rarity === 'epico' ? 'bg-purple-600 text-white hover:bg-purple-500' :
              'bg-white/5 text-white hover:bg-white/10 border border-white/10'}
          `}
        >
          {type === 'contract' ? 'Analisar Contrato' : price === 0 ? 'Grátis' : `Comprar · R$ ${(price / 1000).toLocaleString()}k`}
          <ChevronRight className="h-3.5 w-3.5 ml-2" />
        </Button>
      </CardFooter>
    </motion.div>
  );
}
