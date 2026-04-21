/**
 * InjuryRiskSystem V2 — Risco com propensão, recaída, severidade detalhada e bônus do fisio
 */

import type { Player, Injury } from '@/types/game';
import type { TrainingIntensity } from './TrainingTypes';
import { intensityConfig } from './TrainingTypes';
import { getPhysioBonuses } from '@/types/infrastructure';
import {
  INJURY_CATALOG, getPronenessMultiplier, getRelapseChance,
  getStaminaInjuryMultiplier, type InjuryDefinition,
} from '@/types/injury';

export interface InjuryRiskResult {
  playerId: string;
  riskPercent: number;
  injured: boolean;
  injury?: Injury;
  isRelapse?: boolean;
}

export class InjuryRiskSystem {
  /**
   * Avalia risco de lesão em sessão de treino — V2.
   * Considera: intensidade, stamina, idade, propensão, fisioterapia, personalidade.
   */
  evaluate(
    player: Player,
    intensity: TrainingIntensity,
    physioLevel: number
  ): InjuryRiskResult {
    if (player.injury && player.injury.severity !== 'leve') {
      return { playerId: player.id, riskPercent: 0, injured: false };
    }

    const baseRisk = 0.04;
    const intensityMult = intensityConfig[intensity].injuryRiskMultiplier;
    const staminaMult = getStaminaInjuryMultiplier(player.stamina);
    const ageFactor = player.age > 32 ? 1.5 : player.age > 28 ? 1.2 : 1.0;
    const proneness = player.injuryProneness ?? 30;
    const pronenessMult = getPronenessMultiplier(proneness);
    const personalityFactor = player.personality === 'festeiro' ? 1.2 : 1.0;
    // Treinar lesionado leve: +30% risco
    const injuredExtra = player.injury?.severity === 'leve' ? 1.3 : 1.0;

    const physioBonuses = getPhysioBonuses(physioLevel);
    const physioReduction = 1 - physioBonuses.injuryRiskReduction;

    const finalRisk = Math.min(0.85,
      baseRisk * intensityMult * staminaMult * ageFactor *
      pronenessMult * personalityFactor * injuredExtra * physioReduction
    );
    const riskPercent = Math.round(finalRisk * 100);

    const roll = Math.random();
    const injured = roll < finalRisk;

    if (!injured) {
      return { playerId: player.id, riskPercent, injured: false };
    }

    const def = this._pickInjury(player);
    const days = def.minDays + Math.floor(Math.random() * (def.maxDays - def.minDays + 1));
    const weeks = Math.max(1, Math.round(days / 7));

    const injury: Injury = {
      type: def.name,
      severity: def.severity,
      bodyPart: def.bodyPart,
      weeksRemaining: weeks,
      originalWeeks: weeks,
    };

    return { playerId: player.id, riskPercent, injured: true, injury };
  }

  /**
   * Calcula chance de recaída ao retornar de uma lesão moderada/grave.
   * Se ocorrer, retorna nova lesão (tempo dobrado, severidade pode subir).
   */
  rollRelapse(player: Player, lastInjury: Injury, physioLevel: number): Injury | null {
    const proneness = player.injuryProneness ?? 30;
    const chance = getRelapseChance(proneness, physioLevel);
    if (Math.random() >= chance) return null;

    let severity: Injury['severity'] = lastInjury.severity;
    if (lastInjury.severity === 'leve') severity = 'moderada';
    else if (lastInjury.severity === 'moderada' && Math.random() < 0.4) severity = 'grave';

    const newWeeks = Math.max(2, lastInjury.originalWeeks * 2);
    return {
      type: `Recaída: ${lastInjury.type}`,
      severity,
      bodyPart: lastInjury.bodyPart,
      weeksRemaining: newWeeks,
      originalWeeks: newWeeks,
      isRelapse: true,
    };
  }

  /**
   * Aplica recuperação semanal de jogador lesionado considerando velocidade do fisio.
   */
  tickRecovery(player: Player, physioLevel: number): Player {
    if (!player.injury) return player;
    const bonuses = getPhysioBonuses(physioLevel);
    // Acelera recovery: cada semana decrementa um pouco mais com fisio alto
    const decrement = 1 + bonuses.recoverySpeed; // 1.0 a 1.15
    const remaining = Math.max(0, player.injury.weeksRemaining - decrement);
    if (remaining <= 0) {
      return { ...player, injury: undefined };
    }
    return { ...player, injury: { ...player.injury, weeksRemaining: remaining } };
  }

  /** Atualiza propensão a lesão após cada lesão sofrida (+5, cap 100). */
  bumpProneness(player: Player): Player {
    const current = player.injuryProneness ?? 30;
    return {
      ...player,
      injuryProneness: Math.min(100, current + 5),
      injuryCount: (player.injuryCount ?? 0) + 1,
    };
  }

  private _pickInjury(player: Player): InjuryDefinition {
    // Stamina muito baixa = chance maior de lesão moderada/grave
    let pool = INJURY_CATALOG;
    if (player.stamina < 30) {
      pool = INJURY_CATALOG.filter(i => i.severity !== 'leve');
    } else if (player.stamina < 50) {
      pool = INJURY_CATALOG.filter(i => i.severity !== 'grave');
    } else {
      pool = INJURY_CATALOG.filter(i => i.severity === 'leve' || i.severity === 'moderada');
    }
    if (pool.length === 0) pool = INJURY_CATALOG;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
