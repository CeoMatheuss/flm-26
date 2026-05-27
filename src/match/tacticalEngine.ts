import { TacticsConfig, Formation, PlayStyle, PlayerInstruction } from '@/types/tactics';

/**
 * Tactical Engine v2 (FLM 26)
 * Canonical client-side preview of the tactical impact.
 * The server simulator (supabase/functions/start-match) mirrors the same shape
 * so any change made here should be reflected there for consistency.
 *
 * All multipliers are centered on 1.0 (neutral). Ranges are deliberately wider
 * than v1 so the user perceives every tactical change in match stats and outcomes.
 */

export interface TacticalModifiers {
  staminaBurnRate: number;       // 1.0 default
  offensivePower: number;        // 1.0 default — multiplies expected goals for
  defensiveRobustness: number;   // 1.0 default — multiplies opponent's resistance to score
  possessionBonus: number;       // -15..+15 (%)
  counterAttackBonus: number;    // 0..15
  pressingEfficiency: number;    // 0..15
  crossingBoost: number;         // 0..0.4
  longShotBoost: number;         // 0..0.4
  chanceQualityBoost: number;    // -0.25..+0.4 (xG per shot)
  cardRisk: number;              // 0..0.4 (faltas/cartões)
  formationLabel: string;
  styleLabel: string;
  // for UI explanation
  breakdown: string[];
}

const FORMATION_DELTAS: Record<Formation, Partial<TacticalModifiers>> = {
  '4-4-2':       { offensivePower: 0.00, defensiveRobustness: 0.00, possessionBonus: 0, crossingBoost: 0.05 },
  '4-3-3':       { offensivePower: 0.12, defensiveRobustness: -0.06, possessionBonus: 2, crossingBoost: 0.18 },
  '4-2-3-1':     { offensivePower: 0.06, defensiveRobustness: 0.04, possessionBonus: 6, chanceQualityBoost: 0.10 },
  '3-5-2':       { offensivePower: 0.08, defensiveRobustness: -0.04, possessionBonus: 4 },
  '5-3-2':       { offensivePower: -0.10, defensiveRobustness: 0.18, possessionBonus: -4, counterAttackBonus: 5 },
  '4-1-4-1':     { offensivePower: -0.04, defensiveRobustness: 0.12, possessionBonus: 3 },
  '4-4-1-1':     { offensivePower: 0.02, defensiveRobustness: 0.02 },
  '3-4-3':       { offensivePower: 0.20, defensiveRobustness: -0.15, possessionBonus: 2, crossingBoost: 0.10 },
  '5-4-1':       { offensivePower: -0.18, defensiveRobustness: 0.28, possessionBonus: -6, counterAttackBonus: 6 },
  '4-5-1':       { offensivePower: -0.10, defensiveRobustness: 0.18, possessionBonus: 5 },
  '4-3-2-1':     { offensivePower: 0.08, defensiveRobustness: 0.05, possessionBonus: 4, chanceQualityBoost: 0.08 },
  '4-2-4-0':     { offensivePower: 0.05, defensiveRobustness: 0.00, possessionBonus: 7 },
  '3-4-1-2':     { offensivePower: 0.10, defensiveRobustness: -0.05, possessionBonus: 3 },
  '4-1-2-1-2':   { offensivePower: 0.06, defensiveRobustness: 0.06, possessionBonus: 2, chanceQualityBoost: 0.05 },
};

const STYLE_DELTAS: Partial<Record<PlayStyle, Partial<TacticalModifiers>>> = {
  'ofensivo':          { offensivePower: 0.25, defensiveRobustness: -0.18, staminaBurnRate: 0.10, chanceQualityBoost: 0.05 },
  'equilibrado':       {},
  'defensivo':         { offensivePower: -0.18, defensiveRobustness: 0.25, staminaBurnRate: -0.05 },
  'contra-ataque':     { offensivePower: 0.08, defensiveRobustness: 0.12, counterAttackBonus: 8, staminaBurnRate: -0.05 },
  'posse':             { possessionBonus: 10, offensivePower: -0.05, chanceQualityBoost: 0.05 },
  'tiki-taka':         { possessionBonus: 12, offensivePower: 0.05, pressingEfficiency: 6, staminaBurnRate: 0.08 },
  'gegenpressing':     { offensivePower: 0.18, defensiveRobustness: -0.10, pressingEfficiency: 12, staminaBurnRate: 0.22, cardRisk: 0.15 },
  'parking-bus':       { offensivePower: -0.30, defensiveRobustness: 0.40, possessionBonus: -10, staminaBurnRate: -0.12 },
  'long-ball':         { offensivePower: 0.12, longShotBoost: 0.12, possessionBonus: -6 },
  'retranca-total':    { offensivePower: -0.40, defensiveRobustness: 0.50, possessionBonus: -12, staminaBurnRate: -0.18, counterAttackBonus: 4 },
  'pressao-alta':      { offensivePower: 0.18, defensiveRobustness: -0.10, pressingEfficiency: 12, staminaBurnRate: 0.22, cardRisk: 0.12 },
  'transicao-rapida':  { offensivePower: 0.12, counterAttackBonus: 10, staminaBurnRate: 0.06 },
  'cruzamentos':       { offensivePower: 0.08, crossingBoost: 0.25, possessionBonus: -2 },
  'jogo-inteligente':  { offensivePower: 0.05, defensiveRobustness: 0.08 },
  'defesa-compacta':   { offensivePower: -0.15, defensiveRobustness: 0.28, staminaBurnRate: -0.08 },
  'ataque-total':      { offensivePower: 0.35, defensiveRobustness: -0.28, staminaBurnRate: 0.28, chanceQualityBoost: 0.10 },
  'pressao-pos-perda': { offensivePower: 0.10, pressingEfficiency: 14, staminaBurnRate: 0.26, cardRisk: 0.10 },
  'futebol-criativo':  { offensivePower: 0.14, chanceQualityBoost: 0.18, possessionBonus: 4 },
  'controle-total':    { offensivePower: 0.08, defensiveRobustness: 0.08, possessionBonus: 8, pressingEfficiency: 8, staminaBurnRate: 0.12 },
  'bloco-medio':       { defensiveRobustness: 0.14 },
  'verticalidade':     { offensivePower: 0.12, longShotBoost: 0.10, possessionBonus: -4 },
};

/**
 * Aggregate per-player instructions into team-level deltas.
 * The richer the squad's instruction set, the more pronounced the effect.
 */
function aggregateInstructions(insts: PlayerInstruction[] | undefined): Partial<TacticalModifiers> {
  const out: Partial<TacticalModifiers> = {
    offensivePower: 0, defensiveRobustness: 0, pressingEfficiency: 0,
    crossingBoost: 0, longShotBoost: 0, staminaBurnRate: 0, cardRisk: 0,
  };
  if (!Array.isArray(insts) || insts.length === 0) return out;

  for (const pi of insts) {
    const b = pi.behavior;
    const i = pi.instruction;
    if (b === 'atacar-mais' || b === 'subir-ao-ataque' || i === 'avançar' || i === 'infiltrar') {
      out.offensivePower! += 0.02;
      out.defensiveRobustness! -= 0.015;
    }
    if (b === 'defender-mais' || b === 'ficar-na-defesa' || i === 'recuar' || i === 'manter-posicao') {
      out.defensiveRobustness! += 0.02;
      out.offensivePower! -= 0.015;
    }
    if (b === 'ficar-aberto') {
      out.crossingBoost! += 0.04;
      out.offensivePower! += 0.01;
    }
    if (i === 'marcar-homem') {
      out.pressingEfficiency! += 0.6;
      out.cardRisk! += 0.02;
      out.staminaBurnRate! += 0.02;
    }
    if (i === 'economizar-stamina') {
      out.staminaBurnRate! -= 0.025;
      out.pressingEfficiency! -= 0.4;
    }
  }
  // clamp aggregated impact to keep the system balanced
  out.offensivePower = clamp(out.offensivePower!, -0.18, 0.18);
  out.defensiveRobustness = clamp(out.defensiveRobustness!, -0.18, 0.18);
  out.pressingEfficiency = clamp(out.pressingEfficiency!, -6, 6);
  out.crossingBoost = clamp(out.crossingBoost!, 0, 0.2);
  out.staminaBurnRate = clamp(out.staminaBurnRate!, -0.12, 0.12);
  out.cardRisk = clamp(out.cardRisk!, 0, 0.15);
  return out;
}

function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)); }

function add<K extends keyof TacticalModifiers>(target: TacticalModifiers, key: K, delta?: number) {
  if (typeof delta !== 'number') return;
  (target as any)[key] = (target as any)[key] + delta;
}

export function calculateTacticalModifiers(tactics: TacticsConfig): TacticalModifiers {
  const mods: TacticalModifiers = {
    staminaBurnRate: 1.0,
    offensivePower: 1.0,
    defensiveRobustness: 1.0,
    possessionBonus: 0,
    counterAttackBonus: 0,
    pressingEfficiency: 0,
    crossingBoost: 0,
    longShotBoost: 0,
    chanceQualityBoost: 0,
    cardRisk: 0,
    formationLabel: tactics.formation,
    styleLabel: tactics.playStyle,
    breakdown: [],
  };

  // Formation
  const fd = FORMATION_DELTAS[tactics.formation] || {};
  add(mods, 'offensivePower', fd.offensivePower);
  add(mods, 'defensiveRobustness', fd.defensiveRobustness);
  add(mods, 'possessionBonus', fd.possessionBonus);
  add(mods, 'crossingBoost', fd.crossingBoost);
  add(mods, 'chanceQualityBoost', fd.chanceQualityBoost);
  add(mods, 'counterAttackBonus', fd.counterAttackBonus);
  if (fd.offensivePower || fd.defensiveRobustness) {
    mods.breakdown.push(`Formação ${tactics.formation}: atq ${pct(fd.offensivePower)} / def ${pct(fd.defensiveRobustness)}`);
  }

  // Play Style
  const sd = STYLE_DELTAS[tactics.playStyle] || {};
  add(mods, 'offensivePower', sd.offensivePower);
  add(mods, 'defensiveRobustness', sd.defensiveRobustness);
  add(mods, 'possessionBonus', sd.possessionBonus);
  add(mods, 'counterAttackBonus', sd.counterAttackBonus);
  add(mods, 'pressingEfficiency', sd.pressingEfficiency);
  add(mods, 'crossingBoost', sd.crossingBoost);
  add(mods, 'longShotBoost', sd.longShotBoost);
  add(mods, 'chanceQualityBoost', sd.chanceQualityBoost);
  add(mods, 'cardRisk', sd.cardRisk);
  add(mods, 'staminaBurnRate', sd.staminaBurnRate);
  if (sd.offensivePower || sd.defensiveRobustness) {
    mods.breakdown.push(`Estilo ${tactics.playStyle}: atq ${pct(sd.offensivePower)} / def ${pct(sd.defensiveRobustness)}`);
  }

  // Intensity
  switch (tactics.intensity) {
    case 'baixa':           mods.staminaBurnRate -= 0.20; mods.defensiveRobustness -= 0.05; break;
    case 'agressiva':       mods.staminaBurnRate += 0.20; mods.offensivePower += 0.08; mods.pressingEfficiency += 4; mods.cardRisk += 0.05; break;
    case 'pressao-maxima':  mods.staminaBurnRate += 0.45; mods.pressingEfficiency += 12; mods.offensivePower += 0.12; mods.cardRisk += 0.10; break;
  }

  // Tempo
  if (tactics.tempo === 'muito-rapido') { mods.staminaBurnRate += 0.18; mods.offensivePower += 0.06; mods.possessionBonus -= 4; }
  else if (tactics.tempo === 'rapido')   { mods.staminaBurnRate += 0.08; mods.offensivePower += 0.03; }
  else if (tactics.tempo === 'lento')    { mods.staminaBurnRate -= 0.10; mods.possessionBonus += 4; }

  // Pressing
  if (tactics.pressing === 'ultra-alto') { mods.staminaBurnRate += 0.22; mods.pressingEfficiency += 8; mods.cardRisk += 0.06; }
  else if (tactics.pressing === 'alto')   { mods.staminaBurnRate += 0.10; mods.pressingEfficiency += 5; }
  else if (tactics.pressing === 'baixo')  { mods.staminaBurnRate -= 0.10; mods.pressingEfficiency -= 4; }

  // Marking
  if (tactics.marking === 'individual') { mods.cardRisk += 0.06; mods.defensiveRobustness += 0.05; mods.staminaBurnRate += 0.06; }
  else if (tactics.marking === 'misto') { mods.defensiveRobustness += 0.03; }

  // Defense line
  if (tactics.defenseLine === 'alta') { mods.offensivePower += 0.05; mods.defensiveRobustness -= 0.08; mods.pressingEfficiency += 3; }
  else if (tactics.defenseLine === 'baixa') { mods.offensivePower -= 0.08; mods.defensiveRobustness += 0.10; }

  // Passing style
  if (tactics.passingStyle === 'curto') { mods.possessionBonus += 8; mods.chanceQualityBoost += 0.04; }
  else if (tactics.passingStyle === 'direto') { mods.longShotBoost += 0.08; mods.possessionBonus -= 4; }
  else if (tactics.passingStyle === 'longo') { mods.longShotBoost += 0.05; mods.crossingBoost += 0.15; mods.possessionBonus -= 6; }

  // Width
  if (tactics.width === 'larga') { mods.crossingBoost += 0.18; mods.defensiveRobustness -= 0.03; }
  else if (tactics.width === 'estreita') { mods.chanceQualityBoost += 0.04; mods.defensiveRobustness += 0.03; }

  // Player instructions aggregation
  const ag = aggregateInstructions(tactics.playerInstructions);
  add(mods, 'offensivePower', ag.offensivePower);
  add(mods, 'defensiveRobustness', ag.defensiveRobustness);
  add(mods, 'pressingEfficiency', ag.pressingEfficiency);
  add(mods, 'crossingBoost', ag.crossingBoost);
  add(mods, 'staminaBurnRate', ag.staminaBurnRate);
  add(mods, 'cardRisk', ag.cardRisk);
  if ((ag.offensivePower || 0) || (ag.defensiveRobustness || 0)) {
    mods.breakdown.push(`Instruções individuais: atq ${pct(ag.offensivePower)} / def ${pct(ag.defensiveRobustness)}`);
  }

  // Final clamps
  mods.offensivePower = clamp(mods.offensivePower, 0.45, 1.60);
  mods.defensiveRobustness = clamp(mods.defensiveRobustness, 0.45, 1.60);
  mods.staminaBurnRate = clamp(mods.staminaBurnRate, 0.55, 1.80);
  mods.possessionBonus = clamp(mods.possessionBonus, -18, 18);
  mods.pressingEfficiency = clamp(mods.pressingEfficiency, -5, 22);
  mods.counterAttackBonus = clamp(mods.counterAttackBonus, 0, 18);
  mods.crossingBoost = clamp(mods.crossingBoost, 0, 0.5);
  mods.longShotBoost = clamp(mods.longShotBoost, 0, 0.4);
  mods.chanceQualityBoost = clamp(mods.chanceQualityBoost, -0.25, 0.4);
  mods.cardRisk = clamp(mods.cardRisk, 0, 0.4);

  return mods;
}

function pct(v?: number) {
  if (!v) return '0%';
  const p = Math.round(v * 100);
  return `${p > 0 ? '+' : ''}${p}%`;
}
