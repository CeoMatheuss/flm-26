import { Player } from './game';

export interface Infrastructure {
  trainingCenter: FacilityLevel;
  youthAcademy: FacilityLevel;
  stadium: FacilityLevel;
  physiotherapy: FacilityLevel;
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

export function getUpgradeCost(currentLevel: number): number {
  return facilityCosts[currentLevel + 1] ?? 999999999;
}

export const defaultInfrastructure: Infrastructure = {
  trainingCenter: { level: 0, maxLevel: 10 },
  youthAcademy: { level: 0, maxLevel: 10 },
  stadium: { level: 1, maxLevel: 15 },
  physiotherapy: { level: 0, maxLevel: 10 },
};

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

export function getYouthMonthlyPlayers(investmentPerMonth: number): number {
  if (investmentPerMonth <= 0) return 0;
  if (investmentPerMonth >= 2000000) return 8;
  if (investmentPerMonth >= 1000000) return 6;
  if (investmentPerMonth >= 500000) return 5;
  if (investmentPerMonth >= 250000) return 3;
  if (investmentPerMonth >= 100000) return 2;
  return 1;
}

export function getYouthMinOverall(academyLevel: number): number {
  return Math.min(45 + academyLevel * 4, 85);
}

export function getYouthMaxOverall(academyLevel: number): number {
  return Math.min(55 + academyLevel * 4, 95);
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
