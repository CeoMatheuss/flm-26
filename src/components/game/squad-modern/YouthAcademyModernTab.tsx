import React, { useState, useMemo } from 'react';
import { 
  YouthProspect, getPotentialTier, potentialTierInfo, 
  computeEvolutionStatus, evolutionStatusInfo, youthTagInfo, 
  computeYouthTag, youthInvestmentTiers, getYouthTierByMonthlyCost 
} from '@/types/infrastructure';
import { Player } from '@/types/game';
import { ModernPlayerCard } from './cards/ModernPlayerCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, TrendingUp, Star, ArrowUpRight, Trophy, Coins, Info, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/formatMoney';

interface YouthAcademyModernTabProps {
  prospects: YouthProspect[];
  onPromote: (id: string) => void;
  monthlyInvestment: number;
  onSetInvestment: (amount: number) => void;
}

export function YouthAcademyModernTab({ prospects, onPromote, monthlyInvestment, onSetInvestment }: YouthAcademyModernTabProps) {
  const [selectedProspect, setSelectedProspect] = useState<YouthProspect | null>(null);
  const currentTier = getYouthTierByMonthlyCost(monthlyInvestment);

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 sm:pb-0">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Lado Esquerdo: Lista e Investimento */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Cabeçalho e Investimento */}
          <div className="p-8 rounded-[2.5rem] bg-[#0a0c14] border border-white/5 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
                <GraduationCap className="w-32 h-32 text-[#8b5cf6]" />
             </div>

             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-3xl bg-[#8b5cf6]/10 flex items-center justify-center border border-[#8b5cf6]/20">
                    <GraduationCap className="w-8 h-8 text-[#8b5cf6]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase">Academia de Juniores</h3>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{prospects.length} Prospectos em Desenvolvimento</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                   {youthInvestmentTiers.filter(t => t.tier !== 'none').map(t => (
                      <Button
                        key={t.tier}
                        variant="ghost"
                        onClick={() => {
                          onSetInvestment(t.monthlyCost);
                          toast.success(`Plano de investimento alterado para ${t.label}!`);
                        }}
                        className={`h-auto py-3 px-4 rounded-2xl flex flex-col items-start gap-1 transition-all ${
                          currentTier.tier === t.tier 
                            ? 'bg-[#8b5cf6] text-white' 
                            : 'bg-white/5 hover:bg-white/10 text-white/60'
                        }`}
                      >
                         <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{t.label}</span>
                         <span className="text-xs font-black italic">{formatMoney(t.monthlyCost)}</span>
                      </Button>
                   ))}
                </div>
             </div>

             {/* Grid de Jogadores */}
             {prospects.length > 0 ? (
               <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 relative z-10">
                 {prospects.map(p => (
                   <ModernPlayerCard key={p.id} player={p as Player} onClick={() => setSelectedProspect(p)} />
                 ))}
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center py-20 text-center opacity-30 border border-dashed border-white/10 rounded-3xl">
                  <GraduationCap className="w-16 h-16 mb-4" />
                  <p className="text-sm font-black italic uppercase">Nenhum jovem no momento</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest">O investimento atual trará novos talentos em breve</p>
               </div>
             )}
          </div>
        </div>

        {/* Lado Direito: Detalhes do Prospecto Selecionado */}
        <div className="lg:col-span-1">
          {selectedProspect ? (
            <div className="p-8 rounded-[2.5rem] bg-[#0a0c14] border border-white/5 h-full flex flex-col sticky top-6 animate-in fade-in slide-in-from-right-4">
              <div className="text-center mb-10">
                 <div className="relative inline-block mx-auto mb-6">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-[#8b5cf6]/20 to-transparent border border-white/10 flex items-center justify-center font-black text-5xl italic text-[#8b5cf6] shadow-2xl">
                      {selectedProspect.overall}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-[#0a0c14] border border-white/10 flex items-center justify-center shadow-lg">
                       <Trophy className="w-5 h-5 text-amber-400" />
                    </div>
                 </div>
                 <h4 className="text-xl font-black italic uppercase tracking-tighter truncate">{selectedProspect.name}</h4>
                 <p className="text-[10px] font-bold text-[#8b5cf6] uppercase tracking-widest">{selectedProspect.position} • {selectedProspect.age} Anos</p>
              </div>

              <div className="space-y-6 flex-1">
                {/* Potencial Bar */}
                <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2">
                       <Star className="w-3 h-3" /> Potencial Estimado
                    </span>
                    <span className="text-lg font-black text-amber-400 italic">{selectedProspect.potential}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]" style={{ width: `${selectedProspect.potential}%` }} />
                  </div>
                  <p className="text-[8px] font-bold text-white/20 uppercase mt-3 tracking-widest text-center">Baseado no nível da academia e olheiros</p>
                </div>

                {/* Status Pills */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-3xl bg-white/[0.03] border border-white/5 text-center group hover:bg-[#10b981]/5 hover:border-[#10b981]/20 transition-all">
                    <p className="text-[8px] font-black text-white/30 uppercase mb-2 tracking-widest">Evolução</p>
                    <div className="flex items-center justify-center gap-1.5 text-emerald-400">
                       <TrendingUp className="w-4 h-4" />
                       <p className="text-xs font-black uppercase italic">Rápida</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-3xl bg-white/[0.03] border border-white/5 text-center group hover:bg-amber-400/5 hover:border-amber-400/20 transition-all">
                    <p className="text-[8px] font-black text-white/30 uppercase mb-2 tracking-widest">Raridade</p>
                    <div className="flex items-center justify-center gap-1.5 text-amber-400">
                       <Sparkles className="w-4 h-4" />
                       <p className="text-xs font-black uppercase italic truncate">
                          {potentialTierInfo[selectedProspect.potentialTier || 'comum'].label}
                       </p>
                    </div>
                  </div>
                </div>

                {/* Attributes Preview */}
                <div className="grid grid-cols-3 gap-2">
                   {['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'].map((attr, idx) => (
                      <div key={attr} className="py-2 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                         <p className="text-[7px] font-black text-white/20 uppercase">{attr}</p>
                         <p className="text-xs font-bold text-white/80">{Math.floor(selectedProspect.overall * (0.8 + Math.random() * 0.4))}</p>
                      </div>
                   ))}
                </div>
              </div>

              <div className="space-y-3 mt-8">
                <Button 
                  onClick={() => {
                    onPromote(selectedProspect.id);
                    toast.success(`${selectedProspect.name} foi promovido ao profissional!`);
                    setSelectedProspect(null);
                  }}
                  className="w-full h-14 rounded-3xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-black italic uppercase tracking-[0.15em] shadow-lg shadow-[#8b5cf6]/20 group"
                >
                  <ArrowUpRight className="w-5 h-5 mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  Promover
                </Button>
                <p className="text-[8px] font-bold text-white/20 uppercase text-center tracking-widest">Contrato profissional de 3 anos</p>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-dashed border-white/5 h-full flex flex-col items-center justify-center text-center opacity-40">
              <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                <Info className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-xs font-black uppercase italic tracking-widest text-white/40">Selecione um jovem talento para ver detalhes e promover ao profissional</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
