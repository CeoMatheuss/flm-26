import { Player } from './game';

export interface Infrastructure {
  trainingCenter: FacilityLevel;
  youthAcademy: FacilityLevel;
  stadium: FacilityLevel;
  physiotherapy: FacilityLevel;
}

// Training Center upgrade costs (level 1-30) — V3 rebalanced
export const trainingCenterCosts: Record<number, number> = {
  // 1→5
  1: 300_000, 2: 600_000, 3: 1_000_000, 4: 1_500_000, 5: 2_000_000,
  // 6→10
  6: 2_500_000, 7: 3_500_000, 8: 5_000_000, 9: 6_500_000, 10: 8_000_000,
  // 11→15
  11: 10_000_000, 12: 13_000_000, 13: 16_000_000, 14: 20_000_000, 15: 25_000_000,
  // 16→20
  16: 30_000_000, 17: 38_000_000, 18: 46_000_000, 19: 55_000_000, 20: 65_000_000,
  // 21→25
  21: 75_000_000, 22: 90_000_000, 23: 110_000_000, 24: 130_000_000, 25: 150_000_000,
  // 26→30
  26: 180_000_000, 27: 210_000_000, 28: 250_000_000, 29: 300_000_000, 30: 350_000_000,
};

export function getTrainingCenterUpgradeCost(currentLevel: number): number {
  return trainingCenterCosts[currentLevel + 1] ?? 999999999;
}

// CT Efficiency per week (% gain) — V3
export const ctEfficiencyByLevel: Record<number, number> = {
  1: 1.0, 2: 1.2, 3: 1.5, 4: 1.8, 5: 2.2,
  6: 2.6, 7: 3.0, 8: 3.5, 9: 4.0, 10: 4.5,
  11: 5.0, 12: 5.5, 13: 6.0, 14: 6.5, 15: 7.0,
  16: 7.5, 17: 8.0, 18: 8.5, 19: 9.0, 20: 9.5,
  21: 10.0, 22: 10.5, 23: 11.0, 24: 11.5, 25: 12.0,
  26: 12.5, 27: 13.0, 28: 13.5, 29: 14.0, 30: 15.0,
};

export function getCTEfficiency(level: number): number {
  return ctEfficiencyByLevel[level] ?? 1.0;
}

// ─── V4: Sistema de chance de evolução por sessão ──────────────────────
// Chance base por nível do CT (1→3% até 30→32%).
export function getCTEvolutionChance(level: number): number {
  const lv = Math.max(1, Math.min(30, level));
  return 2 + lv; // 1→3, 2→4, ..., 30→32
}

// Bônus/penalidade por idade.
export function getAgeEvolutionBonus(age: number): number {
  if (age <= 21) return 20;
  if (age <= 26) return 10;
  if (age <= 30) return 0;
  if (age <= 34) return -15;
  return -30;
}

// Tiers de investimento mensal em treino. Valores em R$.
export const trainingInvestmentTiers = [0, 50_000, 100_000, 200_000, 300_000, 500_000] as const;
export type TrainingInvestmentTier = typeof trainingInvestmentTiers[number];

export function getInvestmentEvolutionBonus(monthlyInvestment: number): number {
  const v = Math.max(0, monthlyInvestment | 0);
  if (v >= 500_000) return 10;
  if (v >= 300_000) return 8;
  if (v >= 200_000) return 6;
  if (v >= 100_000) return 4;
  if (v >= 50_000)  return 2;
  return 0;
}

// Chance final (clamp 2% — 70%).
export function calcEvolutionChance(
  ctLevel: number,
  age: number,
  monthlyInvestment: number,
): { ct: number; age: number; investment: number; total: number } {
  const ct = getCTEvolutionChance(ctLevel);
  const ageB = getAgeEvolutionBonus(age);
  const inv = getInvestmentEvolutionBonus(monthlyInvestment);
  const raw = ct + ageB + inv;
  const total = Math.max(2, Math.min(70, raw));
  return { ct, age: ageB, investment: inv, total };
}

// Ganho de atributo por evento de evolução, por idade.
// Jovens evoluem mais rápido (já que escolhemos "Por idade" no design).
export function getEvolutionGainByAge(age: number): number {
  if (age <= 21) return 0.3; // forte
  if (age <= 26) return 0.2; // médio
  return 0.1;                // fraco
}

export interface FacilityLevel {
  level: number;
  maxLevel: number;
  /** ISO date string when an in-progress upgrade completes (used for non-Premium 24h delay). */
  upgradeCompletesAt?: string;
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

export function getUpgradeCost(currentLevel: number, facility?: 'physiotherapy' | string): number {
  if (facility === 'physiotherapy') return physiotherapyCosts[currentLevel + 1] ?? 999_999_999;
  return facilityCosts[currentLevel + 1] ?? 999999999;
}

export const defaultInfrastructure: Infrastructure = {
  trainingCenter: { level: 0, maxLevel: 30 },
  youthAcademy: { level: 0, maxLevel: 30 },
  stadium: { level: 1, maxLevel: 15 },
  physiotherapy: { level: 0, maxLevel: 20 },
};

// ─── Physiotherapy V3 (Nv 1-20) — Custos rebalanceados ──────────────────
// IMPORTANTE: chave N = custo para SUBIR PARA o nível N (de N-1 → N).
// Ex.: physiotherapyCosts[2] = 300k = custo de Nv 1 → Nv 2.
export const physiotherapyCosts: Record<number, number> = {
  1: 150_000,
  2: 300_000,    3: 500_000,    4: 800_000,    5: 1_200_000,  6: 1_800_000,
  7: 2_500_000,  8: 3_500_000,  9: 4_800_000,  10: 6_000_000,
  11: 8_000_000, 12: 10_000_000, 13: 13_000_000, 14: 16_000_000, 15: 20_000_000,
  16: 25_000_000, 17: 32_000_000, 18: 40_000_000, 19: 50_000_000, 20: 65_000_000,
};

export function getPhysioUpgradeCost(currentLevel: number): number {
  // Custo para subir do nível atual para o próximo
  return physiotherapyCosts[currentLevel + 1] ?? 999_999_999;
}

/** Bônus do fisio por nível (V2). */
export interface PhysioBonuses {
  /** % a mais de velocidade na recuperação de lesão. */
  recoverySpeed: number;
  /** % de redução do risco de lesão. */
  injuryRiskReduction: number;
  /** % de redução da chance de recaída. */
  relapseReduction: number;
  /** % de proteção quando jogador atua com stamina baixa. */
  lowStaminaProtection: number;
}

export function getPhysioBonuses(level: number): PhysioBonuses {
  if (level >= 16) return { recoverySpeed: 0.15, injuryRiskReduction: 0.15, relapseReduction: 0.20, lowStaminaProtection: 0.15 };
  if (level >= 11) return { recoverySpeed: 0.10, injuryRiskReduction: 0.10, relapseReduction: 0.10, lowStaminaProtection: 0.10 };
  if (level >= 6)  return { recoverySpeed: 0.05, injuryRiskReduction: 0.05, relapseReduction: 0.05, lowStaminaProtection: 0.05 };
  return { recoverySpeed: 0, injuryRiskReduction: 0, relapseReduction: 0, lowStaminaProtection: 0 };
}

/** Recuperação diária de stamina V2: base 30 + 1 por nível, máx 50. */
export function getDailyStaminaRecovery(physioLevel: number): number {
  return Math.min(50, 30 + Math.max(0, physioLevel));
}

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

// Investment tiers — Base V2 (rebalanced for Weekly/Monthly flow)
export type YouthInvestmentTier = 'none' | 'low' | 'intermediate' | 'high' | 'advanced' | 'elite';

export interface YouthInvestmentTierInfo {
  tier: YouthInvestmentTier;
  monthlyCost: number;
  weeklyCost: number;
  minPlayersPerMonth: number;
  maxPlayersPerMonth: number;
  playersPerWeek: number | 'random';
  label: string;
  emoji: string;
  description: string;
  qualityBonus: number; // 0-100 scale for quality boost
}

export const youthInvestmentTiers: YouthInvestmentTierInfo[] = [
  { 
    tier: 'none', 
    monthlyCost: 0, 
    weeklyCost: 0,
    minPlayersPerMonth: 0, 
    maxPlayersPerMonth: 0, 
    playersPerWeek: 0,
    label: 'Sem Investimento', 
    emoji: '❌', 
    description: 'Nenhum jovem será gerado',
    qualityBonus: 0
  },
  { 
    tier: 'low', 
    monthlyCost: 200_000, 
    weeklyCost: 50_000,
    minPlayersPerMonth: 1, 
    maxPlayersPerMonth: 1, 
    playersPerWeek: 'random',
    label: 'Investimento Baixo', 
    emoji: '🔹', 
    description: 'Gera 1 jogador por MÊS. Overall baixo/médio.',
    qualityBonus: 5
  },
  { 
    tier: 'intermediate', 
    monthlyCost: 600_000, 
    weeklyCost: 150_000,
    minPlayersPerMonth: 2, 
    maxPlayersPerMonth: 3, 
    playersPerWeek: 'random',
    label: 'Intermediário', 
    emoji: '🔸', 
    description: 'Gera 2 a 3 jogadores por MÊS. Geração aleatória.',
    qualityBonus: 15
  },
  { 
    tier: 'high', 
    monthlyCost: 1_200_000, 
    weeklyCost: 300_000,
    minPlayersPerMonth: 4, 
    maxPlayersPerMonth: 4, 
    playersPerWeek: 1,
    label: 'Investimento Alto', 
    emoji: '🔶', 
    description: 'Obrigatoriamente 1 jogador por SEMANA. Melhor qualidade.',
    qualityBonus: 30
  },
  { 
    tier: 'advanced', 
    monthlyCost: 2_400_000, 
    weeklyCost: 600_000,
    minPlayersPerMonth: 4, 
    maxPlayersPerMonth: 4, 
    playersPerWeek: 1,
    label: 'Avançado', 
    emoji: '💎', 
    description: '1 por semana. Maior chance de jogadores raros.',
    qualityBonus: 50
  },
  { 
    tier: 'elite', 
    monthlyCost: 5_000_000, 
    weeklyCost: 1_250_000,
    minPlayersPerMonth: 5, 
    maxPlayersPerMonth: 5, 
    playersPerWeek: 1, // At least 1, some weeks 2
    label: 'Elite', 
    emoji: '🔴', 
    description: 'Até 5 por mês. Alta chance de Geração Dourada.',
    qualityBonus: 80
  },
];

export function getYouthTierByMonthlyCost(cost: number): YouthInvestmentTierInfo {
  return youthInvestmentTiers.reduce((prev, curr) =>
    Math.abs(curr.monthlyCost - cost) < Math.abs(prev.monthlyCost - cost) ? curr : prev
  , youthInvestmentTiers[0]);
}

export function getYouthInvestmentInfo(tier: YouthInvestmentTier): YouthInvestmentTierInfo {
  return youthInvestmentTiers.find(t => t.tier === tier) ?? youthInvestmentTiers[0];
}

export function getYouthWeeklyPlayers(tier: YouthInvestmentTier, weekOfMonth: number, monthlyCount: number): number {
  const info = getYouthInvestmentInfo(tier);
  if (info.tier === 'none') return 0;
  
  if (info.playersPerWeek === 1) {
    // Advanced/Elite/High: 1 per week. Elite gets +1 on a random week to reach 5.
    if (info.tier === 'elite' && weekOfMonth === 4) return 2; // Elite generates 2 on the last week or random
    return 1;
  }
  
  if (info.tier === 'low') {
    return weekOfMonth === 1 ? 1 : 0; // Low generates 1 on the first week
  }
  
  if (info.tier === 'intermediate') {
    // Random 2 or 3 per month
    const totalToGen = monthlyCount || (Math.random() < 0.5 ? 2 : 3);
    if (weekOfMonth === 1) return 1;
    if (weekOfMonth === 2 && totalToGen >= 2) return 1;
    if (weekOfMonth === 3 && totalToGen >= 3) return 1;
    return 0;
  }
  
  return 0;
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

// Hidden potential tier (Rarities)
export type PotentialTier = 'comum' | 'raro' | 'elite' | 'joia_base' | 'geracao_dourada';

export function getPotentialTier(potential: number, overall: number): PotentialTier {
  if (potential >= 95) return 'geracao_dourada';
  if (potential >= 90) return 'joia_base';
  if (potential >= 85) return 'elite';
  if (potential >= 78) return 'raro';
  return 'comum';
}

export const potentialTierInfo: Record<PotentialTier, { label: string; emoji: string; color: string; border: string }> = {
  comum: { label: 'Comum', emoji: '⚪', color: 'text-white/40', border: 'border-white/10' },
  raro: { label: 'Raro', emoji: '🔵', color: 'text-blue-400', border: 'border-blue-400/30' },
  elite: { label: 'Elite', emoji: '🟣', color: 'text-purple-400', border: 'border-purple-400/30' },
  joia_base: { label: 'Joia da Base', emoji: '💎', color: 'text-cyan-400', border: 'border-cyan-400/30' },
  geracao_dourada: { label: 'Geração Dourada', emoji: '🌟', color: 'text-amber-400', border: 'border-amber-400/30' },
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
