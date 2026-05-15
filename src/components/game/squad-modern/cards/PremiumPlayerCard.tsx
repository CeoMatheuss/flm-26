import { Player } from '@/types/game';
import { motion } from 'framer-motion';
import { Zap, Heart, Shield, TrendingUp, Star, Award, MapPin, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ovrTier, positionColors, flagFor, getPlayerStatus, statusMeta } from '../squadHelpers';
import { useAttributeEvolution } from '../useAttributeEvolution';

interface Props {
  player: Player;
  isStarter: boolean;
  selected: boolean;
  onClick: () => void;
}

export function PremiumPlayerCard({ player, isStarter, selected, onClick }: Props) {
  const tier = ovrTier(player.overall);
  const status = getPlayerStatus(player, isStarter);
  const sm = statusMeta[status];
  
  const deltas = useAttributeEvolution([player]);
  const overallDelta = deltas[player.id]?.overall || 0;

  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative w-full aspect-[2/3] rounded-[2rem] overflow-hidden group transition-all duration-300',
        'border-2 shadow-2xl',
        selected 
          ? 'border-emerald-500 shadow-emerald-500/20' 
          : 'border-white/10 hover:border-white/30 bg-zinc-900/40 backdrop-blur-md'
      )}
    >
      {/* Dynamic Background Gradient */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-20 group-hover:opacity-30 transition-opacity',
        tier.bg
      )} />

      {/* Decorative Elements */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all" />

      {/* Card Content */}
      <div className="relative h-full flex flex-col p-4 z-10">
        {/* Top Section: OVR & Position */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col items-center">
            <div className={cn(
              'text-3xl font-black italic leading-none tracking-tighter drop-shadow-lg flex items-center gap-0.5',
              tier.color
            )}>
              {player.overall}
              {overallDelta !== 0 && (
                <span className="flex items-center animate-in fade-in zoom-in duration-500">
                  {overallDelta > 0 
                    ? <ArrowUp className="w-3 h-3 text-emerald-400 fill-emerald-400/20" /> 
                    : <ArrowDown className="w-3 h-3 text-red-400 fill-red-400/20" />}
                </span>
              )}
            </div>
            <div className={cn(
              'mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border',
              positionColors[player.position]
            )}>
              {player.position}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
             <span className="text-xl filter drop-shadow-md">{flagFor((player as any).country)}</span>
             {isStarter && (
               <div className="bg-emerald-500/20 p-1 rounded-lg border border-emerald-500/30">
                 <Shield className="w-3 h-3 text-emerald-400" />
               </div>
             )}
          </div>
        </div>

        {/* Name - Big and Bold */}
        <div className="mt-auto mb-4">
          <h3 className="text-lg font-black italic text-white uppercase tracking-tighter leading-none truncate group-hover:text-emerald-300 transition-colors">
            {player.name.split(' ').pop()}
          </h3>
          <p className="text-[10px] text-white/40 font-bold truncate mt-1">
            {player.name}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatMini icon={<Zap className="w-2.5 h-2.5" />} label="STAM" value={player.stamina} color="text-emerald-400" />
          <StatMini icon={<Heart className="w-2.5 h-2.5" />} label="MOR" value={player.morale} color="text-pink-400" />
        </div>

        {/* Bottom Status Bar */}
        <div className={cn(
          'mt-auto flex items-center justify-center gap-1.5 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest',
          sm.bg, sm.border, sm.color
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full', sm.dot)} />
          {sm.label}
        </div>
      </div>
    </motion.button>
  );
}

function StatMini({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-[8px] font-black text-white/30 uppercase tracking-tighter">
        {icon} {label}
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          className={cn('h-full rounded-full bg-current', color.replace('text', 'bg'))} 
        />
      </div>
      <span className={cn('text-[9px] font-black tabular-nums', color)}>{value}</span>
    </div>
  );
}
