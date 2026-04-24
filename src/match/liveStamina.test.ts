import { describe, it, expect } from 'vitest';
import { computeLiveStamina, staminaColorClass, staminaPerformancePenalty } from './liveStamina';
import type { Player } from '@/types/game';

const mkPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'p1',
  name: 'Test',
  position: 'MEI',
  overall: 70,
  attributes: {
    speed: 70, shooting: 70, passing: 70, defending: 70,
    physical: 60, dribbling: 70, setPieces: 50, positioning: 60,
    heading: 50, marking: 50,
  },
  age: 25,
  salary: 5000,
  stamina: 100,
  morale: 80,
  goals: 0,
  assists: 0,
  contract: 2,
  gamesPlayed: 0,
  trainingProgress: 0,
  ...overrides,
});

describe('computeLiveStamina', () => {
  it('returns initial stamina at minute 0', () => {
    const p = mkPlayer({ stamina: 95 });
    expect(computeLiveStamina({ player: p, minute: 0 })).toBe(95);
  });

  it('decays over time for an average physical player', () => {
    const p = mkPlayer({ stamina: 100 });
    const at90 = computeLiveStamina({ player: p, minute: 90 });
    expect(at90).toBeLessThan(100);
    expect(at90).toBeGreaterThanOrEqual(50); // stays playable
  });

  it('high physical attribute reduces decay', () => {
    const weak = mkPlayer({ attributes: { ...mkPlayer().attributes, physical: 30 } });
    const strong = mkPlayer({ attributes: { ...mkPlayer().attributes, physical: 95 } });
    const w = computeLiveStamina({ player: weak, minute: 90 });
    const s = computeLiveStamina({ player: strong, minute: 90 });
    expect(s).toBeGreaterThan(w);
  });

  it('aggressive tactics drain faster', () => {
    const p = mkPlayer();
    const calm = computeLiveStamina({ player: p, minute: 60, tactics: { formation: '4-4-2', pressing: 'baixo', tempo: 'lento' } as any });
    const ultra = computeLiveStamina({ player: p, minute: 60, tactics: { formation: '4-4-2', pressing: 'ultra-alto', tempo: 'rapido' } as any });
    expect(ultra).toBeLessThan(calm);
  });

  it('respects enteredAt for substitutes', () => {
    const p = mkPlayer({ stamina: 100 });
    const fresh = computeLiveStamina({ player: p, minute: 80, enteredAt: 75 });
    const tired = computeLiveStamina({ player: p, minute: 80, enteredAt: 0 });
    expect(fresh).toBeGreaterThan(tired);
  });

  it('clamps to [0, 100]', () => {
    const p = mkPlayer({ stamina: 30, attributes: { ...mkPlayer().attributes, physical: 20 } });
    const v = computeLiveStamina({ player: p, minute: 120 });
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(100);
  });

  it('uses serverStamina when provided', () => {
    const p = mkPlayer({ stamina: 100 });
    expect(computeLiveStamina({ player: p, minute: 90, serverStamina: 42 })).toBe(42);
  });

  it('handles invalid/edge inputs gracefully', () => {
    const p = mkPlayer({ stamina: 100 });
    expect(computeLiveStamina({ player: p, minute: -5 })).toBe(100);
    expect(computeLiveStamina({ player: p, minute: 0, enteredAt: 50 })).toBe(100); // not yet entered
  });
});

describe('staminaColorClass', () => {
  it('returns proper colors per range', () => {
    expect(staminaColorClass(80)).toContain('emerald');
    expect(staminaColorClass(50)).toContain('yellow');
    expect(staminaColorClass(25)).toContain('orange');
    expect(staminaColorClass(10)).toContain('red');
  });
});

describe('staminaPerformancePenalty', () => {
  it('grows as stamina decreases', () => {
    expect(staminaPerformancePenalty(80)).toBe(0);
    expect(staminaPerformancePenalty(60)).toBeGreaterThan(0);
    expect(staminaPerformancePenalty(10)).toBeGreaterThan(staminaPerformancePenalty(40));
  });
});
