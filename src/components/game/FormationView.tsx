import { Player } from '@/types/game';
import { Formation } from '@/types/tactics';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { validateLineup } from '@/utils/lineupManager';
import { getDynamicOverall } from '@/utils/positionUtils';
import { Zap, Heart, Activity, Star, TrendingUp, TrendingDown, Crown, Sparkles, ArrowRightLeft, AlertTriangle } from 'lucide-react';

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
  const starters = players.slice(0, 11);
  if (starters.length < 11) return new Array(11).fill(null);

  const categories: Record<string, Player[]> = {
    GOL: starters.filter(p => p.position === 'GOL').sort((a,b) => b.overall - a.overall),
    DEF: starters.filter(p => ['ZAG', 'LAT'].includes(p.position)).sort((a,b) => b.overall - a.overall),
    MID: starters.filter(p => ['VOL', 'MEI'].includes(p.position)).sort((a,b) => b.overall - a.overall),
    ATK: starters.filter(p => p.position === 'ATA').sort((a,b) => b.overall - a.overall)
  };

  const layout = formationLayouts[formation] || formationLayouts['4-4-2'];
  const assigned: (Player | null)[] = new Array(11).fill(null);
  
  if (categories.GOL.length > 0) assigned[0] = categories.GOL[0];

  let currentIdx = 1;
  categories.DEF.forEach(p => {
    if (currentIdx < 11) assigned[currentIdx++] = p;
  });

  categories.MID.forEach(p => {
    if (currentIdx < 11) assigned[currentIdx++] = p;
  });

  categories.ATK.forEach(p => {
    if (currentIdx < 11) assigned[currentIdx++] = p;
  });

  const allUsed = new Set(assigned.filter(Boolean).map(p => p!.id));
  const remaining = starters.filter(p => !allUsed.has(p.id));
  for (let i = 0; i < 11; i++) {
    if (!assigned[i] && remaining.length > 0) {
      assigned[i] = remaining.shift()!;
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

const posTextColors: Record<string, string> = {
  GOL: 'text-yellow-950',
  ZAG: 'text-blue-50',
  LAT: 'text-blue-50',
  VOL: 'text-emerald-50',
  MEI: 'text-orange-950',
  ATA: 'text-red-50',
};

export function FormationView({ formation, players, captainId, onPlayerClick, onSwapPlayers, isInteractive = true }: Props) {
  const [prevAssignedIds, setPrevAssignedIds] = useState<string>('');
  const [justUpdatedIds, setJustUpdatedIds] = useState<Set<string>>(new Set());
  const [pendingSwapId, setPendingSwapId] = useState<string | null>(null);
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);
  
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
    <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] xl:aspect-[16/9] mx-auto bg-[#0a1f0f] rounded-3xl overflow-hidden border-4 border-emerald-900/50 shadow-2xl select-none">
       <div className="relative w-full h-full">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grass.png')] opacity-20 pointer-events-none" />
         <div className="absolute inset-0 flex pointer-events-none">
           {[...Array(12)].map((_, i) => (
             <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-emerald-500/[0.04]' : 'bg-transparent'}`} />
           ))}
         </div>
         <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/40 via-transparent to-emerald-950/40 pointer-events-none" />
         <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.6)] pointer-events-none" />
         <div className="absolute inset-2 border-2 border-white/20 rounded-xl pointer-events-none">
           <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/20" />
           <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[25%] aspect-square border-2 border-white/20 rounded-full" />
           <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/40 rounded-full shadow-[0_0_15px_white]" />
           <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[16%] h-[40%] border-2 border-l-0 border-white/20 bg-white/5" />
           <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[6%] h-[20%] border-2 border-l-0 border-white/20" />
           <div className="absolute left-[11%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/40 rounded-full" />
           <div className="absolute left-[16%] top-1/2 -translate-y-1/2 w-[8%] h-[20%] border-2 border-l-0 border-white/20 rounded-r-full" />
           <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[16%] h-[40%] border-2 border-r-0 border-white/20 bg-white/5" />
           <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[6%] h-[20%] border-2 border-r-0 border-white/20" />
           <div className="absolute right-[11%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/40 rounded-full" />
           <div className="absolute right-[16%] top-1/2 -translate-y-1/2 w-[8%] h-[20%] border-2 border-r-0 border-white/20 rounded-l-full" />
           <div className="absolute -left-1 -top-1 w-8 h-8 border-2 border-white/20 rounded-full" />
           <div className="absolute -right-1 -top-1 w-8 h-8 border-2 border-white/20 rounded-full" />
           <div className="absolute -left-1 -bottom-1 w-8 h-8 border-2 border-white/20 rounded-full" />
           <div className="absolute -right-1 -bottom-1 w-8 h-8 border-2 border-white/20 rounded-full" />
         </div>

         <AnimatePresence mode="popLayout">
           {layout.map((slot, i) => {
             const player = assigned[i];
             const isCaptain = player && captainId === player.id;
             const isInjured = player?.injury;
             const isJustUpdated = player && justUpdatedIds.has(player.id);
             const isPendingSwap = player && pendingSwapId === player.id;
             const isHovered = player && hoveredPlayerId === player.id;

             const pitchX = 100 - slot.y;
             const pitchY = slot.x;

             const getStatusColor = () => {
               if (!player) return 'bg-white';
               if (player.stamina < 40 || player.morale < 40 || player.injury) return 'bg-red-500';
               if (player.stamina < 70 || player.morale < 70) return 'bg-yellow-500';
               return 'bg-emerald-500';
             };

             return (
               <motion.div
                 key={player?.id || `empty-${i}`}
                 layout
                 initial={{ scale: 0.8, opacity: 0 }}
                 animate={{ 
                   scale: 1, 
                   opacity: 1,
                   left: `${pitchX}%`, 
                   top: `${pitchY}%` 
                 }}
                 exit={{ scale: 0.8, opacity: 0 }}
                 transition={{ 
                   type: "spring", 
                   stiffness: 400, 
                   damping: 30,
                   layout: { duration: 0.3 }
                 }}
                 className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 
                   ${player ? 'cursor-pointer' : 'opacity-20'} group`}
                 onClick={() => handleSlotClick(player)}
                 onMouseEnter={() => player && setHoveredPlayerId(player.id)}
                 onMouseLeave={() => setHoveredPlayerId(null)}
               >
                 <div className="relative group/player">
                   {player && (
                     <div className={`absolute inset-0 rounded-full blur-3xl opacity-30 -z-10 transition-all duration-500
                       ${isHovered ? 'scale-150 opacity-50' : 'scale-100'}
                       ${getStatusColor()}`} 
                     />
                   )}
                   
                   <motion.div 
                     whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
                     whileTap={{ scale: 0.9 }}
                     className={`w-16 h-16 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center text-white shadow-2xl border-4 transition-all duration-300 relative z-10
                       ${isInjured ? 'bg-slate-800 grayscale border-slate-700' : (posColors[slot.position] || 'bg-slate-900')}
                       ${isCaptain ? 'border-yellow-400 ring-4 ring-yellow-400/30' : 'border-white/90'}
                       ${isJustUpdated ? 'animate-pulse ring-8 ring-primary/40' : ''}
                       ${isPendingSwap ? 'scale-110 ring-8 ring-primary border-primary shadow-[0_0_30px_rgba(var(--primary),0.6)]' : 'border-white/20'}`}
                   >
                     <div className="flex flex-col items-center -space-y-1">
                       <span className={`text-xl sm:text-4xl font-black tracking-tighter drop-shadow-md ${posTextColors[slot.position] || 'text-white'}`}>
                         {player ? getDynamicOverall(player, slot.position as Player['position']) : ''}
                       </span>
                       <span className={`text-[8px] sm:text-[14px] font-bold uppercase opacity-80 ${posTextColors[slot.position] || 'text-white'}`}>
                         {slot.position}
                       </span>
                     </div>
                     
                     <div className="absolute -top-1 -right-1 flex flex-col gap-1 z-30">
                       {player && player.position !== slot.position && player.secondaryPosition !== slot.position && (
                         <div className="bg-red-500 text-white rounded-full w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center shadow-lg border-2 border-white" title="Fora de Posição">
                           <AlertTriangle className="w-2 h-2 sm:w-3.5 sm:h-3.5" />
                         </div>
                       )}
                       {isPendingSwap && (
                         <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 sm:w-10 sm:h-10 flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary),0.8)] border-2 border-white animate-bounce">
                           <ArrowRightLeft className="w-4 h-4 sm:w-6 sm:h-6" />
                         </div>
                       )}
                       {isCaptain && !isPendingSwap && (
                         <div className="bg-yellow-400 text-yellow-950 rounded-full w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center font-black text-[10px] shadow-lg border-2 border-white">
                           <Crown className="w-3 h-3 sm:w-5 sm:h-5" />
                         </div>
                       )}
                       {player?.squadRole === 'estrela' && !isPendingSwap && (
                         <div className="bg-purple-500 text-white rounded-full w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center shadow-lg border-2 border-white">
                           <Star className="w-3 h-3 sm:w-5 sm:h-5 fill-current" />
                         </div>
                       )}
                       {player?.isYouth && !isPendingSwap && (
                         <div className="bg-blue-400 text-white rounded-full w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center shadow-lg border-2 border-white">
                           <Sparkles className="w-3 h-3 sm:w-5 sm:h-5" />
                         </div>
                       )}
                     </div>
                   </motion.div>

                   {player && (
                     <>
                       <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 sm:w-20 h-2 bg-black/40 rounded-full overflow-hidden border border-white/10 z-20">
                         <div 
                           className={`h-full transition-all duration-1000 ${player.stamina < 30 ? 'bg-red-500' : player.stamina < 70 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                           style={{ width: `${player.stamina}%` }}
                         />
                       </div>
                       
                       <div className={`absolute top-1/2 -translate-y-1/2 -left-4 sm:-left-6 p-1.5 rounded-full shadow-lg border-2 border-white z-20
                         ${player.morale > 80 ? 'bg-emerald-500' : player.morale < 40 ? 'bg-red-500' : 'bg-yellow-500'}`}>
                         <Heart className="w-3 h-3 sm:w-5 sm:h-5 text-white fill-current" />
                       </div>

                       <div className={`absolute top-1/2 -translate-y-1/2 -right-4 sm:-right-6 p-1.5 rounded-full shadow-lg border-2 border-white z-20 bg-slate-900`}>
                         {player.evolutionTrend === 'up' && <TrendingUp className="w-3 h-3 sm:w-5 sm:h-5 text-emerald-400" />}
                         {player.evolutionTrend === 'down' && <TrendingDown className="w-3 h-3 sm:w-5 sm:h-5 text-red-400" />}
                         {(player.evolutionTrend === 'stable' || !player.evolutionTrend) && <Minus className="w-3 h-3 sm:w-5 sm:h-5 text-slate-400" />}
                       </div>
                     </>
                   )}
                 </div>
                 
                 <div className={`mt-6 bg-slate-900/90 backdrop-blur-xl px-5 py-2.5 rounded-xl border-2 shadow-2xl transition-all duration-300 min-w-[100px] sm:min-w-[140px]
                   ${isPendingSwap ? 'border-primary bg-primary/20 scale-110' : 'border-white/10 group-hover:border-white/40 group-hover:bg-slate-800'}`}>
                   <p className="text-[12px] sm:text-[16px] text-white font-black text-center leading-none uppercase tracking-tighter truncate">
                     {player ? player.name.split(' ').pop() : slot.position}
                   </p>
                   {player && (
                     <div className="flex items-center justify-center gap-2 mt-2">
                       <span className="text-[9px] sm:text-[11px] text-slate-400 font-bold">#{player.shirtNumber || '--'}</span>
                       <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                       <span className="text-[9px] sm:text-[11px] text-slate-400 font-bold">{player.age} anos</span>
                     </div>
                   )}
                 </div>
               </motion.div>
             );
           })}
         </AnimatePresence>
         <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
       </div>
    </div>
  );
}
