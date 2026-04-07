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

// Academy-specific costs (level 1-30)
export const academyUpgradeCosts: Record<number, number> = {
  // 1-5 Initial
  1: 200000, 2: 300000, 3: 400000, 4: 500000,
  // 6-10 Basic
  5: 700000, 6: 900000, 7: 1100000, 8: 1300000, 9: 1500000,
  // 11-15 Intermediate
  10: 2000000, 11: 2500000, 12: 3000000, 13: 3500000, 14: 4000000,
  // 16-20 Advanced
  15: 5000000, 16: 6000000, 17: 7000000, 18: 8000000, 19: 9000000,
  // 21-25 Elite
  20: 11000000, 21: 13000000, 22: 15000000, 23: 17000000, 24: 19000000,
  // 26-30 World Class
  25: 22000000, 26: 25000000, 27: 28000000, 28: 32000000, 29: 36000000,
};

export function getAcademyUpgradeCost(currentLevel: number): number {
  return academyUpgradeCosts[currentLevel] ?? 999999999;
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

// Investment tiers: basic, medium, high
export type YouthInvestmentTier = 'none' | 'basic' | 'medium' | 'high';

export function getYouthInvestmentInfo(tier: YouthInvestmentTier): { cost: number; minPlayers: number; maxPlayers: number; label: string } {
  switch (tier) {
    case 'basic': return { cost: 500000, minPlayers: 1, maxPlayers: 2, label: 'Básico (R$ 500k)' };
    case 'medium': return { cost: 1500000, minPlayers: 2, maxPlayers: 3, label: 'Médio (R$ 1.5M)' };
    case 'high': return { cost: 3000000, minPlayers: 3, maxPlayers: 5, label: 'Alto (R$ 3M)' };
    default: return { cost: 0, minPlayers: 0, maxPlayers: 0, label: 'Sem investimento' };
  }
}

export function getYouthMonthlyPlayers(investmentPerMonth: number): number {
  // Map old numeric values to new tiers for backward compatibility
  if (investmentPerMonth >= 3000000) return Math.floor(Math.random() * 3) + 3; // 3-5
  if (investmentPerMonth >= 1500000) return Math.floor(Math.random() * 2) + 2; // 2-3
  if (investmentPerMonth >= 500000) return Math.floor(Math.random() * 2) + 1; // 1-2
  return 0;
}

// Academy level 1-30 determines quality
export function getYouthMinOverall(academyLevel: number): number {
  // Level 1: 35, Level 15: 56, Level 30: 80
  return Math.min(35 + Math.floor(academyLevel * 1.5), 80);
}

export function getYouthMaxOverall(academyLevel: number): number {
  // Level 1: 45, Level 15: 67, Level 30: 90
  return Math.min(45 + Math.floor(academyLevel * 1.5), 90);
}

export interface YouthProspect extends Player {
  potential: number;
  monthsInAcademy: number;
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
