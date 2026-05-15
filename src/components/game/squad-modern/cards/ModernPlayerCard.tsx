import { motion } from 'framer-motion';
import { Player } from '@/types/game';
import { Zap, Heart, Shield, Activity, TrendingUp } from 'lucide-react';
import { formatMoney } from '@/lib/formatMoney';

interface ModernPlayerCardProps {
  player: Player;
  onClick: () => void;
}

export function ModernPlayerCard({ player, onClick }: ModernPlayerCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative p-4 rounded-3xl bg-[#0a0c14] border border-white/10 overflow-hidden cursor-pointer group hover:border-[#8b5cf6]/50 transition-all shadow-xl"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 font-black text-xl italic text-[#8b5cf6]">
          {player.overall}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase text-white/40 tracking-wider italic">{player.position}</p>
          <p className="text-xs font-black text-white italic tracking-tighter">#{player.shirtNumber || '00'}</p>
        </div>
      </div>

      <h3 className="text-sm font-black italic text-white uppercase tracking-tighter mb-4 truncate">{player.name}</h3>

      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest">
          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Físico</span>
          <span>{player.stamina}%</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-[#10b981]" style={{ width: `${player.stamina}%` }} />
        </div>
      </div>
    </motion.div>
  );
}
