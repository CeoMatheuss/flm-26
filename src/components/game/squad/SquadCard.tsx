import { Player, personalityLabels } from '@/types/game';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Heart, TrendingUp, TrendingDown, Target, Activity, Star, Repeat } from 'lucide-react';
import { motion } from 'framer-motion';
import { getPlayerValue } from '@/utils/playerGenerator';
import { formatMoney } from '@/lib/formatMoney';

interface SquadCardProps {
  player: Player;
  onClick?: () => void;
  onSwap?: (player: Player) => void;
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

export function SquadCard({ player, onClick, onSwap, isPendingSwap }: SquadCardProps) {
  const value = getPlayerValue(player);
  
  // Simulated evolution data
  const isEvolving = player.overall > (player.potential || 0) * 0.9 && player.age < 25;
  const isDeclining = player.age > 33;
  
  // Simulated chemistry/form
  const chemistry = Math.round(70 + (player.morale / 10) + (player.stamina / 20));
  const form = player.matchRating || 6.5;

  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -1 }}
      className={`relative group cursor-pointer overflow-hidden rounded-2xl border bg-slate-900/60 backdrop-blur-md p-4 transition-all duration-300 w-full
        ${isPendingSwap ? 'border-primary ring-2 ring-primary/50 animate-pulse shadow-[0_0_20px_rgba(var(--primary),0.3)]' : 'border-white/5 hover:border-white/20 hover:shadow-2xl hover:shadow-primary/10'}`}
    >
      {/* Background Glow */}
      <div className="absolute -right-20 -top-20 w-40 h-40 bg-primary/5 blur-3xl rounded-full group-hover:bg-primary/10 transition-colors" />
      
      <div className="flex flex-col md:flex-row items-center gap-4 relative z-10">
        {/* Left Side: Photo & OVR */}
        <div className="flex items-center gap-4 shrink-0" onClick={onClick}>
          <div className="relative">
            <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border-2 shadow-lg backdrop-blur-xl relative overflow-hidden ${posColors[player.position]}`}>
              {/* Photo placeholder */}
              <div className="absolute inset-0 opacity-10 bg-gradient-to-t from-black to-transparent" />
              <span className="text-3xl font-black leading-none drop-shadow-lg">{player.overall}</span>
              <span className="text-[8px] font-black opacity-70 uppercase tracking-widest mt-0.5">OVR</span>
            </div>
            {player.injury && (
              <div className="absolute -top-1 -left-1 bg-red-500 rounded-full p-1 shadow-lg ring-2 ring-slate-900 z-20">
                <Activity className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 z-20">
               {isEvolving ? (
                <div className="bg-emerald-500 rounded-full p-0.5 shadow-lg border border-white/20" title="Evoluindo">
                  <TrendingUp className="w-3 h-3 text-white" />
                </div>
              ) : isDeclining ? (
                <div className="bg-red-500 rounded-full p-0.5 shadow-lg border border-white/20" title="Declinando">
                  <TrendingDown className="w-3 h-3 text-white" />
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] font-black tracking-tighter uppercase px-2 py-0 border-2 ${posColors[player.position]}`}>
                {player.position}
              </Badge>
              {player.shirtNumber && (
                <span className="text-xs font-mono font-black text-white/40">#{player.shirtNumber}</span>
              )}
              {player.position !== 'GOL' && player.attributes.goalkeeping && player.attributes.goalkeeping > 40 && (
                 <Badge variant="outline" className="text-[8px] bg-red-500/20 text-red-400 border-red-500/30 font-black uppercase">Fora de Posição</Badge>
              )}
              {player.age < 21 && player.potential && player.potential >= 88 && (
                 <Badge variant="outline" className="text-[8px] bg-amber-500/20 text-amber-400 border-amber-500/30 font-black uppercase">💎 Joia</Badge>
              )}
            </div>
            <h3 className="text-base font-black text-white uppercase italic tracking-tighter truncate max-w-[140px]">{player.name}</h3>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-white/40 uppercase">{player.age} anos</span>
               {player.personality && <span className="text-xs" title={personalityLabels[player.personality].label}>{personalityLabels[player.personality].emoji}</span>}
            </div>
          </div>
        </div>

        {/* Middle: Stats Grid */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full" onClick={onClick}>
          {/* Energy */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-white/30">
              <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400" /> Energia</span>
              <span className={getStatusColor(player.stamina)}>{player.stamina}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${player.stamina}%` }}
                className={`h-full ${getBarColor(player.stamina)} shadow-[0_0_8px_rgba(var(--primary),0.5)]`}
              />
            </div>
          </div>

          {/* Morale */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-white/30">
              <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" /> Moral</span>
              <span className={getStatusColor(player.morale)}>{player.morale}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${player.morale}%` }}
                className={`h-full ${getBarColor(player.morale)} shadow-[0_0_8px_rgba(var(--primary),0.5)]`}
              />
            </div>
          </div>

          {/* Form / Rating */}
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Star className="w-3 h-3 text-primary" /> Forma
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-black ${form >= 7.5 ? 'text-emerald-400' : form >= 6.5 ? 'text-primary' : 'text-red-400'}`}>
                {form.toFixed(1)}
              </span>
              <div className="flex gap-0.5">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= (form - 5) ? 'bg-primary' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Chemistry */}
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Target className="w-3 h-3 text-cyan-400" /> Entros.
            </span>
            <span className="text-sm font-black text-white/90">{chemistry}%</span>
          </div>
        </div>

        {/* Right Side: Price & Swap Button */}
        <div className="flex flex-row md:flex-col items-center justify-between md:justify-center gap-3 w-full md:w-auto md:min-w-[120px] border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-4">
          <div className="flex flex-col items-start md:items-center">
            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Valor</span>
            <span className="text-sm font-black text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.3)]">{formatMoney(value)}</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (onSwap) onSwap(player);
            }}
            className="h-9 px-4 text-xs font-black uppercase tracking-tighter gap-2 rounded-xl border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:scale-105 active:scale-95 transition-all group/btn shadow-lg"
          >
            <Repeat className="w-3.5 h-3.5 group-hover/btn:rotate-180 transition-transform duration-500" />
            <span>Trocar Jogador</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
