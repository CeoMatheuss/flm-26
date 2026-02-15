export type Formation =
  | '4-4-2' | '4-3-3' | '4-2-3-1' | '3-5-2' | '5-3-2'
  | '4-1-4-1' | '4-4-1-1' | '3-4-3' | '5-4-1' | '4-5-1'
  | '4-3-2-1' | '4-2-4-0' | '3-4-1-2' | '4-1-2-1-2';

export type PlayStyle = 'ofensivo' | 'equilibrado' | 'defensivo' | 'contra-ataque' | 'posse';
export type Pressing = 'ultra-alto' | 'alto' | 'medio' | 'baixo';
export type Tempo = 'muito-rapido' | 'rapido' | 'normal' | 'lento';
export type Marking = 'individual' | 'zona' | 'misto';
export type PassingStyle = 'curto' | 'misto' | 'longo' | 'direto';
export type DefenseLine = 'alta' | 'media' | 'baixa';
export type Width = 'estreita' | 'normal' | 'larga';

export interface PlayerInstruction {
  playerId: string;
  role: 'titular' | 'reserva';
  instruction?: 'livre' | 'manter-posicao' | 'avançar' | 'recuar' | 'marcar-homem';
}

export interface TacticsConfig {
  formation: Formation;
  playStyle: PlayStyle;
  pressing: Pressing;
  tempo: Tempo;
  marking: Marking;
  passingStyle: PassingStyle;
  defenseLine: DefenseLine;
  width: Width;
  playerInstructions: PlayerInstruction[];
  captainId?: string;
  freeKickTakerId?: string;
  penaltyTakerId?: string;
  cornerTakerId?: string;
}

export const defaultTactics: TacticsConfig = {
  formation: '4-4-2',
  playStyle: 'equilibrado',
  pressing: 'medio',
  tempo: 'normal',
  marking: 'zona',
  passingStyle: 'misto',
  defenseLine: 'media',
  width: 'normal',
  playerInstructions: [],
};

export const formationPositions: Record<Formation, Record<string, number>> = {
  '4-4-2': { GOL: 1, ZAG: 2, LAT: 2, VOL: 1, MEI: 3, ATA: 2 },
  '4-3-3': { GOL: 1, ZAG: 2, LAT: 2, VOL: 1, MEI: 2, ATA: 3 },
  '4-2-3-1': { GOL: 1, ZAG: 2, LAT: 2, VOL: 2, MEI: 3, ATA: 1 },
  '3-5-2': { GOL: 1, ZAG: 3, LAT: 0, VOL: 2, MEI: 3, ATA: 2 },
  '5-3-2': { GOL: 1, ZAG: 3, LAT: 2, VOL: 1, MEI: 2, ATA: 2 },
  '4-1-4-1': { GOL: 1, ZAG: 2, LAT: 2, VOL: 1, MEI: 4, ATA: 1 },
  '4-4-1-1': { GOL: 1, ZAG: 2, LAT: 2, VOL: 1, MEI: 3, ATA: 2 },
  '3-4-3': { GOL: 1, ZAG: 3, LAT: 0, VOL: 1, MEI: 3, ATA: 3 },
  '5-4-1': { GOL: 1, ZAG: 3, LAT: 2, VOL: 1, MEI: 3, ATA: 1 },
  '4-5-1': { GOL: 1, ZAG: 2, LAT: 2, VOL: 2, MEI: 3, ATA: 1 },
  '4-3-2-1': { GOL: 1, ZAG: 2, LAT: 2, VOL: 1, MEI: 4, ATA: 1 },
  '4-2-4-0': { GOL: 1, ZAG: 2, LAT: 2, VOL: 2, MEI: 4, ATA: 0 },
  '3-4-1-2': { GOL: 1, ZAG: 3, LAT: 0, VOL: 2, MEI: 3, ATA: 2 },
  '4-1-2-1-2': { GOL: 1, ZAG: 2, LAT: 2, VOL: 1, MEI: 3, ATA: 2 },
};

export const formationDescriptions: Record<Formation, string> = {
  '4-4-2': 'Clássica e equilibrada. Boa cobertura defensiva e ofensiva.',
  '4-3-3': 'Ofensiva com 3 atacantes. Ideal para pressão alta.',
  '4-2-3-1': 'Moderna e versátil. Forte no meio-campo.',
  '3-5-2': 'Domínio no meio com alas. Vulnerável nas laterais.',
  '5-3-2': 'Ultra defensiva. Ideal para segurar resultado.',
  '4-1-4-1': 'Compacta no meio. Boa para contra-ataques.',
  '4-4-1-1': 'Variação do 4-4-2 com meia-atacante.',
  '3-4-3': 'Muito ofensiva. Alto risco, alta recompensa.',
  '5-4-1': 'Muro defensivo. Difícil de penetrar.',
  '4-5-1': 'Controle do meio-campo. Ataque solitário.',
  '4-3-2-1': 'Árvore de Natal. Criatividade no último terço.',
  '4-2-4-0': 'Falso 9. Posse e movimentação intensa.',
  '3-4-1-2': 'Losango no meio. Jogo pelo centro.',
  '4-1-2-1-2': 'Diamante no meio. Forte nas transições.',
};

export type TacticsPreset = { name: string; config: Partial<TacticsConfig> };

export const tacticsPresets: TacticsPreset[] = [
  { name: 'Tiki-Taka', config: { formation: '4-3-3', playStyle: 'posse', pressing: 'alto', tempo: 'normal', passingStyle: 'curto', width: 'estreita' } },
  { name: 'Catenaccio', config: { formation: '5-3-2', playStyle: 'defensivo', pressing: 'baixo', tempo: 'lento', marking: 'individual', defenseLine: 'baixa' } },
  { name: 'Contra-Ataque', config: { formation: '4-4-2', playStyle: 'contra-ataque', pressing: 'medio', tempo: 'rapido', passingStyle: 'direto', defenseLine: 'baixa' } },
  { name: 'Gegenpress', config: { formation: '4-2-3-1', playStyle: 'ofensivo', pressing: 'ultra-alto', tempo: 'muito-rapido', marking: 'individual', defenseLine: 'alta' } },
  { name: 'Jogo Bonito', config: { formation: '4-3-3', playStyle: 'ofensivo', pressing: 'alto', tempo: 'rapido', passingStyle: 'curto', width: 'larga' } },
  { name: 'Retranca', config: { formation: '5-4-1', playStyle: 'defensivo', pressing: 'baixo', tempo: 'lento', defenseLine: 'baixa', width: 'estreita' } },
];
