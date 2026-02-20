import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// --- Simulation helpers ---
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
}

function genAwayAttrs(ovr: number, pos: string) {
  const variance = () => Math.floor(ovr + (rng() * 16 - 8));
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

function teamAvgAttr(players: SimPlayer[], team: 'home' | 'away', attr: keyof SimPlayer): number {
  const pool = players.filter(p => p.team === team && p.isOnPitch);
  if (pool.length === 0) return 50;
  return pool.reduce((s, p) => s + (Number(p[attr]) || 50), 0) / pool.length;
}

/**
 * CORREÇÃO CRÍTICA: Gerador de partidas com UMA ÚNICA AÇÃO POR MINUTO
 * 
 * Regras:
 * 1. Cada minuto real (1-95) só pode ter UM evento relevante
 * 2. A progressão de tempo é linear e garantida
 * 3. Placares realistas: 0x0, 1x0, 1x1, 2x1 são os mais comuns
 * 4. Elásticos (4+) só em casos extremos de diferença de overall
 */
function simulateFullMatch(
  homeTeam: string, awayTeam: string, homePlayers: any[], 
  homeStrength: number, awayStrength: number, tactics: any,
  stadiumName: string, isHome: boolean
) {
  // Build sim players
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

  const awayNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Almeida', 'Ribeiro', 'Gomes'];
  const away: SimPlayer[] = Array.from({ length: 11 }, (_, i) => {
    const pos = i === 0 ? 'GOL' : i < 5 ? 'ZAG' : i < 9 ? 'MEI' : 'ATA';
    const ovr = Math.floor(awayStrength + (rng() * 8 - 4));
    const attrs = genAwayAttrs(ovr, pos);
    return {
      id: `a${i}`, name: awayNames[i] || `Jog.${i + 1}`, position: pos,
      team: 'away' as const, ovr, rating: 6.0, goals: 0, assists: 0, yellowCards: 0,
      isOnPitch: true, stamina: 70 + Math.floor(rng() * 20), morale: 60 + Math.floor(rng() * 30),
      ...attrs,
    };
  });

  const allPlayers = [...home, ...away];

  // Tactical modifiers
  const pressing = tactics?.pressing || 'medio';
  const playStyle = tactics?.playStyle || 'equilibrado';
  const tempo = tactics?.tempo || 'normal';
  const passingStyle = tactics?.passingStyle || 'misto';
  const defenseLine = tactics?.defenseLine || 'media';

  const homeAdv = isHome ? 1.08 : 0.95;
  const avgMorale = home.reduce((s, p) => s + p.morale, 0) / Math.max(1, home.length);
  const moraleMod = 0.85 + (avgMorale / 100) * 0.3;
  const avgStamina = home.reduce((s, p) => s + p.stamina, 0) / 11;
  const fatigueMod = 0.8 + (avgStamina / 100) * 0.2;
  const pressingMod = pressing === 'ultra-alto' ? 1.2 : pressing === 'alto' ? 1.1 : pressing === 'medio' ? 1.0 : 0.9;
  const offensiveMod = playStyle === 'ofensivo' ? 1.15 : playStyle === 'contra-ataque' ? 1.05 : playStyle === 'equilibrado' ? 1.0 : playStyle === 'posse' ? 0.9 : 0.75;
  const tempoMod = tempo === 'muito-rapido' ? 1.1 : tempo === 'rapido' ? 1.05 : tempo === 'normal' ? 1.0 : 0.9;
  const longPassMod = passingStyle === 'longo' || passingStyle === 'direto' ? 1.3 : 1.0;
  const shortPassMod = passingStyle === 'curto' ? 1.3 : 1.0;
  const highLineMod = defenseLine === 'alta' ? 1.15 : defenseLine === 'media' ? 1.0 : 0.85;

  const events: SimEvent[] = [];
  let homeGoals = 0, awayGoals = 0;
  const stats = {
    possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0], corners: [0, 0],
    fouls: [0, 0], yellowCards: [0, 0], redCards: [0, 0], passes: [0, 0],
    tackles: [0, 0], saves: [0, 0], offsides: [0, 0],
  };

  // ── CORREÇÃO CRÍTICA: controle de minutos utilizados ─────────────
  // Garante que NUNCA dois eventos relevantes caem no mesmo minuto
  const usedMinutes = new Set<number>();

  function reserveMinute(min: number): number {
    // Encontra o próximo minuto livre
    let m = min;
    while (usedMinutes.has(m) && m <= 95) m++;
    if (m > 95) return -1; // sem minuto disponível
    usedMinutes.add(m);
    return m;
  }

  // Kickoff
  usedMinutes.add(0);
  events.push({ minute: 0, type: 'kickoff', description: `⚽ O árbitro apita e ${homeTeam} dá a saída de bola no ${stadiumName}! Público vibrando nas arquibancadas, a bola rola!`, team: 'home' });

  // ── PASSO 1: Pré-calcular o resultado final REALISTA ─────────────
  // Baseado em: overall, moral, fator casa, tática
  const strengthDiff = (homeStrength * homeAdv * moraleMod * fatigueMod) - awayStrength;
  
  // Gols esperados por time em 90 minutos — calibrado para resultados reais
  // Times equilibrados (diff ~0): media ~1.1 gols cada
  // Times superiores: até 2.5 gols no máximo comum
  const homeExpected = clamp(1.1 + (strengthDiff / 100) * 1.8 * offensiveMod * tempoMod, 0.3, 3.5);
  const awayExpected = clamp(1.1 - (strengthDiff / 100) * 1.5, 0.2, 3.0);

  // Simulação de Poisson simplificada para gols
  function poissonSample(lambda: number): number {
    // Simula distribuição de Poisson com lambda dado
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do { k++; p *= rng(); } while (p > L);
    return k - 1;
  }

  const totalHomeGoals = poissonSample(homeExpected);
  const totalAwayGoals = poissonSample(awayExpected);

  console.log(`[Sim] Strengths H:${homeStrength} A:${awayStrength} | Expected H:${homeExpected.toFixed(2)} A:${awayExpected.toFixed(2)} | Result ${totalHomeGoals}x${totalAwayGoals}`);

  // ── PASSO 2: Distribuir gols em minutos únicos ────────────────────
  // Minutos disponíveis para gols: 5-44 (1T), 50-89 (2T), excluindo eventos estruturais
  const availableGoalMins = Array.from({ length: 90 }, (_, i) => i + 1)
    .filter(m => m !== 45 && m !== 46); // excluir intervalo

  function pickUniqueMinute(pool: number[]): number {
    const available = pool.filter(m => !usedMinutes.has(m));
    if (available.length === 0) return -1;
    const idx = Math.floor(rng() * available.length);
    const m = available[idx];
    usedMinutes.add(m);
    return m;
  }

  // Alocação de gols do time da casa
  const homeGoalMinutes: number[] = [];
  for (let g = 0; g < totalHomeGoals; g++) {
    const m = pickUniqueMinute(availableGoalMins);
    if (m > 0) homeGoalMinutes.push(m);
  }

  // Alocação de gols do visitante
  const awayGoalMinutes: number[] = [];
  for (let g = 0; g < totalAwayGoals; g++) {
    const m = pickUniqueMinute(availableGoalMins);
    if (m > 0) awayGoalMinutes.push(m);
  }

  // ── PASSO 3: Distribuir eventos de suporte (1 por minuto único) ──
  // Reservar minutos para cartões, substituições, chances
  const cardMins: number[] = [];
  const numCards = 1 + Math.floor(rng() * 3); // 1-3 cartões
  for (let i = 0; i < numCards; i++) {
    const m = pickUniqueMinute(availableGoalMins.filter(m => m >= 20));
    if (m > 0) cardMins.push(m);
  }

  const subMins: number[] = [];
  const numSubs = 2 + Math.floor(rng() * 2); // 2-3 substituições
  for (let i = 0; i < numSubs; i++) {
    const m = pickUniqueMinute(availableGoalMins.filter(m => m >= 55));
    if (m > 0) subMins.push(m);
  }

  const chanceMins: number[] = [];
  const numChances = 3 + Math.floor(rng() * 4); // 3-6 grandes chances
  for (let i = 0; i < numChances; i++) {
    const m = pickUniqueMinute(availableGoalMins);
    if (m > 0) chanceMins.push(m);
  }

  // Minutos de eventos de posse/passe (preencher os vazios)
  const possessionMins: number[] = [];
  for (let m = 1; m <= 90; m++) {
    if (!usedMinutes.has(m) && m !== 45 && m !== 46) {
      // ~40% chance de ter evento de posse neste minuto
      if (rng() < 0.4) {
        usedMinutes.add(m);
        possessionMins.push(m);
      }
    }
  }

  // ── PASSO 4: Construir eventos em ordem cronológica ───────────────
  // Marcador corrente (para mostrar no placar dentro de eventos de gol)
  let currentHome = 0, currentAway = 0;

  // Intervalo
  const addedTime1 = 1 + Math.floor(rng() * 4);
  events.push({ minute: 45, type: 'added_time', description: `⏱️ O quarto árbitro sinaliza: +${addedTime1} minutos de acréscimos no primeiro tempo!`, team: 'neutral' });
  usedMinutes.add(45);
  events.push({ minute: 45 + addedTime1, type: 'halftime', description: `⏱️ Fim do primeiro tempo! ${homeTeam} ${currentHome} x ${currentAway} ${awayTeam}. Os jogadores seguem para o vestiário.`, team: 'neutral' });
  usedMinutes.add(45 + addedTime1);

  // Gerar todos os eventos estruturados
  const allPlanned: SimEvent[] = [];

  // Gols casa
  for (const m of homeGoalMinutes) {
    const scorer = pickByAttr(home.filter(p => p.isOnPitch), 'shooting', rng() > 0.6 ? 'ATA' : undefined);
    const gk = pickByAttr(away.filter(p => p.isOnPitch), 'goalkeeping', 'GOL');
    const shooterSkill = scorer ? (scorer.shooting * 0.6 + scorer.composure * 0.4) : 60;
    const gkSkill = gk ? (gk.goalkeeping * 0.7 + gk.positioning * 0.3) : 55;
    const goalProb = clamp(shooterSkill / (shooterSkill + gkSkill) + 0.1, 0.4, 0.8);
    
    if (rng() < goalProb) {
      currentHome++;
      const goalTypes = ['chute rasteiro no canto', 'chute colocado', 'voleio espetacular', 'toque de primeira', 'chute cruzado', 'chute de trivela'];
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
      homeGoals++;
      const assistText = assistName ? ` Assistência de ${assistName}!` : '';
      const cel = pick(['Corre para a torcida e desliza de joelhos!', 'A equipe inteira pula em cima dele!', 'Aponta para o céu e a torcida explode!', 'Abraça o técnico na beira do campo!']);
      allPlanned.push({ minute: m, type: 'foot_goal', description: `⚽ GOOOOOOL DO ${homeTeam.toUpperCase()}! ${scorer?.name || 'Jogador'} finaliza com um ${goalType}! A bola beija a rede! ${cel}${assistText} ${homeTeam} ${currentHome} x ${currentAway} ${awayTeam}!`, team: 'home', playerName: scorer?.name, assistName, goalType, isGoal: true });
    } else {
      // Gol não saiu — chance grande
      stats.shots[0]++; stats.shotsOnTarget[0]++;
      stats.saves[1]++;
      if (gk) gk.rating = Math.min(10, gk.rating + 0.3);
      allPlanned.push({ minute: m, type: 'great_save', description: `🧤🔥 DEFESAÇA! ${gk?.name || 'Goleiro'} do ${awayTeam} voa e tira no ângulo! Que defesa espetacular!`, team: 'home', playerName: gk?.name });
    }
  }

  // Gols visitante
  for (const m of awayGoalMinutes) {
    const scorer = pickByAttr(away.filter(p => p.isOnPitch), 'shooting', rng() > 0.6 ? 'ATA' : undefined);
    const gk = pickByAttr(home.filter(p => p.isOnPitch), 'goalkeeping', 'GOL');
    const shooterSkill = scorer ? (scorer.shooting * 0.6 + scorer.composure * 0.4) : 60;
    const gkSkill = gk ? (gk.goalkeeping * 0.7 + gk.positioning * 0.3) : 55;
    const goalProb = clamp(shooterSkill / (shooterSkill + gkSkill) + 0.05, 0.35, 0.75);
    
    if (rng() < goalProb) {
      currentAway++;
      const goalType = pick(['chute rasteiro', 'chute colocado', 'cabeceio', 'contra-ataque', 'chute de fora da área']);
      let assistName: string | undefined;
      if (scorer) {
        scorer.goals++; scorer.rating = Math.min(10, scorer.rating + 1.2);
        const others = away.filter(p => p.id !== scorer.id && p.isOnPitch);
        if (others.length > 0 && rng() < 0.6) {
          const assister = pick(others);
          assister.assists++; assister.rating = Math.min(10, assister.rating + 0.6);
          assistName = assister.name;
        }
      }
      stats.shots[1]++; stats.shotsOnTarget[1]++;
      awayGoals++;
      const assistText = assistName ? ` Assistência de ${assistName}!` : '';
      allPlanned.push({ minute: m, type: 'foot_goal', description: `⚽ GOOOOOOL DO ${awayTeam.toUpperCase()}! ${scorer?.name || 'Jogador'} aproveita e marca com um ${goalType}!${assistText} ${homeTeam} ${currentHome} x ${currentAway} ${awayTeam}!`, team: 'away', playerName: scorer?.name, assistName, goalType, isGoal: true });
    } else {
      stats.shots[1]++; stats.shotsOnTarget[1]++;
      stats.saves[0]++;
      if (gk) gk.rating = Math.min(10, gk.rating + 0.3);
      allPlanned.push({ minute: m, type: 'great_save', description: `🧤🔥 GRANDE DEFESA! ${gk?.name || 'Goleiro'} do ${homeTeam} salva! O ${awayTeam} quase marcou!`, team: 'away', playerName: gk?.name });
    }
  }

  // Cartões
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
    allPlanned.push({ minute: m, type: 'yellow_card', description: `🟨 CARTÃO AMARELO! ${pName} do ${tName} faz falta dura em ${oppName} do ${opp}. O árbitro não hesita e mostra a advertência. Atenção doravante!`, team, playerName: pName });
  }

  // Substituições
  for (const m of subMins) {
    const teamIdx: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    allPlanned.push({ minute: m, type: 'substitution', description: `🔄 SUBSTITUIÇÃO! O técnico do ${tName} faz uma mexida tática buscando mais intensidade. A torcida aplaude o jogador que sai.`, team });
  }

  // Grandes chances (que não resultaram em gol)
  for (const m of chanceMins) {
    const teamIdx: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    const pool = allPlayers.filter(p => p.team === team && p.isOnPitch);
    const pName = pool.length > 0 ? pick(pool).name : 'Jogador';
    stats.shots[teamIdx]++;
    const evType = rng() < 0.5 ? 'woodwork' : rng() < 0.5 ? 'great_save' : 'corner_danger';
    const descs: Record<string, string[]> = {
      woodwork: [`📐 TRAVE! ${pName} do ${tName} chuta perfeito e a bola explode no ferro! Quase gol!`, `📐 TRAVESSÃO! ${pName} cabeceia com força e a bola carimbou a parte de cima do gol!`],
      great_save: [`🧤 GRANDE DEFESA! ${pName} do ${tName} finaliza forte mas o goleiro faz defesa espetacular!`, `🧤 Defesa incrível! ${pName} ficou cara a cara e o goleiro fechou o ângulo!`],
      corner_danger: [`🚩⚠️ ESCANTEIO PERIGOSO! ${pName} sobe livre mas cabeceia para fora! Que desperdício do ${tName}!`, `🚩 Cobrança de escanteio perigosa do ${tName}! A bola passa raspando a trave!`],
    };
    if (evType === 'great_save') { stats.shotsOnTarget[teamIdx]++; stats.saves[teamIdx === 0 ? 1 : 0]++; }
    if (evType === 'corner_danger') { stats.corners[teamIdx]++; }
    allPlanned.push({ minute: m, type: evType, description: pick(descs[evType]), team, playerName: pName });
  }

  // Eventos de posse (preenchimento)
  for (const m of possessionMins) {
    const teamIdx: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    const opp = team === 'home' ? awayTeam : homeTeam;
    const pool = allPlayers.filter(p => p.team === team && p.isOnPitch);
    const pName = pool.length > 0 ? pick(pool).name : 'Jogador';
    const p2Name = pool.length > 1 ? pick(pool.filter(p => p.name !== pName)).name : pName;
    stats.passes[teamIdx]++;

    const posTypes = [
      { type: 'possession', desc: `⚽ ${tName} trabalha a bola com paciência. ${pName} toca para ${p2Name} que tenta achar espaço na defesa do ${opp}.` },
      { type: 'dribble_ok', desc: `✨ ${pName} do ${tName} faz jogada individual elegante e avança pelo setor ofensivo!` },
      { type: 'through_ball', desc: `🏃 Contra-ataque veloz do ${tName}! ${pName} puxa em velocidade e busca companheiros pelo meio!` },
      { type: 'midfield_foul', desc: `⚠️ Falta de ${pName} no meio-campo. O árbitro marca e pede mais cuidado ao jogador do ${tName}.` },
    ];
    const chosen = pick(posTypes);
    if (chosen.type === 'midfield_foul') stats.fouls[teamIdx]++;
    allPlanned.push({ minute: m, type: chosen.type, description: chosen.desc, team, playerName: pName });
  }

  // ── PASSO 5: Montar lista final ordenada por minuto ───────────────
  allPlanned.sort((a, b) => a.minute - b.minute);

  // Inserir kickoff no início
  const finalEvents: SimEvent[] = [events[0]]; // kickoff (min 0)

  // Inserir eventos planejados + intervalo na posição correta
  const halftimeMin = 45 + addedTime1;
  let halftimeInserted = false;

  for (const ev of allPlanned) {
    if (!halftimeInserted && ev.minute > halftimeMin) {
      finalEvents.push(events[1]); // added_time 1T
      finalEvents.push(events[2]); // halftime
      halftimeInserted = true;
    }
    finalEvents.push(ev);
  }

  if (!halftimeInserted) {
    finalEvents.push(events[1]);
    finalEvents.push(events[2]);
  }

  // Acréscimos 2T e apito final
  const addedTime2 = 1 + Math.floor(rng() * 5);
  finalEvents.push({ minute: 90, type: 'added_time', description: `⏱️ O quarto árbitro sinaliza: +${addedTime2} minutos de acréscimos no segundo tempo!`, team: 'neutral' });
  finalEvents.push({ minute: 90 + addedTime2, type: 'final_whistle', description: `🏁 APITO FINAL! ${homeTeam} ${homeGoals} x ${awayGoals} ${awayTeam}! Fim de jogo no ${stadiumName}!`, team: 'neutral' });

  // Atualizar placar do intervalo com valores reais do 1T
  const firstHalfHome = homeGoalMinutes.filter(m => m <= 45).length;
  const firstHalfAway = awayGoalMinutes.filter(m => m <= 45).length;
  const halftimeIdx = finalEvents.findIndex(e => e.type === 'halftime');
  if (halftimeIdx >= 0) {
    finalEvents[halftimeIdx].description = `⏱️ Fim do primeiro tempo! ${homeTeam} ${firstHalfHome} x ${firstHalfAway} ${awayTeam}. Os jogadores seguem para o vestiário.`;
  }

  // Atualizar possession
  const effectiveHome2 = homeStrength * homeAdv * moraleMod;
  const possRatio = effectiveHome2 / (effectiveHome2 + awayStrength);
  stats.possession = [Math.round(possRatio * 100), Math.round((1 - possRatio) * 100)];

  // Player ratings
  const playerRatings: Record<string, number> = {};
  allPlayers.filter(p => p.team === 'home').forEach(p => {
    playerRatings[p.id] = Math.round(p.rating * 10) / 10;
  });

  console.log(`[Sim] Final: ${homeGoals}x${awayGoals} | Events: ${finalEvents.length} | Unique minutes: ${usedMinutes.size}`);
  return { events: finalEvents, homeGoals, awayGoals, stats, playerRatings };
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

    // Verify user
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

    // Input validation
    if (typeof homeTeam !== 'string' || homeTeam.length > 100 ||
        typeof awayTeam !== 'string' || awayTeam.length > 100 ||
        typeof matchId !== 'string' || matchId.length > 200) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (stadiumName && (typeof stadiumName !== 'string' || stadiumName.length > 100)) {
      return new Response(JSON.stringify({ error: 'Invalid stadium name' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (competition && (typeof competition !== 'string' || competition.length > 100)) {
      return new Response(JSON.stringify({ error: 'Invalid competition' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (homeStrength !== undefined && (typeof homeStrength !== 'number' || homeStrength < 0 || homeStrength > 100)) {
      return new Response(JSON.stringify({ error: 'Invalid strength value' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (awayStrength !== undefined && (typeof awayStrength !== 'number' || awayStrength < 0 || awayStrength > 100)) {
      return new Response(JSON.stringify({ error: 'Invalid strength value' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (stadiumCapacity !== undefined && (typeof stadiumCapacity !== 'number' || stadiumCapacity < 0 || stadiumCapacity > 200000)) {
      return new Response(JSON.stringify({ error: 'Invalid capacity' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check for existing active match
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: existing } = await adminClient
      .from('live_matches')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'live')
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Já existe uma partida em andamento', matchDbId: existing.id }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Run full simulation server-side
    const result = simulateFullMatch(
      homeTeam, awayTeam, homePlayers || [],
      homeStrength || 60, awayStrength || 60,
      tactics || {}, stadiumName || 'Estádio', isHome !== false
    );

    // Match duration: 12 minutes real-time (720 seconds) for 90 game minutes
    const durationSeconds = 720;
    const now = new Date();
    const finishedAt = new Date(now.getTime() + durationSeconds * 1000);

    // Store in DB
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
        finished_at: finishedAt.toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to create match:', insertError.message);
      return new Response(JSON.stringify({ error: 'Failed to create match' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: true,
      matchDbId: match.id,
      startedAt: now.toISOString(),
      durationSeconds,
      finishedAt: finishedAt.toISOString(),
      totalEvents: result.events.length,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('start-match error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
