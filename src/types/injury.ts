/**
 * Sistema de Lesões V2 — tipos detalhados, propensão, recaída
 */

export type InjurySeverity = 'leve' | 'moderada' | 'grave' | 'cronica';

export type InjuryBodyPart = 'muscular' | 'joelho' | 'ligamento' | 'tornozelo' | 'fadiga';

export interface InjuryDefinition {
  bodyPart: InjuryBodyPart;
  name: string;
  severity: InjurySeverity;
  minDays: number;
  maxDays: number;
  /** Penalidade aplicada na simulação enquanto o jogador atua lesionado (leve). */
  performancePenalty: number; // 0.05 = -5%
  attributeImpact?: Partial<{ speed: number; physical: number; defending: number; positioning: number }>;
}

/** Catálogo de lesões V2 (definidas por região). */
export const INJURY_CATALOG: InjuryDefinition[] = [
  { bodyPart: 'muscular',  name: 'Distensão muscular',  severity: 'leve',     minDays: 1,  maxDays: 5,  performancePenalty: 0.07, attributeImpact: { speed: -3 } },
  { bodyPart: 'fadiga',    name: 'Fadiga extrema',      severity: 'leve',     minDays: 2,  maxDays: 4,  performancePenalty: 0.08, attributeImpact: { physical: -2 } },
  { bodyPart: 'tornozelo', name: 'Entorse de tornozelo',severity: 'moderada', minDays: 5,  maxDays: 12, performancePenalty: 0.20, attributeImpact: { speed: -2 } },
  { bodyPart: 'muscular',  name: 'Estiramento severo',  severity: 'moderada', minDays: 7,  maxDays: 15, performancePenalty: 0.22, attributeImpact: { physical: -3 } },
  { bodyPart: 'joelho',    name: 'Lesão de joelho',     severity: 'grave',    minDays: 15, maxDays: 35, performancePenalty: 1.0,  attributeImpact: { speed: -4, physical: -3 } },
  { bodyPart: 'ligamento', name: 'Ruptura de ligamento',severity: 'grave',    minDays: 30, maxDays: 60, performancePenalty: 1.0,  attributeImpact: { speed: -5, physical: -4 } },
];

/** Faixa de propensão a lesões (0-100). */
export type PronenessLevel = 'baixa' | 'media' | 'alta';

export function getPronenessLevel(value: number): PronenessLevel {
  if (value <= 30) return 'baixa';
  if (value <= 70) return 'media';
  return 'alta';
}

export function getPronenessMultiplier(value: number): number {
  const lvl = getPronenessLevel(value);
  return lvl === 'baixa' ? 1.0 : lvl === 'media' ? 1.3 : 1.6;
}

/** Chance base de recaída ao retornar de lesão. */
export function getRelapseChance(proneness: number, physioLevel: number): number {
  const base = 0.30;
  const proneBonus = proneness > 70 ? 0.30 : proneness > 30 ? 0.15 : 0;
  const physioReduction = physioLevel >= 16 ? 0.20 : physioLevel >= 11 ? 0.10 : physioLevel >= 6 ? 0.05 : 0;
  return Math.max(0, Math.min(0.9, base + proneBonus - physioReduction));
}

/** Penalidade aplicada ao desempenho na partida pela faixa de stamina. */
export function getStaminaPerformancePenalty(stamina: number): number {
  if (stamina >= 50) return 0;
  if (stamina >= 40) return 0.10;
  if (stamina >= 20) return 0.25;
  return 0.40;
}

/** Multiplicador adicional de risco de lesão pela faixa de stamina. */
export function getStaminaInjuryMultiplier(stamina: number): number {
  if (stamina >= 50) return 1.0;
  if (stamina >= 40) return 1.20;
  if (stamina >= 20) return 1.50;
  return 1.80;
}
