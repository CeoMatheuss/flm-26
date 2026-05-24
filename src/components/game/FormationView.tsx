import { Player } from '@/types/game';
import { Formation } from '@/types/tactics';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { validateLineup } from '@/utils/lineupManager';
import { getDynamicOverall, positionCompatibility } from '@/utils/positionUtils';
import { Crown, AlertTriangle, ArrowRightLeft, User, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  formation: Formation;
  players: Player[];
  captainId?: string;
  onPlayerClick?: (player: Player) => void;
  onSwapPlayers?: (playerAId: string, playerBId: string) => void;
  isInteractive?: boolean;
  orientation?: 'portrait' | 'landscape';
  selectedId?: string | null;
  onSlotSelect?: (id: string | null) => void;
}

// Grid systems (x = 0-100 horizontal, y = 0-100 vertical)
const lineX: Record<number, number[]> = {
  1: [50],
  2: [25, 75],
  3: [15, 50, 85],
  4: [12, 38, 62, 88],
  5: [10, 30, 50, 70, 90],
};


const makeLine = (y: number, positions: string[]): TacticalSlot[] => {
  const xs = lineX[positions.length] || [50];
  return positions.map((position, index) => ({ position, x: xs[index], y }));
};

const makeLayout = (lines: TacticalSlot[][]): TacticalSlot[] => lines.flat();

const formationLayouts: Record<Formation, TacticalSlot[]> = {
  '4-4-2': makeLayout([
    makeLine(90, ['GOL']),
    makeLine(72, ['LAT', 'ZAG', 'ZAG', 'LAT']),
    makeLine(45, ['MEI', 'VOL', 'VOL', 'MEI']),
    makeLine(15, ['ATA', 'ATA']),
  ]),
  '4-3-3': makeLayout([
    makeLine(90, ['GOL']),
    makeLine(72, ['LAT', 'ZAG', 'ZAG', 'LAT']),
    makeLine(45, ['MEI', 'VOL', 'MEI']),
    makeLine(15, ['ATA', 'ATA', 'ATA']),
  ]),
  '4-2-3-1': makeLayout([
    makeLine(90, ['GOL']),
    makeLine(72, ['LAT', 'ZAG', 'ZAG', 'LAT']),
    makeLine(55, ['VOL', 'VOL']),
    makeLine(35, ['MEI', 'MEI', 'MEI']),
    makeLine(12, ['ATA']),
  ]),
  '3-5-2': makeLayout([
    makeLine(90, ['GOL']),
    makeLine(72, ['ZAG', 'ZAG', 'ZAG']),
    makeLine(45, ['VOL', 'MEI', 'MEI', 'MEI', 'VOL']),
    makeLine(15, ['ATA', 'ATA']),
  ]),
  '5-3-2': makeLayout([
    makeLine(90, ['GOL']),
    makeLine(72, ['LAT', 'ZAG', 'ZAG', 'ZAG', 'LAT']),
    makeLine(45, ['VOL', 'MEI', 'VOL']),
    makeLine(15, ['ATA', 'ATA']),
  ]),
  '4-1-4-1': makeLayout([
    makeLine(90, ['GOL']),
    makeLine(72, ['LAT', 'ZAG', 'ZAG', 'LAT']),
    makeLine(55, ['VOL']),
    makeLine(35, ['MEI', 'MEI', 'MEI', 'MEI']),
    makeLine(12, ['ATA']),
  ]),
  '4-4-1-1': makeLayout([
    makeLine(90, ['GOL']),
    makeLine(72, ['LAT', 'ZAG', 'ZAG', 'LAT']),
    makeLine(48, ['MEI', 'VOL', 'VOL', 'MEI']),
    makeLine(28, ['MEI']),
    makeLine(12, ['ATA']),
  ]),
  '3-4-3': makeLayout([
    makeLine(90, ['GOL']),
    makeLine(72, ['ZAG', 'ZAG', 'ZAG']),
    makeLine(45, ['VOL', 'MEI', 'MEI', 'VOL']),
    makeLine(15, ['ATA', 'ATA', 'ATA']),
  ]),
  '5-4-1': makeLayout([
    makeLine(90, ['GOL']),
    makeLine(72, ['LAT', 'ZAG', 'ZAG', 'ZAG', 'LAT']),
    makeLine(45, ['MEI', 'VOL', 'VOL', 'MEI']),
    makeLine(12, ['ATA']),
  ]),
  '4-5-1': makeLayout([
    makeLine(90, ['GOL']),
    makeLine(72, ['LAT', 'ZAG', 'ZAG', 'LAT']),
    makeLine(45, ['MEI', 'VOL', 'MEI', 'VOL', 'MEI']),
    makeLine(12, ['ATA']),
  ]),
  '4-3-2-1': makeLayout([
    makeLine(90, ['GOL']),
    makeLine(72, ['LAT', 'ZAG', 'ZAG', 'LAT']),
    makeLine(55, ['VOL', 'MEI', 'VOL']),
    makeLine(32, ['MEI', 'MEI']),
    makeLine(12, ['ATA']),
  ]),
  '4-2-4-0': makeLayout([
    makeLine(90, ['GOL']),
    makeLine(72, ['LAT', 'ZAG', 'ZAG', 'LAT']),
    makeLine(55, ['VOL', 'VOL']),
    makeLine(25, ['MEI', 'MEI', 'MEI', 'MEI']),
  ]),
  '3-4-1-2': makeLayout([
    makeLine(90, ['GOL']),
    makeLine(72, ['ZAG', 'ZAG', 'ZAG']),
    makeLine(50, ['VOL', 'MEI', 'MEI', 'VOL']),
    makeLine(30, ['MEI']),
    makeLine(12, ['ATA', 'ATA']),
  ]),
  '4-1-2-1-2': makeLayout([
    makeLine(90, ['GOL']),
    makeLine(72, ['LAT', 'ZAG', 'ZAG', 'LAT']),
    makeLine(58, ['VOL']),
    makeLine(42, ['MEI', 'MEI']),
    makeLine(28, ['MEI']),
    makeLine(12, ['ATA', 'ATA']),
  ]),
};

function assignPlayersToSlots(players: Player[], formation: Formation) {
  const starters = players.filter(p => p.squad_status === 'starter').slice(0, 11);
  if (starters.length < 11) {
    // Fallback: fill with any players if not enough starters
    const allAvailable = [...players].slice(0, 11);
    if (allAvailable.length < 11) return new Array(11).fill(null);
  }

  const layout = formationLayouts[formation] || formationLayouts['4-4-2'];
  const assigned: (Player | null)[] = new Array(11).fill(null);
  const available = new Set(starters.map(p => p.id));

  const score = (p: Player, slotPos: string) => {
    const compat = positionCompatibility[p.position]?.[slotPos] ?? 0.3;
    let s = compat * 10;
    if (p.position === slotPos) s += 5;
    if (p.secondaryPosition === slotPos) s += 2;
    return s + p.overall / 100;
  };

  const priority: Record<string, number> = { GOL: 10, LAT: 9, ZAG: 8, ATA: 7, VOL: 6, MEI: 5 };
  const slotOrder = layout
    .map((slot, idx) => ({ slot, idx }))
    .sort((a, b) => (priority[b.slot.position] ?? 0) - (priority[a.slot.position] ?? 0));

  for (const { slot, idx } of slotOrder) {
    let best: Player | null = null;
    let bestScore = -Infinity;
    for (const p of starters) {
      if (!available.has(p.id)) continue;
      const sc = score(p, slot.position);
      if (sc > bestScore) { bestScore = sc; best = p; }
    }
    if (best) {
      assigned[idx] = best;
      available.delete(best.id);
    }
  }

  return assigned;
}

const posColor: Record<string, string> = {
  GOL: 'bg-amber-400 text-amber-950',
  ZAG: 'bg-sky-600 text-white',
  LAT: 'bg-sky-500 text-white',
  VOL: 'bg-emerald-500 text-emerald-950',
  MEI: 'bg-orange-500 text-orange-950',
  ATA: 'bg-rose-600 text-white',
};

export function FormationView({
  formation,
  players,
  captainId,
  onPlayerClick,
  onSwapPlayers,
  isInteractive = true,
  orientation = 'landscape',
  selectedId = null,
  onSlotSelect,
}: Props) {
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const selected = selectedId ?? internalSelected;

  const layout = formationLayouts[formation] || formationLayouts['4-4-2'];
  const assigned = useMemo(() => assignPlayersToSlots(players, formation), [players, formation]);

  const handleSlotClick = (player: Player | null) => {
    if (!player || !isInteractive) return;
    
    if (selected && selected !== player.id) {
      if (onSwapPlayers) onSwapPlayers(selected, player.id);
      if (onSlotSelect) onSlotSelect(null); else setInternalSelected(null);
    } else {
      const next = selected === player.id ? null : player.id;
      if (onSlotSelect) onSlotSelect(next); else setInternalSelected(next);
      if (onPlayerClick) onPlayerClick(player);
    }
  };

  const isPortrait = orientation === 'portrait';

  return (
    <div className={cn(
      "relative w-full mx-auto bg-[#0a2e0f] rounded-2xl overflow-hidden border-4 border-emerald-900/60 shadow-2xl transition-all duration-500",
      isPortrait ? "aspect-[3/4] max-w-[400px]" : "aspect-[16/10] max-w-[900px]"
    )}>
      {/* Pitch Graphics */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute inset-0 flex flex-col">
          {[...Array(10)].map((_, i) => (
            <div key={i} className={cn("flex-1", i % 2 === 0 ? "bg-emerald-400/10" : "bg-transparent")} />
          ))}
        </div>
        <div className="absolute inset-0 border-2 border-white/30 m-4 rounded-sm" />
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/30 rounded-full" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[15%] border-2 border-t-0 border-white/30" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[15%] border-2 border-b-0 border-white/30" />
      </div>

      {/* Players */}
      <div className="absolute inset-0 p-8 sm:p-12">
        {layout.map((slot, i) => {
          const player = assigned[i];
          if (!player) return null;

          const isSelected = selected === player.id;
          const isCaptain = captainId === player.id;
          const dynamicOvr = getDynamicOverall(player, slot.position as Player['position']);
          
          return (
            <motion.div
              key={player.id}
              layout
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                left: `${slot.x}%`,
                top: `${slot.y}%`
              }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
              style={{ width: '60px' }}
            >
              <button
                onClick={() => handleSlotClick(player)}
                className={cn(
                  "relative group transition-all duration-300 transform",
                  isSelected ? "scale-125 z-20" : "hover:scale-110"
                )}
              >
                {/* Player Chip */}
                <div className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center shadow-lg transition-all",
                  posColor[slot.position] || "bg-zinc-800 text-white",
                  isSelected ? "border-white ring-4 ring-emerald-400" : "border-white/40",
                  player.stamina < 30 ? "grayscale-50" : ""
                )}>
                  <span className="text-xs sm:text-sm font-black tracking-tighter">
                    {dynamicOvr}
                  </span>

                  {/* Badges */}
                  {isCaptain && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 border border-zinc-900 flex items-center justify-center">
                      <Crown className="w-2.5 h-2.5 text-amber-950" />
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border border-zinc-900 flex items-center justify-center animate-pulse">
                      <ArrowRightLeft className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                {/* Name Label */}
                <div className={cn(
                  "mt-1.5 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/10 shadow-xl",
                  "transition-all duration-300 flex flex-col items-center",
                  isSelected ? "bg-emerald-950/90 border-emerald-500/50" : ""
                )}>
                  <span className="text-[7px] sm:text-[9px] font-black text-white uppercase truncate max-w-[60px] leading-tight">
                    {player.name.split(' ').pop()}
                  </span>
                  <span className="text-[6px] font-bold text-white/40 uppercase tracking-tighter">
                    {slot.position}
                  </span>
                </div>

                {/* Stamina Bar */}
                <div className="mt-1 w-full h-[2px] bg-black/30 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${player.stamina}%` }}
                    className={cn(
                      "h-full",
                      player.stamina > 70 ? "bg-emerald-400" : player.stamina > 40 ? "bg-amber-400" : "bg-rose-500"
                    )}
                  />
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
