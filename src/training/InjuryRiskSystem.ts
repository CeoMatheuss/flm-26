/**
 * InjuryRiskSystem — Calcula risco de lesão em treinos e aplica se necessário
 * 
 * Separado do sistema de partidas.
 * Risco base em treinos é menor que em partidas.
 * Fatores: intensidade, stamina, idade, personalidade, staff médico.
 */

import type { Player, Injury } from '@/types/game';
import type { TrainingIntensity } from './TrainingTypes';
import { intensityConfig } from './TrainingTypes';

export interface InjuryRiskResult {
  playerId: string;
  riskPercent: number; // 0-100
  injured: boolean;
  injury?: Injury;
}

const TRAINING_INJURY_TYPES: Array<{ type: string; severity: Injury['severity']; minWeeks: number; maxWeeks: number }> = [
  { type: 'Distensão muscular', severity: 'leve',     minWeeks: 1, maxWeeks: 2 },
  { type: 'Cãibra severa',      severity: 'leve',     minWeeks: 1, maxWeeks: 1 },
  { type: 'Entorse de tornozelo', severity: 'moderada', minWeeks: 2, maxWeeks: 4 },
  { type: 'Sobrecarga muscular', severity: 'moderada', minWeeks: 2, maxWeeks: 3 },
  { type: 'Lesão de joelho',    severity: 'grave',    minWeeks: 4, maxWeeks: 8 },
];

export class InjuryRiskSystem {
  /**
   * Calcula risco e opcionalmente aplica lesão.
   * medicalStaffLevel 1-10: reduz risco em até 40%.
   */
  evaluate(
    player: Player,
    intensity: TrainingIntensity,
    medicalStaffLevel: number
  ): InjuryRiskResult {
    // Jogador já lesionado — sem novo risco de treino
    if (player.injury) {
      return { playerId: player.id, riskPercent: 0, injured: false };
    }

    const baseRisk = 0.04; // 4% base por sessão de treino pesado
    const intensityMult = intensityConfig[intensity].injuryRiskMultiplier;

    // Stamina baixa aumenta risco
    const staminaFactor = player.stamina < 30 ? 3.0 : player.stamina < 50 ? 1.8 : 1.0;

    // Idade aumenta risco
    const ageFactor = player.age > 32 ? 1.5 : player.age > 28 ? 1.2 : 1.0;

    // Staff médico reduz risco
    const medicalReduction = 1 - (medicalStaffLevel - 1) * 0.04;

    // Personalidade
    const personalityFactor = player.personality === 'festeiro' ? 1.2 : 1.0;

    const finalRisk = Math.min(0.8, baseRisk * intensityMult * staminaFactor * ageFactor * medicalReduction * personalityFactor);
    const riskPercent = Math.round(finalRisk * 100);

    const roll = Math.random();
    const injured = roll < finalRisk;

    console.log(`[InjuryRisk] ${player.name} | risk=${riskPercent}% | roll=${(roll * 100).toFixed(1)}% | injured=${injured}`);

    if (!injured) {
      return { playerId: player.id, riskPercent, injured: false };
    }

    // Determina tipo de lesão — menor risco para treinos vs partidas
    const injuryPool = player.stamina < 30
      ? TRAINING_INJURY_TYPES.filter(t => t.severity !== 'leve')
      : TRAINING_INJURY_TYPES.filter(t => t.severity !== 'grave');

    const selected = injuryPool[Math.floor(Math.random() * injuryPool.length)];
    const weeks = selected.minWeeks + Math.floor(Math.random() * (selected.maxWeeks - selected.minWeeks + 1));

    const injury: Injury = {
      type: selected.type,
      severity: selected.severity,
      weeksRemaining: weeks,
      originalWeeks: weeks,
    };

    return { playerId: player.id, riskPercent, injured: true, injury };
  }
}
