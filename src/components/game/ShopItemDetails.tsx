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
  ShieldCheck
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

  // Determine effect type and duration based on category or bonus_data
  const getEffectInfo = () => {
    switch (item.category) {
      case 'sponsorship':
        return {
          type: 'Finanças',
          benefit: 'Injeção de caixa imediata e renda diária garantida.',
          impact: 'Aumenta significativamente o orçamento do clube para contratações e melhorias.',
          duration: item.duration_days ? `${item.duration_days} dias` : 'Permanente',
          isImmediate: true
        };
      case 'marketing':
        return {
          type: 'Torcida / Reputação',
          benefit: 'Atrai novos torcedores e aumenta a visibilidade do clube.',
          impact: 'Gera crescimento acelerado de torcida a cada partida realizada.',
          duration: '30 dias',
          isImmediate: false
        };
      case 'infrastructure':
        return {
          type: 'Estrutura',
          benefit: 'Melhora as instalações físicas do clube.',
          impact: 'Reduz tempo de treinamento ou melhora recuperação de jogadores.',
          duration: 'Permanente',
          isImmediate: true
        };
      case 'staff':
        return {
          type: 'Equipe Técnica',
          benefit: 'Contratação de profissionais altamente qualificados.',
          impact: 'Melhora a evolução dos atributos dos jogadores nos treinos.',
          duration: 'Permanente',
          isImmediate: false
        };
      default:
        return {
          type: 'Especial',
          benefit: 'Benefícios variados para o desenvolvimento do clube.',
          impact: 'Melhoria geral no desempenho institucional do time.',
          duration: item.duration_days ? `${item.duration_days} dias` : 'Permanente',
          isImmediate: true
        };
    }
  };

  const effect = getEffectInfo();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full h-full md:h-auto md:max-w-4xl bg-[#050810] border-0 md:border md:border-white/10 md:rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row relative"
          >
            {/* Mobile Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-4 right-4 z-20 bg-black/40 hover:bg-black/60 rounded-full md:hidden text-white"
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Left Side: Image & Highlights */}
            <div className="w-full md:w-2/5 relative h-64 md:h-auto">
              <div className="absolute inset-0">
                {item.image_url ? (
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-500/20 to-[#0A0D14] flex items-center justify-center">
                    <Package className="h-20 w-20 text-emerald-500/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050810] via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-[#050810]" />
              </div>

              {/* Rarity and Badge Overlays */}
              <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-2">
                <Badge className={`w-fit border-none uppercase font-black text-[10px] px-3 py-1 shadow-lg ${
                  item.rarity === 'legendary' ? 'bg-amber-500 text-black' :
                  item.rarity === 'epic' ? 'bg-purple-500 text-white' :
                  'bg-emerald-500 text-white'
                }`}>
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  {item.rarity || 'Comum'}
                </Badge>
                <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none text-white drop-shadow-2xl">
                  {item.name}
                </h2>
              </div>
            </div>

            {/* Right Side: Details */}
            <div className="flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1">
                <div className="p-6 md:p-10 space-y-8">
                  {/* Header Actions Desktop */}
                  <div className="hidden md:flex justify-between items-center mb-6">
                    <Button 
                      variant="ghost" 
                      onClick={onClose}
                      className="text-white/60 hover:text-white hover:bg-white/5 -ml-2 rounded-xl gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" /> Voltar para Loja
                    </Button>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 uppercase font-black text-[10px] tracking-widest px-3 py-1">
                      Professional Store
                    </Badge>
                  </div>

                  {/* Description Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500/70">Sobre o Produto</h3>
                    <p className="text-white/80 leading-relaxed font-medium text-lg italic">
                      "{item.description}"
                    </p>
                  </div>

                  {/* Impact Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Zap className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Benefício Direto</span>
                      </div>
                      <p className="text-sm font-bold text-white/90">{effect.benefit}</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-blue-400">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Impacto no Time</span>
                      </div>
                      <p className="text-sm font-bold text-white/90">{effect.impact}</p>
                    </div>
                  </div>

                  {/* Stats & Effects */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] text-white/40 font-black uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Tipo
                      </p>
                      <p className="text-sm font-black text-white">{effect.type}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-white/40 font-black uppercase tracking-wider flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Duração
                      </p>
                      <p className="text-sm font-black text-white">{effect.duration}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-white/40 font-black uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Efeito
                      </p>
                      <p className="text-sm font-black text-white">{effect.isImmediate ? 'Imediato' : 'Progressivo'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-white/40 font-black uppercase tracking-wider flex items-center gap-1">
                        <Users className="h-3 w-3" /> Requisito
                      </p>
                      <p className={`text-sm font-black ${isBlocked ? 'text-red-400' : 'text-emerald-400'}`}>
                        {item.min_fans ? `${item.min_fans.toLocaleString()} fãs` : 'Livre'}
                      </p>
                    </div>
                  </div>

                  {/* Category Specific Data (Sponsorship) */}
                  {item.category === 'sponsorship' && (
                    <div className="p-6 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-[2rem] space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400">Dados do Contrato</h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-[10px] text-emerald-400/60 font-bold uppercase">Pagamento Inicial</p>
                          <p className="text-2xl font-black text-white">R$ {((item.bonus_data?.immediate_cash || 0)/1000).toLocaleString()}k</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-emerald-400/60 font-bold uppercase">Renda Diária</p>
                          <p className="text-2xl font-black text-white">R$ {((item.bonus_data?.daily_cash || 0)/1000).toLocaleString()}k</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Bottom Purchase Bar */}
              <div className="p-6 md:p-10 bg-black/40 border-t border-white/5 backdrop-blur-xl">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="flex-1 w-full text-center md:text-left">
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1">Valor do Investimento</p>
                    <p className="text-3xl font-black text-white italic">
                      {isFree ? 'GRÁTIS' : `R$ ${price.toLocaleString()}`}
                    </p>
                  </div>
                  
                  <div className="flex gap-3 w-full md:w-auto">
                    <Button 
                      variant="outline" 
                      onClick={onClose}
                      className="flex-1 md:flex-none h-14 px-8 border-white/10 hover:bg-white/5 text-white font-black uppercase italic rounded-2xl hidden md:flex"
                    >
                      Cancelar
                    </Button>
                    <Button
                      disabled={isBlocked}
                      onClick={() => {
                        onPurchase();
                        onClose();
                      }}
                      className={`flex-[2] md:flex-none h-14 px-12 font-black uppercase italic rounded-2xl transition-all duration-300 shadow-xl ${
                        isBlocked
                          ? 'bg-white/5 text-white/40 border border-white/5'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40 hover:scale-[1.02] active:scale-95'
                      }`}
                    >
                      {isBlocked ? 'Torcida Insuficiente' : isFree ? 'Assinar Contrato' : 'Confirmar Compra'}
                    </Button>
                  </div>
                </div>
                {isBlocked && (
                  <p className="text-center text-[10px] font-bold text-red-400 mt-4 uppercase tracking-wider">
                    Você precisa de pelo menos {item.min_fans.toLocaleString()} torcedores para este item.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
