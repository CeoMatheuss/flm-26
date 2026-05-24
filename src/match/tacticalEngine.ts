import { TacticsConfig } from '@/types/tactics';

/**
 * Tactical Engine Modifiers (FLM 26)
 * Maps tactical settings to numerical modifiers for the simulation engine.
 */

export interface TacticalModifiers {
  staminaBurnRate: number;      // 1.0 is default
  offensivePower: number;      // 1.0 is default
  defensiveRobustness: number;  // 1.0 is default
  possessionBonus: number;      // 0-10
  counterAttackBonus: number;   // 0-10
  pressingEfficiency: number;   // 0-10
}

export function calculateTacticalModifiers(tactics: TacticsConfig): TacticalModifiers {
  const mods: TacticalModifiers = {
    staminaBurnRate: 1.0,
    offensivePower: 1.0,
    defensiveRobustness: 1.0,
    possessionBonus: 0,
    counterAttackBonus: 0,
    pressingEfficiency: 0
  };

  // Play Style
  switch (tactics.playStyle) {
    case 'ofensivo': mods.offensivePower += 0.2; mods.defensiveRobustness -= 0.15; mods.staminaBurnRate += 0.1; break;
    case 'defensivo': mods.defensiveRobustness += 0.2; mods.offensivePower -= 0.15; mods.staminaBurnRate -= 0.05; break;
    case 'posse': mods.possessionBonus += 5; mods.offensivePower -= 0.05; break;
    case 'contra-ataque': mods.counterAttackBonus += 5; mods.defensiveRobustness += 0.1; break;
    case 'pressao-alta': mods.staminaBurnRate += 0.25; mods.pressingEfficiency += 8; break;
    case 'retranca-total': mods.defensiveRobustness += 0.35; mods.offensivePower -= 0.35; mods.staminaBurnRate -= 0.15; break;
    case 'ataque-total': mods.offensivePower += 0.35; mods.defensiveRobustness -= 0.3; mods.staminaBurnRate += 0.3; break;
  }

  // Intensity
  switch (tactics.intensity) {
    case 'baixa': mods.staminaBurnRate -= 0.2; mods.defensiveRobustness -= 0.1; break;
    case 'agressiva': mods.staminaBurnRate += 0.2; mods.offensivePower += 0.1; mods.pressingEfficiency += 3; break;
    case 'pressao-maxima': mods.staminaBurnRate += 0.5; mods.pressingEfficiency += 10; mods.offensivePower += 0.15; break;
  }

  // Tempo
  if (tactics.tempo === 'muito-rapido') mods.staminaBurnRate += 0.15;
  if (tactics.tempo === 'lento') mods.staminaBurnRate -= 0.1;

  // Pressing
  if (tactics.pressing === 'ultra-alto') mods.staminaBurnRate += 0.2;
  if (tactics.pressing === 'baixo') mods.staminaBurnRate -= 0.1;

  return mods;
}
