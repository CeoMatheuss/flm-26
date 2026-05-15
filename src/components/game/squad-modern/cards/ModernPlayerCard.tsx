import { motion } from 'framer-motion';
import { Player } from '@/types/game';
import { Zap, Heart, Shield, Activity, TrendingUp, Sparkles } from 'lucide-react';
import { formatMoney } from '@/lib/formatMoney';
import { PotentialTier, potentialTierInfo, getPotentialTier } from '@/types/infrastructure';

interface ModernPlayerCardProps {
  player: Player;
  onClick: () => void;
}

export function ModernPlayerCard({ player, onClick }: ModernPlayerCardProps) {
  const potTier = (player as any).potentialTier || getPotentialTier((player as any).potential || 60, player.overall);
  const tierInfo = potentialTierInfo[potTier as PotentialTier];

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative p-4 rounded-3xl bg-[#0a0c14] border ${tierInfo.border} overflow-hidden cursor-pointer group hover:border-[#8b5cf6]/50 transition-all shadow-xl`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${tierInfo.color.replace('text', 'from')}/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 font-black text-xl italic ${tierInfo.color}`}>
          {player.overall}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase text-white/40 tracking-wider italic">{player.position}</p>
          <div className="flex items-center gap-1 mt-1">
             <span className={`text-[8px] font-black uppercase italic ${tierInfo.color}`}>{tierInfo.label}</span>
             {potTier !== 'comum' && <Sparkles className={`w-2.5 h-2.5 ${tierInfo.color}`} />}
          </div>
        </div>
      </div>

      <h3 className="text-sm font-black italic text-white uppercase tracking-tighter mb-4 truncate relative z-10">{player.name}</h3>

      <div className="space-y-2 relative z-10">
        <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest">
          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Físico</span>
          <span>{player.stamina}%</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full ${player.stamina > 70 ? 'bg-emerald-400' : player.stamina > 40 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${player.stamina}%` }} />
        </div>
      </div>
    </motion.div>
  );
}
