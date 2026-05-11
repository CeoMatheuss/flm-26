/**
 * knockoutTieBreaker — utilities applied AFTER the regulation 90' simulation
 * for matches that cannot end in a draw (eliminatórias).
 *
 * Order of application (FIFA standard):
 *   1. 90' regulation result is already computed.
 *   2. If tied: simulate Extra Time (30') with reduced goal expectation.
 *   3. If still tied: simulate Penalty Shootout (best of 5, then sudden death).
 *
 * The shootout never produces a draw; one side always wins.
 *
 * Returned shape augments goals/events with `extraTime` and `shootout`
 * metadata so the UI can render the correct narrative.
 */

export type ETOutcome = {
  homeGoalsET: number;
  awayGoalsET: number;
  hadExtraTime: boolean;
  hadShootout: boolean;
  shootoutHome: number;
  shootoutAway: number;
  /** Effective winner — never null for knockouts. */
  winner: 'home' | 'away';
  /** Extra events to append to the match feed. */
  events: Array<{
    minute: number;
    type: string;
    team: 'home' | 'away' | 'neutral';
    isGoal?: boolean;
    playerName?: string;
    description: string;
  }>;
};

function poisson(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

/**
 * Resolve a knockout match that ended 90' tied.
 * Pass the regulation result + team strengths and names.
 */
export function resolveKnockout(args: {
  homeGoals: number;
  awayGoals: number;
  homeStr: number;
  awayStr: number;
  homeName: string;
  awayName: string;
}): ETOutcome {
  const { homeGoals, awayGoals, homeStr, awayStr, homeName, awayName } = args;

  // Already decided — nothing to do.
  if (homeGoals !== awayGoals) {
    return {
      homeGoalsET: 0,
      awayGoalsET: 0,
      hadExtraTime: false,
      hadShootout: false,
      shootoutHome: 0,
      shootoutAway: 0,
      winner: homeGoals > awayGoals ? 'home' : 'away',
      events: [],
    };
  }

  const events: ETOutcome['events'] = [];

  // ── Extra time (2 × 15') with ~⅓ of regular goal expectancy ──
  const total = Math.max(60, homeStr + awayStr);
  const lambdaHome = 2.6 * (homeStr * 1.05 / total) * 0.34;
  const lambdaAway = 2.6 * (awayStr / total) * 0.34;
  const homeGoalsET = Math.min(3, poisson(lambdaHome));
  const awayGoalsET = Math.min(3, poisson(lambdaAway));

  events.push({
    minute: 91,
    type: 'extra_time_start',
    team: 'neutral',
    description: `⏱️ Empate em 90'! Vamos para a prorrogação.`,
  });

  // Distribute ET goals between minute 91 and 120.
  const used = new Set<number>();
  const pickMin = () => {
    let m = 91 + Math.floor(Math.random() * 30);
    let tries = 0;
    while (used.has(m) && tries < 30) { m = 91 + Math.floor(Math.random() * 30); tries++; }
    used.add(m);
    return m;
  };
  for (let i = 0; i < homeGoalsET; i++) {
    events.push({
      minute: pickMin(), type: 'goal', team: 'home', isGoal: true,
      playerName: 'Atacante', description: `⚽ GOL na prorrogação para ${homeName}!`,
    });
  }
  for (let i = 0; i < awayGoalsET; i++) {
    events.push({
      minute: pickMin(), type: 'goal', team: 'away', isGoal: true,
      playerName: 'Atacante', description: `⚽ GOL na prorrogação para ${awayName}!`,
    });
  }
  events.push({
    minute: 120,
    type: 'extra_time_end',
    team: 'neutral',
    description: `⏸️ Fim da prorrogação: ${homeGoals + homeGoalsET} x ${awayGoals + awayGoalsET}.`,
  });

  const totalHome = homeGoals + homeGoalsET;
  const totalAway = awayGoals + awayGoalsET;

  if (totalHome !== totalAway) {
    return {
      homeGoalsET, awayGoalsET,
      hadExtraTime: true,
      hadShootout: false,
      shootoutHome: 0,
      shootoutAway: 0,
      winner: totalHome > totalAway ? 'home' : 'away',
      events,
    };
  }

  // ── Penalty shootout — best of 5, then sudden death ──
  events.push({
    minute: 121,
    type: 'penalty_shootout_start',
    team: 'neutral',
    description: `🎯 Prorrogação não decidiu. Vamos para os pênaltis!`,
  });

  // Conversion probability scales gently with team strength (skill matters).
  const homeConv = Math.min(0.92, 0.72 + (homeStr - 60) * 0.004);
  const awayConv = Math.min(0.92, 0.72 + (awayStr - 60) * 0.004);

  let sH = 0, sA = 0;
  let kickMin = 121;
  const homeKicks: boolean[] = [];
  const awayKicks: boolean[] = [];

  for (let i = 0; i < 5; i++) {
    // FIFA: If one team leads by more than remaining kicks, they win.
    const homeScored = Math.random() < homeConv;
    if (homeScored) sH++;
    homeKicks.push(homeScored);
    
    events.push({
      minute: kickMin++,
      type: homeScored ? 'penalty_shootout' : 'penalty_shootout_miss',
      team: 'home',
      isGoal: homeScored,
      description: homeScored
        ? `🎯 ${homeName} converte (${sH}-${sA}).`
        : `❌ ${homeName} desperdiça (${sH}-${sA}).`,
    });

    // Check if away team can still win/draw after home's i-th kick
    const remainingHome = 4 - i;
    const remainingAway = 5 - i;
    if (sH > sA + remainingAway || sA > sH + remainingHome) break;

    const awayScored = Math.random() < awayConv;
    if (awayScored) sA++;
    awayKicks.push(awayScored);

    events.push({
      minute: kickMin++,
      type: awayScored ? 'penalty_shootout' : 'penalty_shootout_miss',
      team: 'away',
      isGoal: awayScored,
      description: awayScored
        ? `🎯 ${awayName} converte (${sH}-${sA}).`
        : `❌ ${awayName} desperdiça (${sH}-${sA}).`,
    });

    if (sH > sA + (4 - i) || sA > sH + (4 - i)) break;
  }

  // Sudden death until decided (FIFA style: each team takes one kick until one marks and the other misses).
  while (sH === sA) {
    const homeScored = Math.random() < homeConv;
    if (homeScored) sH++;
    events.push({
      minute: kickMin++,
      type: homeScored ? 'penalty_shootout' : 'penalty_shootout_miss',
      team: 'home',
      isGoal: homeScored,
      description: homeScored
        ? `🎯 Morte súbita: ${homeName} marca (${sH}-${sA}).`
        : `❌ Morte súbita: ${homeName} para no goleiro (${sH}-${sA}).`,
    });
    const awayScored = Math.random() < awayConv;
    if (awayScored) sA++;
    events.push({
      minute: kickMin++,
      type: awayScored ? 'penalty_shootout' : 'penalty_shootout_miss',
      team: 'away',
      isGoal: awayScored,
      description: awayScored
        ? `🎯 Morte súbita: ${awayName} marca (${sH}-${sA}).`
        : `❌ Morte súbita: ${awayName} para no goleiro (${sH}-${sA}).`,
    });
  }

  const winner: 'home' | 'away' = sH > sA ? 'home' : 'away';
  events.push({
    minute: kickMin,
    type: 'penalty_shootout_end',
    team: 'neutral',
    description: `🏆 ${winner === 'home' ? homeName : awayName} vence nos pênaltis ${sH}x${sA}!`,
  });

  return {
    homeGoalsET, awayGoalsET,
    hadExtraTime: true,
    hadShootout: true,
    shootoutHome: sH,
    shootoutAway: sA,
    winner,
    events,
  };
}

/**
 * Returns true when the custom_tournament_matches stage represents a
 * knockout tie (anything that is not a round-robin "league" or "Grupo X").
 */
export function isKnockoutStage(stage: string | null | undefined): boolean {
  if (!stage) return false;
  const s = String(stage).toLowerCase();
  if (s.startsWith('grupo')) return false;
  if (s === 'league' || s === 'liga' || s === 'group') return false;
  return true;
}
