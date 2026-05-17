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
// Linhas horizontais com y idêntico para alinhamento perfeito.
const formationLayouts: Record<Formation, { position: string; x: number; y: number }[]> = {
  '4-4-2': [
    { position: 'GOL', x: 50, y: 93 },
    { position: 'LAT', x: 8,  y: 75 }, { position: 'ZAG', x: 34, y: 75 }, { position: 'ZAG', x: 66, y: 75 }, { position: 'LAT', x: 92, y: 75 },
    { position: 'MEI', x: 10, y: 50 }, { position: 'VOL', x: 36, y: 50 }, { position: 'VOL', x: 64, y: 50 }, { position: 'MEI', x: 90, y: 50 },
    { position: 'ATA', x: 38, y: 22 }, { position: 'ATA', x: 62, y: 22 },
  ],
  '4-3-3': [
    { position: 'GOL', x: 50, y: 93 },
    { position: 'LAT', x: 8,  y: 75 }, { position: 'ZAG', x: 34, y: 75 }, { position: 'ZAG', x: 66, y: 75 }, { position: 'LAT', x: 92, y: 75 },
    { position: 'VOL', x: 50, y: 58 },
    { position: 'MEI', x: 28, y: 46 }, { position: 'MEI', x: 72, y: 46 },
    { position: 'ATA', x: 12, y: 22 }, { position: 'ATA', x: 50, y: 14 }, { position: 'ATA', x: 88, y: 22 },
  ],
  '4-2-3-1': [
    { position: 'GOL', x: 50, y: 93 },
    { position: 'LAT', x: 8,  y: 75 }, { position: 'ZAG', x: 34, y: 75 }, { position: 'ZAG', x: 66, y: 75 }, { position: 'LAT', x: 92, y: 75 },
    { position: 'VOL', x: 36, y: 58 }, { position: 'VOL', x: 64, y: 58 },
    { position: 'MEI', x: 15, y: 36 }, { position: 'MEI', x: 50, y: 36 }, { position: 'MEI', x: 85, y: 36 },
    { position: 'ATA', x: 50, y: 14 },
  ],
  '3-5-2': [
    { position: 'GOL', x: 50, y: 93 },
    { position: 'ZAG', x: 22, y: 76 }, { position: 'ZAG', x: 50, y: 76 }, { position: 'ZAG', x: 78, y: 76 },
    { position: 'VOL', x: 8,  y: 52 }, { position: 'VOL', x: 92, y: 52 },
    { position: 'MEI', x: 28, y: 44 }, { position: 'MEI', x: 50, y: 44 }, { position: 'MEI', x: 72, y: 44 },
    { position: 'ATA', x: 38, y: 18 }, { position: 'ATA', x: 62, y: 18 },
  ],
  '5-3-2': [
    { position: 'GOL', x: 50, y: 93 },
    { position: 'LAT', x: 6,  y: 75 }, { position: 'ZAG', x: 28, y: 75 }, { position: 'ZAG', x: 50, y: 75 }, { position: 'ZAG', x: 72, y: 75 }, { position: 'LAT', x: 94, y: 75 },
    { position: 'VOL', x: 28, y: 48 }, { position: 'MEI', x: 50, y: 48 }, { position: 'VOL', x: 72, y: 48 },
    { position: 'ATA', x: 38, y: 20 }, { position: 'ATA', x: 62, y: 20 },
  ],
  '4-1-4-1': [
    { position: 'GOL', x: 50, y: 93 },
    { position: 'LAT', x: 8,  y: 75 }, { position: 'ZAG', x: 34, y: 75 }, { position: 'ZAG', x: 66, y: 75 }, { position: 'LAT', x: 92, y: 75 },
    { position: 'VOL', x: 50, y: 60 },
    { position: 'MEI', x: 10, y: 40 }, { position: 'MEI', x: 36, y: 40 }, { position: 'MEI', x: 64, y: 40 }, { position: 'MEI', x: 90, y: 40 },
    { position: 'ATA', x: 50, y: 14 },
  ],
  '4-4-1-1': [
    { position: 'GOL', x: 50, y: 93 },
    { position: 'LAT', x: 8,  y: 75 }, { position: 'ZAG', x: 34, y: 75 }, { position: 'ZAG', x: 66, y: 75 }, { position: 'LAT', x: 92, y: 75 },
    { position: 'MEI', x: 10, y: 52 }, { position: 'VOL', x: 36, y: 52 }, { position: 'VOL', x: 64, y: 52 }, { position: 'MEI', x: 90, y: 52 },
    { position: 'MEI', x: 50, y: 32 },
    { position: 'ATA', x: 50, y: 14 },
  ],
  '3-4-3': [
    { position: 'GOL', x: 50, y: 93 },
    { position: 'ZAG', x: 22, y: 76 }, { position: 'ZAG', x: 50, y: 76 }, { position: 'ZAG', x: 78, y: 76 },
    { position: 'VOL', x: 8,  y: 50 }, { position: 'MEI', x: 36, y: 50 }, { position: 'MEI', x: 64, y: 50 }, { position: 'VOL', x: 92, y: 50 },
    { position: 'ATA', x: 12, y: 22 }, { position: 'ATA', x: 50, y: 14 }, { position: 'ATA', x: 88, y: 22 },
  ],
  '5-4-1': [
    { position: 'GOL', x: 50, y: 93 },
    { position: 'LAT', x: 6,  y: 75 }, { position: 'ZAG', x: 28, y: 75 }, { position: 'ZAG', x: 50, y: 75 }, { position: 'ZAG', x: 72, y: 75 }, { position: 'LAT', x: 94, y: 75 },
    { position: 'MEI', x: 12, y: 50 }, { position: 'VOL', x: 38, y: 50 }, { position: 'VOL', x: 62, y: 50 }, { position: 'MEI', x: 88, y: 50 },
    { position: 'ATA', x: 50, y: 18 },
  ],
  '4-5-1': [
    { position: 'GOL', x: 50, y: 93 },
    { position: 'LAT', x: 8,  y: 75 }, { position: 'ZAG', x: 34, y: 75 }, { position: 'ZAG', x: 66, y: 75 }, { position: 'LAT', x: 92, y: 75 },
    { position: 'VOL', x: 28, y: 58 }, { position: 'VOL', x: 72, y: 58 },
    { position: 'MEI', x: 12, y: 38 }, { position: 'MEI', x: 50, y: 38 }, { position: 'MEI', x: 88, y: 38 },
    { position: 'ATA', x: 50, y: 14 },
  ],
  '4-3-2-1': [
    { position: 'GOL', x: 50, y: 93 },
    { position: 'LAT', x: 8,  y: 75 }, { position: 'ZAG', x: 34, y: 75 }, { position: 'ZAG', x: 66, y: 75 }, { position: 'LAT', x: 92, y: 75 },
    { position: 'VOL', x: 28, y: 58 }, { position: 'MEI', x: 50, y: 58 }, { position: 'VOL', x: 72, y: 58 },
    { position: 'MEI', x: 34, y: 36 }, { position: 'MEI', x: 66, y: 36 },
    { position: 'ATA', x: 50, y: 14 },
  ],
  '4-2-4-0': [
    { position: 'GOL', x: 50, y: 93 },
    { position: 'LAT', x: 8,  y: 75 }, { position: 'ZAG', x: 34, y: 75 }, { position: 'ZAG', x: 66, y: 75 }, { position: 'LAT', x: 92, y: 75 },
    { position: 'VOL', x: 36, y: 58 }, { position: 'VOL', x: 64, y: 58 },
    { position: 'MEI', x: 12, y: 28 }, { position: 'MEI', x: 38, y: 28 }, { position: 'MEI', x: 62, y: 28 }, { position: 'MEI', x: 88, y: 28 },
  ],
  '3-4-1-2': [
    { position: 'GOL', x: 50, y: 93 },
    { position: 'ZAG', x: 22, y: 76 }, { position: 'ZAG', x: 50, y: 76 }, { position: 'ZAG', x: 78, y: 76 },
    { position: 'VOL', x: 10, y: 54 }, { position: 'MEI', x: 36, y: 54 }, { position: 'MEI', x: 64, y: 54 }, { position: 'VOL', x: 90, y: 54 },
    { position: 'MEI', x: 50, y: 34 },
    { position: 'ATA', x: 35, y: 16 }, { position: 'ATA', x: 65, y: 16 },
  ],
  '4-1-2-1-2': [
    { position: 'GOL', x: 50, y: 93 },
    { position: 'LAT', x: 8,  y: 75 }, { position: 'ZAG', x: 34, y: 75 }, { position: 'ZAG', x: 66, y: 75 }, { position: 'LAT', x: 92, y: 75 },
    { position: 'VOL', x: 50, y: 60 },
    { position: 'MEI', x: 26, y: 46 }, { position: 'MEI', x: 74, y: 46 },
    { position: 'MEI', x: 50, y: 32 },
    { position: 'ATA', x: 35, y: 16 }, { position: 'ATA', x: 65, y: 16 },
  ],
};

function assignPlayersToSlots(players: Player[], formation: Formation) {
  const starters = players.slice(0, 11);
  if (starters.length < 11) return new Array(11).fill(null);

  const layout = formationLayouts[formation] || formationLayouts['4-4-2'];
  const assigned: (Player | null)[] = new Array(11).fill(null);
  const available = new Set(starters.map(p => p.id));

  // Score: compat real + bônus se a posição natural bate exatamente, + bônus secundária
  const score = (p: Player, slotPos: string) => {
    const compat = positionCompatibility[p.position]?.[slotPos] ?? 0.3;
    let s = compat;
    if (p.position === slotPos) s += 1.0;            // posição natural bate
    if (p.secondaryPosition === slotPos) s += 0.25;  // posição secundária bate
    return s;
  };

  // Ordem de prioridade: posições mais específicas primeiro (GOL > LAT > ZAG > ATA > VOL > MEI)
  const priority: Record<string, number> = { GOL: 6, LAT: 5, ZAG: 4, ATA: 3, VOL: 2, MEI: 1 };
  const slotOrder = layout
    .map((slot, idx) => ({ slot, idx }))
    .sort((a, b) => (priority[b.slot.position] ?? 0) - (priority[a.slot.position] ?? 0));

  // 1ª passada: atribui cada slot ao melhor jogador disponível
  for (const { slot, idx } of slotOrder) {
    let best: Player | null = null;
    let bestScore = -Infinity;
    for (const p of starters) {
      if (!available.has(p.id)) continue;
      const sc = score(p, slot.position) + p.overall / 1000; // desempate por OVR
      if (sc > bestScore) { bestScore = sc; best = p; }
    }
    if (best) {
      assigned[idx] = best;
      available.delete(best.id);
    }
  }

  // Preenche slots vazios com qualquer jogador restante
  const rest = starters.filter(p => available.has(p.id));
  for (let k = 0; k < 11; k++) if (!assigned[k] && rest.length) assigned[k] = rest.shift()!;

  // 2ª passada: dentro de slots que compartilham a MESMA posição (ex: 2 ZAG, 2 LAT, 3 MEI),
  // reordena os jogadores atribuídos por x do slot (esquerda → direita) usando OVR
  // (OVR maior tende ao centro para ZAG/MEI; para LAT/ATA mantém por OVR esquerda → direita).
  const groups = new Map<string, number[]>();
  layout.forEach((slot, idx) => {
    const key = slot.position;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(idx);
  });

  groups.forEach((indices, pos) => {
    if (indices.length < 2) return;
    const slotsSorted = [...indices].sort((a, b) => layout[a].x - layout[b].x);
    const playersInGroup = indices
      .map(i => assigned[i])
      .filter((p): p is Player => !!p);
    if (playersInGroup.length !== slotsSorted.length) return;

    // ZAG e MEI: melhor OVR no centro. LAT/ATA/VOL: ordena por OVR esquerda → direita (estável).
    let ordered: Player[];
    if (pos === 'ZAG' || pos === 'MEI') {
      const byOvr = [...playersInGroup].sort((a, b) => b.overall - a.overall);
      // distribui: melhores ao centro, piores nas pontas
      ordered = new Array(slotsSorted.length);
      let l = 0, r = slotsSorted.length - 1, take = 0;
      // preenche das pontas para o centro com os piores; melhores ficam no meio
      const reversed = [...byOvr].reverse(); // piores primeiro
      while (l <= r) {
        if (l === r) { ordered[l] = reversed[take++]; break; }
        ordered[l++] = reversed[take++];
        ordered[r--] = reversed[take++];
      }
    } else {
      ordered = [...playersInGroup].sort((a, b) => b.overall - a.overall);
    }

    slotsSorted.forEach((slotIdx, i) => { assigned[slotIdx] = ordered[i]; });
  });

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

  // Fallback: se a formação for inválida, usa 4-4-2
  const safeLayout = formationLayouts[formation] ? layout : formationLayouts['4-4-2'];

  return (
    <div
      className={cn(
        'relative w-full mx-auto bg-[#0a1f0f] overflow-visible shadow-xl select-none',
        'rounded-xl sm:rounded-2xl border-2 sm:border-[5px] border-emerald-900/40',
        isPortrait ? 'aspect-[4/5] max-w-[440px]' : 'aspect-[16/9] max-w-[1100px]'
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
        {safeLayout.map((slot, i) => {
          const player = assigned[i];

          // Insets adaptativos: garante margem suficiente para os chips e labels não cortarem nas bordas
          const INSET_X = isPortrait ? 11 : 7;
          const INSET_Y = isPortrait ? 7 : 9;
          const sx = INSET_X + (slot.x * (100 - 2 * INSET_X)) / 100;
          const sy = INSET_Y + (slot.y * (100 - 2 * INSET_Y)) / 100;
          // Em landscape: gol à esquerda (y=92 → left baixo). x do campo vira eixo vertical.
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
                  'relative rounded-full flex flex-col items-center justify-center border-2 sm:border-[3px] shadow-lg transition-all',
                  'w-6 h-6 sm:w-8 sm:h-8 lg:w-9 lg:h-9',
                  isInjured ? 'bg-slate-800 grayscale border-slate-700' : posColor[slot.position] || 'bg-slate-900 text-white',
                  adapt?.border || 'border-white/60',
                  isSelected ? 'scale-110 ring-4 ring-primary shadow-[0_0_25px_rgba(16,185,129,0.6)]' : adapt ? `ring-2 ${adapt.ring}` : ''
                )}
              >
                <span className="text-[11px] sm:text-sm font-black tracking-tighter leading-none">
                  {player ? getDynamicOverall(player, slot.position as Player['position']) : '-'}
                </span>
                <span className="text-[6px] sm:text-[8px] font-bold uppercase opacity-80 leading-none mt-0.5">
                  {slot.position}
                </span>

                {/* Badges */}
                {isCaptain && (
                  <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-yellow-400 border border-zinc-900 flex items-center justify-center">
                    <Crown className="w-2 h-2 sm:w-3 sm:h-3 text-yellow-950" />
                  </div>
                )}
                {adapt?.label === 'fora' && (
                  <div className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-red-500 border border-zinc-900 flex items-center justify-center" title="Fora de posição">
                    <AlertTriangle className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                  </div>
                )}
                {isSelected && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-primary border border-zinc-900 flex items-center justify-center animate-pulse">
                    <ArrowRightLeft className="w-2 h-2 sm:w-3 sm:h-3 text-primary-foreground" />
                  </div>
                )}
              </div>

              {player && (
                <>
                  {/* Barra de stamina */}
                  <div className="mt-0.5 sm:mt-1 w-8 sm:w-12 h-[3px] sm:h-1 bg-black/50 rounded-full overflow-hidden border border-white/10">
                    <div
                      className={cn(
                        'h-full transition-all duration-500',
                        player.stamina < 30 ? 'bg-red-500' : player.stamina < 70 ? 'bg-yellow-500' : 'bg-emerald-500'
                      )}
                      style={{ width: `${player.stamina}%` }}
                    />
                  </div>
                  {/* Nome compacto */}
                  <div className="mt-0.5 sm:mt-1 px-1 sm:px-1.5 py-0.5 rounded bg-black/70 backdrop-blur border border-white/10 max-w-[60px] sm:max-w-[110px]">
                    <p className="text-[8px] sm:text-[10px] text-white font-bold text-center leading-tight truncate">
                      {player.name.split(' ').pop()}
                    </p>
                  </div>
                  {player.morale < 40 && (
                    <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-400 mt-0.5 fill-current" />
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
