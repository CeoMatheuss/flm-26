import { Player } from '@/types/game';
import { formatMoney } from '@/lib/formatMoney';
import { getPlayerValue } from '@/utils/playerGenerator';
import { Heart, Activity, Shield, TrendingUp, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  PlayerStatus,
  statusMeta,
  ovrTier,
  positionColors,
  flagFor,
} from './squadHelpers';

interface Props {
  player: Player;
  status: PlayerStatus;
  selected: boolean;
  onClick: () => void;
}

export function PlayerRow({ player, status, selected, onClick }: Props) {
  const value = getPlayerValue(player);
  const tier = ovrTier(player.overall);
  const sm = statusMeta[status];

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={cn(
        'group w-full text-left rounded-2xl border transition-all duration-300',
        'flex items-center gap-4 px-4 py-3',
        selected
          ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10',
      )}
    >
      {/* Overall Circle */}
      <div className={cn(
        'shrink-0 w-12 h-12 rounded-2xl border-2 flex flex-col items-center justify-center relative overflow-hidden',
        tier.ring, tier.glow, 'bg-zinc-950/80'
      )}>
        <div className={cn('absolute inset-0 opacity-10 bg-gradient-to-br', tier.bg)} />
        <span className={cn('text-lg font-black italic leading-none z-10', tier.color)}>{player.overall}</span>
        <span className="text-[7px] uppercase font-black tracking-widest text-white/40 mt-0.5 z-10">OVR</span>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors truncate">
            {player.name}
          </span>
          <span className="text-sm filter grayscale group-hover:grayscale-0 transition-all">{flagFor((player as any).country)}</span>
          {status === 'titular' && <Shield className="w-3 h-3 text-emerald-400" />}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
          <span className={cn('px-2 py-0.5 rounded-lg border', positionColors[player.position])}>
            {player.position}
          </span>
          <span>{player.age} ANOS</span>
          <span className="w-1 h-1 rounded-full bg-white/10" />
          <span className="truncate">{formatMoney(player.salary)}/SEM</span>
        </div>
      </div>

      {/* Stats (Hidden on mobile) */}
      <div className="hidden lg:flex items-center gap-6 shrink-0 px-4">
        <MiniStat icon={<Activity className="w-3 h-3 text-emerald-400" />} label="FIS" value={player.stamina} />
        <MiniStat icon={<Heart className="w-3 h-3 text-pink-400" />} label="MOR" value={player.morale} />
      </div>

      {/* Market Value */}
      <div className="hidden sm:flex flex-col items-end shrink-0 min-w-[100px]">
        <span className="text-[9px] uppercase font-black tracking-[0.2em] text-white/20">Valor de Mercado</span>
        <span className="text-sm font-black text-emerald-400 italic">
          {formatMoney(value)}
        </span>
      </div>

      {/* Chevron */}
      <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-emerald-400 transition-all group-hover:translate-x-1" />
    </motion.button>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 w-16">
      <div className="flex items-center justify-between text-[8px] font-black text-white/20 uppercase tracking-widest">
        <span>{label}</span>
        <span className="text-white/40">{value}%</span>
      </div>
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div 
          className={cn('h-full rounded-full bg-current', value > 70 ? 'text-emerald-400' : value > 40 ? 'text-amber-400' : 'text-red-400')} 
          style={{ width: `${value}%` }} 
        />
      </div>
    </div>
  );
}
