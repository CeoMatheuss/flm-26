/**
 * FatigueSystem V2 — Stamina diária com base 30 + bônus do fisio
 *
 * - Recuperação base: 30/dia (cap 50 com fisio nível 20)
 * - Modificadores: jogou (-20%), stamina <50 (-30%), ambos (-50%)
 * - Desgaste por partida baseado no atributo `physical` (-20 a -40)
 * - Treino contribui com fadiga adicional quando aplicável
 */

import type { Player } from '@/types/game';
import type { TrainingIntensity } from './TrainingTypes';
import { intensityConfig } from './TrainingTypes';
import { getDailyStaminaRecovery, getPhysioBonuses } from '@/types/infrastructure';

export interface FatigueResult {
  playerId: string;
  staminaBefore: number;
  staminaAfter: number;
  recovered: number;
  lost: number;
}

export class FatigueSystem {
  /** Aplica fadiga de uma sessão de treino. */
  applyTrainingFatigue(
    player: Player,
    intensity: TrainingIntensity,
    fitnessCoachLevel: number
  ): { player: Player; result: FatigueResult } {
    if (player.injury && player.injury.severity !== 'leve') {
      return this._recoveryOnly(player);
    }

    const baseFatigue = intensityConfig[intensity].fatiguePerSession;
    const coachReduction = 1 - (fitnessCoachLevel - 1) * 0.04;
    const personalityPenalty = player.personality === 'festeiro' ? 1.3 : 1.0;
    const physicalBonus = player.personality === 'dedicado' ? 0.85 : 1.0;
    // Treinar lesionado leve: +10 fadiga adicional
    const injuredExtra = player.injury?.severity === 'leve' ? 10 : 0;

    const fatigue = Math.round(baseFatigue * coachReduction * personalityPenalty * physicalBonus) + injuredExtra;
    const before = player.stamina;
    const after = Math.max(10, before - fatigue);

    return {
      player: { ...player, stamina: after },
      result: { playerId: player.id, staminaBefore: before, staminaAfter: after, recovered: 0, lost: fatigue },
    };
  }

  /**
   * Aplica desgaste após partida — V2 baseado no atributo `physical`.
   * Físico 80-100 → -20 | 60-79 → -25 | 40-59 → -30 | 0-39 → -40
   */
  applyMatchWear(player: Player, minutesPlayed = 90): { player: Player; result: FatigueResult } {
    const physical = player.attributes?.physical ?? 60;
    let baseLoss = 40;
    if (physical >= 80) baseLoss = 20;
    else if (physical >= 60) baseLoss = 25;
    else if (physical >= 40) baseLoss = 30;

    const minuteFactor = Math.max(0.3, minutesPlayed / 90);
    const loss = Math.round(baseLoss * minuteFactor);
    const before = player.stamina;
    const after = Math.max(0, before - loss);

    return {
      player: { ...player, stamina: after },
      result: { playerId: player.id, staminaBefore: before, staminaAfter: after, recovered: 0, lost: loss },
    };
  }

  /**
   * Recuperação diária V2.
   * - Base: 30 + fisio (cap 50)
   * - Jogou no dia: ×0.8
   * - Stamina < 50: ×0.7
   * - Ambos: ×0.5 (sobrescreve)
   */
  applyDailyRecovery(
    player: Player,
    physioLevel: number,
    playedToday: boolean
  ): { player: Player; result: FatigueResult } {
    const baseRecovery = getDailyStaminaRecovery(physioLevel);
    const lowStamina = player.stamina < 50;

    let mult = 1.0;
    if (playedToday && lowStamina) mult = 0.5;
    else if (playedToday) mult = 0.8;
    else if (lowStamina) mult = 0.7;

    // Penalidade por personalidade festeira (perde até 8)
    const festeiroPenalty = player.personality === 'festeiro' ? Math.floor(Math.random() * 8) : 0;
    // Bônus de calmo
    const calmBonus = player.personality === 'calmo' ? 3 : 0;

    const recovery = Math.max(0, Math.round(baseRecovery * mult) + calmBonus - festeiroPenalty);
    const before = player.stamina;
    const after = Math.min(100, before + recovery);

    return {
      player: { ...player, stamina: after },
      result: { playerId: player.id, staminaBefore: before, staminaAfter: after, recovered: recovery, lost: 0 },
    };
  }

  /** Mantido para compatibilidade — chama applyDailyRecovery sem partida. */
  applyWeeklyRecovery(
    player: Player,
    physioLevel: number,
    _fitnessCoachLevel: number
  ): { player: Player; result: FatigueResult } {
    return this.applyDailyRecovery(player, physioLevel, false);
  }

  getOvertrainingRisk(player: Player, consecutiveHeavySessions: number): number {
    if (player.stamina > 70) return 0;
    const staminaRisk = (70 - player.stamina) * 1.2;
    const sessionRisk = consecutiveHeavySessions * 15;
    return Math.min(100, staminaRisk + sessionRisk);
  }

  private _recoveryOnly(player: Player, physioLevel = 1): { player: Player; result: FatigueResult } {
    const bonuses = getPhysioBonuses(physioLevel);
    const recovery = Math.round((5 + physioLevel * 3) * (1 + bonuses.recoverySpeed));
    const before = player.stamina;
    const after = Math.min(100, before + recovery);
    return {
      player: { ...player, stamina: after },
      result: { playerId: player.id, staminaBefore: before, staminaAfter: after, recovered: recovery, lost: 0 },
    };
  }
}
