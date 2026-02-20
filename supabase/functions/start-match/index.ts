import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function rng() { return Math.random(); }
function pick<T>(arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; }

interface SimPlayer {
  id: string; name: string; position: string; team: 'home' | 'away'; ovr: number;
  rating: number; goals: number; assists: number; yellowCards: number; isOnPitch: boolean;
  stamina: number; morale: number;
  speed: number; shooting: number; passing: number; defending: number; physical: number;
  dribbling: number; heading: number; marking: number; vision: number; crossing: number;
  longShots: number; workRate: number; composure: number; aggression: number;
  goalkeeping: number; setPieces: number; positioning: number;
}

interface SimEvent {
  minute: number; type: string; description: string; team: 'home' | 'away' | 'neutral';
  playerName?: string; assistName?: string; goalType?: string; isGoal?: boolean;
  // Para animações visuais no cliente:
  animType?: 'goal' | 'pass' | 'save' | 'foul' | 'card' | 'sub' | 'chance' | 'halftime' | 'kickoff' | 'final';
  ballX?: number; ballY?: number; // posição da bola no campo (0-1)
}

function genAwayAttrs(ovr: number, pos: string) {
  const variance = () => clamp(Math.floor(ovr + (rng() * 16 - 8)), 30, 99);
  const isGK = pos === 'GOL'; const isDef = pos === 'ZAG' || pos === 'LAT'; const isAtt = pos === 'ATA';
  return {
    speed: variance(), shooting: isAtt ? variance() + 5 : variance() - 5,
    passing: variance(), defending: isDef ? variance() + 5 : variance() - 5,
    physical: variance(), dribbling: isAtt ? variance() + 3 : variance(),
    heading: isDef ? variance() + 3 : variance(), marking: isDef ? variance() + 5 : variance() - 5,
    vision: variance(), crossing: variance(), longShots: variance(),
    workRate: variance(), composure: variance(), aggression: variance(),
    goalkeeping: isGK ? variance() + 10 : 0, setPieces: variance(), positioning: variance(),
  };
}

function pickByAttr(pool: SimPlayer[], attr: keyof SimPlayer, posFilter?: string): SimPlayer | null {
  let filtered = pool.filter(p => p.isOnPitch);
  if (posFilter) { const f2 = filtered.filter(p => p.position === posFilter); if (f2.length > 0) filtered = f2; }
  if (filtered.length === 0) return null;
  const weights = filtered.map(p => Math.max(1, Number(p[attr]) || 50));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < filtered.length; i++) { r -= weights[i]; if (r <= 0) return filtered[i]; }
  return filtered[filtered.length - 1];
}

function poissonSample(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}

/**
 * SIMULAÇÃO COMPLETA — Lances encadeados, minutos únicos, resultado realista
 * 
 * Estrutura de tempo (client-side mapeado para 12 minutos reais):
 * - Minutos 0-45:  1º tempo (5 min reais)
 * - Minutos 45-46: Intervalo (2 min reais)
 * - Minutos 46-92: 2º tempo (5 min reais)
 */
function simulateFullMatch(
  homeTeam: string, awayTeam: string, homePlayers: any[],
  homeStrength: number, awayStrength: number, tactics: any,
  stadiumName: string, isHome: boolean
) {
  // ── BUILD PLAYERS ─────────────────────────────────────────────────
  const home: SimPlayer[] = homePlayers.slice(0, 11).map((p: any, i: number) => ({
    id: p.id, name: (p.name || '').split(' ').pop() || p.name || `Jog${i}`,
    position: p.position || 'MEI', team: 'home' as const, ovr: p.overall || 60,
    rating: 6.0, goals: 0, assists: 0, yellowCards: 0, isOnPitch: true,
    stamina: p.stamina || 80, morale: p.morale || 70,
    speed: p.attributes?.speed || 50, shooting: p.attributes?.shooting || 50,
    passing: p.attributes?.passing || 50, defending: p.attributes?.defending || 50,
    physical: p.attributes?.physical || 50, dribbling: p.attributes?.dribbling || 50,
    heading: p.attributes?.heading || 50, marking: p.attributes?.marking || 50,
    vision: p.attributes?.vision || 50, crossing: p.attributes?.crossing || 50,
    longShots: p.attributes?.longShots || 50, workRate: p.attributes?.workRate || 50,
    composure: p.attributes?.composure || 50, aggression: p.attributes?.aggression || 50,
    goalkeeping: p.attributes?.goalkeeping || 0, setPieces: p.attributes?.setPieces || 50,
    positioning: p.attributes?.positioning || 50,
  }));

  // BOT FC players use generic numbered names
  const awayNames = awayTeam === 'BOT FC'
    ? Array.from({ length: 11 }, (_, i) => `BOT #${i + 1}`)
    : ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Almeida', 'Ribeiro', 'Gomes'];
  const away: SimPlayer[] = Array.from({ length: 11 }, (_, i) => {
    const pos = i === 0 ? 'GOL' : i < 5 ? 'ZAG' : i < 9 ? 'MEI' : 'ATA';
    const ovr = clamp(Math.floor(awayStrength + (rng() * 8 - 4)), 30, 99);
    const attrs = genAwayAttrs(ovr, pos);
    return {
      id: `a${i}`, name: awayNames[i] || `Jog.${i + 1}`, position: pos,
      team: 'away' as const, ovr, rating: 6.0, goals: 0, assists: 0, yellowCards: 0,
      isOnPitch: true, stamina: 70 + Math.floor(rng() * 20), morale: 60 + Math.floor(rng() * 30),
      ...attrs,
    };
  });

  const allPlayers = [...home, ...away];

  // ── MODIFIERS ─────────────────────────────────────────────────────
  const pressing = tactics?.pressing || 'medio';
  const playStyle = tactics?.playStyle || 'equilibrado';
  const tempo = tactics?.tempo || 'normal';

  const homeAdv = isHome ? 1.08 : 0.95;
  const avgMorale = home.reduce((s, p) => s + p.morale, 0) / Math.max(1, home.length);
  const moraleMod = 0.85 + (avgMorale / 100) * 0.3;
  const avgStamina = home.reduce((s, p) => s + p.stamina, 0) / 11;
  const fatigueMod = 0.8 + (avgStamina / 100) * 0.2;
  const pressingMod = pressing === 'ultra-alto' ? 1.2 : pressing === 'alto' ? 1.1 : pressing === 'medio' ? 1.0 : 0.9;
  const offensiveMod = playStyle === 'ofensivo' ? 1.15 : playStyle === 'contra-ataque' ? 1.05 : playStyle === 'equilibrado' ? 1.0 : playStyle === 'posse' ? 0.9 : 0.75;
  const tempoMod = tempo === 'muito-rapido' ? 1.1 : tempo === 'rapido' ? 1.05 : tempo === 'normal' ? 1.0 : 0.9;

  const stats = {
    possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0], corners: [0, 0],
    fouls: [0, 0], yellowCards: [0, 0], redCards: [0, 0], passes: [0, 0],
    tackles: [0, 0], saves: [0, 0], offsides: [0, 0],
  };

  // ── RESULTADO FINAL (Poisson) ─────────────────────────────────────
  const strengthDiff = (homeStrength * homeAdv * moraleMod * fatigueMod) - awayStrength;
  const homeExpected = clamp(1.1 + (strengthDiff / 100) * 1.8 * offensiveMod * tempoMod * pressingMod, 0.3, 3.5);
  const awayExpected = clamp(1.1 - (strengthDiff / 100) * 1.5, 0.2, 3.0);
  const totalHomeGoals = poissonSample(homeExpected);
  const totalAwayGoals = poissonSample(awayExpected);

  console.log(`[Sim] H:${homeStrength} A:${awayStrength} | λH:${homeExpected.toFixed(2)} λA:${awayExpected.toFixed(2)} | ${totalHomeGoals}x${totalAwayGoals}`);

  // ── MINUTOS ÚNICOS ────────────────────────────────────────────────
  const usedMinutes = new Set<number>([0, 45, 46]);

  function pickUnique(pool: number[]): number {
    const avail = pool.filter(m => !usedMinutes.has(m));
    if (!avail.length) return -1;
    const m = avail[Math.floor(rng() * avail.length)];
    usedMinutes.add(m); return m;
  }

  // Pools por metade (evita gols no intervalo)
  const firstHalfPool = Array.from({ length: 44 }, (_, i) => i + 1);      // 1-44
  const secondHalfPool = Array.from({ length: 44 }, (_, i) => i + 47);    // 47-90
  const allGamePool = [...firstHalfPool, ...secondHalfPool];

  // ── GOLS ─────────────────────────────────────────────────────────
  const homeGoalMins: number[] = [];
  const awayGoalMins: number[] = [];
  for (let g = 0; g < totalHomeGoals; g++) { const m = pickUnique(allGamePool); if (m > 0) homeGoalMins.push(m); }
  for (let g = 0; g < totalAwayGoals; g++) { const m = pickUnique(allGamePool); if (m > 0) awayGoalMins.push(m); }

  // ── EVENTOS DE SUPORTE ────────────────────────────────────────────
  const cardMins: number[] = [];
  for (let i = 0; i < 1 + Math.floor(rng() * 3); i++) {
    const m = pickUnique(allGamePool.filter(m => m >= 20)); if (m > 0) cardMins.push(m);
  }
  const subMins: number[] = [];
  for (let i = 0; i < 2 + Math.floor(rng() * 2); i++) {
    const m = pickUnique(secondHalfPool.filter(m => m >= 55)); if (m > 0) subMins.push(m);
  }
  const chanceMins: number[] = [];
  for (let i = 0; i < 3 + Math.floor(rng() * 4); i++) {
    const m = pickUnique(allGamePool); if (m > 0) chanceMins.push(m);
  }

  // Eventos de construção de jogada (posse/passe) para preencher os vazios
  const possessionMins: number[] = [];
  for (let m = 1; m <= 90; m++) {
    if (!usedMinutes.has(m) && m !== 45 && m !== 46 && rng() < 0.38) {
      usedMinutes.add(m); possessionMins.push(m);
    }
  }

  // ── BUILDER DE EVENTOS ────────────────────────────────────────────
  const allPlanned: SimEvent[] = [];
  let currentHome = 0, currentAway = 0;

  // Helper: construção de jogada (pre-event para gols e chances)
  function buildupDesc(team: 'home' | 'away', tName: string): string {
    const pool = allPlayers.filter(p => p.team === team && p.isOnPitch);
    const p1 = pool.length > 0 ? pick(pool).name : 'Jogador';
    const p2 = pool.filter(p => p.name !== p1).length > 0 ? pick(pool.filter(p => p.name !== p1)).name : p1;
    const buildups = [
      `${p1} recebe no meio, avança e toca para ${p2} em boa posição`,
      `Troca de passes rápida do ${tName}: ${p1} para ${p2} pela esquerda`,
      `${p1} cruza a linha do meio e lança ${p2} nas costas da defesa`,
      `Combinação rápida entre ${p1} e ${p2} abre espaço no ataque`,
    ];
    return pick(buildups);
  }

  // GOLS — CASA
  for (const m of homeGoalMins) {
    const scorer = pickByAttr(home.filter(p => p.isOnPitch), 'shooting', rng() > 0.55 ? 'ATA' : undefined);
    const gk = pickByAttr(away.filter(p => p.isOnPitch), 'goalkeeping', 'GOL');
    const shooterSkill = scorer ? (scorer.shooting * 0.6 + scorer.composure * 0.4) : 60;
    const gkSkill = gk ? (gk.goalkeeping * 0.7 + gk.positioning * 0.3) : 55;
    const goalProb = clamp(shooterSkill / (shooterSkill + gkSkill) + 0.1, 0.4, 0.82);

    if (rng() < goalProb) {
      currentHome++;
      const goalTypes = ['chute rasteiro no canto', 'chute colocado no ângulo', 'voleio espetacular', 'toque de primeira na área', 'chute cruzado de pé direito', 'trivela precisa'];
      const goalType = pick(goalTypes);
      let assistName: string | undefined;
      if (scorer) {
        scorer.goals++; scorer.rating = Math.min(10, scorer.rating + 1.2);
        const others = home.filter(p => p.id !== scorer.id && p.isOnPitch);
        if (others.length > 0 && rng() < 0.65) {
          const assister = pickByAttr(others, 'vision') || pick(others);
          assister.assists++; assister.rating = Math.min(10, assister.rating + 0.6);
          assistName = assister.name;
        }
      }
      stats.shots[0]++; stats.shotsOnTarget[0]++;
      const assistText = assistName ? ` Assistência de ${assistName}!` : '';
      const cel = pick(['🎉 Corre para a torcida e desliza de joelhos!', '🤩 A equipe inteira pula em cima!', '👐 Aponta para o céu, torcida em êxtase!', '🫂 Abraça o técnico na beira do campo!']);
      const buildup = buildupDesc('home', homeTeam);
      allPlanned.push({
        minute: m, type: 'foot_goal', team: 'home', isGoal: true,
        playerName: scorer?.name, assistName, goalType,
        animType: 'goal', ballX: 0.95, ballY: 0.5,
        description: `⚽ GOL DO ${homeTeam.toUpperCase()}! ${buildup}... ${scorer?.name || 'Jogador'} finaliza com ${goalType}! ${cel}${assistText} [${currentHome}x${currentAway}]`,
      });
    } else {
      stats.shots[0]++; stats.shotsOnTarget[0]++; stats.saves[1]++;
      if (gk) gk.rating = Math.min(10, gk.rating + 0.4);
      allPlanned.push({
        minute: m, type: 'great_save', team: 'home', animType: 'save', ballX: 0.92, ballY: 0.5,
        description: `🧤 DEFESAÇA! ${gk?.name || 'Goleiro'} do ${awayTeam} voa no ângulo e salva o time! Incrível!`,
        playerName: gk?.name,
      });
    }
  }

  // GOLS — VISITANTE
  for (const m of awayGoalMins) {
    const scorer = pickByAttr(away.filter(p => p.isOnPitch), 'shooting', rng() > 0.55 ? 'ATA' : undefined);
    const gk = pickByAttr(home.filter(p => p.isOnPitch), 'goalkeeping', 'GOL');
    const shooterSkill = scorer ? (scorer.shooting * 0.6 + scorer.composure * 0.4) : 60;
    const gkSkill = gk ? (gk.goalkeeping * 0.7 + gk.positioning * 0.3) : 55;
    const goalProb = clamp(shooterSkill / (shooterSkill + gkSkill) + 0.05, 0.35, 0.75);

    if (rng() < goalProb) {
      currentAway++;
      const goalType = pick(['chute rasteiro', 'chute no canto', 'cabeceio preciso', 'contra-ataque fulminante', 'chute de fora da área']);
      let assistName: string | undefined;
      if (scorer) {
        scorer.goals++; scorer.rating = Math.min(10, scorer.rating + 1.2);
        const others = away.filter(p => p.id !== scorer.id && p.isOnPitch);
        if (others.length > 0 && rng() < 0.60) {
          const assister = pick(others);
          assister.assists++; assister.rating = Math.min(10, assister.rating + 0.6);
          assistName = assister.name;
        }
      }
      stats.shots[1]++; stats.shotsOnTarget[1]++;
      const assistText = assistName ? ` Assistência de ${assistName}!` : '';
      const buildup = buildupDesc('away', awayTeam);
      allPlanned.push({
        minute: m, type: 'foot_goal', team: 'away', isGoal: true,
        playerName: scorer?.name, assistName, goalType,
        animType: 'goal', ballX: 0.05, ballY: 0.5,
        description: `⚽ GOL DO ${awayTeam.toUpperCase()}! ${buildup}... ${scorer?.name || 'Jogador'} marca com ${goalType}!${assistText} [${currentHome}x${currentAway}]`,
      });
    } else {
      stats.shots[1]++; stats.shotsOnTarget[1]++; stats.saves[0]++;
      if (gk) gk.rating = Math.min(10, gk.rating + 0.4);
      allPlanned.push({
        minute: m, type: 'great_save', team: 'away', animType: 'save', ballX: 0.05, ballY: 0.5,
        description: `🧤 GRANDE DEFESA! ${gk?.name || 'Goleiro'} do ${homeTeam} salva! O ${awayTeam} quase marcou!`,
        playerName: gk?.name,
      });
    }
  }

  // CARTÕES
  for (const m of cardMins) {
    const teamIdx: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    const opp = team === 'home' ? awayTeam : homeTeam;
    const pool = allPlayers.filter(p => p.team === team && p.isOnPitch);
    const pName = pool.length > 0 ? pick(pool).name : 'Jogador';
    const oppPool = allPlayers.filter(p => p.team !== team && p.isOnPitch);
    const oppName = oppPool.length > 0 ? pick(oppPool).name : 'Adversário';
    stats.fouls[teamIdx]++; stats.yellowCards[teamIdx]++;
    allPlanned.push({
      minute: m, type: 'yellow_card', team, animType: 'card',
      playerName: pName,
      description: `🟨 CARTÃO AMARELO! ${pName} do ${tName} faz falta em ${oppName} do ${opp}. O árbitro não hesita!`,
    });
  }

  // SUBSTITUIÇÕES — com nomes dos jogadores
  for (const m of subMins) {
    const teamIdx: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    const onPitch = allPlayers.filter(p => p.team === team && p.isOnPitch);
    const playerOut = onPitch.length > 1 ? onPitch[Math.floor(rng() * (onPitch.length - 1)) + 1] : onPitch[0]; // skip GK
    const playerInName = team === 'home'
      ? `Reserva ${Math.floor(rng() * 7 + 12)}`
      : (awayTeam === 'BOT FC' ? `BOT #${Math.floor(rng() * 5 + 12)}` : `Reserva ${Math.floor(rng() * 7 + 12)}`);
    const outName = playerOut?.name || 'Jogador';
    if (playerOut) playerOut.isOnPitch = false;
    allPlanned.push({
      minute: m, type: 'substitution', team, animType: 'sub',
      playerName: outName,
      description: `🔄 SUBSTITUIÇÃO no ${tName}! Sai ${outName}, entra ${playerInName}. O técnico busca fôlego novo!`,
    });
  }

  // GRANDES CHANCES
  for (const m of chanceMins) {
    const teamIdx: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    const pool = allPlayers.filter(p => p.team === team && p.isOnPitch);
    const pName = pool.length > 0 ? pick(pool).name : 'Jogador';
    stats.shots[teamIdx]++;
    const evType = pick(['woodwork', 'great_save', 'corner_danger', 'offside_trap']);
    const descs: Record<string, string[]> = {
      woodwork: [`📐 TRAVE! ${pName} do ${tName} chuta perfeito e a bola explode na madeira! Que azar!`, `📐 TRAVESSÃO! ${pName} cabeceia forte mas a bola voltou do ferro!`],
      great_save: [`🧤 Defesa incrível! ${pName} do ${tName} ficou cara a cara mas o goleiro fechou o ângulo!`, `🧤 ${pName} chuta forte mas o goleiro espalma com categoria!`],
      corner_danger: [`🚩 Escanteio perigoso do ${tName}! ${pName} sobe mas cabeceia para fora!`, `🚩 Cobrança de canto muito perigosa, a bola passa raspando!`],
      offside_trap: [`⛳ Impedimento anulado! ${pName} do ${tName} estava em posição irregular. Que decepção!`, `⛳ O árbitro levanta a bandeira: impedimento de ${pName}. Gol anulado!`],
    };
    if (evType === 'great_save') { stats.shotsOnTarget[teamIdx]++; stats.saves[teamIdx === 0 ? 1 : 0]++; }
    if (evType === 'corner_danger') stats.corners[teamIdx]++;
    if (evType === 'offside_trap') stats.offsides[teamIdx]++;
    allPlanned.push({
      minute: m, type: evType, team, animType: 'chance', playerName: pName,
      description: pick(descs[evType] || [`⚡ Grande chance do ${tName}!`]),
    });
  }

  // POSSE/PASSES (preenche os minutos vazios — lances encadeados)
  for (const m of possessionMins) {
    const teamIdx: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    const opp = team === 'home' ? awayTeam : homeTeam;
    const pool = allPlayers.filter(p => p.team === team && p.isOnPitch);
    const p1 = pool.length > 0 ? pick(pool).name : 'Jogador';
    const p2 = pool.filter(p => p.name !== p1).length > 0 ? pick(pool.filter(p => p.name !== p1)).name : p1;
    stats.passes[teamIdx]++;
    const bx = team === 'home' ? 0.4 + rng() * 0.3 : 0.3 + rng() * 0.3;

    const posTypes = [
      { type: 'possession', desc: `⚽ ${tName} trabalha bem a bola. ${p1} toca curto para ${p2} que busca espaço no meio.`, anim: 'pass' as const },
      { type: 'dribble_ok', desc: `✨ ${p1} faz uma jogada individual bonita e avança pelo corredor!`, anim: 'pass' as const },
      { type: 'through_ball', desc: `🏃 ${tName} tenta o contra-ataque! ${p1} lança ${p2} nas costas da marcação do ${opp}!`, anim: 'pass' as const },
      { type: 'midfield_foul', desc: `⚠️ Falta de ${p1} no meio. Árbitro marca e orienta o jogo.`, anim: 'foul' as const },
      { type: 'possession', desc: `📐 ${p1} triangula com ${p2} e tenta abrir a defesa do ${opp} pelo lado.`, anim: 'pass' as const },
    ];
    const chosen = pick(posTypes);
    if (chosen.type === 'midfield_foul') stats.fouls[teamIdx]++;
    allPlanned.push({
      minute: m, type: chosen.type, team, animType: chosen.anim, playerName: p1,
      ballX: bx, ballY: 0.2 + rng() * 0.6,
      description: chosen.desc,
    });
  }

  // ── MONTAR EVENTOS FINAIS ─────────────────────────────────────────
  allPlanned.sort((a, b) => a.minute - b.minute);

  const addedTime1 = 1 + Math.floor(rng() * 4);
  const halftimeMin = 45 + addedTime1;

  // Placar real do 1T
  const ht_h = homeGoalMins.filter(m => m <= 45).length;
  const ht_a = awayGoalMins.filter(m => m <= 45).length;

  const finalEvents: SimEvent[] = [];

  // KICKOFF — with stadium, crowd and competition info
  const competition = isHome ? 'Amistoso' : 'Amistoso';
  const estimatedCrowd = Math.floor(stats.possession[0] * 100 + rng() * 5000 + 2000);
  finalEvents.push({
    minute: 0, type: 'kickoff', team: 'neutral', animType: 'kickoff', ballX: 0.5, ballY: 0.5,
    description: `🏟️ A partida começa no ${stadiumName}, com público de ${estimatedCrowd.toLocaleString('pt-BR')} torcedores! ⚽ ${homeTeam} x ${awayTeam} — Amistoso! O árbitro apita e a bola rola!`,
  });

  // Eventos do 1T
  for (const ev of allPlanned.filter(e => e.minute <= 44)) {
    finalEvents.push(ev);
  }

  // Acréscimos e intervalo
  finalEvents.push({
    minute: 45, type: 'added_time', team: 'neutral', animType: 'halftime', ballX: 0.5, ballY: 0.5,
    description: `⏱️ +${addedTime1} minutos de acréscimo no 1º tempo!`,
  });
  finalEvents.push({
    minute: halftimeMin, type: 'halftime', team: 'neutral', animType: 'halftime', ballX: 0.5, ballY: 0.5,
    description: `⏸️ INTERVALO! ${homeTeam} ${ht_h} x ${ht_a} ${awayTeam}. Os jogadores seguem para o vestiário. Tempo de ajustes táticos!`,
  });

  // Eventos do 2T
  for (const ev of allPlanned.filter(e => e.minute >= 47)) {
    finalEvents.push(ev);
  }

  // Acréscimos e apito final
  const addedTime2 = 1 + Math.floor(rng() * 5);
  const finalHomeGoals = homeGoalMins.length; // número real de gols (eventos que converteram)
  const finalAwayGoals = awayGoalMins.length;
  // Usar currentHome/currentAway que são os gols REALMENTE convertidos
  finalEvents.push({
    minute: 90, type: 'added_time', team: 'neutral', animType: 'halftime', ballX: 0.5, ballY: 0.5,
    description: `⏱️ +${addedTime2} minutos de acréscimo no 2º tempo!`,
  });
  finalEvents.push({
    minute: 90 + addedTime2, type: 'final_whistle', team: 'neutral', animType: 'final', ballX: 0.5, ballY: 0.5,
    description: `🏁 APITO FINAL! ${homeTeam} ${currentHome} x ${currentAway} ${awayTeam}! Fim de jogo no ${stadiumName}!`,
  });

  // Posse de bola
  const effectiveHome = homeStrength * homeAdv * moraleMod;
  const possRatio = effectiveHome / (effectiveHome + awayStrength);
  stats.possession = [Math.round(possRatio * 100), 100 - Math.round(possRatio * 100)];

  // Player ratings
  const playerRatings: Record<string, number> = {};
  allPlayers.filter(p => p.team === 'home').forEach(p => {
    playerRatings[p.id] = Math.round(p.rating * 10) / 10;
  });

  // Goal scorers for history
  const goalScorers: { name: string; minute: number; team: 'home' | 'away'; assist?: string }[] = [];
  finalEvents.filter(e => e.isGoal).forEach(e => {
    if (e.playerName) goalScorers.push({ name: e.playerName, minute: e.minute, team: e.team as 'home' | 'away', assist: e.assistName });
  });

  // Man of the match: highest rated player
  const homePlayers_sorted = allPlayers.filter(p => p.team === 'home').sort((a, b) => b.rating - a.rating);
  const manOfTheMatch = homePlayers_sorted.length > 0 ? homePlayers_sorted[0].name : undefined;

  console.log(`[Sim] Final: ${currentHome}x${currentAway} | Events: ${finalEvents.length}`);
  return { events: finalEvents, homeGoals: currentHome, awayGoals: currentAway, stats, playerRatings, goalScorers, manOfTheMatch };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const { homeTeam, awayTeam, homePlayers, homeStrength, awayStrength, matchId, tactics, stadiumName, stadiumCapacity, isHome, competition } = body;

    if (!homeTeam || !awayTeam || !matchId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (typeof homeTeam !== 'string' || homeTeam.length > 100 || typeof awayTeam !== 'string' || awayTeam.length > 100 || typeof matchId !== 'string' || matchId.length > 200) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check for existing active match
    const { data: existing } = await adminClient
      .from('live_matches')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'live')
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Já existe uma partida em andamento', matchDbId: existing.id }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Simulate
    const result = simulateFullMatch(
      homeTeam, awayTeam, homePlayers || [],
      homeStrength || 60, awayStrength || 60,
      tactics || {}, stadiumName || 'Estádio', isHome !== false
    );

    // Duration: 12 minutes real-time (720 seconds) for a full match
    const durationSeconds = 720;
    const now = new Date();

    const { data: match, error: insertError } = await adminClient
      .from('live_matches')
      .insert({
        user_id: userId,
        match_id: matchId,
        home_team: homeTeam,
        away_team: awayTeam,
        home_strength: homeStrength || 60,
        away_strength: awayStrength || 60,
        stadium_name: stadiumName || 'Estádio',
        stadium_capacity: stadiumCapacity || 5000,
        is_home: isHome !== false,
        competition: competition || 'Amistoso',
        status: 'live',
        started_at: now.toISOString(),
        duration_seconds: durationSeconds,
        home_goals: result.homeGoals,
        away_goals: result.awayGoals,
        current_minute: 0,
        events: result.events,
        stats: result.stats,
        player_ratings: result.playerRatings,
        home_players: (homePlayers || []).slice(0, 11).map((p: any) => ({ id: p.id, name: p.name, position: p.position, overall: p.overall })),
        tactics: tactics || {},
        finished_at: new Date(now.getTime() + durationSeconds * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to create match:', insertError.message);
      return new Response(JSON.stringify({ error: 'Failed to create match' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Save to match_history immediately (permanent record)
    await adminClient.from('match_history').insert({
      user_id: userId,
      live_match_id: match.id,
      match_type: 'friendly',
      competition: competition || 'Amistoso',
      home_team: homeTeam,
      away_team: awayTeam,
      home_goals: result.homeGoals,
      away_goals: result.awayGoals,
      is_home: isHome !== false,
      stadium_name: stadiumName || 'Estádio',
      stadium_capacity: stadiumCapacity || 5000,
      played_at: now.toISOString(),
      events: result.events,
      stats: result.stats,
      player_ratings: result.playerRatings,
      home_players: (homePlayers || []).slice(0, 11).map((p: any) => ({ id: p.id, name: p.name, position: p.position, overall: p.overall })),
      goal_scorers: result.goalScorers,
      man_of_the_match: result.manOfTheMatch || null,
    });

    return new Response(JSON.stringify({
      success: true,
      matchDbId: match.id,
      startedAt: now.toISOString(),
      durationSeconds,
      totalEvents: result.events.length,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('start-match error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
