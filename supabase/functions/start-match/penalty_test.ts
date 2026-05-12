
import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";

// Mock types and functions to replicate the logic in start-match/index.ts
interface SimPlayer {
  id: string; name: string; position: string; team: 'home' | 'away';
  shooting: number; composure: number; setPieces: number; goalkeeping: number;
}

// Deterministic RNG for testing
function makeMulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

let _rng = makeMulberry32(123);
function rng() { return _rng(); }

function simulatePenalty(taker: SimPlayer, keeper: SimPlayer | undefined): boolean {
  const baseProb = 0.78;
  const skillBoost = (taker.shooting + (taker.composure || 60) + (taker.setPieces || 60)) / 300 * 0.15;
  const gkSave = (keeper?.goalkeeping || 60) / 100 * 0.10;
  const chance = baseProb + skillBoost - gkSave;
  return rng() < chance;
}

Deno.test("Penalty Simulation - High Skill Taker vs Low Skill Keeper", () => {
  _rng = makeMulberry32(42); // Reset seed
  const taker: SimPlayer = { id: '1', name: 'Elite Striker', position: 'ATA', team: 'home', shooting: 95, composure: 90, setPieces: 90, goalkeeping: 0 };
  const keeper: SimPlayer = { id: '2', name: 'Poor Keeper', position: 'GOL', team: 'away', shooting: 0, composure: 40, setPieces: 0, goalkeeping: 30 };
  
  let goals = 0;
  const trials = 1000;
  for (let i = 0; i < trials; i++) {
    if (simulatePenalty(taker, keeper)) goals++;
  }
  
  const conversionRate = goals / trials;
  console.log(`High Skill Rate: ${conversionRate}`);
  // Expected: base(0.78) + skillBoost(~0.137) - gkSave(0.03) = ~0.887
  assertEquals(conversionRate > 0.85, true, `Conversion rate ${conversionRate} should be high`);
});

Deno.test("Penalty Simulation - Low Skill Taker vs High Skill Keeper", () => {
  _rng = makeMulberry32(42); // Reset seed
  const taker: SimPlayer = { id: '1', name: 'Bad Taker', position: 'DEF', team: 'home', shooting: 30, composure: 30, setPieces: 30, goalkeeping: 0 };
  const keeper: SimPlayer = { id: '2', name: 'Elite Keeper', position: 'GOL', team: 'away', shooting: 0, composure: 90, setPieces: 0, goalkeeping: 95 };
  
  let goals = 0;
  const trials = 1000;
  for (let i = 0; i < trials; i++) {
    if (simulatePenalty(taker, keeper)) goals++;
  }
  
  const conversionRate = goals / trials;
  console.log(`Low Skill Rate: ${conversionRate}`);
  // Expected: base(0.78) + skillBoost(0.045) - gkSave(0.095) = ~0.73
  assertEquals(conversionRate < 0.80, true, `Conversion rate ${conversionRate} should be lower`);
  assertEquals(conversionRate > 0.60, true, `Conversion rate ${conversionRate} should still be reasonable for a penalty`);
});

Deno.test("Penalty Simulation - Consistency Check", () => {
  const seed = 999;
  const taker: SimPlayer = { id: '1', name: 'Player', position: 'ATA', team: 'home', shooting: 75, composure: 75, setPieces: 75, goalkeeping: 0 };
  const keeper: SimPlayer = { id: '2', name: 'Keeper', position: 'GOL', team: 'away', shooting: 0, composure: 75, setPieces: 0, goalkeeping: 75 };

  _rng = makeMulberry32(seed);
  const result1 = simulatePenalty(taker, keeper);
  
  _rng = makeMulberry32(seed);
  const result2 = simulatePenalty(taker, keeper);
  
  assertEquals(result1, result2, "Deterministic RNG should produce same result for same seed");
});
