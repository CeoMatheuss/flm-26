/**
 * liveStamina — Continuous in-match fatigue model (frontend).
 *
 * Computes a per-player stamina value that decays during the live match, based on:
 * - Initial stamina (pre-match `p.stamina`)
 * - Minutes elapsed since the player entered the field
 * - Pressing/tempo tactics (intensity)
 * - Player's `physical` attribute (resistance)
 * - Halftime gives a small recovery
 *
 * No server changes required. Pure deterministic projection used for UI/decisions.
 */

import type { Player } from '@/types/game';
import type { TacticsConfig } from '@/types/tactics';

export interface LiveStaminaInput {
  player: Player;
  /** Current match minute (0-90+) */
  minute: number;
  /** Minute when the player entered (0 for starters, sub minute for bench) */
  enteredAt?: number;
  tactics?: TacticsConfig | null;
  isHalftime?: boolean;
  /** Stamina from server (overrides projection if available) */
  serverStamina?: number;
}

/** Tactic-based intensity multiplier (1.0 = baseline). */
function tacticIntensity(t?: TacticsConfig | null): number {
  if (!t) return 1.0;
  let mult = 1.0;
  switch (t.pressing as any) {
    case 'ultra-alto': mult *= 1.55; break;
    case 'alto':       mult *= 1.30; break;
    case 'medio':      mult *= 1.0;  break;
    case 'baixo':      mult *= 0.85; break;
  }
  switch (t.tempo as any) {
    case 'rapido':     mult *= 1.20; break;
    case 'normal':     mult *= 1.0;  break;
    case 'lento':      mult *= 0.90; break;
  }
  return mult;
}

/**
 * Compute the live stamina for a single player at a given minute.
 * Returns an integer 0-100.
 */
export function computeLiveStamina({
  player,
  minute,
  enteredAt = 0,
  tactics,
  isHalftime,
  serverStamina,
}: LiveStaminaInput): number {
  if (typeof serverStamina === 'number' && serverStamina > 0) {
    return Math.max(0, Math.min(100, Math.round(serverStamina)));
  }

  const initial = Math.max(0, Math.min(100, player.stamina ?? 100));
  const physical = player.attributes?.physical ?? 60;
  const initialStamina = Math.max(0, Math.min(100, player.stamina ?? 100));

  // Minutes actually played in this match (capped at 120 for overtime support)
  const playedMinutes = Math.max(0, minute - Math.max(0, enteredAt));
  if (playedMinutes <= 0) return initial;

  // Base loss per minute: 0.45/min for 60 phys
  // Scales 0.65 (phys 30) → 0.30 (phys 95)
  const physFactor = 1.35 - (physical / 100); 
  const baseLossPerMin = 0.45 * physFactor;

  // Tactics modifier
  const intensity = tacticIntensity(tactics);

  let loss = playedMinutes * baseLossPerMin * intensity;

  // Halftime micro-recovery (between minute 45-46): +8 stamina back
  if (minute >= 46) loss -= 8;

  // Personality adjustments
  if ((player as any).personality === 'dedicado') loss *= 0.90;
  if ((player as any).personality === 'festeiro') loss *= 1.15;
  if ((player as any).personality === 'preguicoso') loss *= 1.10;

  const result = Math.round(initialStamina - loss);
  return Math.max(0, Math.min(100, result));
}

/**
 * Risco de lesão baseado na stamina (V4)
 */
export function getStaminaInjuryRisk(stamina: number): 'baixo' | 'moderado' | 'alto' | 'critico' {
  if (stamina >= 50) return 'baixo';
  if (stamina >= 35) return 'moderado';
  if (stamina >= 15) return 'alto';
  return 'critico';
}

/**
 * Get a color class for a stamina value.
 */
export function staminaColorClass(stamina: number): string {
  if (stamina >= 70) return 'bg-emerald-500';
  if (stamina >= 40) return 'bg-yellow-500';
  if (stamina >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}

/**
 * Performance penalty (0-1) applied by low stamina — useful for UI hints.
 * 0 = no penalty, 0.4 = -40%.
 */
export function staminaPerformancePenalty(stamina: number): number {
  if (stamina >= 70) return 0;
  if (stamina >= 50) return 0.05;
  if (stamina >= 30) return 0.15;
  if (stamina >= 15) return 0.30;
  return 0.45;
}
