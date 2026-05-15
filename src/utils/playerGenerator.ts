import { Player, PlayerAttributes, PlayerHistoryEntry, ScoutReport, PlayerPersonality, allPersonalities } from '@/types/game';
import { YouthProspect, getYouthMinOverall, getYouthMaxOverall, getPotentialTier, computeEvolutionStatus, computeYouthTag } from '@/types/infrastructure';

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
  'Atlético Mineiro', 'Palmeiras', 'São Paulo', 'Corinthians', 'Grêmio', 'Internacional', 'Cruzeiro',
  'Santos', 'Vasco', 'Botafogo', 'Fluminense', 'Bahia', 'Sport', 'Fortaleza', 'Ceará', 'Coritiba', 'Athletico-PR',
  'Goiás', 'Vitória', 'Ponte Preta', 'Guarani', 'Juventude', 'Chapecoense', 'Avaí', 'Figueirense',
];

const positions: Player['position'][] = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];

function randomName() {
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

function randomPersonality(): PlayerPersonality {
  return allPersonalities[Math.floor(Math.random() * allPersonalities.length)];
}

function generateAttributes(position: Player['position'], overall: number): PlayerAttributes {
  const variance = () => Math.floor(Math.random() * 16 - 8);

  // Goalkeeping: high for GOL, very low for others
  const gkVal = position === 'GOL' ? overall + 10 + variance() : Math.floor(overall * 0.2) + variance();

  const base = {
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
    goalkeeping: clamp(gkVal),
  };
}

export function calculateOverall(attrs: PlayerAttributes, position: Player['position']): number {
  const weights: Record<Player['position'], Record<string, number>> = {
    GOL: { speed: 0.03, shooting: 0.01, passing: 0.06, defending: 0.15, physical: 0.10, dribbling: 0.01, setPieces: 0.01, positioning: 0.12, heading: 0.03, marking: 0.08, vision: 0.02, crossing: 0.01, longShots: 0.01, workRate: 0.02, composure: 0.02, aggression: 0.01, goalkeeping: 0.31 },
    ZAG: { speed: 0.07, shooting: 0.02, passing: 0.06, defending: 0.20, physical: 0.13, dribbling: 0.02, setPieces: 0.02, positioning: 0.10, heading: 0.12, marking: 0.10, vision: 0.02, crossing: 0.01, longShots: 0.01, workRate: 0.04, composure: 0.04, aggression: 0.04, goalkeeping: 0.00 },
    LAT: { speed: 0.13, shooting: 0.04, passing: 0.12, defending: 0.11, physical: 0.10, dribbling: 0.10, setPieces: 0.02, positioning: 0.06, heading: 0.03, marking: 0.08, vision: 0.04, crossing: 0.08, longShots: 0.02, workRate: 0.04, composure: 0.02, aggression: 0.01, goalkeeping: 0.00 },
    VOL: { speed: 0.06, shooting: 0.04, passing: 0.15, defending: 0.15, physical: 0.12, dribbling: 0.05, setPieces: 0.03, positioning: 0.08, heading: 0.04, marking: 0.08, vision: 0.04, crossing: 0.02, longShots: 0.02, workRate: 0.05, composure: 0.04, aggression: 0.03, goalkeeping: 0.00 },
    MEI: { speed: 0.08, shooting: 0.10, passing: 0.16, defending: 0.02, physical: 0.06, dribbling: 0.14, setPieces: 0.08, positioning: 0.08, heading: 0.03, marking: 0.03, vision: 0.08, crossing: 0.03, longShots: 0.04, workRate: 0.03, composure: 0.03, aggression: 0.01, goalkeeping: 0.00 },
    ATA: { speed: 0.12, shooting: 0.20, passing: 0.05, defending: 0.01, physical: 0.08, dribbling: 0.12, setPieces: 0.04, positioning: 0.12, heading: 0.08, marking: 0.01, vision: 0.03, crossing: 0.01, longShots: 0.04, workRate: 0.03, composure: 0.04, aggression: 0.02, goalkeeping: 0.00 },
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
    stamina: 100, // Inicia sempre com 100
    morale: Math.floor(Math.random() * 30 + 60),
    goals: 0,
    assists: 0,
    contract: Math.floor(Math.random() * 4 + 1),
    gamesPlayed: 0,
    trainingProgress: 0,
    history,
    personality: randomPersonality(),
    physicalStatus: 'Descansado',
    staminaLastUpdatedAt: new Date().toISOString(),
  };
}

/**
 * Distribuição obrigatória do elenco completo — exatos 35 jogadores:
 * Titulares (11) + Reservas (11) + Base/Juniores (13)
 * Total: 35 jogadores
 * 
 * Distribuição de posições (mínimos):
 * - 3 Goleiros
 * - 6 Zagueiros
 * - 6 Laterais (3 LD + 3 LE)
 * - 5 Volantes
 * - 8 Meio-campistas
 * - 7 Atacantes (Pontas/Centroavantes)
 */
export function generateInitialSquad(clubName?: string, tier: 'strong' | 'medium' | 'weak' = 'medium'): Player[] {
  const ovrRange: Record<string, [number, number]> = {
    strong: [72, 85],
    medium: [62, 75],
    weak: [50, 65]
  };

  const range = ovrRange[tier];

  type Slot = {
    pos: Player['position'];
    side?: 'L' | 'R' | 'C';
    secondary?: Player['position'];
    isYouth?: boolean;
  };

  const blueprint: Slot[] = [
    // Goleiros (3)
    { pos: 'GOL' }, { pos: 'GOL' }, { pos: 'GOL', isYouth: true },
    
    // Zagueiros (6)
    { pos: 'ZAG', secondary: 'VOL' }, { pos: 'ZAG' }, { pos: 'ZAG' }, 
    { pos: 'ZAG', secondary: 'LAT' }, { pos: 'ZAG', isYouth: true }, { pos: 'ZAG', isYouth: true },
    
    // Laterais (6: 3 LD + 3 LE)
    { pos: 'LAT', side: 'R', secondary: 'MEI' }, { pos: 'LAT', side: 'R' }, { pos: 'LAT', side: 'R', isYouth: true },
    { pos: 'LAT', side: 'L', secondary: 'MEI' }, { pos: 'LAT', side: 'L' }, { pos: 'LAT', side: 'L', isYouth: true },
    
    // Volantes (5)
    { pos: 'VOL', secondary: 'MEI' }, { pos: 'VOL' }, { pos: 'VOL', secondary: 'ZAG' }, 
    { pos: 'VOL', isYouth: true }, { pos: 'VOL', isYouth: true },
    
    // Meio-campistas (8)
    { pos: 'MEI', secondary: 'VOL' }, { pos: 'MEI' }, { pos: 'MEI', secondary: 'ATA' }, { pos: 'MEI' },
    { pos: 'MEI', isYouth: true }, { pos: 'MEI', isYouth: true }, { pos: 'MEI', isYouth: true }, { pos: 'MEI', isYouth: true },
    
    // Atacantes (7)
    { pos: 'ATA', side: 'L', secondary: 'MEI' }, { pos: 'ATA', side: 'L', isYouth: true },
    { pos: 'ATA', side: 'R', secondary: 'MEI' }, { pos: 'ATA', side: 'R', isYouth: true },
    { pos: 'ATA', side: 'C' }, { pos: 'ATA', side: 'C' }, { pos: 'ATA', side: 'C', isYouth: true },
  ];

  const squad: Player[] = blueprint.map(slot => {
    // Youth players are younger and have more potential but lower current OVR
    const ageRange: [number, number] = slot.isYouth ? [16, 19] : [20, 34];
    const currentOvrRange: [number, number] = slot.isYouth 
      ? [Math.max(30, range[0] - 15), range[0]] 
      : range;

    const p = generatePlayer(currentOvrRange, ageRange, slot.pos, clubName);
    
    if (slot.side) p.side = slot.side;
    if (slot.secondary) p.secondaryPosition = slot.secondary;
    if (slot.isYouth) {
      p.isYouth = true;
      p.potential = Math.min(99, p.overall + Math.floor(Math.random() * 20) + 5);
      p.squadRole = 'promessa';
    } else {
      p.potential = Math.min(99, p.overall + Math.floor(Math.random() * 10));
      p.squadRole = p.overall > range[1] - 5 ? 'titular' : 'reserva';
    }
    
    // Add market value
    p.marketValue = getPlayerBaseValue(p);
    
    return p;
  });

  // ── Pré-escalação 4-3-3 com os 11 melhores nas posições corretas ──
  const formation433: Array<{ pos: Player['position']; side?: 'L' | 'R' | 'C' }> = [
    { pos: 'GOL' },
    { pos: 'LAT', side: 'R' }, { pos: 'ZAG' }, { pos: 'ZAG' }, { pos: 'LAT', side: 'L' },
    { pos: 'VOL' }, { pos: 'MEI' }, { pos: 'MEI' },
    { pos: 'ATA', side: 'R' }, { pos: 'ATA', side: 'C' }, { pos: 'ATA', side: 'L' },
  ];

  const used = new Set<string>();
  const starters: Player[] = [];
  for (const slot of formation433) {
    let candidates = squad
      .filter(p => !used.has(p.id) && p.position === slot.pos && (!slot.side || p.side === slot.side))
      .sort((a, b) => b.overall - a.overall);
    
    if (candidates.length === 0) {
      candidates = squad
        .filter(p => !used.has(p.id) && p.position === slot.pos)
        .sort((a, b) => b.overall - a.overall);
    }
    
    if (candidates[0]) {
      starters.push({ ...candidates[0], squadRole: 'titular' });
      used.add(candidates[0].id);
    }
  }

  // The rest are bench and reserves
  const others = squad.filter(p => !used.has(p.id)).sort((a, b) => b.overall - a.overall);
  const bench = others.slice(0, 11).map(p => ({ ...p, squadRole: 'reserva' }));
  const reserves = others.slice(11).map(p => ({ ...p, squadRole: p.isYouth ? 'promessa' : 'reserva' }));


  return [...starters, ...bench, ...reserves];
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

/** Valor fixo baseado em atributos e idade — V3 (preços top reescalonados) */
export function getPlayerBaseValue(player: Player): number {
  // Curva de OVR encarecendo a elite
  let baseValue: number;
  if (player.overall >= 90)      baseValue = player.overall * 250_000;
  else if (player.overall >= 85) baseValue = player.overall * 150_000;
  else if (player.overall >= 80) baseValue = player.overall * 80_000;
  else if (player.overall >= 75) baseValue = player.overall * 50_000;
  else if (player.overall >= 70) baseValue = player.overall * 30_000;
  else if (player.overall >= 65) baseValue = player.overall * 20_000;
  else if (player.overall >= 55) baseValue = player.overall * 10_000;
  else                            baseValue = player.overall * 5_000;

  // Curva de idade: pico 23-27, jovem premium, velho desconto
  let ageFactor: number;
  if (player.age <= 20) ageFactor = 1.5;
  else if (player.age <= 22) ageFactor = 1.4;
  else if (player.age <= 24) ageFactor = 1.3;
  else if (player.age <= 27) ageFactor = 1.2;
  else if (player.age <= 29) ageFactor = 1.0;
  else if (player.age <= 31) ageFactor = 0.7;
  else if (player.age <= 33) ageFactor = 0.4;
  else ageFactor = 0.2;

  return Math.floor(baseValue * ageFactor);
}

/** Calcula bônus variável: +10% por sequência de vitórias / boa colocação, -10% se perdendo */
export function getPlayerVariableBonus(winStreak: number, leaguePosition?: number, totalTeams?: number): number {
  let bonus = 0;
  // +10% por cada 3 vitórias seguidas (máx +30%)
  if (winStreak >= 3) bonus += Math.min(30, Math.floor(winStreak / 3) * 10);
  // -10% por cada 3 derrotas seguidas (winStreak negativo)
  if (winStreak <= -3) bonus += Math.max(-30, Math.ceil(winStreak / 3) * 10);
  // Colocação na liga: top 25% = +10%, bottom 25% = -10%
  if (leaguePosition != null && totalTeams != null && totalTeams > 1) {
    const ratio = leaguePosition / totalTeams;
    if (ratio <= 0.25) bonus += 10;
    else if (ratio >= 0.75) bonus -= 10;
  }
  return bonus;
}

/** Bônus de potencial: jovem (≤22) com OVR ≥75 ganha multiplicador (joia 💎) — até +40% */
export function getPotentialBonusPercent(player: Player): number {
  if (player.age > 22) return 0;
  if (player.overall < 75) return 0;
  // OVR 75 → +20%, OVR 80 → +30%, OVR 85+ → +40%
  if (player.overall >= 85) return 40;
  if (player.overall >= 80) return 30;
  return 20;
}

/** Bônus de forma (últimas 5 notas): média ≥7.5 → +15%, ≤6.0 → -15% */
export function getFormBonusPercent(player: Player): number {
  const ratings = player.seasonRatings;
  if (!ratings || ratings.length === 0) return 0;
  const recent = ratings.slice(-5);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  if (avg >= 7.5) return 15;
  if (avg >= 7.0) return 8;
  if (avg <= 5.5) return -15;
  if (avg <= 6.0) return -8;
  return 0;
}

/** Bônus por personalidade: lider/competitivo/dedicado +10%; festeiro/preguicoso -10% */
export function getPersonalityBonusPercent(player: Player): number {
  const p = player.personality;
  if (!p) return 0;
  if (p === 'lider' || p === 'competitivo' || p === 'dedicado') return 10;
  if (p === 'festeiro' || p === 'preguicoso') return -10;
  return 0;
}

/** Verifica se é uma "joia" — jovem promissor com bônus de potencial */
export function isPlayerGem(player: Player): boolean {
  return getPotentialBonusPercent(player) > 0;
}

/**
 * Curva exponencial de elite: aplica multiplicador para jogadores com OVR ≥ 80,
 * tornando craques significativamente mais caros no mercado.
 * OVR 80–84 = 1.5x | 85–89 = 2.0x | 90–94 = 3.0x | 95+ = 5.0x
 */
export function getEliteOvrMultiplier(overall: number): number {
  if (overall >= 95) return 5.0;
  if (overall >= 90) return 3.0;
  if (overall >= 85) return 2.0;
  if (overall >= 80) return 1.5;
  return 1.0;
}

/** Valor total = fixo × (1 + soma de bônus%) × multiplicador de elite (OVR 80+) */
export function getPlayerValue(player: Player, winStreak: number = 0, leaguePosition?: number, totalTeams?: number): number {
  const baseValue = getPlayerBaseValue(player);
  const variablePercent = getPlayerVariableBonus(winStreak, leaguePosition, totalTeams);
  const potentialPercent = getPotentialBonusPercent(player);
  const formPercent = getFormBonusPercent(player);
  const personalityPercent = getPersonalityBonusPercent(player);
  const totalPercent = variablePercent + potentialPercent + formPercent + personalityPercent;
  const eliteMult = getEliteOvrMultiplier(player.overall);
  return Math.floor(baseValue * (1 + totalPercent / 100) * eliteMult);
}

/** Tendência do valor de mercado (↑/↓/→) */
export function getValueTrend(player: Player, winStreak: number = 0): 'up' | 'down' | 'flat' {
  const variablePercent = getPlayerVariableBonus(winStreak);
  const formPercent = getFormBonusPercent(player);
  const total = variablePercent + formPercent;
  if (total >= 8) return 'up';
  if (total <= -8) return 'down';
  return 'flat';
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
  const targetOverall = Math.floor(Math.random() * (maxOvr - minOvr + 1) + minOvr);
  const age = Math.floor(Math.random() * 3 + 16);
  const attributes = generateAttributes(pos, targetOverall);
  const overall = calculateOverall(attributes, pos);

  // Potential cap by academy level (Base V2)
  let maxPot = 65;
  if (academyLevel <= 5) maxPot = 70;
  else if (academyLevel <= 10) maxPot = 78;
  else if (academyLevel <= 20) maxPot = 88;
  else if (academyLevel <= 25) maxPot = 94;
  else maxPot = 99;

  const minBonus = 3;
  const maxBonus = Math.max(minBonus + 1, maxPot - overall);
  let potential = overall + Math.floor(Math.random() * (maxBonus - minBonus + 1) + minBonus);

  // Generational chance (POT 95-99) only at lvl 26+
  const generationalChance = academyLevel >= 26 ? (academyLevel - 25) * 0.025 : 0;
  if (Math.random() < generationalChance) {
    potential = Math.max(potential, 95 + Math.floor(Math.random() * 5));
  }
  potential = Math.min(99, Math.max(overall + 1, potential));

  const baseProspect: YouthProspect = {
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
    personality: randomPersonality(),
    potentialTier: getPotentialTier(potential, overall),
    highlightStreak: 0,
    stagnationCycles: 0,
    injuredCycles: 0,
  };
  baseProspect.evolutionStatus = computeEvolutionStatus(baseProspect);
  baseProspect.youthTag = computeYouthTag(baseProspect);
  return baseProspect;
}

export function generateYouthBatch(count: number, academyLevel: number): YouthProspect[] {
  return Array.from({ length: count }, () => generateYouthProspect(academyLevel));
}
