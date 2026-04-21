import { Player } from './game';

export interface Infrastructure {
  trainingCenter: FacilityLevel;
  youthAcademy: FacilityLevel;
  stadium: FacilityLevel;
  physiotherapy: FacilityLevel;
}

// Training Center upgrade costs (level 1-30)
export const trainingCenterCosts: Record<number, number> = {
  1: 10000, 2: 20000, 3: 35000, 4: 50000, 5: 75000,
  6: 100000, 7: 150000, 8: 200000, 9: 300000, 10: 500000,
  11: 700000, 12: 900000, 13: 1100000, 14: 1400000, 15: 1700000,
  16: 2000000, 17: 2500000, 18: 3000000, 19: 3500000, 20: 4000000,
  21: 5000000, 22: 5500000, 23: 6000000, 24: 6500000, 25: 7000000,
  26: 7500000, 27: 8000000, 28: 8500000, 29: 9000000, 30: 10000000,
};

export function getTrainingCenterUpgradeCost(currentLevel: number): number {
  return trainingCenterCosts[currentLevel + 1] ?? 999999999;
}

export interface FacilityLevel {
  level: number;
  maxLevel: number;
}

export const facilityCosts: Record<number, number> = {
  1: 150000,
  2: 300000,
  3: 750000,
  4: 1500000,
  5: 3000000,
  6: 6000000,
  7: 10000000,
  8: 18000000,
  9: 30000000,
  10: 50000000,
};

// Academy-specific costs (level 1-30) — Base V2 rebalanced
export const academyUpgradeCosts: Record<number, number> = {
  // 1→5
  1: 500_000, 2: 1_000_000, 3: 1_500_000, 4: 2_000_000, 5: 3_000_000,
  // 6→10
  6: 4_000_000, 7: 6_000_000, 8: 8_000_000, 9: 10_000_000, 10: 13_000_000,
  // 11→15
  11: 16_000_000, 12: 20_000_000, 13: 25_000_000, 14: 30_000_000, 15: 36_000_000,
  // 16→20
  16: 45_000_000, 17: 55_000_000, 18: 65_000_000, 19: 80_000_000, 20: 95_000_000,
  // 21→25
  21: 110_000_000, 22: 130_000_000, 23: 155_000_000, 24: 185_000_000, 25: 220_000_000,
  // 26→30 (ELITE)
  26: 260_000_000, 27: 300_000_000, 28: 350_000_000, 29: 400_000_000, 30: 450_000_000,
};

export function getAcademyUpgradeCost(currentLevel: number): number {
  // Cost to go from currentLevel → currentLevel+1
  return academyUpgradeCosts[currentLevel + 1] ?? academyUpgradeCosts[currentLevel] ?? 999999999;
}

export function getUpgradeCost(currentLevel: number): number {
  return facilityCosts[currentLevel + 1] ?? 999999999;
}

export const defaultInfrastructure: Infrastructure = {
  trainingCenter: { level: 1, maxLevel: 30 },
  youthAcademy: { level: 0, maxLevel: 30 },
  stadium: { level: 1, maxLevel: 15 },
  physiotherapy: { level: 0, maxLevel: 10 },
};

// Training system helpers
export function getTrainingThreshold(ctLevel: number): number {
  return Math.max(40, 100 - ctLevel * 2);
}

export function getTrainingPointsPerSession(
  ctLevel: number,
  intensity: 'leve' | 'moderado' | 'pesado',
  age: number,
  personality?: string
): number {
  const base = 5;
  const intMult = intensity === 'leve' ? 0.6 : intensity === 'moderado' ? 1.0 : 1.5;
  const ageFactor = age < 22 ? 1.5 : age <= 30 ? 1.0 : 0.5;
  const persFactor = personality === 'dedicado' ? 1.2 : personality === 'preguicoso' ? 0.8 : 1.0;
  const ctBonus = 1 + ctLevel * 0.03;
  return Math.round(base * intMult * ageFactor * persFactor * ctBonus);
}

export function getTrainingFatiguePerSession(trainingType: string): number {
  switch (trainingType) {
    case 'fisico': return 15;
    case 'tecnico': return 8;
    case 'tatico': return 5;
    case 'recuperacao': return -20;
    case 'preparacao': return 3;
    default: return 5;
  }
}

// Stadium-specific capacity and costs
export const stadiumCapacities: Record<number, number> = {
  1: 5000, 2: 10000, 3: 15000, 4: 20000, 5: 25000, 6: 30000,
  7: 40000, 8: 50000, 9: 60000, 10: 70000, 11: 80000, 12: 90000, 13: 100000,
  14: 110000, 15: 120000,
};

export function getStadiumCapacity(level: number): number {
  return stadiumCapacities[level] || 5000;
}

export function getStadiumUpgradeCost(currentLevel: number): number {
  const nextCapacity = stadiumCapacities[currentLevel + 1];
  if (!nextCapacity) return 999999999;
  if (nextCapacity <= 30000) return 5000000;
  if (nextCapacity <= 100000) return 10000000;
  return 20000000;
}

export function getPhysiotherapyRecovery(level: number): number {
  // Base recovery 5 stamina + 3 per level
  return 5 + level * 3;
}

export function getTrainingBoost(level: number): number {
  return 0.5 + level * 0.15;
}

// Investment tiers — Base V2 (reduced costs)
export type YouthInvestmentTier = 'none' | 'basic' | 'intermediate' | 'advanced' | 'elite';

export interface YouthInvestmentTierInfo {
  tier: YouthInvestmentTier;
  cost: number;
  minPlayers: number;
  maxPlayers: number;
  label: string;
  emoji: string;
  description: string;
}

export const youthInvestmentTiers: YouthInvestmentTierInfo[] = [
  { tier: 'none', cost: 0, minPlayers: 0, maxPlayers: 0, label: 'Sem Investimento', emoji: '❌', description: 'Nenhum jovem será gerado' },
  { tier: 'basic', cost: 250_000, minPlayers: 1, maxPlayers: 1, label: 'Básico', emoji: '🔹', description: 'Gera 1 jogador/mês' },
  { tier: 'intermediate', cost: 500_000, minPlayers: 2, maxPlayers: 3, label: 'Intermediário', emoji: '🔸', description: 'Gera 2 a 3 jogadores/mês' },
  { tier: 'advanced', cost: 1_000_000, minPlayers: 4, maxPlayers: 4, label: 'Avançado', emoji: '🔶', description: 'Gera 4 jogadores/mês' },
  { tier: 'elite', cost: 2_000_000, minPlayers: 5, maxPlayers: 5, label: 'Elite', emoji: '🔴', description: 'Máximo: 5 jogadores/mês' },
];

export function getYouthTierByCost(cost: number): YouthInvestmentTierInfo {
  // Match closest tier
  return youthInvestmentTiers.reduce((prev, curr) =>
    Math.abs(curr.cost - cost) < Math.abs(prev.cost - cost) ? curr : prev
  , youthInvestmentTiers[0]);
}

export function getYouthInvestmentInfo(tier: YouthInvestmentTier): YouthInvestmentTierInfo {
  return youthInvestmentTiers.find(t => t.tier === tier) ?? youthInvestmentTiers[0];
}

export function getYouthMonthlyPlayers(investmentPerMonth: number): number {
  const tier = getYouthTierByCost(investmentPerMonth);
  if (tier.minPlayers === tier.maxPlayers) return tier.minPlayers;
  return Math.floor(Math.random() * (tier.maxPlayers - tier.minPlayers + 1)) + tier.minPlayers;
}

// OVR ranges per academy level — Base V2
export function getYouthMinOverall(academyLevel: number): number {
  if (academyLevel <= 5) return 40;
  if (academyLevel <= 10) return 45;
  if (academyLevel <= 20) return 50;
  if (academyLevel <= 25) return 55;
  return 60; // 26-30
}

export function getYouthMaxOverall(academyLevel: number): number {
  if (academyLevel <= 5) return 55;
  if (academyLevel <= 10) return 60;
  if (academyLevel <= 20) return 70;
  if (academyLevel <= 25) return 80;
  return 85; // 26-30 (with chance of POT 99)
}

// Hidden potential tier
export type PotentialTier = 'comum' | 'promissor' | 'alto_potencial' | 'talento_raro' | 'geracional';

export function getPotentialTier(potential: number): PotentialTier {
  if (potential >= 95) return 'geracional';
  if (potential >= 89) return 'talento_raro';
  if (potential >= 81) return 'alto_potencial';
  if (potential >= 71) return 'promissor';
  return 'comum';
}

export const potentialTierInfo: Record<PotentialTier, { label: string; emoji: string; color: string }> = {
  comum: { label: 'Comum', emoji: '⚪', color: 'text-muted-foreground' },
  promissor: { label: 'Promissor', emoji: '🔵', color: 'text-blue-400' },
  alto_potencial: { label: 'Alto Potencial', emoji: '🟢', color: 'text-emerald-400' },
  talento_raro: { label: 'Talento Raro', emoji: '🟣', color: 'text-purple-400' },
  geracional: { label: 'Geracional', emoji: '🌟', color: 'text-amber-400' },
};

// Player evolution status
export type EvolutionStatus = 'evoluindo' | 'estavel' | 'travado';

export const evolutionStatusInfo: Record<EvolutionStatus, { label: string; emoji: string; color: string }> = {
  evoluindo: { label: 'Evoluindo', emoji: '📈', color: 'text-emerald-400' },
  estavel: { label: 'Estável', emoji: '➡️', color: 'text-amber-400' },
  travado: { label: 'Travado', emoji: '⚠️', color: 'text-red-400' },
};

// Youth tags
export type YouthTag = 'promessa_clube' | 'talento_base' | 'revelacao';

export const youthTagInfo: Record<YouthTag, { label: string; emoji: string; color: string }> = {
  promessa_clube: { label: 'Promessa do Clube', emoji: '⭐', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  talento_base: { label: 'Talento da Base', emoji: '💎', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  revelacao: { label: 'Revelação', emoji: '🔥', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
};

export interface YouthProspect extends Player {
  potential: number;
  monthsInAcademy: number;
  potentialTier?: PotentialTier;
  evolutionStatus?: EvolutionStatus;
  youthTag?: YouthTag;
  highlightStreak?: number; // # of consecutive matches as standout
  stagnationCycles?: number; // remaining cycles "travado" by event
  injuredCycles?: number; // remaining cycles unavailable by event
}

/** Compute evolution status based on prospect stats */
export function computeEvolutionStatus(p: YouthProspect): EvolutionStatus {
  if ((p.stagnationCycles ?? 0) > 0) return 'travado';
  const moraleBoost = (p.morale ?? 60) >= 70;
  const moraleDrop = (p.morale ?? 60) < 40;
  const playing = (p.gamesPlayed ?? 0) >= 2;
  const young = p.age < 19;
  if (moraleDrop && !playing) return 'travado';
  if ((moraleBoost && playing) || young || (p.trainingProgress ?? 0) >= 50) return 'evoluindo';
  return 'estavel';
}

/** Compute youth tag based on prospect stats */
export function computeYouthTag(p: YouthProspect): YouthTag | undefined {
  if ((p.highlightStreak ?? 0) >= 3) return 'revelacao';
  if (p.potential >= 85) return 'talento_base';
  if (p.overall >= 65 && p.age < 20) return 'promessa_clube';
  return undefined;
}

export interface SeasonData {
  currentSeason: number;
  currentWeek: number;
  totalWeeks: number;
  seasonHistory: SeasonResult[];
}

export interface SeasonResult {
  season: number;
  position: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  champion: string;
}

export const defaultSeason: SeasonData = {
  currentSeason: 1,
  currentWeek: 1,
  totalWeeks: 38,
  seasonHistory: [],
};
