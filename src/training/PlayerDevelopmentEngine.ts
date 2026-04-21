/**
 * PlayerDevelopmentEngine V3 — Motor de evolução por progresso (%)
 *
 * Regras V3:
 * - Cada semana adiciona % de progresso (0-100) baseado em CT, intensidade, idade, personalidade, moral
 * - Treino Específico: 100% do gain vai p/ atributo escolhido
 * - Treino Grupo: distribui pelos pesos do grupo (60/30/10 etc.)
 * - Ao atingir 100% → +1 no atributo principal e reseta progresso
 * - Bônus por minutos jogados (+0.5% por minuto)
 */

import type { Player, PlayerAttributes } from '@/types/game';
import type { TrainingFocusKey, DevelopmentLog, PlayerTrainingConfig } from './TrainingTypes';
import { focusToAttr, intensityConfig, isGroupFocus, groupWeights } from './TrainingTypes';
import { getCTEfficiency } from '@/types/infrastructure';

export interface StaffConfig {
  headCoach: number;
  fitnessCoach: number;
  youthDeveloper: number;
  medicalStaff: number;
}

export const defaultStaff: StaffConfig = {
  headCoach: 3, fitnessCoach: 3, youthDeveloper: 3, medicalStaff: 3,
};

export class PlayerDevelopmentEngine {
  private _logs: DevelopmentLog[] = [];

  /**
   * Calcula o gain semanal de progresso (em pontos %).
   */
  calcWeeklyGain(
    player: Player,
    config: PlayerTrainingConfig,
    trainingCenterLevel: number,
    staff: StaffConfig,
    minutesPlayedThisWeek = 0
  ): number {
    if (player.injury) return 0;
    if (player.age > 33) return 0;

    const baseEff = getCTEfficiency(trainingCenterLevel); // 1.0 a 15.0 %
    const intensityMult = intensityConfig[config.intensity].progressMultiplier;
    const ageFactor =
      player.age < 20 ? 1.6 :
      player.age < 25 ? 1.3 :
      player.age <= 30 ? 1.0 : 0.6;
    const personalityFactor =
      player.personality === 'dedicado' ? 1.2 :
      player.personality === 'preguicoso' ? 0.8 : 1.0;
    const moraleFactor = 0.7 + (player.morale / 100) * 0.6; // 0.7 a 1.3
    const coachBoost = 1 + (staff.headCoach - 1) * 0.04;
    const youthBoost = player.age < 23 ? 1 + (staff.youthDeveloper - 1) * 0.05 : 1;

    const gain = baseEff * intensityMult * ageFactor * personalityFactor * moraleFactor * coachBoost * youthBoost;
    const matchBonus = minutesPlayedThisWeek * 0.5; // +0.5%/min jogado
    return Math.max(0, gain + matchBonus);
  }

  /**
   * Determina status visual a partir do gain semanal.
   */
  computeStatus(gain: number, player: Player): 'evoluindo' | 'normal' | 'lento' | 'travado' {
    if (player.age > 33 || player.injury) return 'travado';
    if (gain >= 8) return 'evoluindo';
    if (gain >= 4) return 'normal';
    if (gain >= 1) return 'lento';
    return 'travado';
  }

  /**
   * Processa uma semana de treino.
   */
  processWeek(
    player: Player,
    config: PlayerTrainingConfig,
    trainingCenterLevel: number,
    staff: StaffConfig,
    week: number,
    minutesPlayedThisWeek = 0
  ): { player: Player; log: DevelopmentLog | null } {
    const { focus } = config;
    if (focus === 'none') {
      return { player: { ...player, trainingStatus: 'travado' }, log: null };
    }

    const gain = this.calcWeeklyGain(player, config, trainingCenterLevel, staff, minutesPlayedThisWeek);
    const status = this.computeStatus(gain, player);

    if (gain <= 0) {
      return { player: { ...player, trainingStatus: status }, log: null };
    }

    const currentProgress = player.trainingProgress ?? 0;
    let newProgress = currentProgress + gain;
    let log: DevelopmentLog | null = null;
    let updatedPlayer = { ...player };

    // Distribui ganho para atributos (Grupo) ou atributo único (Específico)
    if (isGroupFocus(focus)) {
      // Para grupo: aplica progresso parcial em cada atributo conforme peso
      // Aqui preenche progress global; o "+1" vai pro atributo de maior peso ao completar
    }

    if (newProgress >= 100) {
      // Determina atributo principal a evoluir
      let mainAttr: keyof PlayerAttributes | null = null;
      if (isGroupFocus(focus)) {
        // pega atributo de maior peso, mas que ainda não atingiu cap
        const weights = groupWeights[focus];
        const cap = player.age < 25 ? 99 : 95;
        for (const w of weights) {
          const cur = (player.attributes[w.attr] as number | undefined) ?? 0;
          if (cur < cap) { mainAttr = w.attr; break; }
        }
      } else {
        mainAttr = focusToAttr[focus];
      }

      if (mainAttr) {
        const currentVal = (player.attributes[mainAttr] as number | undefined) ?? 0;
        const cap = player.age < 25 ? 99 : 95;
        if (currentVal < cap) {
          const newVal = Math.min(cap, currentVal + 1);
          const updatedAttributes: PlayerAttributes = { ...player.attributes, [mainAttr]: newVal };
          const newOverall = this._recalcOverall(player, updatedAttributes);
          updatedPlayer = {
            ...player,
            attributes: updatedAttributes,
            overall: newOverall,
            lastTrainedAttr: mainAttr,
          };
          log = {
            playerId: player.id,
            playerName: player.name,
            attribute: mainAttr,
            oldValue: currentVal,
            newValue: newVal,
            week,
            source: 'training',
          };
          this._logs.push(log);
          newProgress = newProgress - 100;
        } else {
          newProgress = 100; // trava
        }
      }
    }

    return {
      player: { ...updatedPlayer, trainingProgress: Math.max(0, Math.min(100, newProgress)), trainingStatus: status },
      log,
    };
  }

  /**
   * Aplica declínio por idade para jogadores acima de 33.
   */
  applyAgingDecline(player: Player): Player {
    if (player.age <= 33) return player;
    const declineChance = 0.08 + (player.age - 33) * 0.05;
    if (Math.random() > declineChance) return player;

    const attrs = Object.entries(player.attributes) as [keyof PlayerAttributes, number][];
    const eligible = attrs.filter(([, v]) => v > 40);
    if (eligible.length === 0) return player;

    const [key, val] = eligible[Math.floor(Math.random() * eligible.length)];
    const updatedAttributes: PlayerAttributes = { ...player.attributes, [key]: Math.max(40, val - 1) };
    const newOverall = this._recalcOverall(player, updatedAttributes);

    return { ...player, attributes: updatedAttributes, overall: newOverall };
  }

  getLogs(): DevelopmentLog[] { return this._logs; }
  clearLogs(): void { this._logs = []; }

  private _recalcOverall(player: Player, attrs: PlayerAttributes): number {
    const isGol = player.position === 'GOL';
    const weights = isGol
      ? { defending: 0.25, physical: 0.15, positioning: 0.20, composure: 0.15, goalkeeping: 0.25 }
      : {
          speed: 0.12, shooting: 0.12, passing: 0.12, defending: 0.10, physical: 0.10,
          dribbling: 0.09, positioning: 0.09, heading: 0.06, vision: 0.07, composure: 0.07,
          marking: 0.06,
        };

    let sum = 0, totalWeight = 0;
    for (const [k, w] of Object.entries(weights)) {
      const v = (attrs as any)[k] ?? 0;
      sum += v * (w as number);
      totalWeight += w as number;
    }
    return Math.round(Math.min(99, Math.max(40, sum / totalWeight)));
  }
}
