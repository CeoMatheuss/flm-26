/**
 * PlayerDevelopmentEngine V4 — Motor de evolução por CHANCE (%)
 *
 * Regras V4:
 * - A cada semana, rola uma chance de evolução baseada em:
 *     CT (3% a 32%) + idade (-30 a +20) + investimento mensal (0 a +10)
 *   Limites: 2% (mínimo) — 70% (máximo).
 * - Se a chance dispara, o jogador ganha um incremento no atributo treinado:
 *     ≤21 anos: +0.3   |   22-26: +0.2   |   27+: +0.1
 * - O incremento se acumula em `trainingProgress` (0–100). Quando passa de 100,
 *   o atributo principal sobe +1 (cap = potential do jogador).
 * - Treino Específico: 100% do incremento vai p/ atributo escolhido.
 * - Treino Grupo: vai p/ atributo de maior peso ainda abaixo do cap.
 * - Stamina é descontada pelo FatigueSystem (mantido em TrainingManager).
 */

import type { Player, PlayerAttributes } from '@/types/game';
import type { TrainingFocusKey, DevelopmentLog, PlayerTrainingConfig } from './TrainingTypes';
import { focusToAttr, intensityConfig, isGroupFocus, groupWeights } from './TrainingTypes';
import { calcEvolutionChance, getEvolutionGainByAge } from '@/types/infrastructure';

export interface StaffConfig {
  headCoach: number;
  fitnessCoach: number;
  youthDeveloper: number;
  medicalStaff: number;
}

export const defaultStaff: StaffConfig = {
  headCoach: 3, fitnessCoach: 3, youthDeveloper: 3, medicalStaff: 3,
};

export interface EvolutionBreakdown {
  ct: number;
  age: number;
  investment: number;
  total: number;          // chance final (clamp 2-70) já com modificadores
  gainPerEvent: number;   // 0.1 / 0.2 / 0.3
  expectedWeekly: number; // chance% × ganho × 100, em pontos de progresso
}

export class PlayerDevelopmentEngine {
  private _logs: DevelopmentLog[] = [];
  /** Bônus Premium global: +5 p.p. na chance final (cap 70). */
  public premiumBoost: boolean = false;
  /** Investimento mensal global em treino (R$). Setado pelo TrainingManager. */
  public monthlyInvestment: number = 0;

  setMonthlyInvestment(value: number) {
    this.monthlyInvestment = Math.max(0, value | 0);
  }

  /** Detalha a chance de evolução para um jogador (sem rolar). */
  computeBreakdown(
    player: Player,
    config: PlayerTrainingConfig,
    trainingCenterLevel: number,
  ): EvolutionBreakdown {
    const { ct, age, investment, total } = calcEvolutionChance(
      trainingCenterLevel, player.age, this.monthlyInvestment,
    );
    const intensityMult = intensityConfig[config.intensity].progressMultiplier; // 0.6 / 1.0 / 1.4
    const moraleMult = 0.85 + (player.morale / 100) * 0.3; // 0.85 a 1.15
    let chance = total * intensityMult * moraleMult;
    if (this.premiumBoost) chance += 5;
    if (player.injury) chance = 0;
    if (config.focus === 'none') chance = 0;
    chance = Math.max(0, Math.min(70, Math.round(chance * 10) / 10));

    const gainPerEvent = getEvolutionGainByAge(player.age);
    const expectedWeekly = +(chance / 100 * gainPerEvent * 100).toFixed(2);
    return { ct, age, investment, total: chance, gainPerEvent, expectedWeekly };
  }

  /** Compat: ganho semanal esperado em pontos de progresso (0-100). */
  calcWeeklyGain(
    player: Player,
    config: PlayerTrainingConfig,
    trainingCenterLevel: number,
    _staff: StaffConfig,
    _minutesPlayedThisWeek = 0,
  ): number {
    return this.computeBreakdown(player, config, trainingCenterLevel).expectedWeekly;
  }

  computeStatus(gain: number, player: Player): 'evoluindo' | 'normal' | 'lento' | 'travado' {
    if (player.injury) return 'travado';
    if (gain >= 8) return 'evoluindo';
    if (gain >= 4) return 'normal';
    if (gain >= 1) return 'lento';
    return 'travado';
  }

  /** Processa uma semana: rola a chance e aplica ganho fracionário. */
  processWeek(
    player: Player,
    config: PlayerTrainingConfig,
    trainingCenterLevel: number,
    _staff: StaffConfig,
    week: number,
    _minutesPlayedThisWeek = 0,
  ): { player: Player; log: DevelopmentLog | null } {
    const { focus } = config;
    if (focus === 'none' || player.injury) {
      return { player: { ...player, trainingStatus: 'travado' }, log: null };
    }

    const bd = this.computeBreakdown(player, config, trainingCenterLevel);
    const status = this.computeStatus(bd.expectedWeekly, player);

    const roll = Math.random() * 100;
    if (roll >= bd.total) {
      return { player: { ...player, trainingStatus: status }, log: null };
    }

    const gainPoints = bd.gainPerEvent * 100;

    let mainAttr: keyof PlayerAttributes | null = null;
    const cap = Math.max(40, Math.min(99, player.potential ?? 99));
    if (isGroupFocus(focus)) {
      const weights = groupWeights[focus];
      for (const w of weights) {
        const cur = (player.attributes[w.attr] as number | undefined) ?? 0;
        if (cur < cap) { mainAttr = w.attr; break; }
      }
    } else {
      mainAttr = focusToAttr[focus];
    }

    if (!mainAttr) {
      return { player: { ...player, trainingStatus: status }, log: null };
    }

    const currentVal = (player.attributes[mainAttr] as number | undefined) ?? 0;
    if (currentVal >= cap) {
      return { player: { ...player, trainingStatus: status, trainingProgress: 100 }, log: null };
    }

    const currentProgress = player.trainingProgress ?? 0;
    let newProgress = currentProgress + gainPoints;
    let log: DevelopmentLog | null = null;
    let updatedPlayer: Player = { ...player };

    if (newProgress >= 100) {
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
    }

    return {
      player: { ...updatedPlayer, trainingProgress: Math.max(0, Math.min(100, newProgress)), trainingStatus: status },
      log,
    };
  }

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
