/**
 * FatigueSystem — Gerencia fadiga e recuperação dos jogadores
 * 
 * - Aplica perda de stamina por sessão de treino
 * - Recuperação natural entre semanas
 * - Staff de condicionamento reduz fadiga
 * - Personalidade 'festeiro' penaliza recuperação
 * - Separado do sistema de partidas (não altera placar nem eventos de jogo)
 */

import type { Player } from '@/types/game';
import type { TrainingIntensity } from './TrainingTypes';
import { intensityConfig } from './TrainingTypes';

export interface FatigueResult {
  playerId: string;
  staminaBefore: number;
  staminaAfter: number;
  recovered: number;
  lost: number;
}

export class FatigueSystem {
  /**
   * Aplica fadiga de uma sessão de treino.
   * fitnessCoachLevel 1-10: reduz fadiga em até 40%.
   */
  applyTrainingFatigue(
    player: Player,
    intensity: TrainingIntensity,
    fitnessCoachLevel: number
  ): { player: Player; result: FatigueResult } {
    if (player.injury) {
      // Lesionados não treinam — recuperação suave
      return this._recoveryOnly(player);
    }

    const baseFatigue = intensityConfig[intensity].fatiguePerSession;
    const coachReduction = 1 - (fitnessCoachLevel - 1) * 0.04; // até -36%
    const personalityPenalty = player.personality === 'festeiro' ? 1.3 : 1.0;
    const physicalBonus = player.personality === 'dedicado' ? 0.85 : 1.0;

    const fatigue = Math.round(baseFatigue * coachReduction * personalityPenalty * physicalBonus);
    const before = player.stamina;
    const after = Math.max(10, before - fatigue);

    console.log(`[Fatigue] ${player.name} | intensity=${intensity} | -${fatigue} stamina | ${before} → ${after}`);

    return {
      player: { ...player, stamina: after },
      result: { playerId: player.id, staminaBefore: before, staminaAfter: after, recovered: 0, lost: fatigue },
    };
  }

  /**
   * Aplica recuperação semanal (chamado entre semanas, sem partida).
   * fitnessCoachLevel melhora a recuperação.
   */
  applyWeeklyRecovery(
    player: Player,
    physioLevel: number,
    fitnessCoachLevel: number
  ): { player: Player; result: FatigueResult } {
    if (player.injury) {
      return this._recoveryOnly(player, physioLevel);
    }

    const baseRecovery = 10 + fitnessCoachLevel * 2 + physioLevel;
    const calmBonus = player.personality === 'calmo' ? 5 : 0;
    const festeiroPenalty = player.personality === 'festeiro' ? Math.floor(Math.random() * 8) : 0;
    const recovery = Math.max(0, baseRecovery + calmBonus - festeiroPenalty);

    const before = player.stamina;
    const after = Math.min(100, before + recovery);

    return {
      player: { ...player, stamina: after },
      result: { playerId: player.id, staminaBefore: before, staminaAfter: after, recovered: recovery, lost: 0 },
    };
  }

  /**
   * Verifica se jogador está em risco de overtraining.
   * Retorna um score 0-100 de risco.
   */
  getOvertrainingRisk(player: Player, consecutiveHeavySessions: number): number {
    if (player.stamina > 70) return 0;
    const staminaRisk = (70 - player.stamina) * 1.2;
    const sessionRisk = consecutiveHeavySessions * 15;
    return Math.min(100, staminaRisk + sessionRisk);
  }

  private _recoveryOnly(player: Player, physioLevel = 1): { player: Player; result: FatigueResult } {
    const recovery = 5 + physioLevel * 3;
    const before = player.stamina;
    const after = Math.min(100, before + recovery);
    return {
      player: { ...player, stamina: after },
      result: { playerId: player.id, staminaBefore: before, staminaAfter: after, recovered: recovery, lost: 0 },
    };
  }
}
