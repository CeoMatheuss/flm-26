import { Player, PlayerAttributes, PlayerHistoryEntry, ScoutReport } from '@/types/game';
import { YouthProspect, getYouthMinOverall, getYouthMaxOverall } from '@/types/infrastructure';

const generateId = () => Math.random().toString(36).substr(2, 9);

const firstNames = [
  'Carlos', 'Henrique', 'Vinícius', 'Jonathan', 'Renan', 'Caio', 'Yuri', 'Danilo', 'Leandro', 'Igor',
  'Gustavo', 'Eduardo', 'Ricardo', 'Fabrício', 'Willian', 'Jean', 'Samuel', 'Otávio', 'Rogério', 'Adriano',
  'Matheus', 'Luan', 'Wesley', 'Breno', 'Kelvin', 'Ruan', 'Davi', 'Enzo', 'Miguel', 'Arthur',
  'Rafael', 'Pedro', 'Lucas', 'Felipe', 'Gabriel', 'Thiago', 'Bruno', 'André', 'Diego', 'Marcos',
  'Leonardo', 'Bernardo', 'Kauan', 'Cauã', 'João', 'Nicolas', 'Heitor', 'Theo', 'Murilo', 'Guilherme',
  'Vitor', 'Lorenzo', 'Benício', 'Joaquim', 'Antônio', 'Francisco', 'Isaac', 'Daniel', 'Davi Luiz', 'Noah',
  'Raul', 'Lucca', 'Pietro', 'Caleb', 'Gael', 'Bento', 'Levi', 'Emanuel', 'Thomas', 'Ravi',
  'Cléber', 'Neyson', 'Washington', 'Edson', 'Ronaldo', 'Rivaldo', 'Kaká', 'Romário', 'Robinho', 'Marquinhos',
  'Vanderlei', 'Jailson', 'Sidnei', 'Cássio', 'Weverton', 'Hugo', 'Fagner', 'Arana', 'Reinaldo', 'Rodinei',
  'Paulinho', 'Allan', 'Jorginho', 'Fernandinho', 'Casemiro', 'Fabinho', 'Rodrygo', 'Raphinha', 'Richarlison', 'Firmino',
];

const lastNames = [
  'Pereira', 'Araújo', 'Barbosa', 'Ribeiro', 'Martins', 'Cardoso', 'Pinto', 'Nascimento', 'Moreira', 'Teixeira',
  'Carvalho', 'Monteiro', 'Campos', 'Duarte', 'Correia', 'Freitas', 'Machado', 'Ramos', 'Vieira', 'Lopes',
  'Santos', 'Silva', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Almeida', 'Ferreira', 'Rodrigues', 'Nunes',
  'Gomes', 'Dias', 'Mendes', 'Rocha', 'Borges', 'Reis', 'Amaral', 'Melo', 'Pires', 'Tavares',
  'Fonseca', 'Castro', 'Azevedo', 'Moura', 'Barros', 'Sampaio', 'Andrade', 'Cunha', 'Batista', 'Nogueira',
  'Miranda', 'Cavalcanti', 'Vasconcelos', 'Xavier', 'Coelho', 'Alencar', 'Farias', 'Guimarães', 'Braga', 'Medeiros',
];

const randomClubNames = [
  'Atlético Mineiro', 'Flamengo', 'Palmeiras', 'São Paulo', 'Corinthians', 'Grêmio', 'Internacional', 'Cruzeiro',
  'Santos', 'Vasco', 'Botafogo', 'Fluminense', 'Bahia', 'Sport', 'Fortaleza', 'Ceará', 'Coritiba', 'Athletico-PR',
  'Goiás', 'Vitória', 'Ponte Preta', 'Guarani', 'Juventude', 'Chapecoense', 'Avaí', 'Figueirense',
];

const positions: Player['position'][] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

function randomName() {
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

function generateAttributes(position: Player['position'], overall: number): PlayerAttributes {
  const variance = () => Math.floor(Math.random() * 16 - 8);

  const base: Record<Player['position'], Omit<PlayerAttributes, 'vision' | 'crossing' | 'longShots' | 'workRate' | 'composure' | 'aggression'> & { vision: number; crossing: number; longShots: number; workRate: number; composure: number; aggression: number }> = {
    GOL: { speed: overall - 10 + variance(), shooting: overall - 20 + variance(), passing: overall - 5 + variance(), defending: overall + 5 + variance(), physical: overall + variance(), dribbling: overall - 15 + variance(), setPieces: overall - 15 + variance(), positioning: overall + 8 + variance(), heading: overall - 5 + variance(), marking: overall + variance(), vision: overall - 5 + variance(), crossing: overall - 20 + variance(), longShots: overall - 20 + variance(), workRate: overall - 5 + variance(), composure: overall + 5 + variance(), aggression: overall - 10 + variance() },
    ZAG: { speed: overall - 5 + variance(), shooting: overall - 10 + variance(), passing: overall - 3 + variance(), defending: overall + 8 + variance(), physical: overall + 5 + variance(), dribbling: overall - 8 + variance(), setPieces: overall - 8 + variance(), positioning: overall + 5 + variance(), heading: overall + 7 + variance(), marking: overall + 8 + variance(), vision: overall - 5 + variance(), crossing: overall - 10 + variance(), longShots: overall - 8 + variance(), workRate: overall + 3 + variance(), composure: overall + 3 + variance(), aggression: overall + 5 + variance() },
    LAT: { speed: overall + 5 + variance(), shooting: overall - 5 + variance(), passing: overall + 3 + variance(), defending: overall + variance(), physical: overall + variance(), dribbling: overall + 2 + variance(), setPieces: overall - 3 + variance(), positioning: overall + 2 + variance(), heading: overall - 5 + variance(), marking: overall + 3 + variance(), vision: overall + 2 + variance(), crossing: overall + 8 + variance(), longShots: overall - 5 + variance(), workRate: overall + 5 + variance(), composure: overall + variance(), aggression: overall + 2 + variance() },
    VOL: { speed: overall - 3 + variance(), shooting: overall - 5 + variance(), passing: overall + 5 + variance(), defending: overall + 5 + variance(), physical: overall + 3 + variance(), dribbling: overall - 3 + variance(), setPieces: overall + variance(), positioning: overall + 5 + variance(), heading: overall + 3 + variance(), marking: overall + 7 + variance(), vision: overall + 3 + variance(), crossing: overall - 5 + variance(), longShots: overall - 3 + variance(), workRate: overall + 5 + variance(), composure: overall + 3 + variance(), aggression: overall + 5 + variance() },
    MEI: { speed: overall + variance(), shooting: overall + 3 + variance(), passing: overall + 8 + variance(), defending: overall - 8 + variance(), physical: overall - 3 + variance(), dribbling: overall + 5 + variance(), setPieces: overall + 5 + variance(), positioning: overall + 3 + variance(), heading: overall - 3 + variance(), marking: overall - 5 + variance(), vision: overall + 8 + variance(), crossing: overall + 3 + variance(), longShots: overall + 5 + variance(), workRate: overall + variance(), composure: overall + 5 + variance(), aggression: overall - 5 + variance() },
    ATA: { speed: overall + 5 + variance(), shooting: overall + 10 + variance(), passing: overall - 3 + variance(), defending: overall - 15 + variance(), physical: overall + variance(), dribbling: overall + 5 + variance(), setPieces: overall + 3 + variance(), positioning: overall + 8 + variance(), heading: overall + 5 + variance(), marking: overall - 12 + variance(), vision: overall + 3 + variance(), crossing: overall - 5 + variance(), longShots: overall + 5 + variance(), workRate: overall + 3 + variance(), composure: overall + 5 + variance(), aggression: overall + 3 + variance() },
  };

  const attrs = base[position];
  const clamp = (v: number) => Math.max(1, Math.min(99, v));
  return {
    speed: clamp(attrs.speed),
    shooting: clamp(attrs.shooting),
    passing: clamp(attrs.passing),
    defending: clamp(attrs.defending),
    physical: clamp(attrs.physical),
    dribbling: clamp(attrs.dribbling),
    setPieces: clamp(attrs.setPieces),
    positioning: clamp(attrs.positioning),
    heading: clamp(attrs.heading),
    marking: clamp(attrs.marking),
    vision: clamp(attrs.vision),
    crossing: clamp(attrs.crossing),
    longShots: clamp(attrs.longShots),
    workRate: clamp(attrs.workRate),
    composure: clamp(attrs.composure),
    aggression: clamp(attrs.aggression),
  };
}

export function calculateOverall(attrs: PlayerAttributes, position: Player['position']): number {
  const weights: Record<Player['position'], Record<string, number>> = {
    GOL: { speed: 0.04, shooting: 0.01, passing: 0.08, defending: 0.28, physical: 0.16, dribbling: 0.02, setPieces: 0.02, positioning: 0.16, heading: 0.04, marking: 0.10, vision: 0.02, crossing: 0.01, longShots: 0.01, workRate: 0.02, composure: 0.02, aggression: 0.01 },
    ZAG: { speed: 0.07, shooting: 0.02, passing: 0.06, defending: 0.20, physical: 0.13, dribbling: 0.02, setPieces: 0.02, positioning: 0.10, heading: 0.12, marking: 0.10, vision: 0.02, crossing: 0.01, longShots: 0.01, workRate: 0.04, composure: 0.04, aggression: 0.04 },
    LAT: { speed: 0.13, shooting: 0.04, passing: 0.12, defending: 0.11, physical: 0.10, dribbling: 0.10, setPieces: 0.02, positioning: 0.06, heading: 0.03, marking: 0.08, vision: 0.04, crossing: 0.08, longShots: 0.02, workRate: 0.04, composure: 0.02, aggression: 0.01 },
    VOL: { speed: 0.06, shooting: 0.04, passing: 0.15, defending: 0.15, physical: 0.12, dribbling: 0.05, setPieces: 0.03, positioning: 0.08, heading: 0.04, marking: 0.08, vision: 0.04, crossing: 0.02, longShots: 0.02, workRate: 0.05, composure: 0.04, aggression: 0.03 },
    MEI: { speed: 0.08, shooting: 0.10, passing: 0.16, defending: 0.02, physical: 0.06, dribbling: 0.14, setPieces: 0.08, positioning: 0.08, heading: 0.03, marking: 0.03, vision: 0.08, crossing: 0.03, longShots: 0.04, workRate: 0.03, composure: 0.03, aggression: 0.01 },
    ATA: { speed: 0.12, shooting: 0.20, passing: 0.05, defending: 0.01, physical: 0.08, dribbling: 0.12, setPieces: 0.04, positioning: 0.12, heading: 0.08, marking: 0.01, vision: 0.03, crossing: 0.01, longShots: 0.04, workRate: 0.03, composure: 0.04, aggression: 0.02 },
  };
  const w = weights[position];
  let val = 0;
  for (const [key, weight] of Object.entries(w)) {
    val += ((attrs as any)[key] ?? 50) * weight;
  }
  return Math.max(1, Math.min(99, Math.round(val)));
}

function generateRandomHistory(age: number): PlayerHistoryEntry[] {
  if (age < 20) return [];
  const numClubs = Math.min(age - 18, Math.floor(Math.random() * 3) + 1);
  const history: PlayerHistoryEntry[] = [];
  let currentSeason = 1;
  for (let i = 0; i < numClubs; i++) {
    const club = randomClubNames[Math.floor(Math.random() * randomClubNames.length)];
    const duration = Math.floor(Math.random() * 3) + 1;
    const games = Math.floor(Math.random() * 30 * duration + 10);
    const goals = Math.floor(Math.random() * games * 0.3);
    const assists = Math.floor(Math.random() * games * 0.2);
    const avgRating = +(Math.random() * 3 + 5).toFixed(1);
    history.push({
      club,
      seasonStart: currentSeason,
      seasonEnd: currentSeason + duration - 1,
      games,
      goals,
      assists,
      avgRating,
    });
    currentSeason += duration;
  }
  return history;
}

export function generatePlayer(overallRange: [number, number], ageRange: [number, number], pos?: Player['position'], clubName?: string): Player {
  const position = pos || positions[Math.floor(Math.random() * positions.length)];
  const targetOverall = Math.floor(Math.random() * (overallRange[1] - overallRange[0] + 1) + overallRange[0]);
  const age = Math.floor(Math.random() * (ageRange[1] - ageRange[0] + 1) + ageRange[0]);
  const attributes = generateAttributes(position, targetOverall);
  const overall = calculateOverall(attributes, position);

  const history: PlayerHistoryEntry[] = clubName
    ? [{ club: clubName, seasonStart: 1, games: 0, goals: 0, assists: 0, avgRating: 0 }]
    : generateRandomHistory(age);

  return {
    id: generateId(),
    name: randomName(),
    position,
    overall,
    attributes,
    age,
    salary: 500,
    stamina: Math.floor(Math.random() * 30 + 70),
    morale: Math.floor(Math.random() * 30 + 60),
    goals: 0,
    assists: 0,
    contract: Math.floor(Math.random() * 4 + 1),
    gamesPlayed: 0,
    trainingProgress: 0,
    history,
  };
}

export function generateInitialSquad(clubName?: string): Player[] {
  const squad: Player[] = [];
  const posCount: [Player['position'], number][] = [
    ['GOL', 2], ['ZAG', 4], ['LAT', 3], ['VOL', 3], ['MEI', 4], ['ATA', 4],
  ];
  for (const [pos, count] of posCount) {
    for (let i = 0; i < count; i++) {
      squad.push(generatePlayer([35, 55], [18, 32], pos, clubName));
    }
  }
  return squad;
}

export function generateMarketPlayer(): Player {
  return generatePlayer([60, 85], [18, 33]);
}

export function generateMarketPlayers(count: number): Player[] {
  return Array.from({ length: count }, () => generateMarketPlayer());
}

export function generateFreeAgents(count: number): Player[] {
  return Array.from({ length: count }, () => {
    const p = generatePlayer([40, 75], [22, 35]);
    return { ...p, contract: 0 };
  });
}

export function getPlayerValue(player: Player): number {
  const baseValue = player.overall * 15000;
  const ageFactor = player.age < 25 ? 1.3 : player.age > 30 ? 0.7 : 1;
  return Math.floor(baseValue * ageFactor);
}

export function generateScoutReport(player: Player, scoutAccuracy: number): ScoutReport {
  const revealedKeys: (keyof PlayerAttributes)[] = ['speed', 'shooting', 'passing', 'defending', 'physical', 'dribbling', 'setPieces', 'positioning', 'heading', 'marking'];
  const numRevealed = Math.min(revealedKeys.length, Math.floor(scoutAccuracy / 15) + 1);
  const shuffled = [...revealedKeys].sort(() => Math.random() - 0.5);
  const revealed: Partial<PlayerAttributes> = {};
  for (let i = 0; i < numRevealed; i++) {
    const key = shuffled[i];
    const noise = Math.floor((100 - scoutAccuracy) / 10 * (Math.random() * 2 - 1));
    revealed[key] = Math.max(1, Math.min(99, player.attributes[key] + noise));
  }

  const overallNoise = Math.floor((100 - scoutAccuracy) / 8 * (Math.random() * 2 - 1));
  return {
    id: generateId(),
    player,
    scoutName: 'Olheiro',
    accuracy: scoutAccuracy,
    estimatedOverall: Math.max(1, Math.min(99, player.overall + overallNoise)),
    estimatedAttributes: revealed,
    reportDate: `Relatório`,
  };
}

export function generateYouthProspect(academyLevel: number): YouthProspect {
  const pos = positions[Math.floor(Math.random() * positions.length)];
  const minOvr = getYouthMinOverall(academyLevel);
  const maxOvr = getYouthMaxOverall(academyLevel);
  const targetOverall = Math.floor(Math.random() * (maxOvr - minOvr) + minOvr);
  const age = Math.floor(Math.random() * 3 + 16);
  const attributes = generateAttributes(pos, targetOverall);
  const overall = calculateOverall(attributes, pos);
  // Potential capped by academy level: lvl1 = +3~9, lvl5 = +3~17, lvl10 = +3~27
  const maxPotentialBonus = Math.min(27, 5 + academyLevel * 2);
  const potential = Math.min(99, overall + Math.floor(Math.random() * maxPotentialBonus + 3));

  return {
    id: generateId(),
    name: randomName(),
    position: pos,
    overall,
    attributes,
    age,
    salary: 200,
    stamina: Math.floor(Math.random() * 20 + 75),
    morale: Math.floor(Math.random() * 20 + 70),
    goals: 0,
    assists: 0,
    contract: 5,
    gamesPlayed: 0,
    trainingProgress: 0,
    potential,
    monthsInAcademy: 0,
  };
}

export function generateYouthBatch(count: number, academyLevel: number): YouthProspect[] {
  return Array.from({ length: count }, () => generateYouthProspect(academyLevel));
}
