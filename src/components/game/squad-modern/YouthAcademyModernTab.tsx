import React, { useState } from 'react';
import { 
  YouthProspect, potentialTierInfo, youthInvestmentTiers, getYouthTierByMonthlyCost 
} from '@/types/infrastructure';
import { Player } from '@/types/game';
import { PremiumPlayerCard } from './cards/PremiumPlayerCard';
import { Button } from '@/components/ui/button';
import { GraduationCap, TrendingUp, Star, ArrowUpRight, Trophy, Info, Sparkles, Coins, Search, Newspaper, Clock } from 'lucide-react';
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
  const [activeSubTab, setActiveSubTab] = useState<string>('plantel');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPos, setFilterPos] = useState('ALL');
  
  const currentTier = getYouthTierByMonthlyCost(monthlyInvestment);

  const filteredProspects = React.useMemo(() => {
    return prospects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPos = filterPos === 'ALL' || p.position === filterPos;
      return matchesSearch && matchesPos;
    }).sort((a, b) => (b.potential || 0) - (a.potential || 0));
  }, [prospects, searchTerm, filterPos]);

  const copinhaUnlocked = currentSeason >= 2;
  const eligibleForCopinha = prospects.filter(p => p.age <= 20).length;

  const isConstructing = !!academyUpgradeCompletesAt && new Date(academyUpgradeCompletesAt).getTime() > Date.now();


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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/5 rounded-2xl">
           <TabButton 
             active={activeSubTab === 'plantel'} 
             onClick={() => setActiveSubTab('plantel')} 
             label="Plantel" 
             icon={<GraduationCap className="w-3.5 h-3.5" />} 
           />
           <TabButton 
             active={activeSubTab === 'investimento'} 
             onClick={() => setActiveSubTab('investimento')} 
             label="Investimento" 
             icon={<Coins className="w-3.5 h-3.5" />} 
           />
           <TabButton 
             active={activeSubTab === 'copinha'} 
             onClick={() => setActiveSubTab('copinha')} 
             label="Copinha" 
             icon={<Trophy className="w-3.5 h-3.5" />} 
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
        {/* Prospects List / Sub-tab Content */}
        <div className="xl:col-span-3">
          <AnimatePresence mode="wait">
            {activeSubTab === 'plantel' && (
              <motion.div 
                key="plantel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
              >
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
              </motion.div>
            )}

            {activeSubTab === 'investimento' && (
              <motion.div 
                key="investimento"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {youthInvestmentTiers.filter(t => t.tier !== 'none').map(t => {
                    const isActive = currentTier.tier === t.tier;
                    return (
                      <button
                        key={t.tier}
                        onClick={() => {
                          onSetInvestment(t.monthlyCost);
                          toast.success(`Plano ${t.label} ativado!`);
                        }}
                        className={cn(
                          "flex flex-col text-left p-6 rounded-[2rem] border transition-all duration-300 relative overflow-hidden group active:scale-95",
                          isActive
                            ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.1)]"
                            : "bg-zinc-900/40 border-white/5 hover:border-white/20 hover:bg-zinc-900/60"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-2xl transition-colors",
                          isActive ? "bg-emerald-500 text-zinc-950" : "bg-white/5 text-white/40 group-hover:bg-white/10"
                        )}>
                          {t.emoji}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">{t.label}</span>
                        <span className="text-xl font-black italic mb-2 text-white">
                          {formatMoney(t.monthlyCost)}
                          <span className="text-[10px] font-normal text-white/40 ml-1 italic">/mês</span>
                        </span>
                        <p className="text-xs font-bold text-white/60 leading-relaxed mb-4">{t.description}</p>
                        
                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                           <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                              <TrendingUp className="h-3 w-3" /> +{t.qualityBonus}% Qualidade
                           </span>
                           {isActive && (
                             <span className="text-[8px] font-black bg-emerald-500 text-zinc-950 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                               Ativo
                             </span>
                           )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeSubTab === 'copinha' && (
              <motion.div 
                key="copinha"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-8 sm:p-12 rounded-[2.5rem] bg-zinc-900/40 border border-amber-500/20 backdrop-blur-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                  <Trophy className="w-64 h-64 text-amber-500" />
                </div>
                
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div className="space-y-8">
                    <div>
                      <h4 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-4">
                        Copa São Paulo de Juniores
                      </h4>
                      <p className="text-sm font-bold text-white/40 leading-relaxed max-w-md">
                        A Copinha é a maior vitrine do futebol brasileiro. Participar acelera drasticamente o desenvolvimento dos seus talentos Sub-20 e atrai olheiros mundiais.
                      </p>
                    </div>

                    <div className="flex gap-4">
                       <div className="flex-1 p-5 rounded-3xl bg-white/5 border border-white/5">
                          <p className="text-3xl font-black text-amber-400 italic leading-none mb-1">{eligibleForCopinha}</p>
                          <p className="text-[10px] uppercase font-black text-white/30 tracking-widest">Jogadores Sub-20</p>
                       </div>
                       <div className="flex-1 p-5 rounded-3xl bg-white/5 border border-white/5">
                          <p className={cn(
                            "text-3xl font-black italic leading-none mb-1",
                            copinhaUnlocked ? "text-emerald-400" : "text-red-400"
                          )}>
                            {copinhaUnlocked ? 'Aberta' : 'Bloqueada'}
                          </p>
                          <p className="text-[10px] uppercase font-black text-white/30 tracking-widest">Inscrições</p>
                       </div>
                    </div>

                    <Button 
                      size="lg"
                      disabled={!copinhaUnlocked || eligibleForCopinha < 11}
                      onClick={onEnrollCopinha}
                      className="w-full h-16 rounded-3xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black italic uppercase tracking-[0.2em] shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                    >
                      <Trophy className="w-5 h-5 mr-3" />
                      Inscrever na Copinha
                    </Button>
                    
                    {!copinhaUnlocked && (
                      <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/5">
                        <Clock className="w-3.5 h-3.5 text-white/40" />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                          Disponível na Temporada 2
                        </span>
                      </div>
                    )}
                  </div>

function TabButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
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
                  <div className="relative aspect-[16/10] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
                    <img 
                      src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800" 
                      className="w-full h-full object-cover opacity-40"
                      alt="Stadium"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6 p-6 rounded-[2rem] bg-zinc-900/80 backdrop-blur-md border border-white/10">
                       <p className="text-xs font-black text-white mb-3 flex items-center gap-2 uppercase tracking-widest">
                          <Sparkles className="h-4 w-4 text-amber-400" /> Benefícios da Vitória
                       </p>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-emerald-400 uppercase">+15 Overall</p>
                             <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Para os destaques</p>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[10px] font-black text-amber-400 uppercase">Valor 4x</p>
                             <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Mercado Aquecido</p>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSubTab === 'mural' && (
              <motion.div 
                key="mural"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {[
                  { title: 'Treino de Finalização em Alta', text: 'Os atacantes da base mostraram pontaria afiada no coletivo de hoje.', date: 'Hoje', type: 'training' },
                  { title: 'Olheiro Impressionado', text: 'Um olheiro europeu foi visto nas arquibancadas observando nossos meias.', date: 'Ontem', type: 'market' },
                  { title: 'Exemplo de Conduta', text: 'A nova safra de jogadores tem se destacado pela disciplina e moral elevada.', date: '2 dias atrás', type: 'morale' }
                ].map((news, i) => (
                  <div key={i} className="flex gap-6 p-6 rounded-[2rem] bg-zinc-900/40 border border-white/5 hover:bg-zinc-900/60 transition-all cursor-default group">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border",
                      news.type === 'training' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                      news.type === 'market' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 
                      'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                    )}>
                      {news.type === 'training' ? <Star className="h-6 w-6" /> : 
                       news.type === 'market' ? <Search className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-base font-black italic uppercase tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                          {news.title}
                        </h4>
                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{news.date}</span>
                      </div>
                      <p className="text-xs font-bold text-white/40 leading-relaxed uppercase tracking-wider">
                        {news.text}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
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
