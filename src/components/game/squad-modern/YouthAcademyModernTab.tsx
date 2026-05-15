import React, { useState, useMemo } from 'react';
import { YouthProspect, getPotentialTier, potentialTierInfo, computeEvolutionStatus, evolutionStatusInfo, youthTagInfo, computeYouthTag } from '@/types/infrastructure';
import { Player } from '@/types/game';
import { ModernPlayerCard } from './cards/ModernPlayerCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, TrendingUp, Star, ArrowUpRight, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface YouthAcademyModernTabProps {
  prospects: YouthProspect[];
  onPromote: (id: string) => void;
}

export function YouthAcademyModernTab({ prospects, onPromote }: YouthAcademyModernTabProps) {
  const [selectedProspect, setSelectedProspect] = useState<YouthProspect | null>(null);

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 backdrop-blur-xl col-span-1 md:col-span-3">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#8b5cf6]/10 flex items-center justify-center border border-[#8b5cf6]/20">
                <GraduationCap className="w-6 h-6 text-[#8b5cf6]" />
              </div>
              <div>
                <h3 className="text-xl font-black italic tracking-tighter uppercase">Academia de Juniores</h3>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{prospects.length} Prospectos em Desenvolvimento</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {prospects.map(p => (
              <ModernPlayerCard key={p.id} player={p as Player} onClick={() => setSelectedProspect(p)} />
            ))}
          </div>
        </div>

        <div className="col-span-1 h-full">
          {selectedProspect ? (
            <div className="p-6 rounded-[2rem] bg-[#0a0c14] border border-white/5 h-full flex flex-col animate-in fade-in slide-in-from-right-4">
              <div className="text-center mb-6">
                 <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#8b5cf6]/20 to-transparent border border-white/10 mx-auto mb-4 flex items-center justify-center font-black text-4xl italic text-[#8b5cf6]">
                   {selectedProspect.overall}
                 </div>
                 <h4 className="text-lg font-black italic uppercase tracking-tighter truncate">{selectedProspect.name}</h4>
                 <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{selectedProspect.position} • {selectedProspect.age} Anos</p>
              </div>

              <div className="space-y-4 flex-1">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Potencial</span>
                    <span className="text-sm font-black text-amber-400">{selectedProspect.potential}</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${selectedProspect.potential}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
                    <p className="text-[8px] font-bold text-white/30 uppercase mb-1">Evolução</p>
                    <p className="text-xs font-black text-emerald-400 italic">Rápida</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
                    <p className="text-[8px] font-bold text-white/30 uppercase mb-1">Talento</p>
                    <Star className="w-4 h-4 text-amber-400 mx-auto" />
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => {
                  onPromote(selectedProspect.id);
                  toast.success(`${selectedProspect.name} foi promovido ao profissional!`);
                  setSelectedProspect(null);
                }}
                className="w-full h-12 rounded-2xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-black italic uppercase tracking-widest mt-6"
              >
                Promover ao Profissional
              </Button>
            </div>
          ) : (
            <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-dashed border-white/10 h-full flex flex-col items-center justify-center text-center opacity-40">
              < GraduationCap className="w-12 h-12 text-white/20 mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">Selecione um jovem</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
