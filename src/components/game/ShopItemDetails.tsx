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
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

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

  // Formatação de números profissional
  const formatMoney = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
    return val.toLocaleString('pt-BR');
  };

  // Cálculos financeiros
  const dailyReturn = (item.bonus_data?.daily_cash || 0) / 100;
  const immediateReturn = (item.bonus_data?.immediate_cash || 0) / 100;
  const duration = item.duration_days || 30;
  
  const weeklyReturn = dailyReturn * 7;
  const monthlyReturn = dailyReturn * 30;
  const totalGrossReturn = (dailyReturn * duration) + immediateReturn;
  const totalNetProfit = totalGrossReturn - price;
  const roiDays = dailyReturn > 0 ? Math.ceil(price / dailyReturn) : 0;
  const profitPercentage = price > 0 ? (totalNetProfit / price) * 100 : 0;

  const getEffectInfo = () => {
    switch (item.category) {
      case 'sponsorship':
        return {
          type: 'Patrocínio Master',
          benefit: 'Injeção de caixa imediata e renda diária.',
          impact: 'Aumenta significativamente o orçamento para contratações.',
          advantages: [
            'Aumento direto na renda diária',
            'Melhoria na reputação global',
            'Expansão da marca do clube',
            'Bônus por vitórias em oficiais'
          ],
          color: 'emerald'
        };
      case 'marketing':
        return {
          type: 'Marketing / Branding',
          benefit: 'Atração massiva de novos torcedores.',
          impact: 'Gera crescimento orgânico de torcida por jogo.',
          advantages: [
            'Crescimento acelerado de fãs',
            'Engajamento social nas redes',
            'Aumento de sócios-torcedores',
            'Valorização da camisa do clube'
          ],
          color: 'blue'
        };
      case 'infrastructure':
        return {
          type: 'Estrutura / Infra',
          benefit: 'Melhoria nas instalações físicas.',
          impact: 'Eficiência operativa e saúde dos jogadores.',
          advantages: [
            'Recuperação física mais rápida',
            'Aumento do OVR médio nos treinos',
            'Menor probabilidade de lesões',
            'Instalações de alto nível'
          ],
          color: 'amber'
        };
      case 'staff':
        return {
          type: 'Staff Profissional',
          benefit: 'Corpo técnico de elite mundial.',
          impact: 'Evolução tática e técnica dos atletas.',
          advantages: [
            'Treinamento mais produtivo',
            'Evolução de jovens talentos',
            'Análise tática aprimorada',
            'Gestão de vestiário exemplar'
          ],
          color: 'purple'
        };
      default:
        return {
          type: 'Especial / Premium',
          benefit: 'Benefícios exclusivos de alto impacto.',
          impact: 'Vantagem competitiva em todas as áreas.',
          advantages: [
            'Status Premium no servidor',
            'Acesso a recursos bloqueados',
            'Selo de verificação no perfil',
            'Bônus exclusivos diários'
          ],
          color: 'rose'
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
          className="fixed inset-0 z-[120] flex items-center justify-center p-0 md:p-4 bg-black/95 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="w-full h-full md:h-[90vh] md:max-w-6xl bg-[#050810] border-0 md:border md:border-white/10 md:rounded-[3rem] overflow-hidden flex flex-col md:flex-row relative shadow-[0_0_100px_rgba(0,0,0,0.5)]"
          >
            {/* Mobile Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-6 right-6 z-30 bg-black/40 hover:bg-black/60 rounded-full md:hidden text-white"
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Side Panel: Brand & Image */}
            <div className="w-full md:w-5/12 relative h-[35vh] md:h-auto overflow-hidden">
              <div className="absolute inset-0">
                {item.image_url ? (
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    className="w-full h-full object-cover scale-105 hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br from-${effect.color}-500/20 to-black flex items-center justify-center`}>
                    <Package className={`h-32 w-32 text-${effect.color}-500/10`} />
                  </div>
                )}
                {/* Overlay Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050810] via-transparent to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#050810] hidden md:block" />
              </div>

              {/* Badges & Title */}
              <div className="absolute bottom-8 left-8 right-8 z-10 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={`border-none uppercase font-black text-[10px] px-3 py-1 shadow-2xl ${
                    item.rarity === 'legendary' ? 'bg-amber-500 text-black' :
                    item.rarity === 'epic' ? 'bg-purple-500 text-white' :
                    'bg-emerald-500 text-white'
                  }`}>
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    {item.rarity || 'Especial'}
                  </Badge>
                  <Badge variant="outline" className="bg-white/5 border-white/10 text-white/60 uppercase font-black text-[10px] px-3 py-1">
                    Nível {item.min_level || 1}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
                    {item.name}
                  </h2>
                  <p className={`text-xs font-black uppercase tracking-[0.2em] text-${effect.color}-400`}>
                    {effect.type}
                  </p>
                </div>
              </div>
            </div>

            {/* Main Content: Details & Financials */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#050810]">
              <ScrollArea className="flex-1">
                <div className="p-8 md:p-14 space-y-12">
                  {/* Desktop Header Navigation */}
                  <div className="hidden md:flex justify-between items-center">
                    <Button 
                      variant="ghost" 
                      onClick={onClose}
                      className="text-white/40 hover:text-white hover:bg-white/5 -ml-4 rounded-2xl gap-2 font-black uppercase italic text-xs"
                    >
                      <ChevronLeft className="h-4 w-4" /> Voltar para o Mercado
                    </Button>
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Market ID: #{item.id.slice(0, 6)}</span>
                    </div>
                  </div>

                  {/* About Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-7 space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Info className={`h-4 w-4 text-${effect.color}-400`} />
                          <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Visão Geral do Produto</h3>
                        </div>
                        <p className="text-white/90 leading-relaxed font-medium text-xl italic lg:pr-10">
                          "{item.description}"
                        </p>
                      </div>

                      {/* Advantages Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                        {effect.advantages.map((adv, idx) => (
                          <div key={idx} className="flex items-center gap-3 group">
                            <div className={`h-6 w-6 rounded-lg bg-${effect.color}-500/10 border border-${effect.color}-500/20 flex items-center justify-center group-hover:bg-${effect.color}-500/20 transition-colors`}>
                              <CheckCircle2 className={`h-3 w-3 text-${effect.color}-400`} />
                            </div>
                            <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors">{adv}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Stats Column */}
                    <div className="lg:col-span-5 space-y-4">
                       <div className="bg-white/5 border border-white/5 rounded-[2rem] p-8 space-y-6">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                            <Target className="h-3 w-3" /> Impacto Institucional
                          </h4>
                          <div className="space-y-6">
                             <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase">
                                   <span className="text-white/40">Retorno Financeiro</span>
                                   <span className="text-emerald-400">Excelente</span>
                                </div>
                                <Progress value={95} className="h-1 bg-white/5" indicatorClassName="bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                             </div>
                             <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase">
                                   <span className="text-white/40">Engajamento Social</span>
                                   <span className="text-blue-400">Moderado</span>
                                </div>
                                <Progress value={65} className="h-1 bg-white/5" indicatorClassName="bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                             </div>
                             <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase">
                                   <span className="text-white/40">Eficiência Operacional</span>
                                   <span className="text-amber-400">Alto</span>
                                </div>
                                <Progress value={85} className="h-1 bg-white/5" indicatorClassName="bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Financial Analysis Section */}
                  <div className="space-y-8">
                     <div className="flex items-center gap-2">
                        <LineChart className="h-4 w-4 text-emerald-400" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-white/40">Análise Financeira e Projeções</h3>
                     </div>

                     <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {/* Investimento */}
                        <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem] space-y-1 hover:bg-white/10 transition-colors cursor-default group">
                           <p className="text-[9px] text-white/30 font-black uppercase tracking-wider group-hover:text-white/50 transition-colors">Investimento Total</p>
                           <p className="text-2xl font-black text-white italic">R$ {formatMoney(price)}</p>
                        </div>
                        {/* Renda Diária */}
                        <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem] space-y-1 hover:bg-emerald-500/5 transition-colors cursor-default group">
                           <p className="text-[9px] text-emerald-400/50 font-black uppercase tracking-wider group-hover:text-emerald-400 transition-colors">Renda Diária</p>
                           <p className="text-2xl font-black text-emerald-400 italic">+ R$ {formatMoney(dailyReturn)}</p>
                        </div>
                        {/* ROI Estimado */}
                        <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem] space-y-1 hover:bg-blue-500/5 transition-colors cursor-default group">
                           <p className="text-[9px] text-blue-400/50 font-black uppercase tracking-wider group-hover:text-blue-400 transition-colors">Break-even (ROI)</p>
                           <p className="text-2xl font-black text-blue-400 italic">{roiDays} Dias</p>
                        </div>
                        {/* Lucro Total */}
                        <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem] space-y-1 hover:bg-amber-500/5 transition-colors cursor-default group border-amber-500/20">
                           <p className="text-[9px] text-amber-500/50 font-black uppercase tracking-wider group-hover:text-amber-500 transition-colors">Lucro Esperado</p>
                           <p className="text-2xl font-black text-amber-500 italic">R$ {formatMoney(totalNetProfit)}</p>
                        </div>
                     </div>

                     {/* Detailed Return Table */}
                     <div className="bg-gradient-to-br from-white/5 to-transparent border border-white/5 rounded-[2.5rem] overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5">
                           <div className="p-8 space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Retorno Semanal</p>
                              <p className="text-3xl font-black text-white italic">R$ {formatMoney(weeklyReturn)}</p>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400/60 uppercase">
                                 <ArrowUpRight className="h-3 w-3" /> Crescimento de 23%
                              </div>
                           </div>
                           <div className="p-8 space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Retorno Mensal (30d)</p>
                              <p className="text-3xl font-black text-white italic">R$ {formatMoney(monthlyReturn)}</p>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400/60 uppercase">
                                 <TrendingUp className="h-3 w-3" /> Alta Estabilidade
                              </div>
                           </div>
                           <div className="p-8 space-y-4">
                              <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Rentabilidade Total</p>
                              <div className="flex items-end gap-2">
                                 <p className="text-4xl font-black text-emerald-400 italic">+{profitPercentage.toFixed(0)}%</p>
                                 <p className="text-[10px] font-bold text-white/20 mb-1.5 uppercase tracking-tighter">Sobre o capital</p>
                              </div>
                              <p className="text-[10px] font-medium text-white/40 italic leading-tight">
                                Esse investimento renderá aproximadamente R$ {formatMoney(totalGrossReturn)} em {duration} dias.
                              </p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Requirements & Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="flex items-center gap-4 p-6 bg-white/5 border border-white/5 rounded-[2rem]">
                        <div className={`p-4 rounded-2xl bg-${effect.color}-500/10 text-${effect.color}-400`}>
                           <Clock className="h-6 w-6" />
                        </div>
                        <div>
                           <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Duração do Contrato</p>
                           <p className="text-lg font-black text-white italic">{duration} Dias</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 p-6 bg-white/5 border border-white/5 rounded-[2rem]">
                        <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400">
                           <Users className="h-6 w-6" />
                        </div>
                        <div>
                           <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Mínimo de Torcedores</p>
                           <p className={`text-lg font-black italic ${isBlocked ? 'text-red-400' : 'text-emerald-400'}`}>
                              {item.min_fans ? formatMoney(item.min_fans) : 'Livre'}
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 p-6 bg-white/5 border border-white/5 rounded-[2rem]">
                        <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-400">
                           <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                           <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Ativação do Benefício</p>
                           <p className="text-lg font-black text-white italic">Imediata</p>
                        </div>
                     </div>
                  </div>
                </div>
              </ScrollArea>

              {/* Action Bar */}
              <div className="p-8 md:p-14 bg-[#0A0D14] border-t border-white/5 backdrop-blur-3xl">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-1 w-full text-center md:text-left space-y-1">
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em]">Custo de Implementação</p>
                    <div className="flex items-center justify-center md:justify-start gap-4">
                       <p className="text-5xl md:text-6xl font-black text-white italic tracking-tighter">
                         {isFree ? 'GRÁTIS' : `R$ ${price.toLocaleString()}`}
                       </p>
                       {!isFree && (
                         <Badge variant="outline" className="border-emerald-500/20 text-emerald-400 font-black text-[10px] py-1 px-3">
                           PAGAMENTO ÚNICO
                         </Badge>
                       )}
                    </div>
                  </div>
                  
                  <div className="flex gap-4 w-full md:w-auto">
                    <Button 
                      variant="outline" 
                      onClick={onClose}
                      className="flex-1 md:flex-none h-20 px-10 border-white/5 hover:bg-white/5 text-white/40 font-black uppercase italic rounded-3xl hidden md:flex text-sm transition-all"
                    >
                      Pular Oferta
                    </Button>
                    <Button
                      disabled={isBlocked}
                      onClick={() => {
                        onPurchase();
                        onClose();
                      }}
                      className={`flex-[2] md:flex-none h-20 px-16 font-black uppercase italic rounded-3xl transition-all duration-500 shadow-2xl text-lg relative overflow-hidden group ${
                        isBlocked
                          ? 'bg-white/5 text-white/20 border border-white/5'
                          : `bg-${effect.color}-600 hover:bg-${effect.color}-500 text-white shadow-${effect.color}-900/20 hover:scale-[1.02] active:scale-95`
                      }`}
                    >
                      <div className="relative z-10 flex items-center gap-3">
                         {isBlocked ? <Lock className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                         {isBlocked ? 'Bloqueado por Torcida' : isFree ? 'Assinar Contrato' : 'Efetuar Investimento'}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </Button>
                  </div>
                </div>
                {isBlocked && (
                  <p className="text-center text-[10px] font-black text-red-400 mt-6 uppercase tracking-widest animate-pulse">
                    Atenção: Seu clube precisa de {item.min_fans?.toLocaleString()} torcedores para validar este contrato.
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