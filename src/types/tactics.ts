export type Formation = '4-4-2' | '4-3-3' | '4-2-3-1' | '3-5-2' | '5-3-2';

export interface TacticsConfig {
  formation: Formation;
  playStyle: 'ofensivo' | 'equilibrado' | 'defensivo';
  pressing: 'alto' | 'medio' | 'baixo';
  tempo: 'rapido' | 'normal' | 'lento';
}

export const defaultTactics: TacticsConfig = {
  formation: '4-4-2',
  playStyle: 'equilibrado',
  pressing: 'medio',
  tempo: 'normal',
};

export const formationPositions: Record<Formation, Record<string, number>> = {
  '4-4-2': { GOL: 1, ZAG: 2, LAT: 2, VOL: 1, MEI: 3, ATA: 2 },
  '4-3-3': { GOL: 1, ZAG: 2, LAT: 2, VOL: 1, MEI: 2, ATA: 3 },
  '4-2-3-1': { GOL: 1, ZAG: 2, LAT: 2, VOL: 2, MEI: 3, ATA: 1 },
  '3-5-2': { GOL: 1, ZAG: 3, LAT: 0, VOL: 2, MEI: 3, ATA: 2 },
  '5-3-2': { GOL: 1, ZAG: 3, LAT: 2, VOL: 1, MEI: 2, ATA: 2 },
};
