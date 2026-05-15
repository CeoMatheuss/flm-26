import { Player } from '@/types/game';
import { Formation } from '@/types/tactics';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { validateLineup } from '@/utils/lineupManager';

interface Props {
  formation: Formation;
  players: Player[];
  captainId?: string;
  onPlayerClick?: (player: Player) => void;
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

export function FormationView({ formation, players, captainId, onPlayerClick }: Props) {
  const [prevAssignedIds, setPrevAssignedIds] = useState<string>('');
  const [justUpdatedIds, setJustUpdatedIds] = useState<Set<string>>(new Set());
  
  // Real-time validation
  useEffect(() => {
    const validation = validateLineup(players);
    if (!validation.valid) {
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

  return (
    <div className="relative w-full max-w-md mx-auto aspect-[3/4] sm:aspect-[2/3] bg-emerald-800 rounded-xl overflow-hidden border border-emerald-600/30 shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/10 to-transparent pointer-events-none" />
      
      {/* Pitch markings */}
      <div className="absolute inset-0 opacity-50">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-28 sm:h-28 border-2 border-white/20 rounded-full" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/30 rounded-full" />
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/20" />
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[55%] h-[16%] border-2 border-t-0 border-white/20 rounded-b-lg" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[55%] h-[16%] border-2 border-b-0 border-white/20 rounded-t-lg" />
      </div>

      {/* Players */}
      <AnimatePresence>
        {layout.map((slot, i) => {
          const player = assigned[i];
          const isCaptain = player && captainId === player.id;
          const isInjured = player?.injury;
          const isJustUpdated = player && justUpdatedIds.has(player.id);

          return (
            <motion.div
              key={player?.id || `empty-${i}`}
              layout
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                left: `${slot.x}%`, 
                top: `${slot.y}%` 
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ 
                type: "spring", 
                stiffness: 260, 
                damping: 20,
                layout: { duration: 0.5 }
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 ${onPlayerClick && player ? 'cursor-pointer' : ''} z-10`}
              onClick={() => onPlayerClick && player && onPlayerClick(player)}
            >
              <div className="relative group">
                {/* Glow effect for recently updated players */}
                {isJustUpdated && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 1 }}
                    className="absolute inset-0 rounded-full bg-primary/40 blur-md -z-10"
                  />
                )}
                
                <motion.div 
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${isInjured ? 'bg-slate-500' : posColors[slot.position] || 'bg-muted'} flex items-center justify-center text-white text-[10px] sm:text-[12px] font-black shadow-[0_4px_10px_rgba(0,0,0,0.3)] border-2 ${isCaptain ? 'border-yellow-400' : 'border-white/40'} ${isJustUpdated ? 'ring-2 ring-primary ring-offset-1 ring-offset-transparent animate-pulse' : ''}`}
                >
                  {player ? player.overall : '?'}
                </motion.div>
                
                {isCaptain && (
                  <span className="absolute -top-1 -right-1 text-[8px] bg-yellow-400 text-black rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold shadow-sm border border-black/10">C</span>
                )}
                {isInjured && (
                  <span className="absolute -top-1 -left-1 text-[8px] bg-red-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-sm">🏥</span>
                )}
              </div>
              
              <div className="bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-white/10">
                <p className="text-[7px] sm:text-[9px] text-white font-bold text-center leading-tight max-w-[50px] sm:max-w-[70px] truncate">
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
