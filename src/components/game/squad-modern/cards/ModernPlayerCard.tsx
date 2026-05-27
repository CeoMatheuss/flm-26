import { motion } from 'framer-motion';
import { Player } from '@/types/game';
import { Zap, Heart, Shield, Activity, TrendingUp, Sparkles, Tag, Handshake, ArrowLeftRight, X } from 'lucide-react';
import { formatMoney } from '@/lib/formatMoney';
import { cn } from '@/lib/utils';
import swapIcon from '@/assets/swap-icon.png';
import { PotentialTier, potentialTierInfo, getPotentialTier } from '@/types/infrastructure';
import { usePlayerHighlight } from '@/contexts/PlayerHighlightContext';

interface ModernPlayerCardProps {
  player: Player;
  onClick: () => void;
}

export function ModernPlayerCard({ player, onClick, onOpenQuickSwap }: ModernPlayerCardProps & { onOpenQuickSwap?: () => void }) {
  const { highlights, removeHighlight } = usePlayerHighlight();
  const highlight = highlights[player.id];

  const rawTier = (player as any).potentialTier || getPotentialTier((player as any).potential || 60, player.overall);
  const potTier: PotentialTier = (potentialTierInfo as any)[rawTier] ? rawTier : 'comum';
  const tierInfo = potentialTierInfo[potTier] || potentialTierInfo.comum;
  const tierColor = tierInfo.color || potentialTierInfo.comum.color;
  const tierBorder = highlight 
    ? highlight.type === 'listed_sale' || highlight.type === 'new_signing' ? 'border-amber-400' : 'border-cyan-400'
    : (tierInfo.border || potentialTierInfo.comum.border);

  const badgeLabels: Record<string, string> = {
    new_signing: 'NOVO REFORÇO',
    listed_loan: 'DISPONÍVEL P/ EMPRÉSTIMO',
    transferred: 'TRANSFERIDO',
    listed_sale: 'À VENDA'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative p-4 rounded-3xl bg-[#0a0c14] border overflow-hidden cursor-pointer group transition-all duration-500 shadow-xl",
        tierBorder,
        highlight && "ring-4 ring-offset-2 ring-offset-[#0a0c14] z-50",
        highlight?.type === 'listed_sale' || highlight?.type === 'new_signing' ? "ring-amber-400/50 shadow-[0_0_30px_rgba(245,158,11,0.3)]" : highlight ? "ring-cyan-400/50 shadow-[0_0_30px_rgba(34,211,238,0.3)]" : "hover:border-[#8b5cf6]/50"
      )}
    >
      <AnimatePresence>
        {highlight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={cn(
              "absolute inset-0 pointer-events-none z-0",
              highlight.type === 'listed_sale' || highlight.type === 'new_signing' ? "bg-amber-400/10" : "bg-cyan-400/10"
            )}
          />
        )}
      </AnimatePresence>

      <div className={`absolute inset-0 bg-gradient-to-br ${tierColor.replace('text', 'from')}/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
      
      {highlight && (
        <div className="absolute top-0 right-0 z-50 p-2">
          <button 
            onClick={(e) => { e.stopPropagation(); removeHighlight(player.id); }}
            className="p-1 rounded-full bg-black/50 hover:bg-black/80 text-white/70 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {highlight && (
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={cn(
            "absolute top-2 left-2 z-50 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-lg",
            highlight.type === 'listed_sale' || highlight.type === 'new_signing' 
              ? "bg-amber-400 text-black border-amber-500" 
              : "bg-cyan-400 text-black border-cyan-500"
          )}
        >
          {badgeLabels[highlight.type]}
        </motion.div>
      )}
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex flex-col gap-2">
          <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 font-black text-xl italic ${tierColor}`}>
            {player.overall}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenQuickSwap?.();
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 hover:scale-110 bg-black/20 backdrop-blur-sm border border-white/5"
            title="Troca Rápida"
          >
            <ArrowLeftRight className={cn("w-5 h-5 drop-shadow-lg transition-colors", tierColor)} />
          </button>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase text-white/40 tracking-wider italic">{player.position}</p>
          <div className="flex items-center gap-1 mt-1">
             <span className={`text-[8px] font-black uppercase italic ${tierColor}`}>{tierInfo.label}</span>
             {potTier !== 'comum' && <Sparkles className={`w-2.5 h-2.5 ${tierColor}`} />}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-sm font-black italic text-white uppercase tracking-tighter truncate">{player.name}</h3>
        <div className="flex gap-1">
          {player.onTransferList && (
            <div className="p-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" title="À Venda">
              <Tag className="w-3 h-3" />
            </div>
          )}
          {player.onLoanList && (
            <div className="p-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400" title="Empréstimo">
              <Handshake className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 relative z-10">
        <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest">
          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Condição</span>
          <span>{player.stamina}%</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full ${player.stamina > 70 ? 'bg-emerald-400' : player.stamina > 40 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${player.stamina}%` }} />
        </div>
      </div>
    </motion.div>
  );
}
