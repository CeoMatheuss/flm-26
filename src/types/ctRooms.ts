export interface CTRoom {
  id: string;
  name: string;
  icon: string;
  description: string;
  level: number;
  maxLevel: number;
  effect: string;
  cost: number[];
}

export interface CTRooms {
  gym: number;        // Musculação - boost físico
  pool: number;       // Piscina - recuperação stamina
  cryotherapy: number; // Crioterapia - reduz lesões
  videoRoom: number;  // Sala de Vídeo - boost tático
  nutrition: number;  // Nutrição - boost geral
  meditation: number; // Meditação - boost moral
}

export const defaultCTRooms: CTRooms = {
  gym: 0,
  pool: 0,
  cryotherapy: 0,
  videoRoom: 0,
  nutrition: 0,
  meditation: 0,
};

export const ctRoomDefinitions: Record<keyof CTRooms, { name: string; icon: string; description: string; effect: string; costs: number[] }> = {
  gym: {
    name: 'Musculação',
    icon: '🏋️',
    description: 'Melhora o atributo Físico dos jogadores',
    effect: '+1 Físico por nível a cada treino',
    costs: [500000, 1500000, 3000000, 6000000, 12000000],
  },
  pool: {
    name: 'Piscina',
    icon: '🏊',
    description: 'Recuperação mais rápida de stamina após jogos',
    effect: '+3 stamina por nível após partida',
    costs: [400000, 1200000, 2500000, 5000000, 10000000],
  },
  cryotherapy: {
    name: 'Crioterapia',
    icon: '🧊',
    description: 'Reduz chance e duração de lesões',
    effect: '-5% chance de lesão por nível',
    costs: [800000, 2000000, 4000000, 8000000, 15000000],
  },
  videoRoom: {
    name: 'Sala de Vídeo',
    icon: '📺',
    description: 'Melhora posicionamento e visão tática',
    effect: '+1 Posicionamento por nível a cada treino',
    costs: [300000, 900000, 2000000, 4000000, 8000000],
  },
  nutrition: {
    name: 'Nutrição',
    icon: '🥗',
    description: 'Jogadores evoluem mais rápido em geral',
    effect: '+5% chance de evolução por nível',
    costs: [600000, 1800000, 3500000, 7000000, 14000000],
  },
  meditation: {
    name: 'Meditação',
    icon: '🧘',
    description: 'Melhora a moral do elenco constantemente',
    effect: '+2 moral por nível após partida',
    costs: [200000, 600000, 1500000, 3000000, 6000000],
  },
};

export function getCTRoomUpgradeCost(room: keyof CTRooms, currentLevel: number): number {
  const def = ctRoomDefinitions[room];
  if (currentLevel >= def.costs.length) return 999999999;
  return def.costs[currentLevel];
}
