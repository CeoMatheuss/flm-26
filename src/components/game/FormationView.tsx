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
    { position: 'GOL', x: 50, y: 90 },
    { position: 'LAT', x: 15, y: 70 }, { position: 'ZAG', x: 38, y: 72 }, { position: 'ZAG', x: 62, y: 72 }, { position: 'LAT', x: 85, y: 70 },
    { position: 'MEI', x: 15, y: 45 }, { position: 'VOL', x: 38, y: 48 }, { position: 'VOL', x: 62, y: 48 }, { position: 'MEI', x: 85, y: 45 },
    { position: 'ATA', x: 35, y: 20 }, { position: 'ATA', x: 65, y: 20 },
  ],
  '4-3-3': [
    { position: 'GOL', x: 50, y: 90 },
    { position: 'LAT', x: 15, y: 70 }, { position: 'ZAG', x: 38, y: 72 }, { position: 'ZAG', x: 62, y: 72 }, { position: 'LAT', x: 85, y: 70 },
    { position: 'VOL', x: 30, y: 48 }, { position: 'MEI', x: 50, y: 45 }, { position: 'MEI', x: 70, y: 48 },
    { position: 'ATA', x: 20, y: 20 }, { position: 'ATA', x: 50, y: 15 }, { position: 'ATA', x: 80, y: 20 },
  ],
  '4-2-3-1': [
    { position: 'GOL', x: 50, y: 90 },
    { position: 'LAT', x: 15, y: 70 }, { position: 'ZAG', x: 38, y: 72 }, { position: 'ZAG', x: 62, y: 72 }, { position: 'LAT', x: 85, y: 70 },
    { position: 'VOL', x: 35, y: 55 }, { position: 'VOL', x: 65, y: 55 },
    { position: 'MEI', x: 20, y: 38 }, { position: 'MEI', x: 50, y: 35 }, { position: 'MEI', x: 80, y: 38 },
    { position: 'ATA', x: 50, y: 15 },
  ],
  '3-5-2': [
    { position: 'GOL', x: 50, y: 90 },
    { position: 'ZAG', x: 25, y: 72 }, { position: 'ZAG', x: 50, y: 74 }, { position: 'ZAG', x: 75, y: 72 },
    { position: 'VOL', x: 15, y: 50 }, { position: 'VOL', x: 85, y: 50 },
    { position: 'MEI', x: 30, y: 42 }, { position: 'MEI', x: 50, y: 40 }, { position: 'MEI', x: 70, y: 42 },
    { position: 'ATA', x: 35, y: 18 }, { position: 'ATA', x: 65, y: 18 },
  ],
  '5-3-2': [
    { position: 'GOL', x: 50, y: 90 },
    { position: 'LAT', x: 10, y: 68 }, { position: 'ZAG', x: 30, y: 72 }, { position: 'ZAG', x: 50, y: 74 }, { position: 'ZAG', x: 70, y: 72 }, { position: 'LAT', x: 90, y: 68 },
    { position: 'VOL', x: 30, y: 48 }, { position: 'MEI', x: 50, y: 45 }, { position: 'MEI', x: 70, y: 48 },
    { position: 'ATA', x: 35, y: 18 }, { position: 'ATA', x: 65, y: 18 },
  ],
  '4-1-4-1': [
    { position: 'GOL', x: 50, y: 90 },
    { position: 'LAT', x: 15, y: 70 }, { position: 'ZAG', x: 38, y: 72 }, { position: 'ZAG', x: 62, y: 72 }, { position: 'LAT', x: 85, y: 70 },
    { position: 'VOL', x: 50, y: 58 },
    { position: 'MEI', x: 15, y: 40 }, { position: 'MEI', x: 38, y: 38 }, { position: 'MEI', x: 62, y: 38 }, { position: 'MEI', x: 85, y: 40 },
    { position: 'ATA', x: 50, y: 15 },
  ],
  '4-4-1-1': [
    { position: 'GOL', x: 50, y: 90 },
    { position: 'LAT', x: 15, y: 70 }, { position: 'ZAG', x: 38, y: 72 }, { position: 'ZAG', x: 62, y: 72 }, { position: 'LAT', x: 85, y: 70 },
    { position: 'MEI', x: 15, y: 48 }, { position: 'VOL', x: 38, y: 50 }, { position: 'VOL', x: 62, y: 50 }, { position: 'MEI', x: 85, y: 48 },
    { position: 'MEI', x: 50, y: 32 },
    { position: 'ATA', x: 50, y: 15 },
  ],
  '3-4-3': [
    { position: 'GOL', x: 50, y: 90 },
    { position: 'ZAG', x: 25, y: 72 }, { position: 'ZAG', x: 50, y: 74 }, { position: 'ZAG', x: 75, y: 72 },
    { position: 'VOL', x: 15, y: 50 }, { position: 'MEI', x: 38, y: 48 }, { position: 'MEI', x: 62, y: 48 }, { position: 'VOL', x: 85, y: 50 },
    { position: 'ATA', x: 20, y: 20 }, { position: 'ATA', x: 50, y: 15 }, { position: 'ATA', x: 80, y: 20 },
  ],
  '5-4-1': [
    { position: 'GOL', x: 50, y: 90 },
    { position: 'LAT', x: 10, y: 68 }, { position: 'ZAG', x: 30, y: 72 }, { position: 'ZAG', x: 50, y: 74 }, { position: 'ZAG', x: 70, y: 72 }, { position: 'LAT', x: 90, y: 68 },
    { position: 'MEI', x: 18, y: 45 }, { position: 'VOL', x: 40, y: 48 }, { position: 'VOL', x: 60, y: 48 }, { position: 'MEI', x: 82, y: 45 },
    { position: 'ATA', x: 50, y: 15 },
  ],
  '4-5-1': [
    { position: 'GOL', x: 50, y: 90 },
    { position: 'LAT', x: 15, y: 70 }, { position: 'ZAG', x: 38, y: 72 }, { position: 'ZAG', x: 62, y: 72 }, { position: 'LAT', x: 85, y: 70 },
    { position: 'VOL', x: 25, y: 52 }, { position: 'VOL', x: 75, y: 52 },
    { position: 'MEI', x: 15, y: 38 }, { position: 'MEI', x: 50, y: 35 }, { position: 'MEI', x: 85, y: 38 },
    { position: 'ATA', x: 50, y: 15 },
  ],
  '4-3-2-1': [
    { position: 'GOL', x: 50, y: 90 },
    { position: 'LAT', x: 15, y: 70 }, { position: 'ZAG', x: 38, y: 72 }, { position: 'ZAG', x: 62, y: 72 }, { position: 'LAT', x: 85, y: 70 },
    { position: 'VOL', x: 30, y: 55 }, { position: 'MEI', x: 50, y: 52 }, { position: 'VOL', x: 70, y: 55 },
    { position: 'MEI', x: 35, y: 35 }, { position: 'MEI', x: 65, y: 35 },
    { position: 'ATA', x: 50, y: 15 },
  ],
  '4-2-4-0': [
    { position: 'GOL', x: 50, y: 90 },
    { position: 'LAT', x: 15, y: 70 }, { position: 'ZAG', x: 38, y: 72 }, { position: 'ZAG', x: 62, y: 72 }, { position: 'LAT', x: 85, y: 70 },
    { position: 'VOL', x: 35, y: 55 }, { position: 'VOL', x: 65, y: 55 },
    { position: 'MEI', x: 15, y: 30 }, { position: 'MEI', x: 40, y: 25 }, { position: 'MEI', x: 60, y: 25 }, { position: 'MEI', x: 85, y: 30 },
  ],
  '3-4-1-2': [
    { position: 'GOL', x: 50, y: 90 },
    { position: 'ZAG', x: 25, y: 72 }, { position: 'ZAG', x: 50, y: 74 }, { position: 'ZAG', x: 75, y: 72 },
    { position: 'VOL', x: 15, y: 52 }, { position: 'MEI', x: 38, y: 50 }, { position: 'MEI', x: 62, y: 50 }, { position: 'VOL', x: 85, y: 52 },
    { position: 'MEI', x: 50, y: 35 },
    { position: 'ATA', x: 35, y: 18 }, { position: 'ATA', x: 65, y: 18 },
  ],
  '4-1-2-1-2': [
    { position: 'GOL', x: 50, y: 90 },
    { position: 'LAT', x: 15, y: 70 }, { position: 'ZAG', x: 38, y: 72 }, { position: 'ZAG', x: 62, y: 72 }, { position: 'LAT', x: 85, y: 70 },
    { position: 'VOL', x: 50, y: 58 },
    { position: 'MEI', x: 30, y: 45 }, { position: 'MEI', x: 70, y: 45 },
    { position: 'MEI', x: 50, y: 32 },
    { position: 'ATA', x: 35, y: 18 }, { position: 'ATA', x: 65, y: 18 },
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
  GOL: 'bg-amber-500',
  ZAG: 'bg-blue-500',
  LAT: 'bg-sky-400',
  VOL: 'bg-emerald-500',
  MEI: 'bg-orange-400',
  ATA: 'bg-red-500',
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
    <div className="relative w-full max-w-md mx-auto aspect-[3/4] sm:aspect-[2/3] bg-[#0a1a0f] rounded-3xl overflow-hidden border border-emerald-500/20 shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)] select-none">
      {/* Premium Field Texture */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-emerald-950/40 pointer-events-none" />
      
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
                  <div className={`absolute inset-0 rounded-full blur-md opacity-40 -z-10 group-hover:opacity-80 transition-opacity ${posColors[slot.position] || 'bg-white'}`} />
                )}
                
                <motion.div 
                  whileHover={{ scale: 1.2, rotate: 5, zIndex: 50 }}
                  whileTap={{ scale: 0.9 }}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-black shadow-xl border-2 transition-all duration-300
                    ${isInjured ? 'bg-slate-700 grayscale' : (posColors[slot.position] || 'bg-slate-800')}
                    ${isCaptain ? 'border-yellow-400 ring-2 ring-yellow-400/20' : 'border-white/90'}
                    ${isJustUpdated ? 'animate-pulse ring-4 ring-primary/50' : ''}
                    ${isPendingSwap ? 'scale-125 ring-4 ring-primary border-primary shadow-[0_0_20px_rgba(var(--primary),0.6)]' : ''}`}
                >
                  <span className="drop-shadow-md">{player ? player.overall : '?'}</span>
                </motion.div>
                
                {isCaptain && (
                  <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-yellow-400 text-black rounded-full w-4 h-4 flex items-center justify-center font-black text-[9px] shadow-lg border border-black/20"
                  >
                    C
                  </motion.div>
                )}

                {/* Status Indicators */}
                {player && (
                  <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                    {player.stamina < 50 && (
                      <div className="bg-red-500 rounded-full w-3 h-3 flex items-center justify-center shadow-lg border border-white/20">
                        <Zap className="w-2 h-2 text-white" />
                      </div>
                    )}
                    {player.morale < 50 && (
                      <div className="bg-amber-500 rounded-full w-3 h-3 flex items-center justify-center shadow-lg border border-white/20">
                        <Heart className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className={`bg-slate-900/90 backdrop-blur-md px-2 py-0.5 rounded-full border shadow-lg min-w-[50px] transition-all duration-300
                ${isPendingSwap ? 'border-primary bg-primary/20 scale-110' : 'border-white/20 group-hover:border-primary/50'}`}>
                <p className="text-[8px] sm:text-[10px] text-white font-black text-center leading-none uppercase tracking-tighter truncate max-w-[60px] sm:max-w-[80px]">
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
