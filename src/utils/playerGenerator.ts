import { Player, PlayerAttributes, ScoutReport } from '@/types/game';
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

const positions: Player['position'][] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

function randomName() {
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

function generateAttributes(position: Player['position'], overall: number): PlayerAttributes {
  const variance = () => Math.floor(Math.random() * 16 - 8);

  const base: Record<Player['position'], PlayerAttributes> = {
    GOL: { speed: overall - 10 + variance(), shooting: overall - 20 + variance(), passing: overall - 5 + variance(), defending: overall + 5 + variance(), physical: overall + variance(), dribbling: overall - 15 + variance(), setPieces: overall - 15 + variance(), positioning: overall + 8 + variance(), heading: overall - 5 + variance(), marking: overall + variance() },
    ZAG: { speed: overall - 5 + variance(), shooting: overall - 10 + variance(), passing: overall - 3 + variance(), defending: overall + 8 + variance(), physical: overall + 5 + variance(), dribbling: overall - 8 + variance(), setPieces: overall - 8 + variance(), positioning: overall + 5 + variance(), heading: overall + 7 + variance(), marking: overall + 8 + variance() },
    LAT: { speed: overall + 5 + variance(), shooting: overall - 5 + variance(), passing: overall + 3 + variance(), defending: overall + variance(), physical: overall + variance(), dribbling: overall + 2 + variance(), setPieces: overall - 3 + variance(), positioning: overall + 2 + variance(), heading: overall - 5 + variance(), marking: overall + 3 + variance() },
    VOL: { speed: overall - 3 + variance(), shooting: overall - 5 + variance(), passing: overall + 5 + variance(), defending: overall + 5 + variance(), physical: overall + 3 + variance(), dribbling: overall - 3 + variance(), setPieces: overall + variance(), positioning: overall + 5 + variance(), heading: overall + 3 + variance(), marking: overall + 7 + variance() },
    MEI: { speed: overall + variance(), shooting: overall + 3 + variance(), passing: overall + 8 + variance(), defending: overall - 8 + variance(), physical: overall - 3 + variance(), dribbling: overall + 5 + variance(), setPieces: overall + 5 + variance(), positioning: overall + 3 + variance(), heading: overall - 3 + variance(), marking: overall - 5 + variance() },
    ATA: { speed: overall + 5 + variance(), shooting: overall + 10 + variance(), passing: overall - 3 + variance(), defending: overall - 15 + variance(), physical: overall + variance(), dribbling: overall + 5 + variance(), setPieces: overall + 3 + variance(), positioning: overall + 8 + variance(), heading: overall + 5 + variance(), marking: overall - 12 + variance() },
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
  };
}

export function calculateOverall(attrs: PlayerAttributes, position: Player['position']): number {
  const weights: Record<Player['position'], Record<keyof PlayerAttributes, number>> = {
    GOL: { speed: 0.04, shooting: 0.01, passing: 0.08, defending: 0.30, physical: 0.18, dribbling: 0.02, setPieces: 0.02, positioning: 0.18, heading: 0.05, marking: 0.12 },
    ZAG: { speed: 0.08, shooting: 0.03, passing: 0.08, defending: 0.22, physical: 0.15, dribbling: 0.03, setPieces: 0.02, positioning: 0.12, heading: 0.15, marking: 0.12 },
    LAT: { speed: 0.16, shooting: 0.06, passing: 0.15, defending: 0.14, physical: 0.12, dribbling: 0.12, setPieces: 0.03, positioning: 0.08, heading: 0.04, marking: 0.10 },
    VOL: { speed: 0.08, shooting: 0.06, passing: 0.18, defending: 0.18, physical: 0.14, dribbling: 0.07, setPieces: 0.04, positioning: 0.10, heading: 0.05, marking: 0.10 },
    MEI: { speed: 0.10, shooting: 0.12, passing: 0.20, defending: 0.03, physical: 0.08, dribbling: 0.18, setPieces: 0.10, positioning: 0.10, heading: 0.04, marking: 0.05 },
    ATA: { speed: 0.14, shooting: 0.22, passing: 0.07, defending: 0.01, physical: 0.10, dribbling: 0.15, setPieces: 0.05, positioning: 0.14, heading: 0.10, marking: 0.02 },
  };
  const w = weights[position];
  const val = Math.round(
    attrs.speed * w.speed + attrs.shooting * w.shooting + attrs.passing * w.passing +
    attrs.defending * w.defending + attrs.physical * w.physical + attrs.dribbling * w.dribbling +
    attrs.setPieces * w.setPieces + attrs.positioning * w.positioning + attrs.heading * w.heading +
    attrs.marking * w.marking
  );
  return Math.max(1, Math.min(99, val));
}

export function generatePlayer(overallRange: [number, number], ageRange: [number, number], pos?: Player['position']): Player {
  const position = pos || positions[Math.floor(Math.random() * positions.length)];
  const targetOverall = Math.floor(Math.random() * (overallRange[1] - overallRange[0] + 1) + overallRange[0]);
  const age = Math.floor(Math.random() * (ageRange[1] - ageRange[0] + 1) + ageRange[0]);
  const attributes = generateAttributes(position, targetOverall);
  const overall = calculateOverall(attributes, position);

  return {
    id: generateId(),
    name: randomName(),
    position,
    overall,
    attributes,
    age,
    salary: Math.floor(overall * 800 + Math.random() * 10000),
    stamina: Math.floor(Math.random() * 30 + 70),
    morale: Math.floor(Math.random() * 30 + 60),
    goals: 0,
    assists: 0,
    contract: Math.floor(Math.random() * 4 + 1),
    gamesPlayed: 0,
    trainingProgress: 0,
  };
}

export function generateInitialSquad(): Player[] {
  const squad: Player[] = [];
  const posCount: [Player['position'], number][] = [
    ['GOL', 2], ['ZAG', 4], ['LAT', 3], ['VOL', 3], ['MEI', 4], ['ATA', 4],
  ];
  for (const [pos, count] of posCount) {
    for (let i = 0; i < count; i++) {
      squad.push(generatePlayer([35, 55], [18, 32], pos));
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
  const potential = Math.min(99, overall + Math.floor(Math.random() * 20 + 5));

  return {
    id: generateId(),
    name: randomName(),
    position: pos,
    overall,
    attributes,
    age,
    salary: Math.floor(overall * 300 + 5000),
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
