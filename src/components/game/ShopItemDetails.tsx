import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ShoppingBag, 
  DollarSign, 
  Users, 
  ChevronLeft, 
  Package, 
  TrendingUp, 
  Building2, 
  Clock, 
  CheckCircle2, 
  Crown,
  Zap,
  Star,
  ShieldCheck,
  TrendingDown,
  ArrowUpRight,
  Info,
  Calendar,
  Rocket,
  LineChart,
  Target,
  Lock,
  Shirt,
  Sparkles,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ShopItemDetailsProps {
  item: any;
  isOpen: boolean;
  onClose: () => void;
  onPurchase: () => void;
  clubFans: number;
}

export function ShopItemDetails({ item, isOpen, onClose, onPurchase, clubFans }: ShopItemDetailsProps) {
  if (!item) return null;

  const isBlocked = (clubFans || 0) < (item.min_fans || 0);
  const price = item.price_cents / 100;
  const isFree = item.price_cents === 0;

  const formatMoney = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
    return val.toLocaleString('pt-BR');
  };

  const getBenefitDetails = () => {
    const data = item.bonus_data || {};
    const benefits = [];

    // Patrocínios / Finanças
    if (data.dinheiroSemanal) {
      benefits.push({
        label: "Rendimento",
        value: `+R$ ${formatMoney(data.dinheiroSemanal)} por semana`,
        icon: DollarSign,
        color: "text-emerald-400"
      });
    } else if (data.daily_cash) {
      benefits.push({
        label: "Rendimento",
        value: `+R$ ${formatMoney(data.daily_cash * 7)} por semana`,
        icon: DollarSign,
        color: "text-emerald-400"
      });
    }

    if (data.immediate_cash) {
      benefits.push({
        label: "Injeção de Caixa",
        value: `R$ ${formatMoney(data.immediate_cash / 100)} imediatos`,
        icon: TrendingUp,
        color: "text-emerald-400"
      });
    }

    // Marketing / Torcida
    if (data.torcidaPorDia) {
      benefits.push({
        label: "Expansão",
        value: `+${data.torcidaPorDia.toLocaleString()} torcedores por dia`,
        icon: Users,
        color: "text-blue-400"
      });
    } else if (data.fans_min && data.fans_max) {
      benefits.push({
        label: "Expansão",
        value: `+${data.fans_min}-${data.fans_max} torcedores por dia`,
        icon: Users,
        color: "text-blue-400"
      });
    }

    // Figurinhas / Jogadores
    if (data.desbloqueiaJogador) {
      benefits.push({
        label: "Colecionável",
        value: data.desbloqueiaJogador === 'rare' ? "Chance de desbloquear jogador raro" : "Desbloqueia jogador especial",
        icon: Star,
        color: "text-amber-400"
      });
    } else if (item.category === 'stickers' || item.id.includes('pack')) {
      benefits.push({
        label: "Colecionável",
        value: "Desbloqueia novos jogadores",
        icon: Package,
        color: "text-amber-400"
      });
    }

    // Uniformes / Loja
    if (data.aumentaVendas) {
      benefits.push({
        label: "Comércio",
        value: "Libera o lançamento de uma nova coleção de uniformes com vendas automáticas",
        icon: Shirt,
        color: "text-purple-400"
      });
    } else if (item.category === 'uniform' || item.id.includes('kit')) {
      benefits.push({
        label: "Visual",
        value: "Novo uniforme oficial do clube",
        icon: Shirt,
        color: "text-purple-400"
      });
    }

    // Duração
    if (item.duration_days) {
      benefits.push({
        label: "Duração do Contrato",
        value: `${item.duration_days} dias`,
        icon: Clock,
        color: "text-white/40"
      });
    }

    return benefits;
  };

  const benefits = getBenefitDetails();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-0 md:p-6 bg-black/95 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            className="w-full h-full md:h-auto md:max-w-2xl bg-[#050810] border-0 md:border md:border-white/10 md:rounded-[2rem] overflow-hidden flex flex-col relative shadow-2xl"
          >
            {/* Header / Image Area */}
            <div className="relative h-[140px] md:h-[180px] overflow-hidden">
              {item.image_url ? (
                <img 
                  src={item.image_url} 
                  alt={item.name} 
                  className="w-full h-full object-cover scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-500/20 to-black flex items-center justify-center">
                  <Package className="h-32 w-32 text-emerald-500/10" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-[#050810] via-[#050810]/40 to-transparent" />
              
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="absolute top-3 right-3 z-30 bg-black/40 hover:bg-black/60 rounded-full text-white h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="absolute bottom-4 left-5 right-5 space-y-1">
                <Badge className={`border-none uppercase font-black text-[9px] px-2 py-0.5 ${
                  item.rarity === 'legendary' ? 'bg-amber-500 text-black' :
                  item.rarity === 'epic' ? 'bg-purple-500 text-white' :
                  'bg-emerald-500 text-white'
                }`}>
                  <Star className="h-2.5 w-2.5 mr-1 fill-current" />
                  {item.rarity || 'Especial'}
                </Badge>
                <h2 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter leading-none text-white drop-shadow-xl">
                  {item.name}
                </h2>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-5 md:p-6 space-y-4 overflow-y-auto scrollbar-hide">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="h-3 w-3 text-emerald-400" />
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-white/30">O que este produto faz</h3>
                </div>
                <p className="text-sm md:text-base text-white/90 leading-relaxed font-medium italic">
                  "{item.description}"
                </p>
              </div>

              {/* Benefits Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {benefits.map((benefit, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white/5 ${benefit.color}`}>
                      <benefit.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-0.5">{benefit.label}</p>
                      <p className="text-sm font-black text-white italic">{benefit.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Requirements & Action */}
              <div className="pt-3 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Investimento Necessário</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-black text-emerald-400 italic">R$ 0,01</p>
                    {isBlocked && (
                      <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/20 uppercase font-black text-[9px] py-0.5">
                        <Users className="h-2.5 w-2.5 mr-1" /> Requer {item.min_fans.toLocaleString()} fãs
                      </Badge>
                    )}
                  </div>
                </div>

                <Button 
                  disabled={isBlocked} 
                  onClick={onPurchase}
                  className={`w-full md:w-auto min-w-[220px] h-14 rounded-2xl font-black uppercase italic text-base tracking-tighter shadow-2xl transition-all active:scale-95 group relative overflow-hidden ${
                    isBlocked 
                      ? 'bg-white/5 text-white/20 border border-white/5' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
                  <div className="flex items-center justify-center gap-2 relative z-10">
                    <CreditCard className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    <span>{isFree ? 'RESGATAR AGORA' : (item.category === 'sponsorship' ? 'ADQUIRIR PATROCÍNIO' : 'COMPRAR AGORA')}</span>
                    <Sparkles className="h-4 w-4 text-emerald-300 animate-pulse" />
                  </div>
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
