import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { YouthProspect, potentialTierInfo } from '@/types/infrastructure';
import { PromotionDecision } from '@/types/promotion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Star, UserPlus, Clock, Search, Trash2, Award } from 'lucide-react';
import { motion } from 'framer-motion';

interface PromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: YouthProspect;
  onDecision: (decision: PromotionDecision) => void;
}

export function PromotionDialog({ open, onOpenChange, prospect, onDecision }: PromotionDialogProps) {
  const potInfo = potentialTierInfo[prospect.potentialTier || 'comum'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-white/10 text-white p-0 overflow-hidden">
        <div className="relative h-48 bg-gradient-to-br from-emerald-600 to-zinc-900 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="z-10 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-white/10 border-4 border-white/20 flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
              <span className="text-4xl">⚽</span>
            </div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Relatório de Promoção</h2>
          </motion.div>
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent"></div>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-3xl font-black text-white flex items-center gap-3">
                {prospect.name}
                <Badge className={`${potInfo.color} ${potInfo.border} bg-transparent border uppercase text-[10px] px-2`}>
                   {potInfo.label}
                </Badge>
              </h3>
              <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs mt-1">
                {prospect.age} anos • {prospect.position} • Base do Clube
              </p>
            </div>
            
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="text-center">
                <p className="text-[10px] text-zinc-500 font-black uppercase mb-1">Overall</p>
                <p className="text-3xl font-black text-emerald-400">{prospect.overall}</p>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="text-center">
                <p className="text-[10px] text-zinc-500 font-black uppercase mb-1">Potencial</p>
                <p className="text-3xl font-black text-amber-400">{prospect.potential}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" /> Destaques Recentes
              </h4>
              <div className="space-y-2">
                <HighlightItem icon={<Award className="w-4 h-4 text-emerald-400" />} text="Dominou o meio-campo no último treino" />
                <HighlightItem icon={<Star className="w-4 h-4 text-amber-400" />} text="Evolução física impressionante" />
                <HighlightItem icon={<TrendingUp className="w-4 h-4 text-blue-400" />} text="Potencial de titular absoluto no futuro" />
              </div>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl">
              <p className="text-sm text-zinc-300 italic leading-relaxed">
                “O jovem jogador <span className="text-white font-bold">{prospect.name}</span> chamou atenção da comissão técnica e está pronto para o desafio no elenco profissional.”
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
             <ActionButton 
                onClick={() => onDecision('promoted')} 
                icon={<UserPlus className="w-4 h-4" />} 
                label="Oferecer Contrato" 
                variant="emerald"
             />
             <ActionButton 
                onClick={() => onDecision('stayed')} 
                icon={<Clock className="w-4 h-4" />} 
                label="Manter na Base" 
             />
             <ActionButton 
                onClick={() => onDecision('observing')} 
                icon={<Search className="w-4 h-4" />} 
                label="Observar Mais" 
             />
             <ActionButton 
                onClick={() => onDecision('released')} 
                icon={<Trash2 className="w-4 h-4" />} 
                label="Dispensar" 
                variant="destructive"
             />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HighlightItem({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
      {icon}
      <span className="text-xs font-bold text-zinc-300">{text}</span>
    </div>
  );
}

function ActionButton({ onClick, icon, label, variant = 'default' }: { onClick: () => void, icon: React.ReactNode, label: string, variant?: 'default' | 'emerald' | 'destructive' }) {
  const styles = {
    default: "bg-white/5 hover:bg-white/10 text-white border-white/10",
    emerald: "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 border-transparent",
    destructive: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all active:scale-95 group ${styles[variant]}`}
    >
      <div className={`p-2 rounded-lg ${variant === 'emerald' ? 'bg-zinc-950/20' : 'bg-white/5'} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-center">{label}</span>
    </button>
  );
}
