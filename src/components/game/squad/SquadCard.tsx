import { Player } from '@/types/game';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, Heart, TrendingUp, TrendingDown, Target, Shield, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { getPlayerValue } from '@/utils/playerGenerator';
import { formatMoney } from '@/lib/formatMoney';

interface SquadCardProps {
  player: Player;
  onClick?: () => void;
  isPendingSwap?: boolean;
}

const posColors: Record<string, string> = {
  GOL: 'border-amber-500/50 text-amber-400 bg-amber-500/10',
  ZAG: 'border-blue-500/50 text-blue-400 bg-blue-500/10',
  LAT: 'border-cyan-500/50 text-cyan-400 bg-cyan-500/10',
  VOL: 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10',
  MEI: 'border-purple-500/50 text-purple-400 bg-purple-500/10',
  ATA: 'border-red-500/50 text-red-400 bg-red-500/10',
};

const getStatusColor = (val: number) => {
  if (val >= 80) return 'text-emerald-400';
  if (val >= 60) return 'text-yellow-400';
  return 'text-red-400';
};

const getBarColor = (val: number) => {
  if (val >= 80) return 'bg-emerald-500';
  if (val >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
};

export function SquadCard({ player, onClick, isPendingSwap }: SquadCardProps) {
  const value = getPlayerValue(player);
  
  // Simulated evolution data (in a real app, this would come from player history)
  const isEvolving = player.overall > (player.potential || 0) * 0.9 && player.age < 25;
  const isDeclining = player.age > 33;

  
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative group cursor-pointer overflow-hidden rounded-2xl border bg-slate-900/40 backdrop-blur-md p-3 transition-all duration-300
        ${isPendingSwap ? 'border-primary ring-2 ring-primary/50 animate-pulse' : 'border-white/5 hover:border-white/20 hover:shadow-2xl hover:shadow-primary/10'}`}
    >
      {/* Background Glow */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 blur-3xl rounded-full group-hover:bg-primary/10 transition-colors" />
      
      <div className="flex gap-4">
        {/* Left Side: OVR and Identity */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 shadow-lg backdrop-blur-xl ${posColors[player.position]}`}>
              <div className="flex items-center gap-0.5">
                <span className="text-2xl font-black leading-none">{player.overall}</span>
                {isEvolving && <ArrowUp className="w-3 h-3 text-emerald-400 animate-bounce" />}
                {isDeclining && <ArrowDown className="w-3 h-3 text-red-400 animate-bounce" />}
              </div>
              <span className="text-[8px] font-bold opacity-70 uppercase">OVR</span>
            </div>
            {player.injury && (
              <div className="absolute -top-1 -left-1 bg-red-500 rounded-full p-1 shadow-lg ring-2 ring-slate-900">
                <Activity className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <Badge variant="outline" className={`text-[9px] font-black tracking-tighter uppercase px-1.5 py-0 ${posColors[player.position]}`}>
            {player.position}
          </Badge>
          {player.shirtNumber && (
            <span className="text-[10px] font-mono font-bold text-white/30">#{player.shirtNumber}</span>
          )}
        </div>

        {/* Middle: Name and Stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="text-sm font-bold text-white truncate uppercase tracking-tight">{player.name}</h3>
            {player.age <= 21 && <span className="text-[10px]" title="Jovem Promessa">💎</span>}
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {/* Condition */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-white/40">
                <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> Físico</span>
                <span className={getStatusColor(player.stamina)}>{player.stamina}%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${player.stamina}%` }}
                  className={`h-full ${getBarColor(player.stamina)}`}
                />
              </div>
            </div>

            {/* Morale */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-white/40">
                <span className="flex items-center gap-1"><Heart className="w-2.5 h-2.5" /> Moral</span>
                <span className={getStatusColor(player.morale)}>{player.morale}%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${player.morale}%` }}
                  className={`h-full ${getBarColor(player.morale)}`}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-white/30 uppercase">Valor</span>
              <span className="text-xs font-black text-primary">{formatMoney(value)}</span>
            </div>
            <div className="flex gap-2">
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-bold text-white/30 uppercase">Salário</span>
                <span className="text-[10px] font-bold text-white/80">R${(player.salary / 1000).toFixed(0)}k</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
