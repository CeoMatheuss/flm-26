import { Player } from '@/types/game';
import { formatMoney } from '@/lib/formatMoney';
import { getPlayerValue } from '@/utils/playerGenerator';
import { Heart, Activity, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
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
    <button
      onClick={onClick}
      className={cn(
        'group w-full text-left rounded-xl border transition-all duration-200',
        'flex items-center gap-3 px-3 py-2.5',
        selected
          ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-emerald-500/20',
      )}
    >
      {/* Shirt number */}
      <div className="shrink-0 w-9 h-9 rounded-lg bg-zinc-900/70 border border-white/5 flex items-center justify-center">
        <span className="text-xs font-black italic text-white/70 tracking-tighter">
          {player.shirtNumber ?? '–'}
        </span>
      </div>

      {/* Status dot + name + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', sm.dot)} />
          <span className="text-sm font-bold text-white truncate">{player.name}</span>
          <span className="text-[11px] shrink-0">{flagFor((player as any).country)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/40">
          <span className={cn('px-1.5 py-0.5 rounded border text-[9px] font-bold', positionColors[player.position])}>
            {player.position}
          </span>
          <span>{player.age}a</span>
          <span className="hidden xs:inline">•</span>
          <span className="hidden xs:inline truncate">{formatMoney(player.salary)}/sem</span>
        </div>
      </div>

      {/* Energy + Morale bars (compact) */}
      <div className="hidden sm:flex flex-col gap-1.5 w-24 shrink-0">
        <Bar
          icon={<Activity className="h-2.5 w-2.5 text-emerald-400" />}
          value={player.stamina}
          color="bg-emerald-400"
        />
        <Bar
          icon={<Heart className="h-2.5 w-2.5 text-pink-400" />}
          value={player.morale}
          color="bg-pink-400"
        />
      </div>

      {/* Status badge */}
      <div className={cn('hidden md:block px-2 py-1 rounded-md border text-[9px] font-bold uppercase tracking-wider', sm.bg, sm.border, sm.color)}>
        {sm.label}
      </div>

      {/* Market value */}
      <div className="hidden sm:flex flex-col items-end shrink-0">
        <span className="text-[9px] uppercase tracking-wider text-white/30 font-bold">Valor</span>
        <span className="text-xs font-black text-emerald-400">{formatMoney(value)}</span>
      </div>

      {/* Overall */}
      <div className={cn(
        'shrink-0 w-11 h-11 rounded-xl border-2 flex flex-col items-center justify-center',
        tier.ring, tier.glow, 'bg-zinc-950/80'
      )}>
        <span className={cn('text-base font-black italic leading-none', tier.color)}>{player.overall}</span>
        <span className="text-[7px] uppercase font-bold tracking-wider text-white/40 mt-0.5">OVR</span>
      </div>
    </button>
  );
}

function Bar({ icon, value, color }: { icon: React.ReactNode; value: number; color: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${v}%` }} />
      </div>
      <span className="text-[9px] font-bold text-white/40 w-6 text-right">{v}</span>
    </div>
  );
}
