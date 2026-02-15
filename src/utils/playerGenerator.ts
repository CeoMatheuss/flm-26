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

// Generate attributes based on position and target overall
function generateAttributes(position: Player['position'], overall: number): PlayerAttributes {
  const variance = () => Math.floor(Math.random() * 16 - 8); // -8 to +7

  const base: Record<Player['position'], PlayerAttributes> = {
    GOL: { speed: overall - 10 + variance(), shooting: overall - 20 + variance(), passing: overall - 5 + variance(), defending: overall + 5 + variance(), physical: overall + variance(), dribbling: overall - 15 + variance() },
    ZAG: { speed: overall - 5 + variance(), shooting: overall - 10 + variance(), passing: overall - 3 + variance(), defending: overall + 8 + variance(), physical: overall + 5 + variance(), dribbling: overall - 8 + variance() },
    LAT: { speed: overall + 5 + variance(), shooting: overall - 5 + variance(), passing: overall + 3 + variance(), defending: overall + variance(), physical: overall + variance(), dribbling: overall + 2 + variance() },
    VOL: { speed: overall - 3 + variance(), shooting: overall - 5 + variance(), passing: overall + 5 + variance(), defending: overall + 5 + variance(), physical: overall + 3 + variance(), dribbling: overall - 3 + variance() },
    MEI: { speed: overall + variance(), shooting: overall + 3 + variance(), passing: overall + 8 + variance(), defending: overall - 8 + variance(), physical: overall - 3 + variance(), dribbling: overall + 5 + variance() },
    ATA: { speed: overall + 5 + variance(), shooting: overall + 10 + variance(), passing: overall - 3 + variance(), defending: overall - 15 + variance(), physical: overall + variance(), dribbling: overall + 5 + variance() },
  };

  const attrs = base[position];
  // Clamp all values between 1 and 99
  return {
    speed: Math.max(1, Math.min(99, attrs.speed)),
    shooting: Math.max(1, Math.min(99, attrs.shooting)),
    passing: Math.max(1, Math.min(99, attrs.passing)),
    defending: Math.max(1, Math.min(99, attrs.defending)),
    physical: Math.max(1, Math.min(99, attrs.physical)),
    dribbling: Math.max(1, Math.min(99, attrs.dribbling)),
  };
}

export function calculateOverall(attrs: PlayerAttributes, position: Player['position']): number {
  const weights: Record<Player['position'], Record<keyof PlayerAttributes, number>> = {
    GOL: { speed: 0.05, shooting: 0.02, passing: 0.10, defending: 0.40, physical: 0.25, dribbling: 0.03 },
    ZAG: { speed: 0.10, shooting: 0.05, passing: 0.10, defending: 0.35, physical: 0.25, dribbling: 0.05 },
    LAT: { speed: 0.20, shooting: 0.08, passing: 0.18, defending: 0.18, physical: 0.15, dribbling: 0.15 },
    VOL: { speed: 0.10, shooting: 0.08, passing: 0.22, defending: 0.25, physical: 0.20, dribbling: 0.10 },
    MEI: { speed: 0.12, shooting: 0.15, passing: 0.25, defending: 0.05, physical: 0.10, dribbling: 0.23 },
    ATA: { speed: 0.18, shooting: 0.30, passing: 0.10, defending: 0.02, physical: 0.12, dribbling: 0.20 },
  };
  const w = weights[position];
  const val = Math.round(
    attrs.speed * w.speed + attrs.shooting * w.shooting + attrs.passing * w.passing +
    attrs.defending * w.defending + attrs.physical * w.physical + attrs.dribbling * w.dribbling
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

// Generate initial squad of 20 players, max 55 OVR, balanced positions
export function generateInitialSquad(): Player[] {
  const squad: Player[] = [];
  // 2 GOL, 4 ZAG, 3 LAT, 3 VOL, 4 MEI, 4 ATA = 20
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

// Free agents: expired contracts, OVR hidden from user
export function generateFreeAgents(count: number): Player[] {
  return Array.from({ length: count }, () => {
    const p = generatePlayer([40, 75], [22, 35]);
    return { ...p, contract: 0 }; // free agent
  });
}

export function getPlayerValue(player: Player): number {
  const baseValue = player.overall * 15000;
  const ageFactor = player.age < 25 ? 1.3 : player.age > 30 ? 0.7 : 1;
  return Math.floor(baseValue * ageFactor);
}

// Scout report: reveals partial info based on accuracy
export function generateScoutReport(player: Player, scoutAccuracy: number): ScoutReport {
  const revealedKeys: (keyof PlayerAttributes)[] = ['speed', 'shooting', 'passing', 'defending', 'physical', 'dribbling'];
  // Higher accuracy = more attributes revealed and closer estimate
  const numRevealed = Math.min(revealedKeys.length, Math.floor(scoutAccuracy / 20) + 1);
  const shuffled = [...revealedKeys].sort(() => Math.random() - 0.5);
  const revealed: Partial<PlayerAttributes> = {};
  for (let i = 0; i < numRevealed; i++) {
    const key = shuffled[i];
    // Add some noise based on accuracy
    const noise = Math.floor((100 - scoutAccuracy) / 10 * (Math.random() * 2 - 1));
    revealed[key] = Math.max(1, Math.min(99, player.attributes[key] + noise));
  }

  const overallNoise = Math.floor((100 - scoutAccuracy) / 8 * (Math.random() * 2 - 1));
  return {
    id: generateId(),
    player,
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
