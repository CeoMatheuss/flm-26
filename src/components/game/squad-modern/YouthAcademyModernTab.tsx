import React, { useState, useEffect, useMemo } from 'react';
import { 
  YouthProspect, potentialTierInfo, youthInvestmentTiers, getYouthTierByMonthlyCost,
  getAcademyUpgradeCost, getYouthMinOverall, getYouthMaxOverall
} from '@/types/infrastructure';
import { Player } from '@/types/game';
import { PremiumPlayerCard } from './cards/PremiumPlayerCard';
import { Button } from '@/components/ui/button';
import { GraduationCap, TrendingUp, Star, ArrowUpRight, Trophy, Info, Sparkles, Coins, Search, Newspaper, Clock, Hammer, Check, Lock } from 'lucide-react';
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
  academyUpgradeCompletesAt?: string;
  budget: number;
  hasScouts: boolean;
  currentSeason: number;
  onSell: (id: string) => void;
  onEnrollCopinha: () => void;
  onUpgradeAcademy: () => void;
  lastYouthGenAt?: string;
  isPremium?: boolean;
}

export function YouthAcademyModernTab({ 
  prospects, onPromote, monthlyInvestment, onSetInvestment,
  academyLevel, academyUpgradeCompletesAt, budget, hasScouts, currentSeason, onSell, onEnrollCopinha, onUpgradeAcademy,
  lastYouthGenAt, isPremium
}: YouthAcademyModernTabProps) {
  const [selectedProspect, setSelectedProspect] = useState<YouthProspect | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPos, setFilterPos] = useState('ALL');
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  const currentTier = getYouthTierByMonthlyCost(monthlyInvestment);
  const isConstructing = !!academyUpgradeCompletesAt && new Date(academyUpgradeCompletesAt).getTime() > Date.now();

  useEffect(() => {
    if (!lastYouthGenAt) return;
    const calculateTimeLeft = () => {
      const lastGen = new Date(lastYouthGenAt).getTime();
      const nextGen = lastGen + 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const diff = nextGen - now;

      if (diff <= 0) {
        setTimeLeft('Disponível agora!');
        return;
      }

      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((diff % (60 * 1000)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [lastYouthGenAt]);

  const constructionProgress = React.useMemo(() => {
    if (!isConstructing || !academyUpgradeCompletesAt) return 0;
    const target = new Date(academyUpgradeCompletesAt).getTime();
    const start = target - 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - start;
    return Math.max(0, Math.min(100, (elapsed / (24 * 60 * 60 * 1000)) * 100));
  }, [isConstructing, academyUpgradeCompletesAt]);

  const constructionRemaining = React.useMemo(() => {
    if (!isConstructing || !academyUpgradeCompletesAt) return '';
    const diff = new Date(academyUpgradeCompletesAt).getTime() - Date.now();
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  }, [isConstructing, academyUpgradeCompletesAt]);


  const filteredProspects = React.useMemo(() => {
    return prospects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPos = filterPos === 'ALL' || p.position === filterPos;
      return matchesSearch && matchesPos;
    }).sort((a, b) => (b.potential || 0) - (a.potential || 0));
  }, [prospects, searchTerm, filterPos]);

  const copinhaUnlocked = currentSeason >= 2;
  const eligibleForCopinha = prospects.filter(p => p.age <= 20).length;

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
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Nível {academyLevel}/30</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">
                  {prospects.length} Talentos em Observação
                </span>
                {academyLevel < 30 && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <button 
                      onClick={onUpgradeAcademy}
                      disabled={isConstructing}
                      className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      <ArrowUpRight className="w-3 h-3" /> Melhorar Base
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Investment plans removed as requested */}
        </div>
      </section>

      {/* Quick Upgrade Widget */}
      {academyLevel < 30 && !isConstructing && (() => {
        const cost = getAcademyUpgradeCost(academyLevel);
        const canAfford = budget >= cost;
        const nextLevel = academyLevel + 1;
        const currentMax = getYouthMaxOverall(academyLevel);
        const nextMax = getYouthMaxOverall(nextLevel);
        const progressPct = (academyLevel / 30) * 100;
        return (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative p-6 sm:p-8 rounded-[2rem] bg-gradient-to-br from-emerald-500/10 via-zinc-900/40 to-zinc-900/40 border border-emerald-500/20 backdrop-blur-xl overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shrink-0">
                  <Hammer className="w-7 h-7 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">Evoluir Base</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Nv {academyLevel} → {nextLevel}</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black italic uppercase tracking-tight text-white truncate">
                    OVR máx. {currentMax} <span className="text-emerald-400">→ {nextMax}</span>
                  </h3>
                  <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden max-w-xs">
                    <div className="h-full bg-emerald-500" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="text-right">
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Custo</p>
                  <p className={cn("text-base sm:text-lg font-black italic", canAfford ? "text-white" : "text-red-400")}>
                    {formatMoney(cost)}
                  </p>
                </div>
                <Button
                  onClick={onUpgradeAcademy}
                  disabled={!canAfford}
                  className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black uppercase tracking-widest text-xs px-6 py-6 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.3)] disabled:opacity-40 disabled:shadow-none"
                >
                  <ArrowUpRight className="w-4 h-4 mr-1" /> Evoluir
                </Button>
              </div>
            </div>
          </motion.section>
        );
      })()}

      <AnimatePresence>
        {isConstructing && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 backdrop-blur-xl flex flex-col sm:flex-row items-center gap-6"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <div className="flex-1 w-full sm:w-auto">
              <div className="flex items-center justify-between mb-2">
                 <h4 className="text-sm font-black italic uppercase tracking-widest text-amber-400">Expansão da Academia</h4>
                 <span className="text-xs font-black text-amber-400/60 uppercase tracking-widest">{constructionRemaining}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${constructionProgress}%` }}
                  className="h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" 
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/5 rounded-2xl overflow-x-auto scrollbar-hide">
           <div className="px-4 py-2 flex items-center gap-2 border-r border-white/5 mr-2">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <div className="flex flex-col">
                 <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] leading-none mb-1">Próximo Talento</span>
                 <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{timeLeft}</span>
              </div>
           </div>

           <TabButton 
             active={activeSubTab === 'plantel'} 
             onClick={() => setActiveSubTab('plantel')} 
             label="Plantel" 
             icon={<GraduationCap className="w-3.5 h-3.5" />} 
           />
           {/* Investimento tab button removed */}
           <TabButton 
             active={activeSubTab === 'copinha'} 
             onClick={() => setActiveSubTab('copinha')} 
             label="Copinha" 
             icon={<Trophy className="w-3.5 h-3.5" />} 
           />
           <TabButton 
             active={activeSubTab === 'upgrade'} 
             onClick={() => setActiveSubTab('upgrade')} 
             label="Evolução" 
             icon={<Hammer className="w-3.5 h-3.5" />} 
           />
           <TabButton 
             active={activeSubTab === 'mural'} 
             onClick={() => setActiveSubTab('mural')} 
             label="Mural" 
             icon={<Newspaper className="w-3.5 h-3.5" />} 
           />
        </div>

        {activeSubTab === 'plantel' && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
              <input 
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl h-10 pl-9 pr-4 text-xs font-bold text-white placeholder:text-white/20 focus:border-emerald-500/50 outline-none transition-all"
              />
            </div>
            <select 
              value={filterPos}
              onChange={(e) => setFilterPos(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl h-10 px-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all"
            >
              <option value="ALL">Todas</option>
              <option value="GOL">GOL</option>
              <option value="ZAG">ZAG</option>
              <option value="LAT">LAT</option>
              <option value="VOL">VOL</option>
              <option value="MEI">MEI</option>
              <option value="ATA">ATA</option>
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filteredProspects.map(p => (
              <PremiumPlayerCard 
                key={p.id} 
                player={p as any} 
                isStarter={false}
                selected={selectedProspect?.id === p.id}
                onClick={() => setSelectedProspect(p)} 
              />
            ))}
            {filteredProspects.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-30 bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[2rem]">
                <GraduationCap className="w-16 h-16 mb-4 text-white/40" />
                <p className="text-lg font-black italic uppercase text-white">Nenhum jogador encontrado</p>
                <p className="text-xs font-bold uppercase tracking-widest text-white/60 mt-2">
                  Ajuste seus filtros ou aguarde o próximo ciclo
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-1">
          <AnimatePresence mode="wait">
            {selectedProspect ? (
              <motion.div
                key={selectedProspect.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <YouthPlayerSidebar 
                  prospect={selectedProspect}
                  onPromote={onPromote}
                  onSell={onSell}
                  onClose={() => setSelectedProspect(null)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 rounded-[2rem] bg-zinc-900/20 border border-white/5 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <Star className="w-8 h-8 text-white/20" />
                </div>
                <h4 className="text-sm font-black italic uppercase text-white/40 tracking-widest">
                  Selecione um Jogador
                </h4>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-2 max-w-[150px]">
                  Clique em um talento para ver detalhes e opções
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
  );
}

function TabButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap",
        active 
          ? "bg-emerald-500 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.3)]" 
          : "text-white/40 hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
