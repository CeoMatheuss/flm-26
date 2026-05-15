import { Player } from '@/types/game';
import { Formation } from '@/types/tactics';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { validateLineup } from '@/utils/lineupManager';
import { Zap, Heart, Activity, Star } from 'lucide-react';

interface Props {
  formation: Formation;
  players: Player[];
  captainId?: string;
  onPlayerClick?: (player: Player) => void;
  onSwapPlayers?: (playerAId: string, playerBId: string) => void;
  isInteractive?: boolean;
}

const formationLayouts: Record<Formation, { position: string; x: number; y: number }[]> = {
  '4-4-2': [
    { position: 'GOL', x: 50, y: 88 },
    { position: 'LAT', x: 12, y: 72 }, { position: 'ZAG', x: 37, y: 72 }, { position: 'ZAG', x: 63, y: 72 }, { position: 'LAT', x: 88, y: 72 },
    { position: 'MEI', x: 12, y: 48 }, { position: 'VOL', x: 37, y: 48 }, { position: 'VOL', x: 63, y: 48 }, { position: 'MEI', x: 88, y: 48 },
    { position: 'ATA', x: 35, y: 22 }, { position: 'ATA', x: 65, y: 22 },
  ],
  '4-3-3': [
    { position: 'GOL', x: 50, y: 88 },
    { position: 'LAT', x: 12, y: 72 }, { position: 'ZAG', x: 37, y: 72 }, { position: 'ZAG', x: 63, y: 72 }, { position: 'LAT', x: 88, y: 72 },
    { position: 'VOL', x: 30, y: 50 }, { position: 'MEI', x: 50, y: 48 }, { position: 'MEI', x: 70, y: 50 },
    { position: 'ATA', x: 15, y: 22 }, { position: 'ATA', x: 50, y: 18 }, { position: 'ATA', x: 85, y: 22 },
  ],
  '4-2-3-1': [
    { position: 'GOL', x: 50, y: 88 },
    { position: 'LAT', x: 12, y: 72 }, { position: 'ZAG', x: 37, y: 72 }, { position: 'ZAG', x: 63, y: 72 }, { position: 'LAT', x: 88, y: 72 },
    { position: 'VOL', x: 35, y: 55 }, { position: 'VOL', x: 65, y: 55 },
    { position: 'MEI', x: 15, y: 38 }, { position: 'MEI', x: 50, y: 35 }, { position: 'MEI', x: 85, y: 38 },
    { position: 'ATA', x: 50, y: 18 },
  ],
  '3-5-2': [
    { position: 'GOL', x: 50, y: 88 },
    { position: 'ZAG', x: 25, y: 72 }, { position: 'ZAG', x: 50, y: 72 }, { position: 'ZAG', x: 75, y: 72 },
    { position: 'VOL', x: 15, y: 50 }, { position: 'VOL', x: 85, y: 50 },
    { position: 'MEI', x: 30, y: 42 }, { position: 'MEI', x: 50, y: 40 }, { position: 'MEI', x: 70, y: 42 },
    { position: 'ATA', x: 35, y: 20 }, { position: 'ATA', x: 65, y: 20 },
  ],
  '5-3-2': [
    { position: 'GOL', x: 50, y: 88 },
    { position: 'LAT', x: 10, y: 70 }, { position: 'ZAG', x: 30, y: 72 }, { position: 'ZAG', x: 50, y: 72 }, { position: 'ZAG', x: 70, y: 72 }, { position: 'LAT', x: 90, y: 70 },
    { position: 'VOL', x: 30, y: 48 }, { position: 'MEI', x: 50, y: 45 }, { position: 'MEI', x: 70, y: 48 },
    { position: 'ATA', x: 35, y: 20 }, { position: 'ATA', x: 65, y: 20 },
  ],
  '4-1-4-1': [
    { position: 'GOL', x: 50, y: 88 },
    { position: 'LAT', x: 12, y: 72 }, { position: 'ZAG', x: 37, y: 72 }, { position: 'ZAG', x: 63, y: 72 }, { position: 'LAT', x: 88, y: 72 },
    { position: 'VOL', x: 50, y: 58 },
    { position: 'MEI', x: 15, y: 40 }, { position: 'MEI', x: 38, y: 40 }, { position: 'MEI', x: 62, y: 40 }, { position: 'MEI', x: 85, y: 40 },
    { position: 'ATA', x: 50, y: 18 },
  ],
  '4-4-1-1': [
    { position: 'GOL', x: 50, y: 88 },
    { position: 'LAT', x: 12, y: 72 }, { position: 'ZAG', x: 37, y: 72 }, { position: 'ZAG', x: 63, y: 72 }, { position: 'LAT', x: 88, y: 72 },
    { position: 'MEI', x: 12, y: 50 }, { position: 'VOL', x: 37, y: 50 }, { position: 'VOL', x: 63, y: 50 }, { position: 'MEI', x: 88, y: 50 },
    { position: 'MEI', x: 50, y: 35 },
    { position: 'ATA', x: 50, y: 18 },
  ],
  '3-4-3': [
    { position: 'GOL', x: 50, y: 88 },
    { position: 'ZAG', x: 25, y: 72 }, { position: 'ZAG', x: 50, y: 72 }, { position: 'ZAG', x: 75, y: 72 },
    { position: 'VOL', x: 12, y: 50 }, { position: 'MEI', x: 38, y: 50 }, { position: 'MEI', x: 62, y: 50 }, { position: 'VOL', x: 88, y: 50 },
    { position: 'ATA', x: 15, y: 22 }, { position: 'ATA', x: 50, y: 18 }, { position: 'ATA', x: 85, y: 22 },
  ],
  '5-4-1': [
    { position: 'GOL', x: 50, y: 88 },
    { position: 'LAT', x: 10, y: 70 }, { position: 'ZAG', x: 30, y: 72 }, { position: 'ZAG', x: 50, y: 72 }, { position: 'ZAG', x: 70, y: 72 }, { position: 'LAT', x: 90, y: 70 },
    { position: 'MEI', x: 18, y: 48 }, { position: 'VOL', x: 40, y: 48 }, { position: 'VOL', x: 60, y: 48 }, { position: 'MEI', x: 82, y: 48 },
    { position: 'ATA', x: 50, y: 20 },
  ],
  '4-5-1': [
    { position: 'GOL', x: 50, y: 88 },
    { position: 'LAT', x: 12, y: 72 }, { position: 'ZAG', x: 37, y: 72 }, { position: 'ZAG', x: 63, y: 72 }, { position: 'LAT', x: 88, y: 72 },
    { position: 'VOL', x: 25, y: 55 }, { position: 'VOL', x: 75, y: 55 },
    { position: 'MEI', x: 15, y: 40 }, { position: 'MEI', x: 50, y: 38 }, { position: 'MEI', x: 85, y: 40 },
    { position: 'ATA', x: 50, y: 18 },
  ],
  '4-3-2-1': [
    { position: 'GOL', x: 50, y: 88 },
    { position: 'LAT', x: 12, y: 72 }, { position: 'ZAG', x: 37, y: 72 }, { position: 'ZAG', x: 63, y: 72 }, { position: 'LAT', x: 88, y: 72 },
    { position: 'VOL', x: 30, y: 55 }, { position: 'MEI', x: 50, y: 52 }, { position: 'VOL', x: 70, y: 55 },
    { position: 'MEI', x: 35, y: 38 }, { position: 'MEI', x: 65, y: 38 },
    { position: 'ATA', x: 50, y: 18 },
  ],
  '4-2-4-0': [
    { position: 'GOL', x: 50, y: 88 },
    { position: 'LAT', x: 12, y: 72 }, { position: 'ZAG', x: 37, y: 72 }, { position: 'ZAG', x: 63, y: 72 }, { position: 'LAT', x: 88, y: 72 },
    { position: 'VOL', x: 35, y: 55 }, { position: 'VOL', x: 65, y: 55 },
    { position: 'MEI', x: 15, y: 35 }, { position: 'MEI', x: 40, y: 32 }, { position: 'MEI', x: 60, y: 32 }, { position: 'MEI', x: 85, y: 35 },
  ],
  '3-4-1-2': [
    { position: 'GOL', x: 50, y: 88 },
    { position: 'ZAG', x: 25, y: 72 }, { position: 'ZAG', x: 50, y: 72 }, { position: 'ZAG', x: 75, y: 72 },
    { position: 'VOL', x: 15, y: 52 }, { position: 'MEI', x: 38, y: 52 }, { position: 'MEI', x: 62, y: 52 }, { position: 'VOL', x: 85, y: 52 },
    { position: 'MEI', x: 50, y: 35 },
    { position: 'ATA', x: 35, y: 20 }, { position: 'ATA', x: 65, y: 20 },
  ],
  '4-1-2-1-2': [
    { position: 'GOL', x: 50, y: 88 },
    { position: 'LAT', x: 12, y: 72 }, { position: 'ZAG', x: 37, y: 72 }, { position: 'ZAG', x: 63, y: 72 }, { position: 'LAT', x: 88, y: 72 },
    { position: 'VOL', x: 50, y: 58 },
    { position: 'MEI', x: 30, y: 48 }, { position: 'MEI', x: 70, y: 48 },
    { position: 'MEI', x: 50, y: 35 },
    { position: 'ATA', x: 35, y: 20 }, { position: 'ATA', x: 65, y: 20 },
  ],
};

function assignPlayersToSlots(players: Player[], formation: Formation) {
  const layout = formationLayouts[formation];
  const starters = players.slice(0, 11);
  const available = [...starters].sort((a, b) => b.overall - a.overall);
  const assigned: (Player | null)[] = layout.map(() => null);

  for (let i = 0; i < layout.length; i++) {
    const slot = layout[i];
    const idx = available.findIndex(p => p.position === slot.position);
    if (idx >= 0) {
      assigned[i] = available[idx];
      available.splice(idx, 1);
    }
  }

  for (let i = 0; i < assigned.length; i++) {
    if (!assigned[i] && available.length > 0) {
      assigned[i] = available.shift()!;
    }
  }

  return assigned;
}

const posColors: Record<string, string> = {
  GOL: 'bg-yellow-400',
  ZAG: 'bg-blue-600',
  LAT: 'bg-blue-500',
  VOL: 'bg-emerald-500',
  MEI: 'bg-orange-500',
  ATA: 'bg-red-600',
};

export function FormationView({ formation, players, captainId, onPlayerClick, onSwapPlayers, isInteractive = true }: Props) {
  const [prevAssignedIds, setPrevAssignedIds] = useState<string>('');
  const [justUpdatedIds, setJustUpdatedIds] = useState<Set<string>>(new Set());
  const [pendingSwapId, setPendingSwapId] = useState<string | null>(null);
  
  // Real-time validation (only when we have a full lineup)
  useEffect(() => {
    if (!Array.isArray(players) || players.length < 11) return;
    const validation = validateLineup(players);
    if (!validation.valid && validation.message) {
      toast.error(validation.message, { id: 'lineup-validation' });
    }
  }, [players]);

  const layout = formationLayouts[formation];
  const assigned = assignPlayersToSlots(players, formation);
  
  const currentAssignedIds = assigned.map(p => p?.id).filter(Boolean).join(',');

  useEffect(() => {
    if (prevAssignedIds && prevAssignedIds !== currentAssignedIds) {
      const oldIds = new Set(prevAssignedIds.split(','));
      const newIds = new Set(currentAssignedIds.split(','));
      
      const changed = new Set<string>();
      newIds.forEach(id => {
        if (!oldIds.has(id)) changed.add(id);
      });
      
      if (changed.size > 0) {
        setJustUpdatedIds(changed);
        const timer = setTimeout(() => setJustUpdatedIds(new Set()), 3000);
        return () => clearTimeout(timer);
      }
    }
    setPrevAssignedIds(currentAssignedIds);
  }, [currentAssignedIds, prevAssignedIds]);

  const handleSlotClick = useCallback((player: Player | null) => {
    if (!player) return;

    if (pendingSwapId) {
      if (pendingSwapId !== player.id && onSwapPlayers) {
        onSwapPlayers(pendingSwapId, player.id);
        setPendingSwapId(null);
      } else {
        setPendingSwapId(null);
      }
    } else if (isInteractive) {
      setPendingSwapId(player.id);
    }

    if (onPlayerClick) {
      onPlayerClick(player);
    }
  }, [pendingSwapId, onSwapPlayers, onPlayerClick, isInteractive]);

  return (
    <div className="relative w-full max-w-md mx-auto aspect-[3/4] sm:aspect-[4/5] lg:aspect-[2/3] bg-[#07140b] rounded-3xl overflow-hidden border border-emerald-500/30 shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)] select-none">
      {/* Pitch Pattern (Stripes) */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-emerald-500/[0.02]' : 'bg-transparent'}`} />
        ))}
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-emerald-950/20 pointer-events-none" />
      
      {/* Pitch markings - Modern Style */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 border border-white/40 rounded-full" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/60 rounded-full shadow-[0_0_10px_white]" />
        <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-white/40" />
        
        {/* Goal Areas */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[60%] h-[18%] border border-t-0 border-white/40 rounded-b-xl bg-white/5" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[60%] h-[18%] border border-b-0 border-white/40 rounded-t-xl bg-white/5" />
        
        {/* Penalty Arcs */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[18%] w-[25%] h-[6%] border border-t-0 border-white/40 rounded-b-full" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[18%] w-[25%] h-[6%] border border-b-0 border-white/40 rounded-t-full" />
      </div>

      {/* Players */}
      <AnimatePresence mode="popLayout">
        {layout.map((slot, i) => {
          const player = assigned[i];
          const isCaptain = player && captainId === player.id;
          const isInjured = player?.injury;
          const isJustUpdated = player && justUpdatedIds.has(player.id);
          const isPendingSwap = player && pendingSwapId === player.id;

          return (
            <motion.div
              key={player?.id || `empty-${i}`}
              layout
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                left: `${slot.x}%`, 
                top: `${slot.y}%` 
              }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 25,
                layout: { duration: 0.4 }
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 ${player ? 'cursor-pointer' : ''} z-10 group`}
              onClick={() => handleSlotClick(player)}
            >
              <div className="relative">
                {/* Glow for Starters */}
                {player && (
                  <div className={`absolute inset-0 rounded-full blur-xl opacity-20 -z-10 group-hover:opacity-40 transition-opacity ${posColors[slot.position] || 'bg-white'}`} />
                )}
                
                <motion.div 
                  whileHover={{ scale: 1.1, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-lg border-2 transition-all duration-300 relative
                    ${isInjured ? 'bg-slate-700 grayscale border-slate-600' : (posColors[slot.position] || 'bg-slate-800')}
                    ${isCaptain ? 'border-yellow-400 ring-4 ring-yellow-400/20' : 'border-white/90'}
                    ${isJustUpdated ? 'animate-pulse ring-4 ring-primary/50' : ''}
                    ${isPendingSwap ? 'scale-110 ring-4 ring-primary border-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]' : 'border-white/20'}`}
                >
                  <div className="flex flex-col items-center">
                    <span className="drop-shadow-lg text-lg leading-none">{player ? player.overall : '?'}</span>
                  </div>
                </motion.div>
                
                {isCaptain && (
                  <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-yellow-400 text-black rounded-full w-4.5 h-4.5 flex items-center justify-center font-black text-[8px] shadow-lg border border-black/20 z-20"
                  >
                    C
                  </motion.div>
                )}

                {/* Status Indicators */}
                {player && (
                  <div className="absolute -bottom-1 -right-1 flex gap-0.5 z-20">
                    {player.stamina < 50 && (
                      <div className="bg-red-500 rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white/20" title="Cansado">
                        <Zap className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {isInjured && (
                      <div className="bg-slate-900 rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white/20" title="Lesionado">
                        <Activity className="w-2.5 h-2.5 text-red-500" />
                      </div>
                    )}
                    {player.morale > 80 && (
                      <div className="bg-emerald-500 rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white/20" title="Boa Forma">
                        <Star className="w-2.5 h-2.5 text-white fill-current" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className={`mt-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border shadow-sm transition-all duration-300
                ${isPendingSwap ? 'border-primary bg-primary/20' : 'border-white/10 group-hover:border-white/30'}`}>
                <p className="text-[9px] sm:text-[10px] text-white font-bold text-center leading-none uppercase tracking-wide truncate max-w-[70px] sm:max-w-[90px]">
                  {player ? player.name.split(' ').pop() : slot.position}
                </p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>

  );
}
