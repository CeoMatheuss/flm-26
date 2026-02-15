import { Player } from '@/types/game';
import { Formation } from '@/types/tactics';

interface Props {
  formation: Formation;
  players: Player[];
}

// Map formation to 2D positions on pitch (x%, y% from top-left)
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
};

function assignPlayersToSlots(players: Player[], formation: Formation) {
  const layout = formationLayouts[formation];
  const available = [...players].sort((a, b) => b.overall - a.overall);
  const assigned: (Player | null)[] = layout.map(() => null);

  // Assign best matching player for each slot
  for (let i = 0; i < layout.length; i++) {
    const slot = layout[i];
    const idx = available.findIndex(p => p.position === slot.position);
    if (idx >= 0) {
      assigned[i] = available[idx];
      available.splice(idx, 1);
    }
  }

  // Fill remaining slots with best available
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

export function FormationView({ formation, players }: Props) {
  const layout = formationLayouts[formation];
  const assigned = assignPlayersToSlots(players, formation);

  return (
    <div className="relative w-full aspect-[3/4] sm:aspect-[2/3] bg-emerald-800 rounded-xl overflow-hidden border border-emerald-600/30">
      {/* Pitch markings */}
      <div className="absolute inset-0">
        {/* Center circle */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-28 sm:h-28 border-2 border-emerald-600/40 rounded-full" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-600/50 rounded-full" />
        {/* Center line */}
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-emerald-600/30" />
        {/* Penalty areas */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[55%] h-[16%] border-2 border-t-0 border-emerald-600/30 rounded-b-lg" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[55%] h-[16%] border-2 border-b-0 border-emerald-600/30 rounded-t-lg" />
        {/* Goal areas */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[25%] h-[7%] border-2 border-t-0 border-emerald-600/25 rounded-b" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[25%] h-[7%] border-2 border-b-0 border-emerald-600/25 rounded-t" />
      </div>

      {/* Players */}
      {layout.map((slot, i) => {
        const player = assigned[i];
        return (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5"
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
          >
            <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full ${posColors[slot.position] || 'bg-muted'} flex items-center justify-center text-white text-[9px] sm:text-[11px] font-bold shadow-lg border-2 border-white/30`}>
              {player ? player.overall : '?'}
            </div>
            <span className="text-[7px] sm:text-[9px] text-white font-medium text-center leading-tight max-w-[50px] sm:max-w-[70px] truncate drop-shadow-md">
              {player ? player.name.split(' ').pop() : slot.position}
            </span>
          </div>
        );
      })}
    </div>
  );
}
