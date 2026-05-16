import { Player } from '@/types/game';
import { Formation } from '@/types/tactics';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { validateLineup } from '@/utils/lineupManager';
import { getDynamicOverall, positionCompatibility } from '@/utils/positionUtils';
import { Crown, AlertTriangle, ArrowRightLeft, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  formation: Formation;
  players: Player[];
  captainId?: string;
  onPlayerClick?: (player: Player) => void;
  onSwapPlayers?: (playerAId: string, playerBId: string) => void;
  isInteractive?: boolean;
  /** portrait = gol em baixo, ataque em cima (mobile). landscape = gol à esquerda (desktop). */
  orientation?: 'portrait' | 'landscape';
  /** id do jogador selecionado externamente (ex: para trocar com o banco) */
  selectedId?: string | null;
  /** notifica componente pai quando um slot é tocado */
  onSlotSelect?: (id: string | null) => void;
}

// Coordenadas em sistema "portrait" (x = horizontal 0-100, y = profundidade 0=ataque..100=gol)
const formationLayouts: Record<Formation, { position: string; x: number; y: number }[]> = {
  '4-4-2': [
    { position: 'GOL', x: 50, y: 92 },
    { position: 'LAT', x: 12, y: 74 }, { position: 'ZAG', x: 37, y: 76 }, { position: 'ZAG', x: 63, y: 76 }, { position: 'LAT', x: 88, y: 74 },
    { position: 'MEI', x: 12, y: 50 }, { position: 'VOL', x: 37, y: 52 }, { position: 'VOL', x: 63, y: 52 }, { position: 'MEI', x: 88, y: 50 },
    { position: 'ATA', x: 35, y: 22 }, { position: 'ATA', x: 65, y: 22 },
  ],
  '4-3-3': [
    { position: 'GOL', x: 50, y: 92 },
    { position: 'LAT', x: 12, y: 74 }, { position: 'ZAG', x: 37, y: 76 }, { position: 'ZAG', x: 63, y: 76 }, { position: 'LAT', x: 88, y: 74 },
    { position: 'VOL', x: 30, y: 52 }, { position: 'MEI', x: 50, y: 48 }, { position: 'MEI', x: 70, y: 52 },
    { position: 'ATA', x: 18, y: 22 }, { position: 'ATA', x: 50, y: 16 }, { position: 'ATA', x: 82, y: 22 },
  ],
  '4-2-3-1': [
    { position: 'GOL', x: 50, y: 92 },
    { position: 'LAT', x: 12, y: 74 }, { position: 'ZAG', x: 37, y: 76 }, { position: 'ZAG', x: 63, y: 76 }, { position: 'LAT', x: 88, y: 74 },
    { position: 'VOL', x: 35, y: 56 }, { position: 'VOL', x: 65, y: 56 },
    { position: 'MEI', x: 18, y: 36 }, { position: 'MEI', x: 50, y: 32 }, { position: 'MEI', x: 82, y: 36 },
    { position: 'ATA', x: 50, y: 14 },
  ],
  '3-5-2': [
    { position: 'GOL', x: 50, y: 92 },
    { position: 'ZAG', x: 25, y: 76 }, { position: 'ZAG', x: 50, y: 76 }, { position: 'ZAG', x: 75, y: 76 },
    { position: 'VOL', x: 12, y: 52 }, { position: 'VOL', x: 88, y: 52 },
    { position: 'MEI', x: 30, y: 44 }, { position: 'MEI', x: 50, y: 40 }, { position: 'MEI', x: 70, y: 44 },
    { position: 'ATA', x: 35, y: 18 }, { position: 'ATA', x: 65, y: 18 },
  ],
  '5-3-2': [
    { position: 'GOL', x: 50, y: 92 },
    { position: 'LAT', x: 10, y: 72 }, { position: 'ZAG', x: 30, y: 76 }, { position: 'ZAG', x: 50, y: 76 }, { position: 'ZAG', x: 70, y: 76 }, { position: 'LAT', x: 90, y: 72 },
    { position: 'VOL', x: 30, y: 50 }, { position: 'MEI', x: 50, y: 46 }, { position: 'MEI', x: 70, y: 50 },
    { position: 'ATA', x: 35, y: 18 }, { position: 'ATA', x: 65, y: 18 },
  ],
  '4-1-4-1': [
    { position: 'GOL', x: 50, y: 92 },
    { position: 'LAT', x: 12, y: 74 }, { position: 'ZAG', x: 37, y: 76 }, { position: 'ZAG', x: 63, y: 76 }, { position: 'LAT', x: 88, y: 74 },
    { position: 'VOL', x: 50, y: 60 },
    { position: 'MEI', x: 15, y: 40 }, { position: 'MEI', x: 38, y: 38 }, { position: 'MEI', x: 62, y: 38 }, { position: 'MEI', x: 85, y: 40 },
    { position: 'ATA', x: 50, y: 14 },
  ],
  '4-4-1-1': [
    { position: 'GOL', x: 50, y: 92 },
    { position: 'LAT', x: 12, y: 74 }, { position: 'ZAG', x: 37, y: 76 }, { position: 'ZAG', x: 63, y: 76 }, { position: 'LAT', x: 88, y: 74 },
    { position: 'MEI', x: 12, y: 52 }, { position: 'VOL', x: 37, y: 54 }, { position: 'VOL', x: 63, y: 54 }, { position: 'MEI', x: 88, y: 52 },
    { position: 'MEI', x: 50, y: 32 },
    { position: 'ATA', x: 50, y: 14 },
  ],
  '3-4-3': [
    { position: 'GOL', x: 50, y: 92 },
    { position: 'ZAG', x: 25, y: 76 }, { position: 'ZAG', x: 50, y: 76 }, { position: 'ZAG', x: 75, y: 76 },
    { position: 'VOL', x: 12, y: 52 }, { position: 'MEI', x: 38, y: 52 }, { position: 'MEI', x: 62, y: 52 }, { position: 'VOL', x: 88, y: 52 },
    { position: 'ATA', x: 18, y: 22 }, { position: 'ATA', x: 50, y: 16 }, { position: 'ATA', x: 82, y: 22 },
  ],
  '5-4-1': [
    { position: 'GOL', x: 50, y: 92 },
    { position: 'LAT', x: 10, y: 72 }, { position: 'ZAG', x: 30, y: 76 }, { position: 'ZAG', x: 50, y: 76 }, { position: 'ZAG', x: 70, y: 76 }, { position: 'LAT', x: 90, y: 72 },
    { position: 'MEI', x: 18, y: 50 }, { position: 'VOL', x: 40, y: 50 }, { position: 'VOL', x: 60, y: 50 }, { position: 'MEI', x: 82, y: 50 },
    { position: 'ATA', x: 50, y: 18 },
  ],
  '4-5-1': [
    { position: 'GOL', x: 50, y: 92 },
    { position: 'LAT', x: 12, y: 74 }, { position: 'ZAG', x: 37, y: 76 }, { position: 'ZAG', x: 63, y: 76 }, { position: 'LAT', x: 88, y: 74 },
    { position: 'VOL', x: 25, y: 56 }, { position: 'VOL', x: 75, y: 56 },
    { position: 'MEI', x: 15, y: 38 }, { position: 'MEI', x: 50, y: 34 }, { position: 'MEI', x: 85, y: 38 },
    { position: 'ATA', x: 50, y: 14 },
  ],
  '4-3-2-1': [
    { position: 'GOL', x: 50, y: 92 },
    { position: 'LAT', x: 12, y: 74 }, { position: 'ZAG', x: 37, y: 76 }, { position: 'ZAG', x: 63, y: 76 }, { position: 'LAT', x: 88, y: 74 },
    { position: 'VOL', x: 30, y: 56 }, { position: 'MEI', x: 50, y: 52 }, { position: 'VOL', x: 70, y: 56 },
    { position: 'MEI', x: 35, y: 36 }, { position: 'MEI', x: 65, y: 36 },
    { position: 'ATA', x: 50, y: 14 },
  ],
  '4-2-4-0': [
    { position: 'GOL', x: 50, y: 92 },
    { position: 'LAT', x: 12, y: 74 }, { position: 'ZAG', x: 37, y: 76 }, { position: 'ZAG', x: 63, y: 76 }, { position: 'LAT', x: 88, y: 74 },
    { position: 'VOL', x: 35, y: 56 }, { position: 'VOL', x: 65, y: 56 },
    { position: 'MEI', x: 15, y: 32 }, { position: 'MEI', x: 40, y: 28 }, { position: 'MEI', x: 60, y: 28 }, { position: 'MEI', x: 85, y: 32 },
  ],
  '3-4-1-2': [
    { position: 'GOL', x: 50, y: 92 },
    { position: 'ZAG', x: 25, y: 76 }, { position: 'ZAG', x: 50, y: 76 }, { position: 'ZAG', x: 75, y: 76 },
    { position: 'VOL', x: 15, y: 54 }, { position: 'MEI', x: 38, y: 54 }, { position: 'MEI', x: 62, y: 54 }, { position: 'VOL', x: 85, y: 54 },
    { position: 'MEI', x: 50, y: 32 },
    { position: 'ATA', x: 35, y: 16 }, { position: 'ATA', x: 65, y: 16 },
  ],
  '4-1-2-1-2': [
    { position: 'GOL', x: 50, y: 92 },
    { position: 'LAT', x: 12, y: 74 }, { position: 'ZAG', x: 37, y: 76 }, { position: 'ZAG', x: 63, y: 76 }, { position: 'LAT', x: 88, y: 74 },
    { position: 'VOL', x: 50, y: 60 },
    { position: 'MEI', x: 30, y: 48 }, { position: 'MEI', x: 70, y: 48 },
    { position: 'MEI', x: 50, y: 32 },
    { position: 'ATA', x: 35, y: 16 }, { position: 'ATA', x: 65, y: 16 },
  ],
};

function assignPlayersToSlots(players: Player[], formation: Formation) {
  const starters = players.slice(0, 11);
  if (starters.length < 11) return new Array(11).fill(null);

  const cats = {
    GOL: starters.filter(p => p.position === 'GOL').sort((a, b) => b.overall - a.overall),
    DEF: starters.filter(p => ['ZAG', 'LAT'].includes(p.position)).sort((a, b) => b.overall - a.overall),
    MID: starters.filter(p => ['VOL', 'MEI'].includes(p.position)).sort((a, b) => b.overall - a.overall),
    ATK: starters.filter(p => p.position === 'ATA').sort((a, b) => b.overall - a.overall),
  };

  const assigned: (Player | null)[] = new Array(11).fill(null);
  if (cats.GOL[0]) assigned[0] = cats.GOL[0];

  let i = 1;
  cats.DEF.forEach(p => { if (i < 11) assigned[i++] = p; });
  cats.MID.forEach(p => { if (i < 11) assigned[i++] = p; });
  cats.ATK.forEach(p => { if (i < 11) assigned[i++] = p; });

  const used = new Set(assigned.filter(Boolean).map(p => p!.id));
  const rest = starters.filter(p => !used.has(p.id));
  for (let k = 0; k < 11; k++) if (!assigned[k] && rest.length) assigned[k] = rest.shift()!;
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

function adaptationRing(player: Player, slotPos: string) {
  const compat = positionCompatibility[player.position]?.[slotPos] ?? 0.3;
  const isSecondary = player.secondaryPosition === slotPos;
  const eff = isSecondary ? Math.max(0.9, compat) : compat;
  if (eff >= 1.0) return { ring: 'ring-emerald-400/0', border: 'border-white/60', label: 'natural' as const };
  if (eff >= 0.85) return { ring: 'ring-amber-300/60', border: 'border-amber-300', label: 'adaptado' as const };
  if (eff >= 0.7) return { ring: 'ring-orange-400/70', border: 'border-orange-400', label: 'improvisado' as const };
  return { ring: 'ring-red-500/80', border: 'border-red-500', label: 'fora' as const };
}

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

  useEffect(() => {
    if (!Array.isArray(players) || players.length < 11) return;
    const validation = validateLineup(players);
    if (!validation.valid && validation.message) {
      toast.error(validation.message, { id: 'lineup-validation' });
    }
  }, [players]);

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
    }
    if (onPlayerClick) onPlayerClick(player);
  };

  const isPortrait = orientation === 'portrait';

  return (
    <div
      className={cn(
        'relative w-full mx-auto bg-[#0a1f0f] rounded-2xl overflow-hidden border-[5px] border-emerald-900/40 shadow-xl select-none',
        isPortrait ? 'aspect-[3/4] max-w-[440px]' : 'aspect-[16/10] max-w-3xl'
      )}
    >
      {/* Grama */}
      <div className="absolute inset-0 flex pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div key={i} className={`flex-1 ${i % 2 === 0 ? 'bg-emerald-500/[0.05]' : 'bg-transparent'}`} />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/40 via-transparent to-emerald-950/40 pointer-events-none" />
      <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.6)] pointer-events-none" />

      {/* Linhas do campo (portrait: vertical) */}
      {isPortrait ? (
        <div className="absolute inset-2 border-2 border-white/20 rounded-lg pointer-events-none">
          <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-white/20" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[28%] aspect-square border-2 border-white/20 rounded-full" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/40 rounded-full" />
          {/* Grande área inferior (gol mandante) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[18%] border-2 border-b-0 border-white/20" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[28%] h-[7%] border-2 border-b-0 border-white/20" />
          {/* Grande área superior */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[18%] border-2 border-t-0 border-white/20" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[28%] h-[7%] border-2 border-t-0 border-white/20" />
        </div>
      ) : (
        <div className="absolute inset-2 border-2 border-white/20 rounded-lg pointer-events-none">
          <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/20" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[20%] aspect-square border-2 border-white/20 rounded-full" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/40 rounded-full" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[18%] h-[44%] border-2 border-r-0 border-white/20" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[7%] h-[22%] border-2 border-r-0 border-white/20" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[18%] h-[44%] border-2 border-l-0 border-white/20" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[7%] h-[22%] border-2 border-l-0 border-white/20" />
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {layout.map((slot, i) => {
          const player = assigned[i];

          // Mapeia coordenadas: portrait usa (x, y) direto; landscape rotaciona 90°
          // Aplica inset de segurança p/ que chip + nome não vazem do campo (overflow-hidden)
          const INSET_X = 8; // % de margem lateral
          const INSET_Y = 4; // % de margem vertical
          const sx = INSET_X + (slot.x * (100 - 2 * INSET_X)) / 100;
          const sy = INSET_Y + (slot.y * (100 - 2 * INSET_Y)) / 100;
          const left = isPortrait ? sx : 100 - sy;
          const top = isPortrait ? sy : sx;

          const isCaptain = player && captainId === player.id;
          const isInjured = player?.injury;
          const isSelected = player && selected === player.id;
          const adapt = player ? adaptationRing(player, slot.position) : null;

          return (
            <motion.button
              key={player?.id || `empty-${i}`}
              type="button"
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, left: `${left}%`, top: `${top}%` }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28, layout: { duration: 0.25 } }}
              onClick={() => handleSlotClick(player)}
              className={cn(
                'absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 outline-none',
                player ? 'cursor-pointer' : 'opacity-25 pointer-events-none'
              )}
              style={{ touchAction: 'manipulation' }}
            >
              <div
                className={cn(
                  'relative rounded-full flex flex-col items-center justify-center border-[3px] shadow-lg transition-all',
                  'w-11 h-11 sm:w-14 sm:h-14 lg:w-16 lg:h-16',
                  isInjured ? 'bg-slate-800 grayscale border-slate-700' : posColor[slot.position] || 'bg-slate-900 text-white',
                  adapt?.border || 'border-white/60',
                  isSelected ? 'scale-110 ring-4 ring-primary shadow-[0_0_25px_rgba(16,185,129,0.6)]' : adapt ? `ring-2 ${adapt.ring}` : ''
                )}
              >
                <span className="text-sm sm:text-lg font-black tracking-tighter leading-none">
                  {player ? getDynamicOverall(player, slot.position as Player['position']) : '-'}
                </span>
                <span className="text-[7px] sm:text-[8px] font-bold uppercase opacity-80 leading-none mt-0.5">
                  {slot.position}
                </span>

                {/* Badges */}
                {isCaptain && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-yellow-400 border border-zinc-900 flex items-center justify-center">
                    <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-950" />
                  </div>
                )}
                {adapt?.label === 'fora' && (
                  <div className="absolute -top-1 -left-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-500 border border-zinc-900 flex items-center justify-center" title="Fora de posição">
                    <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                  </div>
                )}
                {isSelected && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary border border-zinc-900 flex items-center justify-center animate-pulse">
                    <ArrowRightLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary-foreground" />
                  </div>
                )}
              </div>

              {player && (
                <>
                  {/* Barra de stamina */}
                  <div className="mt-1 w-10 sm:w-12 h-1 bg-black/50 rounded-full overflow-hidden border border-white/10">
                    <div
                      className={cn(
                        'h-full transition-all duration-500',
                        player.stamina < 30 ? 'bg-red-500' : player.stamina < 70 ? 'bg-yellow-500' : 'bg-emerald-500'
                      )}
                      style={{ width: `${player.stamina}%` }}
                    />
                  </div>
                  {/* Nome compacto */}
                  <div className="mt-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur border border-white/10 max-w-[80px] sm:max-w-[110px]">
                    <p className="text-[9px] sm:text-[10px] text-white font-bold text-center leading-tight truncate">
                      {player.name.split(' ').pop()}
                    </p>
                  </div>
                  {player.morale < 40 && (
                    <Heart className="w-3 h-3 text-red-400 mt-0.5 fill-current" />
                  )}
                </>
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
