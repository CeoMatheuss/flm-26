import { Player } from '@/types/game';
import { formatMoney } from '@/lib/formatMoney';
import { getPlayerValue } from '@/utils/playerGenerator';
import { Heart, Activity, Shield, ChevronRight, Tag, Handshake, ArrowLeftRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useAttributeEvolution } from './useAttributeEvolution';
import {
  PlayerStatus,
  statusMeta,
  ovrTier,
  getPositionColor,
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
  const sm = statusMeta[status] || statusMeta.reserva;
  
  const deltas = useAttributeEvolution([player]);
  const overallDelta = deltas[player.id]?.overall || 0;

  // Custom styling based on special statuses
  const isForSale = player.onTransferList || status === 'lista-transferencia';
  const isForLoan = player.onLoanList || status === 'lista-emprestimo';
  const isLoanedOut = player.isLoaned || status === 'emprestado';
  const isLoanedIn = player.isReceivedLoan || status === 'recebido-emprestimo';

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={cn(
        'group w-full text-left rounded-2xl border transition-all duration-300 relative overflow-hidden',
        'flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 min-h-[80px]',
        selected
          ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10',
        isForSale && 'border-emerald-500/40 bg-emerald-500/[0.03] shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]',
        isForLoan && 'border-cyan-500/40 bg-cyan-500/[0.03]',
        isLoanedIn && 'border-indigo-500/40 bg-indigo-500/[0.03]',
        isLoanedOut && 'border-zinc-500/40 bg-zinc-500/[0.03] opacity-80'
      )}
    >
      {/* Visual background highlights for special statuses */}
      {(isForSale || isForLoan || isLoanedIn) && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 pointer-events-none"
        >
          <div className={cn(
            "absolute inset-0 opacity-[0.03]",
            isForSale ? "bg-emerald-500" : isForLoan ? "bg-cyan-500" : "bg-indigo-500"
          )} />
          <div className={cn(
            "absolute top-0 left-0 w-1 h-full",
            isForSale ? "bg-emerald-500" : isForLoan ? "bg-cyan-500" : "bg-indigo-500"
          )} />
        </motion.div>
      )}

      {/* Overall Circle */}
      <div className={cn(
        'shrink-0 w-12 h-12 rounded-2xl border-2 flex flex-col items-center justify-center relative overflow-hidden',
        tier.ring, tier.glow, 'bg-zinc-950/80'
      )}>
        <div className={cn('absolute inset-0 opacity-10 bg-gradient-to-br', tier.bg)} />
        <span className={cn('text-lg font-black italic leading-none z-10 flex items-center gap-0.5', tier.color)}>
          {player.overall}
        </span>
        <span className="text-[7px] uppercase font-black tracking-widest text-white/40 mt-0.5 z-10">OVR</span>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 overflow-hidden z-10">
        <div className="flex items-center gap-2 mb-1 overflow-hidden">
          <span className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors truncate block">
            {player.name}
          </span>
          <span className="text-sm filter grayscale group-hover:grayscale-0 transition-all">{flagFor((player as any).country || player.nationality)}</span>
          {status === 'titular' && <Shield className="w-3 h-3 text-emerald-400" />}
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-bold text-white/30 uppercase tracking-widest overflow-hidden">
            <span className={cn('px-2 py-0.5 rounded-lg border', getPositionColor(player.position))}>
              {player.position}
            </span>
            <span className="shrink-0">{player.age} ANOS</span>
          </div>

          {/* Special Status Badges */}
          {isForSale && (
            <BadgeSelo label="À VENDA" color="text-emerald-400" bg="bg-emerald-500/20" icon={<Tag className="w-2 h-2" />} />
          )}
          {isForLoan && (
            <BadgeSelo label="EMPRÉSTIMO" color="text-cyan-400" bg="bg-cyan-500/20" icon={<ArrowLeftRight className="w-2 h-2" />} />
          )}
          {isLoanedIn && (
            <BadgeSelo 
              label={`EMP. RECEBIDO ${player.loanedFrom ? `(${player.loanedFrom})` : ''}`} 
              color="text-indigo-400" 
              bg="bg-indigo-500/20" 
              icon={<Handshake className="w-2 h-2" />} 
            />
          )}
          {isLoanedOut && (
            <BadgeSelo 
              label={`EMPRESTADO ${player.loanedTo ? `→ ${player.loanedTo}` : ''}`} 
              color="text-zinc-400" 
              bg="bg-zinc-500/20" 
              icon={<ArrowLeftRight className="w-2 h-2" />} 
            />
          )}
          
          {(isLoanedIn || isLoanedOut) && player.loanWeeksRemaining && (
            <span className="flex items-center gap-1 text-[8px] font-black text-white/40 uppercase">
              <Clock className="w-2 h-2" /> {player.loanWeeksRemaining} SEM
            </span>
          )}
        </div>
      </div>

      {/* Stats (Hidden on mobile) */}
      <div className="hidden lg:flex items-center gap-6 shrink-0 px-4 z-10">
        <MiniStat icon={<Activity className="w-3 h-3 text-emerald-400" />} label="FIS" value={player.stamina} />
        <MiniStat icon={<Heart className="w-3 h-3 text-pink-400" />} label="MOR" value={player.morale} />
      </div>

      {/* Market Value */}
      <div className="hidden sm:flex flex-col items-end shrink-0 min-w-[90px] sm:min-w-[110px] ml-auto overflow-hidden z-10">
        <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-[0.2em] text-white/20 whitespace-nowrap">Valor de Mercado</span>
        <span className="text-xs sm:text-sm font-black text-emerald-400 italic whitespace-nowrap">
          {formatMoney(value)}
        </span>
      </div>

      {/* Chevron */}
      <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-emerald-400 transition-all group-hover:translate-x-1 z-10" />
    </motion.button>
  );
}

function BadgeSelo({ label, color, bg, icon }: { label: string; color: string; bg: string; icon: React.ReactNode }) {
  return (
    <motion.span 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border border-white/10 shadow-sm animate-pulse',
        color, bg
      )}
    >
      {icon}
      {label}
    </motion.span>
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