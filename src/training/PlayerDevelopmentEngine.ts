/**
 * PlayerDevelopmentEngine — Motor de evolução individual de atributos
 * 
 * Regras:
 * - Calcula progresso baseado em foco, intensidade, idade e personalidade
 * - Jovens (<25) evoluem mais rápido
 * - Acima de 33 não evoluem (apenas declinam)
 * - 'dedicado' +20% velocidade, 'preguicoso' -20%
 * - Staff técnico influencia chance de evolução
 */

import type { Player, PlayerAttributes } from '@/types/game';
import type { TrainingFocusKey, TrainingIntensity, DevelopmentLog, PlayerTrainingConfig } from './TrainingTypes';
import { focusToAttr, intensityConfig } from './TrainingTypes';

export interface StaffConfig {
  headCoach: number;       // 1-10: melhora chance geral
  fitnessCoach: number;    // 1-10: reduz fadiga, melhora físico
  youthDeveloper: number;  // 1-10: multiplicador para jogadores jovens
  medicalStaff: number;    // 1-10: reduz risco de lesão
}

export const defaultStaff: StaffConfig = {
  headCoach: 3,
  fitnessCoach: 3,
  youthDeveloper: 3,
  medicalStaff: 3,
};

export class PlayerDevelopmentEngine {
  private _logs: DevelopmentLog[] = [];

  /**
   * Processa evolução de um jogador em uma semana de treino.
   * Retorna o jogador possivelmente com atributo +1 e os logs.
   */
  processWeek(
    player: Player,
    config: PlayerTrainingConfig,
    trainingCenterLevel: number,
    staff: StaffConfig,
    week: number
  ): { player: Player; log: DevelopmentLog | null } {
    const { focus, intensity } = config;
    const attr = focusToAttr[focus];

    // Sem foco → sem evolução
    if (!attr || focus === 'none') {
      console.log(`[PDEngine] ${player.name} — sem foco, sem evolução.`);
      return { player, log: null };
    }

    // Idade máxima para evolução
    if (player.age > 33) {
      console.log(`[PDEngine] ${player.name} — idade ${player.age} > 33, sem evolução.`);
      return { player, log: null };
    }

    // Jogador lesionado não treina
    if (player.injury) {
      console.log(`[PDEngine] ${player.name} — lesionado, sem treino.`);
      return { player, log: null };
    }

    // Fator base: quantas semanas são necessárias por progressPoint
    const baseWeeksNeeded = Math.max(2, 10 - trainingCenterLevel);
    const intensityMult = intensityConfig[intensity].progressMultiplier;

    // Fator de idade: jovens evoluem mais rápido
    const ageFactor = player.age < 20 ? 1.6 : player.age < 25 ? 1.3 : player.age <= 30 ? 1.0 : 0.6;

    // Fator de personalidade
    const personalityFactor =
      player.personality === 'dedicado' ? 1.2 :
      player.personality === 'preguicoso' ? 0.8 : 1.0;

    // Staff boost
    const coachBoost = 1 + (staff.headCoach - 1) * 0.04; // +4% por nível
    const youthBoost = player.age < 23 ? 1 + (staff.youthDeveloper - 1) * 0.05 : 1.0;

    // Probabilidade de +1 atributo nesta semana
    const baseChance = 1 / baseWeeksNeeded;
    const finalChance = Math.min(0.95, baseChance * intensityMult * ageFactor * personalityFactor * coachBoost * youthBoost);

    console.log(`[PDEngine] ${player.name} | focus=${focus} | intensity=${intensity} | chance=${(finalChance * 100).toFixed(1)}%`);

    const roll = Math.random();
    if (roll > finalChance) {
      return { player, log: null };
    }

    // Atributo atual
    const currentVal = (player.attributes[attr] as number | undefined) ?? 0;
    const cap = player.age < 25 ? 99 : 95; // jovens podem chegar a 99
    if (currentVal >= cap) {
      console.log(`[PDEngine] ${player.name} — atributo ${attr} já no cap ${cap}.`);
      return { player, log: null };
    }

    const newVal = Math.min(cap, currentVal + 1);
    const updatedAttributes: PlayerAttributes = { ...player.attributes, [attr]: newVal };

    // Recalcula overall com o novo atributo
    const newOverall = this._recalcOverall(player, updatedAttributes);

    const updatedPlayer: Player = {
      ...player,
      attributes: updatedAttributes,
      overall: newOverall,
    };

    const log: DevelopmentLog = {
      playerId: player.id,
      playerName: player.name,
      attribute: attr,
      oldValue: currentVal,
      newValue: newVal,
      week,
      source: 'training',
    };

    this._logs.push(log);
    console.log(`[PDEngine] ✅ ${player.name} evoluiu ${attr}: ${currentVal} → ${newVal}`);
    return { player: updatedPlayer, log };
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

    console.log(`[PDEngine] 📉 ${player.name} declinou ${String(key)}: ${val} → ${val - 1}`);
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
