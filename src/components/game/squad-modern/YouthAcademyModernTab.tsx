import React, { useState } from 'react';
import { 
  YouthProspect, potentialTierInfo, youthInvestmentTiers, getYouthTierByMonthlyCost 
} from '@/types/infrastructure';
import { Player } from '@/types/game';
import { PremiumPlayerCard } from './cards/PremiumPlayerCard';
import { Button } from '@/components/ui/button';
import { GraduationCap, TrendingUp, Star, ArrowUpRight, Trophy, Info, Sparkles, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/formatMoney';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface YouthAcademyModernTabProps {
  prospects: YouthProspect[];
  onPromote: (id: string) => void;
  monthlyInvestment: number;
  onSetInvestment: (amount: number) => void;
  academyLevel: number;
  budget: number;
  hasScouts: boolean;
  currentSeason: number;
  onSell: (id: string) => void;
  onEnrollCopinha: () => void;
  onUpgradeAcademy: () => void;
}

export function YouthAcademyModernTab({ 
  prospects, onPromote, monthlyInvestment, onSetInvestment,
  academyLevel, budget, hasScouts, currentSeason, onSell, onEnrollCopinha, onUpgradeAcademy
}: YouthAcademyModernTabProps) {
  const [selectedProspect, setSelectedProspect] = useState<YouthProspect | null>(null);
  const currentTier = getYouthTierByMonthlyCost(monthlyInvestment);

  return (
    <div className="space-y-8 pb-20 sm:pb-0">
      {/* Academy Overview & Investment */}
      <section className="relative p-6 sm:p-10 rounded-[2.5rem] bg-zinc-900/40 border border-white/5 backdrop-blur-xl overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <GraduationCap className="w-48 h-48 text-emerald-500" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <GraduationCap className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase text-white">
                Centro de Formação
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Nível {currentTier.label}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">
                  {prospects.length} Talentos em Observação
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {youthInvestmentTiers.filter(t => t.tier !== 'none').map(t => (
              <button
                key={t.tier}
                onClick={() => {
                  onSetInvestment(t.monthlyCost);
                  toast.success(`Investimento na base: ${t.label}`);
                }}
                className={cn(
                  "flex flex-col items-start px-5 py-3 rounded-2xl border transition-all duration-300 active:scale-95",
                  currentTier.tier === t.tier
                    ? "bg-emerald-500 border-emerald-400 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:border-white/20"
                )}
              >
                <span className={cn("text-[9px] font-black uppercase tracking-widest mb-1 opacity-60")}>
                  Plano {t.label}
                </span>
                <span className="text-sm font-black italic">{formatMoney(t.monthlyCost)}/mês</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">
          Plantel da Base
        </h3>
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
            Próximo ciclo: 7 dias
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Prospects List */}
        <div className="xl:col-span-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            <AnimatePresence>
              {prospects.map(p => (
                <PremiumPlayerCard 
                  key={p.id} 
                  player={p as any} 
                  isStarter={false}
                  selected={selectedProspect?.id === p.id}
                  onClick={() => setSelectedProspect(p)} 
                />
              ))}
            </AnimatePresence>
            {prospects.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-30 bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[2rem]">
                <GraduationCap className="w-16 h-16 mb-4 text-white/40" />
                <p className="text-lg font-black italic uppercase text-white">Academia Vazia</p>
                <p className="text-xs font-bold uppercase tracking-widest text-white/60 mt-2">
                  Um novo jogador chegará automaticamente a cada 7 dias
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Selected Prospect Details */}
        <div className="xl:col-span-1">
          <AnimatePresence mode="wait">
            {selectedProspect ? (
              <motion.div
                key={selectedProspect.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="sticky top-28 p-8 rounded-[2.5rem] bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-2xl flex flex-col gap-8 shadow-2xl"
              >
                <div className="text-center">
                  <div className="relative inline-block mx-auto mb-6">
                    <div className={cn(
                      "w-32 h-32 rounded-[2.5rem] flex flex-col items-center justify-center border-4 bg-zinc-950/80 shadow-2xl relative overflow-hidden",
                      selectedProspect.overall >= 70 ? "border-amber-400/50 shadow-amber-400/20" : "border-white/10"
                    )}>
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
                      <span className={cn(
                        "text-5xl font-black italic z-10",
                        selectedProspect.overall >= 70 ? "text-amber-400" : "text-white"
                      )}>
                        {selectedProspect.overall}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 z-10">OVR</span>
                    </div>
                    {selectedProspect.overall >= 70 && (
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-amber-400 border-4 border-zinc-900 flex items-center justify-center shadow-lg">
                        <Trophy className="w-5 h-5 text-zinc-900" />
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white truncate">
                    {selectedProspect.name}
                  </h3>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
                      {selectedProspect.position}
                    </span>
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                      {selectedProspect.age} ANOS
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Potential Display */}
                  <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/5">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                         <Star className="w-3 h-3 text-amber-400" /> Potencial
                      </span>
                      <span className="text-xl font-black text-amber-400 italic">~{selectedProspect.potential}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedProspect.potential}%` }}
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400" 
                      />
                    </div>
                  </div>

                  {/* Attributes Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {['FIS', 'TEC', 'TAC', 'DEF', 'VEL', 'MEN'].map((attr) => (
                      <div key={attr} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center group hover:bg-emerald-500/5 transition-all">
                        <p className="text-[8px] font-black text-white/20 uppercase mb-1">{attr}</p>
                        <p className="text-sm font-black text-white italic group-hover:text-emerald-400">
                          {Math.floor(selectedProspect.overall * (0.85 + Math.random() * 0.3))}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Raridade / Tag */}
                  <div className={cn(
                    "p-4 rounded-3xl border flex items-center gap-4",
                    selectedProspect.rarity === 'Craque geracional' ? "bg-amber-500/10 border-amber-500/20" :
                    selectedProspect.rarity === 'Promessa' ? "bg-cyan-500/10 border-cyan-500/20" :
                    selectedProspect.rarity === 'Bom talento' ? "bg-blue-500/10 border-blue-500/20" :
                    "bg-emerald-500/5 border-emerald-500/10"
                  )}>
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center",
                      selectedProspect.rarity === 'Craque geracional' ? "bg-amber-500/20 text-amber-400" :
                      selectedProspect.rarity === 'Promessa' ? "bg-cyan-500/20 text-cyan-400" :
                      selectedProspect.rarity === 'Bom talento' ? "bg-blue-500/20 text-blue-400" :
                      "bg-emerald-500/10 text-emerald-400"
                    )}>
                       <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Raridade</p>
                      <p className={cn(
                        "text-xs font-black uppercase italic",
                        selectedProspect.rarity === 'Craque geracional' ? "text-amber-400" :
                        selectedProspect.rarity === 'Promessa' ? "text-cyan-400" :
                        selectedProspect.rarity === 'Bom talento' ? "text-blue-400" :
                        "text-emerald-400"
                      )}>
                         {selectedProspect.rarity || 'Comum'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Button 
                    onClick={() => {
                      onPromote(selectedProspect.id);
                      setSelectedProspect(null);
                    }}
                    className="w-full h-16 rounded-3xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black italic uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all active:scale-95 group"
                  >
                    <ArrowUpRight className="w-6 h-6 mr-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    Promover ao Profissional
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div className="sticky top-28 p-10 rounded-[2.5rem] bg-zinc-900/20 border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center opacity-40">
                <div className="w-20 h-20 rounded-[2rem] bg-white/5 flex items-center justify-center mb-8">
                  <Info className="w-10 h-10 text-white/20" />
                </div>
                <p className="text-sm font-black uppercase italic tracking-widest text-white/40 leading-relaxed">
                  Selecione um jovem talento da academia para analisar seu potencial e promovê-lo ao time principal
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
    </div>
  </div>
  );
}
