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
  animType?: 'goal' | 'pass' | 'save' | 'foul' | 'card' | 'sub' | 'chance' | 'halftime' | 'kickoff' | 'final' | 'penalty';
  ballX?: number; ballY?: number;
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
 * SIMULAÇÃO COMPLETA v2 — Placar determinístico via Poisson (sem double-check)
 * 
 * CORREÇÕES:
 * 1. Poisson determina placar FINAL diretamente — sem goalProb secondary check
 * 2. Eventos de pênalti e faltas perigosas adicionados
 * 3. competition passado corretamente
 * 4. awayStrength validado/clampado no servidor
 */
function simulateFullMatch(
  homeTeam: string, awayTeam: string, homePlayers: any[],
  homeStrength: number, awayStrength: number, tactics: any,
  stadiumName: string, isHome: boolean, competition: string
) {
  // Validate and clamp strengths server-side
  homeStrength = clamp(Math.round(homeStrength), 20, 99);
  awayStrength = clamp(Math.round(awayStrength), 20, 99);

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

  const awayNames = awayTeam === 'AI FC'
    ? Array.from({ length: 11 }, (_, i) => `AI #${i + 1}`)
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

  // ── Position-based strength modifiers ──────────────────────────
  const homeDefenders = home.filter(p => ['ZAG', 'LAT', 'GOL'].includes(p.position));
  const homeMidfielders = home.filter(p => ['MEI', 'VOL', 'MC', 'ME', 'MD'].includes(p.position));
  const homeAttackers = home.filter(p => ['ATA', 'PE', 'PD', 'SA'].includes(p.position));
  
  const homeDefAvg = homeDefenders.length > 0 ? homeDefenders.reduce((s, p) => s + p.defending, 0) / homeDefenders.length : 50;
  const homeMidAvg = homeMidfielders.length > 0 ? homeMidfielders.reduce((s, p) => s + (p.passing + p.vision) / 2, 0) / homeMidfielders.length : 50;
  const homeAtkAvg = homeAttackers.length > 0 ? homeAttackers.reduce((s, p) => s + p.shooting, 0) / homeAttackers.length : 50;

  // Away positional averages
  const awayDefenders = away.filter(p => ['ZAG', 'LAT', 'GOL'].includes(p.position));
  const awayAttackers = away.filter(p => ['ATA'].includes(p.position));
  const awayDefAvg = awayDefenders.length > 0 ? awayDefenders.reduce((s, p) => s + p.defending, 0) / awayDefenders.length : 50;
  const awayAtkAvg = awayAttackers.length > 0 ? awayAttackers.reduce((s, p) => s + p.shooting, 0) / awayAttackers.length : 50;

  const stats = {
    possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0], corners: [0, 0],
    fouls: [0, 0], yellowCards: [0, 0], redCards: [0, 0], passes: [0, 0],
    tackles: [0, 0], saves: [0, 0], offsides: [0, 0],
  };

  // ── RESULTADO FINAL (Poisson) — DETERMINÍSTICO ─────────────────
  // Attack vs opposing defense determines goal expectancy
  const homeAttackVsDefense = (homeAtkAvg + homeMidAvg * 0.5) / Math.max(1, awayDefAvg);
  const awayAttackVsDefense = (awayAtkAvg + 50 * 0.5) / Math.max(1, homeDefAvg);
  
  const strengthDiff = (homeStrength * homeAdv * moraleMod * fatigueMod) - awayStrength;
  const homeExpected = clamp(
    1.1 + (strengthDiff / 100) * 1.5 * offensiveMod * tempoMod * pressingMod + (homeAttackVsDefense - 1) * 0.3,
    0.3, 3.5
  );
  const awayExpected = clamp(
    1.1 - (strengthDiff / 100) * 1.2 + (awayAttackVsDefense - 1) * 0.3,
    0.2, 3.0
  );
  
  // Poisson is the SOLE determinant — no secondary goalProb check
  const totalHomeGoals = poissonSample(homeExpected);
  const totalAwayGoals = poissonSample(awayExpected);

  console.log(`[Sim] H:${homeStrength} A:${awayStrength} | λH:${homeExpected.toFixed(2)} λA:${awayExpected.toFixed(2)} | Final: ${totalHomeGoals}x${totalAwayGoals}`);

  // ── MINUTOS ÚNICOS ────────────────────────────────────────────────
  const usedMinutes = new Set<number>([0, 45, 46]);

  function pickUnique(pool: number[]): number {
    const avail = pool.filter(m => !usedMinutes.has(m));
    if (!avail.length) return -1;
    const m = avail[Math.floor(rng() * avail.length)];
    usedMinutes.add(m); return m;
  }

  const firstHalfPool = Array.from({ length: 44 }, (_, i) => i + 1);
  const secondHalfPool = Array.from({ length: 44 }, (_, i) => i + 47);
  const allGamePool = [...firstHalfPool, ...secondHalfPool];

  // ── GOAL MINUTES ────────────────────────────────────────────────
  const homeGoalMins: number[] = [];
  const awayGoalMins: number[] = [];
  for (let g = 0; g < totalHomeGoals; g++) { const m = pickUnique(allGamePool); if (m > 0) homeGoalMins.push(m); }
  for (let g = 0; g < totalAwayGoals; g++) { const m = pickUnique(allGamePool); if (m > 0) awayGoalMins.push(m); }

  // ── PENALTY EVENTS ────────────────────────────────────────────────
  // Determine if penalties happen based on pressing, aggression, attack pressure
  const penaltyMins: { minute: number; team: 'home' | 'away'; isGoal: boolean }[] = [];
  const penaltyChance = (pressingMod - 0.9) * 0.15 + 0.08; // Higher pressing = more penalty chances
  
  for (let i = 0; i < 2; i++) {
    if (rng() < penaltyChance) {
      const team: 'home' | 'away' = rng() < 0.55 ? 'home' : 'away';
      const m = pickUnique(allGamePool.filter(m => m >= 20));
      if (m > 0) {
        // Penalty conversion based on kicker composure vs GK
        const kicker = team === 'home'
          ? pickByAttr(home.filter(p => p.isOnPitch), 'setPieces')
          : pickByAttr(away.filter(p => p.isOnPitch), 'setPieces');
        const gk = team === 'home'
          ? pickByAttr(away.filter(p => p.isOnPitch), 'goalkeeping', 'GOL')
          : pickByAttr(home.filter(p => p.isOnPitch), 'goalkeeping', 'GOL');
        
        const kickerSkill = kicker ? (kicker.composure * 0.5 + kicker.setPieces * 0.5) : 55;
        const gkSkill = gk ? (gk.goalkeeping * 0.6 + gk.composure * 0.4) : 50;
        const conversionProb = clamp(kickerSkill / (kickerSkill + gkSkill) + 0.15, 0.55, 0.85);
        const isGoal = rng() < conversionProb;
        
        penaltyMins.push({ minute: m, team, isGoal });
      }
    }
  }

  // ── DANGEROUS FOUL EVENTS ──────────────────────────────────────
  const dangerousFoulMins: number[] = [];
  const dangerousFoulCount = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < dangerousFoulCount; i++) {
    const m = pickUnique(allGamePool.filter(m => m >= 10));
    if (m > 0) dangerousFoulMins.push(m);
  }

  // ── SUPPORT EVENTS ────────────────────────────────────────────────
  const cardMins: number[] = [];
  for (let i = 0; i < 2 + Math.floor(rng() * 4); i++) {
    const m = pickUnique(allGamePool.filter(m => m >= 15)); if (m > 0) cardMins.push(m);
  }
  const subMins: number[] = [];
  for (let i = 0; i < 2 + Math.floor(rng() * 3); i++) {
    const m = pickUnique(secondHalfPool.filter(m => m >= 55)); if (m > 0) subMins.push(m);
  }
  const chanceMins: number[] = [];
  for (let i = 0; i < 5 + Math.floor(rng() * 5); i++) {
    const m = pickUnique(allGamePool); if (m > 0) chanceMins.push(m);
  }

  // Fill remaining minutes with possession events
  const possessionMins: number[] = [];
  for (let m = 1; m <= 90; m++) {
    if (!usedMinutes.has(m) && m !== 45 && m !== 46) {
      usedMinutes.add(m); possessionMins.push(m);
    }
  }

  // ── EVENT BUILDER ────────────────────────────────────────────────
  const allPlanned: SimEvent[] = [];
  let currentHome = 0, currentAway = 0;

  // Track penalty goals separately — they add to total score
  let penaltyHomeGoals = 0, penaltyAwayGoals = 0;

  function buildupDesc(team: 'home' | 'away', tName: string): string {
    const pool = allPlayers.filter(p => p.team === team && p.isOnPitch);
    const p1 = pool.length > 0 ? pick(pool).name : 'Jogador';
    const p2 = pool.filter(p => p.name !== p1).length > 0 ? pick(pool.filter(p => p.name !== p1)).name : p1;
    const p3 = pool.filter(p => p.name !== p1 && p.name !== p2).length > 0 ? pick(pool.filter(p => p.name !== p1 && p.name !== p2)).name : p2;
    const buildups = [
      `${p1} recebe no meio-campo, gira sobre o marcador e toca para ${p2} que avança em velocidade pela meia-esquerda. ${p2} abre para ${p3} na ponta que cruza na área`,
      `Troca de passes rápida do ${tName}: ${p1} para ${p2}, tabela pelo centro, a bola volta limpa para ${p1} que avança livre pelo corredor central e encontra ${p3} na entrada da área`,
      `${p1} desarma no meio-campo e aciona ${p2} no contra-ataque fulminante! ${p2} avança em alta velocidade, dribla um adversário e encontra ${p3} sozinho dentro da área`,
      `Combinação magistral entre ${p1} e ${p2}: parede no meio, ${p2} lança ${p3} nas costas da defesa com um passe de classe mundial. ${p3} domina no peito e fica cara a cara com o goleiro`,
      `${p1} recebe pressão de dois marcadores mas consegue sair com categoria, rola para ${p2} que dá um lindo lançamento de primeira para ${p3} invadindo a grande área pelo lado direito`,
      `Jogada ensaiada do ${tName}! ${p1} cobra a falta curta para ${p2}, que devolve de calcanhar para ${p3}. A defesa fica perdida e ${p3} aparece livre na marca do pênalti`,
    ];
    return pick(buildups);
  }

  // ── GOAL NARRATIONS ─────────────────────────────────────────────
  const goalNarrations = {
    home: (scorer: string, goalType: string, assistName: string | undefined, tName: string, opp: string, score: string) => {
      const assistText = assistName ? ` Assistência BRILHANTE de ${assistName}, que deixou tudo mastigado!` : '';
      const celebrations = [
        `A torcida EXPLODE nas arquibancadas! ${scorer} corre para o setor onde está a organizada, tira a camisa e gira no ar! LOUCURA no estádio! Os companheiros pulam em cima dele formando um monte humano!`,
        `${scorer} desliza de joelhos no gramado molhado, fecha os olhos e aponta para o céu com as duas mãos! Lágrimas de emoção! A equipe inteira corre para abraçá-lo na comemoração mais efusiva da partida!`,
        `QUE GOLAÇO! ${scorer} sai correndo feito louco pela lateral do campo, os reservas invadem o gramado para festejar! O técnico faz gestos para a torcida e o estádio vem abaixo! Momento ÉPICO!`,
        `O estádio treme! ${scorer} faz o famoso gesto do coração com as mãos voltado para a câmera, enquanto fogos de artifício estouram atrás da arquibancada! Festa completa!`,
        `ARREPIANTE! ${scorer} abraça o bandeirinha de escanteio, os torcedores mais próximos jogam copos de cerveja para o alto e o estádio inteiro canta o nome dele em uníssono!`,
      ];
      return `⚽ GOOOOOOL DO ${tName.toUpperCase()}!!! ${scorer} finaliza com um ${goalType} ESPETACULAR e a bola morre no fundo das redes! O goleiro do ${opp} ficou estátua!${assistText} ${pick(celebrations)} [${score}]`;
    },
    away: (scorer: string, goalType: string, assistName: string | undefined, tName: string, opp: string, score: string) => {
      const assistText = assistName ? ` Passe decisivo de ${assistName}!` : '';
      const descs = [
        `⚽ GOL DO ${tName.toUpperCase()}! ${scorer} aparece como um fantasma na área e finaliza com ${goalType} certeiro! A defesa do ${opp} foi pega no cochilo e o goleiro nem se mexeu! ${scorer} comemora com os punhos cerrados enquanto a torcida mandante fica em silêncio sepulcral!${assistText} [${score}]`,
        `⚽ GOL DO ${tName.toUpperCase()}! Contra-ataque mortal! ${scorer} recebe em velocidade, ajusta o corpo e solta um ${goalType} impossível de defender! O estádio emudece enquanto ${scorer} celebra provocando os torcedores adversários!${assistText} [${score}]`,
        `⚽ GOL DO ${tName.toUpperCase()}! Jogada trabalhada com maestria! ${scorer} finaliza com ${goalType} no cantinho e o goleiro do ${opp} só olha a bola entrar! Gelo no estádio! ${scorer} corre em direção ao banco de reservas e é recebido com festa!${assistText} [${score}]`,
      ];
      return pick(descs);
    },
  };

  // ── HOME GOALS — all Poisson goals are GUARANTEED to convert ──
  for (const m of homeGoalMins) {
    currentHome++;
    const scorer = pickByAttr(home.filter(p => p.isOnPitch), 'shooting', rng() > 0.55 ? 'ATA' : undefined);
    const goalTypes = ['chute rasteiro no canto inferior esquerdo', 'chute colocado no ângulo superior direito', 'voleio espetacular de primeira', 'toque de primeira na saída do goleiro', 'chute cruzado de pé direito sem chance para o arqueiro', 'trivela precisa no cantinho', 'cabeçada certeira no segundo pau', 'chute de longe que desviou na defesa e entrou', 'finalização seca de meia-altura'];
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
    const buildup = buildupDesc('home', homeTeam);
    allPlanned.push({
      minute: m, type: 'foot_goal', team: 'home', isGoal: true,
      playerName: scorer?.name, assistName, goalType,
      animType: 'goal', ballX: 0.95, ballY: 0.5,
      description: `${buildup}... ${goalNarrations.home(scorer?.name || 'Jogador', goalType, assistName, homeTeam, awayTeam, `${currentHome}x${currentAway}`)}`,
    });
  }

  // ── AWAY GOALS — all Poisson goals GUARANTEED ──
  for (const m of awayGoalMins) {
    currentAway++;
    const scorer = pickByAttr(away.filter(p => p.isOnPitch), 'shooting', rng() > 0.55 ? 'ATA' : undefined);
    const goalType = pick(['chute rasteiro cruzado', 'chute seco no canto inferior', 'cabeceio preciso no segundo pau', 'contra-ataque fulminante com toque na saída do goleiro', 'chute de fora da área que desviou na barreira', 'finalização de primeira após cruzamento perfeito']);
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
    const buildup = buildupDesc('away', awayTeam);
    allPlanned.push({
      minute: m, type: 'foot_goal', team: 'away', isGoal: true,
      playerName: scorer?.name, assistName, goalType,
      animType: 'goal', ballX: 0.05, ballY: 0.5,
      description: `${buildup}... ${goalNarrations.away(scorer?.name || 'Jogador', goalType, assistName, awayTeam, homeTeam, `${currentHome}x${currentAway}`)}`,
    });
  }

  // ── PENALTY EVENTS ────────────────────────────────────────────────
  for (const pen of penaltyMins) {
    const team = pen.team;
    const tName = team === 'home' ? homeTeam : awayTeam;
    const opp = team === 'home' ? awayTeam : homeTeam;
    const teamPlayers = team === 'home' ? home : away;
    const oppPlayers = team === 'home' ? away : home;
    const teamIdx = team === 'home' ? 0 : 1;
    
    const kicker = pickByAttr(teamPlayers.filter(p => p.isOnPitch), 'setPieces');
    const gk = pickByAttr(oppPlayers.filter(p => p.isOnPitch), 'goalkeeping', 'GOL');
    const fouler = pickByAttr(oppPlayers.filter(p => p.isOnPitch && p.position !== 'GOL'), 'aggression');
    const fouledPlayer = pickByAttr(teamPlayers.filter(p => p.isOnPitch), 'dribbling', 'ATA');
    
    // Foul description
    const foulDescs = [
      `🔴 PÊNALTI PARA O ${tName.toUpperCase()}! ${fouler?.name || 'Defensor'} do ${opp} derruba ${fouledPlayer?.name || 'atacante'} dentro da grande área com uma entrada irresponsável! O árbitro aponta para a marca da cal sem hesitar! Toda a torcida do ${tName} se levanta!`,
      `🔴 PÊNALTI! ${fouledPlayer?.name || 'Atacante'} do ${tName} invade a área pelo lado direito, dribla um defensor e é derrubado por ${fouler?.name || 'zagueiro'} do ${opp}! Penalidade máxima! O estádio explode!`,
      `🔴 O ÁRBITRO MARCA PÊNALTI! Jogada envolvente do ${tName}, a bola chega dentro da área para ${fouledPlayer?.name || 'atacante'} que é atingido por trás por ${fouler?.name || 'defensor'} do ${opp}! Decisão correta!`,
    ];
    
    stats.fouls[teamIdx === 0 ? 1 : 0]++;
    
    if (pen.isGoal) {
      if (team === 'home') { currentHome++; penaltyHomeGoals++; }
      else { currentAway++; penaltyAwayGoals++; }
      
      if (kicker) { kicker.goals++; kicker.rating = Math.min(10, kicker.rating + 1.0); }
      stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++;
      
      const penGoalDescs = [
        `⚽🎯 GOOOOL DE PÊNALTI! ${kicker?.name || 'Cobrador'} do ${tName} bate com frieza no canto esquerdo! ${gk?.name || 'Goleiro'} até adivinha o lado mas a bola entra com força! PLACAR: ${currentHome}x${currentAway}! A torcida vai à loucura!`,
        `⚽🎯 CONVERTEU! ${kicker?.name || 'Cobrador'} pega a bola com confiança, toma distância, corre e chuta forte no meio do gol! ${gk?.name || 'Goleiro'} se joga para o lado e a bola entra! ${currentHome}x${currentAway}! Nervos de aço!`,
        `⚽🎯 GOOOL! ${kicker?.name || 'Cobrador'} do ${tName} cobra com classe! Paradinha na corrida, ${gk?.name || 'Goleiro'} se antecipa para a direita e a bola vai no canto oposto! Implacável! ${currentHome}x${currentAway}!`,
      ];
      
      allPlanned.push({
        minute: pen.minute, type: 'penalty_goal', team, isGoal: true,
        playerName: kicker?.name, goalType: 'pênalti',
        animType: 'penalty', ballX: team === 'home' ? 0.88 : 0.12, ballY: 0.5,
        description: `${pick(foulDescs)}\n\n${pick(penGoalDescs)}`,
      });
    } else {
      stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++;
      stats.saves[teamIdx === 0 ? 1 : 0]++;
      if (gk) gk.rating = Math.min(10, gk.rating + 0.8);
      
      const penSaveDescs = [
        `🧤❌ DEFENDEU! ${gk?.name || 'Goleiro'} do ${opp} adivinha o canto e faz uma defesa MONUMENTAL no pênalti de ${kicker?.name || 'cobrador'}! O estádio explode! ${gk?.name || 'Goleiro'} se levanta batendo no peito — que momento HEROICO!`,
        `🧤❌ PERDEU O PÊNALTI! ${kicker?.name || 'Cobrador'} bate forte demais e a bola vai para fora! Por cima do gol! A pressão foi demais! ${kicker?.name || 'Cobrador'} coloca as mãos na cabeça sem acreditar!`,
        `🧤❌ NA TRAVE! ${kicker?.name || 'Cobrador'} do ${tName} bate com força mas a bola explode na trave esquerda e volta para o campo! Que drama! ${gk?.name || 'Goleiro'} comemora como se fosse um gol!`,
      ];
      
      allPlanned.push({
        minute: pen.minute, type: 'penalty_miss', team,
        playerName: kicker?.name,
        animType: 'penalty', ballX: team === 'home' ? 0.88 : 0.12, ballY: 0.5,
        description: `${pick(foulDescs)}\n\n${pick(penSaveDescs)}`,
      });
    }
  }

  // ── DANGEROUS FOULS ────────────────────────────────────────────────
  for (const m of dangerousFoulMins) {
    const teamIdx: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    const opp = team === 'home' ? awayTeam : homeTeam;
    const attacker = pickByAttr(allPlayers.filter(p => p.team === team && p.isOnPitch), 'dribbling');
    const defender = pickByAttr(allPlayers.filter(p => p.team !== team && p.isOnPitch), 'aggression');
    
    stats.fouls[teamIdx === 0 ? 1 : 0]++;
    
    const dangerDescs = [
      `⚠️🔥 FALTA PERIGOSA na entrada da área do ${opp}! ${defender?.name || 'Defensor'} derruba ${attacker?.name || 'atacante'} do ${tName} com uma entrada violenta! O árbitro marca a falta em posição PERIGOSÍSSIMA! A torcida pede cartão!`,
      `⚠️🔥 LANCE QUENTE! ${attacker?.name || 'Atacante'} do ${tName} é derrubado por ${defender?.name || 'defensor'} do ${opp} na meia-lua! Falta em posição ideal para cobrança direta! O clima esquenta no jogo!`,
      `⚠️🔥 FALTA DURA! ${defender?.name || 'Jogador'} do ${opp} chega com a sola da chuteira em ${attacker?.name || 'atacante'} do ${tName}! O árbitro para o jogo e corre para o lance! Falta perigosa na fronteira da grande área!`,
    ];
    
    allPlanned.push({
      minute: m, type: 'dangerous_foul', team,
      playerName: attacker?.name,
      animType: 'foul', ballX: team === 'home' ? 0.78 : 0.22, ballY: 0.45 + rng() * 0.1,
      description: pick(dangerDescs),
    });
  }

  // ── CARDS ──────────────────────────────────────────────────────────
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
    const cardDescs = [
      `🟨 CARTÃO AMARELO! ${pName} do ${tName} chega atrasado em ${oppName} do ${opp} com uma entrada desleal pelo lado! O árbitro não hesita e vai direto ao bolso! ${pName} reclama mas o juiz é firme na decisão. Cuidado, na próxima é expulsão!`,
      `🟨 AMARELO para ${pName}! Falta violenta no meio-campo em ${oppName} do ${opp}! O jogador entrou com a sola da chuteira e acertou a canela do adversário! O árbitro mostra o cartão e avisa que não vai tolerar esse tipo de jogo duro!`,
      `🟨 O árbitro para o jogo e mostra o CARTÃO AMARELO para ${pName} do ${tName}! Falta tática clara em ${oppName} que ia saindo em contra-ataque promissor! ${pName} sabia o que estava fazendo — falta profissional para impedir o avanço do ${opp}!`,
      `🟨 ${pName} do ${tName} derruba ${oppName} com um carrinho por trás! O árbitro corre em direção ao lance, apita e puxa o amarelo! A torcida do ${opp} protesta pedindo vermelho, mas o juiz mantém a decisão!`,
    ];
    allPlanned.push({
      minute: m, type: 'yellow_card', team, animType: 'card',
      playerName: pName,
      description: pick(cardDescs),
    });
  }

  // ── SUBSTITUTIONS ──────────────────────────────────────────────────
  for (const m of subMins) {
    const teamIdx: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    const onPitch = allPlayers.filter(p => p.team === team && p.isOnPitch);
    const playerOut = onPitch.length > 1 ? onPitch[Math.floor(rng() * (onPitch.length - 1)) + 1] : onPitch[0];
    const playerInName = team === 'home'
      ? `Reserva ${Math.floor(rng() * 7 + 12)}`
      : (awayTeam === 'AI FC' ? `AI #${Math.floor(rng() * 5 + 12)}` : `Reserva ${Math.floor(rng() * 7 + 12)}`);
    const outName = playerOut?.name || 'Jogador';
    if (playerOut) playerOut.isOnPitch = false;
    const subDescs = [
      `🔄 SUBSTITUIÇÃO no ${tName}! O técnico pede a troca: sai ${outName}, que recebe aplausos da torcida e entra ${playerInName} com sangue nos olhos! O treinador quer dar fôlego novo ao time para os minutos decisivos!`,
      `🔄 Mexida tática no ${tName}! ${outName} dá lugar a ${playerInName}. O jogador que sai caminha devagar, visivelmente cansado, e bate palmas para a torcida enquanto o substituto entra correndo e já pede a bola!`,
      `🔄 O técnico do ${tName} não está satisfeito e faz a alteração: sai ${outName}, entra ${playerInName}! Mudança estratégica pensando nos últimos minutos da partida. ${outName} aperta a mão do companheiro e segue para o banco.`,
    ];
    allPlanned.push({
      minute: m, type: 'substitution', team, animType: 'sub',
      playerName: outName,
      description: pick(subDescs),
    });
  }

  // ── CHANCES ────────────────────────────────────────────────────────
  for (const m of chanceMins) {
    const teamIdx: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    const opp = team === 'home' ? awayTeam : homeTeam;
    const pool = allPlayers.filter(p => p.team === team && p.isOnPitch);
    const pName = pool.length > 0 ? pick(pool).name : 'Jogador';
    const p2 = pool.filter(p => p.name !== pName).length > 0 ? pick(pool.filter(p => p.name !== pName)).name : pName;
    stats.shots[teamIdx]++;
    const evType = pick(['woodwork', 'great_save', 'corner_danger', 'offside_trap', 'long_shot_miss', 'header_miss']);
    const descs: Record<string, string[]> = {
      woodwork: [
        `📐 TRAVE!!! ${pName} do ${tName} solta uma bomba de fora da área que bate com violência na trave direita e volta para o campo! O estádio inteiro colocou a mão na cabeça! Por centímetros o ${tName} não abre o placar! Que azar!`,
        `📐 TRAVESSÃO! ${pName} cabeceia com potência após cruzamento de ${p2}, a bola sobe e bate no ferro com uma violência absurda! Todo mundo achou que era gol! O goleiro do ${opp} só olhou e agradeceu!`,
        `📐 NA TRAVE E PARA FORA! ${pName} do ${tName} recebe na entrada da área, ajeita e chuta colocado! A bola faz uma curva perfeita, beija a trave esquerda e sai pela linha de fundo! O goleiro estava batido!`,
      ],
      great_save: [
        `🧤 Defesa FENOMENAL! ${pName} do ${tName} ficou cara a cara com o goleiro do ${opp}, chutou rasteiro no canto, mas o arqueiro se esticou todo e fez uma defesa de cinema! Que reflexo absurdo! A torcida aplaude o goleiro adversário!`,
        `🧤 ${pName} chuta forte de primeira! A bola ia como um foguete no ângulo superior direito, mas o goleiro do ${opp} dá um salto felino e espalma com a ponta dos dedos! MILAGRE no gol! ${pName} não acredita!`,
        `🧤 QUASE! ${pName} do ${tName} finaliza de voleio após passe genial de ${p2}, mas o goleiro do ${opp} faz defesa providencial com os pés! O rebote é afastado pela zaga!`,
      ],
      corner_danger: [
        `🚩 Escanteio PERIGOSÍSSIMO do ${tName}! A bola vem fechada na primeira trave, ${pName} sobe mais alto que todo mundo mas o cabeceio vai raspando a trave! A defesa do ${opp} respira aliviada mas tremendo!`,
        `🚩 Cobrança de escanteio perfeita! ${p2} cobra com efeito, ${pName} aparece na segunda trave completamente livre, mas cabeceia para cima! Chance claríssima desperdiçada! O técnico coloca as mãos na cabeça!`,
        `🚩 Escanteio curto do ${tName}! ${p2} tabela com ${pName}, cruza na área, a bola desvia na primeira trave e quase engana o goleiro! Que confusão na grande área do ${opp}!`,
      ],
      offside_trap: [
        `⛳ IMPEDIMENTO! ${pName} do ${tName} havia marcado um golaço com um chute certeiro no ângulo, mas o bandeirinha levanta a bandeira: posição irregular por centímetros! A torcida protesta furiosa! O VAR não está disponível!`,
        `⛳ O árbitro levanta a bandeira: impedimento de ${pName} do ${tName}! A jogada estava linda, ${p2} fez o lançamento perfeito, mas ${pName} se adiantou por menos de um metro! Que decepção para o ${tName}!`,
      ],
      long_shot_miss: [
        `💨 ${pName} do ${tName} arrisca de MUITO LONGE! A bola sai girando e desviando no ar, passa raspando a trave direita e vai para fora! Tinha veneno nesse chute! O goleiro do ${opp} só acompanhou com os olhos!`,
        `💨 Chute de longa distância! ${pName} pega a sobra na entrada da área e solta o pé! A bola sobe demais e vai por cima do gol! Faltou pontaria, mas a intenção era boa!`,
      ],
      header_miss: [
        `👤 ${pName} do ${tName} sobe de cabeça após cruzamento de ${p2} mas cabeceia fraco! A bola vai mansinha para as mãos do goleiro! Era para fazer mais nessa jogada! O técnico grita instruções da beira do campo!`,
        `👤 Cruzamento perfeito na cabeça de ${pName}! Ele estava completamente sozinho mas cabeceou torto e a bola foi para fora sem perigo! DESPERDIÇOU uma chance incrível!`,
      ],
    };
    if (evType === 'great_save') { stats.shotsOnTarget[teamIdx]++; stats.saves[teamIdx === 0 ? 1 : 0]++; }
    if (evType === 'corner_danger') stats.corners[teamIdx]++;
    if (evType === 'offside_trap') stats.offsides[teamIdx]++;
    allPlanned.push({
      minute: m, type: evType, team, animType: 'chance', playerName: pName,
      description: pick(descs[evType] || [`⚡ Grande chance do ${tName}!`]),
    });
  }

  // ── POSSESSION/PASS EVENTS ────────────────────────────────────────
  for (const m of possessionMins) {
    const teamIdx: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    const opp = team === 'home' ? awayTeam : homeTeam;
    const pool = allPlayers.filter(p => p.team === team && p.isOnPitch);
    const oppPool = allPlayers.filter(p => p.team !== team && p.isOnPitch);
    const p1 = pool.length > 0 ? pick(pool).name : 'Jogador';
    const p2 = pool.filter(p => p.name !== p1).length > 0 ? pick(pool.filter(p => p.name !== p1)).name : p1;
    const def = oppPool.length > 0 ? pick(oppPool).name : 'Defensor';
    stats.passes[teamIdx]++;
    const bx = team === 'home' ? 0.35 + rng() * 0.35 : 0.3 + rng() * 0.35;

    const posTypes = [
      { type: 'possession', desc: `⚽ ${tName} mantém a posse no campo ofensivo. ${p1} recebe de costas, gira sobre ${def} com classe e toca curto para ${p2} que busca o espaço entre as linhas. O time trabalha a bola com paciência procurando a brecha na defesa do ${opp}.`, anim: 'pass' as const },
      { type: 'dribble_ok', desc: `✨ Jogada INDIVIDUAL espetacular! ${p1} do ${tName} recebe na ponta esquerda, faz um corte seco para dentro deixando ${def} no chão, e avança em direção à área! A torcida se levanta!`, anim: 'pass' as const },
      { type: 'through_ball', desc: `🏃 Lançamento longo do ${tName}! ${p1} vê a movimentação de ${p2} e manda um bolão perfeito nas costas da zaga do ${opp}! ${p2} controla no peito e avança em velocidade! A defesa corre desesperada para fechar!`, anim: 'pass' as const },
      { type: 'midfield_foul', desc: `⚠️ Falta de ${p1} do ${tName} em ${def} do ${opp} no meio-campo! Entrada forte por baixo que acerta a canela do adversário! O árbitro marca rapidamente e chama ${p1} para uma conversa séria. Jogo fica quente!`, anim: 'foul' as const },
      { type: 'possession', desc: `📐 Triangulação perfeita do ${tName}! ${p1} toca para ${p2}, recebe de volta em tabela e tenta abrir a defesa compacta do ${opp} pelo lado direito. A bola circula com inteligência buscando o desequilíbrio.`, anim: 'pass' as const },
      { type: 'tackle', desc: `💪 DESARME ESPETACULAR de ${def} do ${opp}! ${p1} do ${tName} vinha conduzindo em velocidade pelo meio, mas ${def} chegou com o tempo perfeito e tirou a bola com uma entrada limpa e precisa! O público aplaude a jogada defensiva!`, anim: 'pass' as const },
      { type: 'crossing', desc: `↗️ Cruzamento do ${tName}! ${p1} recebe na ponta e cruza na área, mas a defesa do ${opp} afasta de cabeça! ${def} sobe mais alto e manda para escanteio! O ${tName} pressiona!`, anim: 'pass' as const },
      { type: 'long_pass', desc: `🎯 Lindo passe longo de ${p1} do ${tName}! A bola cruza todo o campo e chega limpa nos pés de ${p2} do outro lado! Mudança de jogo inteligente que pegou a defesa do ${opp} desprevenida!`, anim: 'pass' as const },
      { type: 'pressing', desc: `🔥 Pressão alta do ${tName}! ${p1} e ${p2} fecham a saída de bola do ${opp}! ${def} tenta sair jogando mas quase perde a bola na defesa! O ${tName} sufoca e não deixa o adversário respirar!`, anim: 'pass' as const },
      { type: 'gk_distribution', desc: `🧤 Reposição rápida do goleiro do ${tName}! A bola sai pela lateral e o goleiro lança longo para ${p1} que tenta disputar a bola no alto com ${def} do ${opp}. Jogo segue disputado no meio-campo.`, anim: 'pass' as const },
      { type: 'throw_in', desc: `📍 Lateral para o ${tName}. ${p1} cobra rápido para ${p2} que tenta ganhar a linha de fundo. ${def} do ${opp} acompanha de perto e faz o corte! Disputa intensa na lateral do campo!`, anim: 'pass' as const },
      { type: 'free_kick', desc: `🎯 Falta para o ${tName} em boa posição! ${p1} se posiciona para a cobrança... cruza na área mas ${def} do ${opp} aparece na primeira trave e afasta o perigo com firmeza!`, anim: 'pass' as const },
    ];
    const chosen = pick(posTypes);
    if (chosen.type === 'midfield_foul') stats.fouls[teamIdx]++;
    if (chosen.type === 'tackle') stats.tackles[teamIdx === 0 ? 1 : 0]++;
    allPlanned.push({
      minute: m, type: chosen.type, team, animType: chosen.anim, playerName: p1,
      ballX: bx, ballY: 0.2 + rng() * 0.6,
      description: chosen.desc,
    });
  }

  // ── FINAL ASSEMBLY ────────────────────────────────────────────────
  allPlanned.sort((a, b) => a.minute - b.minute);

  const addedTime1 = 1 + Math.floor(rng() * 4);
  const halftimeMin = 45 + addedTime1;

  const ht_h = homeGoalMins.filter(m => m <= 45).length + penaltyMins.filter(p => p.team === 'home' && p.isGoal && p.minute <= 45).length;
  const ht_a = awayGoalMins.filter(m => m <= 45).length + penaltyMins.filter(p => p.team === 'away' && p.isGoal && p.minute <= 45).length;

  const finalEvents: SimEvent[] = [];

  // Estimated crowd based on stadium capacity
  const estimatedCrowd = Math.floor(Math.min(50000, 2000 + rng() * 8000 + homeStrength * 100));
  finalEvents.push({
    minute: 0, type: 'kickoff', team: 'neutral', animType: 'kickoff', ballX: 0.5, ballY: 0.5,
    description: `🏟️ A partida começa no ${stadiumName}, com público de ${estimatedCrowd.toLocaleString('pt-BR')} torcedores! ⚽ ${homeTeam} x ${awayTeam} — ${competition}! O árbitro apita e a bola rola!`,
  });

  for (const ev of allPlanned.filter(e => e.minute <= 44)) {
    finalEvents.push(ev);
  }

  finalEvents.push({
    minute: 45, type: 'added_time', team: 'neutral', animType: 'halftime', ballX: 0.5, ballY: 0.5,
    description: `⏱️ +${addedTime1} minutos de acréscimo no 1º tempo!`,
  });
  finalEvents.push({
    minute: halftimeMin, type: 'halftime', team: 'neutral', animType: 'halftime', ballX: 0.5, ballY: 0.5,
    description: `⏸️ INTERVALO! ${homeTeam} ${ht_h} x ${ht_a} ${awayTeam}. Os jogadores seguem para o vestiário. Tempo de ajustes táticos!`,
  });

  for (const ev of allPlanned.filter(e => e.minute >= 47)) {
    finalEvents.push(ev);
  }

  const addedTime2 = 1 + Math.floor(rng() * 5);
  // Final score = Poisson goals + penalty goals
  const finalHomeGoals = currentHome;
  const finalAwayGoals = currentAway;
  
  finalEvents.push({
    minute: 90, type: 'added_time', team: 'neutral', animType: 'halftime', ballX: 0.5, ballY: 0.5,
    description: `⏱️ +${addedTime2} minutos de acréscimo no 2º tempo!`,
  });
  finalEvents.push({
    minute: 90 + addedTime2, type: 'final_whistle', team: 'neutral', animType: 'final', ballX: 0.5, ballY: 0.5,
    description: `🏁 APITO FINAL! ${homeTeam} ${finalHomeGoals} x ${finalAwayGoals} ${awayTeam}! Fim de jogo no ${stadiumName}!`,
  });

  // Possession
  const effectiveHome = homeStrength * homeAdv * moraleMod;
  const possRatio = effectiveHome / (effectiveHome + awayStrength);
  stats.possession = [Math.round(possRatio * 100), 100 - Math.round(possRatio * 100)];

  // Player ratings
  const playerRatings: Record<string, number> = {};
  allPlayers.filter(p => p.team === 'home').forEach(p => {
    playerRatings[p.id] = Math.round(p.rating * 10) / 10;
  });

  // Goal scorers
  const goalScorers: { name: string; minute: number; team: 'home' | 'away'; assist?: string }[] = [];
  finalEvents.filter(e => e.isGoal).forEach(e => {
    if (e.playerName) goalScorers.push({ name: e.playerName, minute: e.minute, team: e.team as 'home' | 'away', assist: e.assistName });
  });

  // Man of the match
  const homePlayers_sorted = allPlayers.filter(p => p.team === 'home').sort((a, b) => b.rating - a.rating);
  const manOfTheMatch = homePlayers_sorted.length > 0 ? homePlayers_sorted[0].name : undefined;

  console.log(`[Sim] Final: ${finalHomeGoals}x${finalAwayGoals} | Events: ${finalEvents.length} | Penalties: ${penaltyMins.length}`);
  return { events: finalEvents, homeGoals: finalHomeGoals, awayGoals: finalAwayGoals, stats, playerRatings, goalScorers, manOfTheMatch };
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

    // Server-side validation: clamp strength values
    const validatedHomeStrength = clamp(Number(homeStrength) || 60, 20, 99);
    const validatedAwayStrength = clamp(Number(awayStrength) || 60, 20, 99);

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

    // Simulate with validated strengths and competition
    const validCompetition = typeof competition === 'string' && competition.length <= 50 ? competition : 'Amistoso';
    const result = simulateFullMatch(
      homeTeam, awayTeam, homePlayers || [],
      validatedHomeStrength, validatedAwayStrength,
      tactics || {}, stadiumName || 'Estádio', isHome !== false,
      validCompetition
    );

    // Duration: 12 minutes real-time (720 seconds)
    const durationSeconds = 720;
    const now = new Date();

    const { data: match, error: insertError } = await adminClient
      .from('live_matches')
      .insert({
        user_id: userId,
        match_id: matchId,
        home_team: homeTeam,
        away_team: awayTeam,
        home_strength: validatedHomeStrength,
        away_strength: validatedAwayStrength,
        stadium_name: stadiumName || 'Estádio',
        stadium_capacity: stadiumCapacity || 5000,
        is_home: isHome !== false,
        competition: validCompetition,
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
      match_type: validCompetition === 'Amistoso' ? 'friendly' : 'competitive',
      competition: validCompetition,
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
