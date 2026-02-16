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
  const pressingMod = pressing === 'ultra-alto' ? 1.3 : pressing === 'alto' ? 1.15 : pressing === 'medio' ? 1.0 : 0.85;
  const offensiveMod = playStyle === 'ofensivo' ? 1.25 : playStyle === 'contra-ataque' ? 1.1 : playStyle === 'equilibrado' ? 1.0 : playStyle === 'posse' ? 0.85 : 0.7;
  const tempoMod = tempo === 'muito-rapido' ? 1.2 : tempo === 'rapido' ? 1.1 : tempo === 'normal' ? 1.0 : 0.85;
  const longPassMod = passingStyle === 'longo' || passingStyle === 'direto' ? 1.4 : passingStyle === 'misto' ? 1.0 : 0.6;
  const shortPassMod = passingStyle === 'curto' ? 1.4 : passingStyle === 'misto' ? 1.0 : 0.7;
  const highLineMod = defenseLine === 'alta' ? 1.2 : defenseLine === 'media' ? 1.0 : 0.8;

  const events: SimEvent[] = [];
  let homeGoals = 0, awayGoals = 0;
  const stats = {
    possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0], corners: [0, 0],
    fouls: [0, 0], yellowCards: [0, 0], redCards: [0, 0], passes: [0, 0],
    tackles: [0, 0], saves: [0, 0], offsides: [0, 0],
  };
  const guarantees = { hasGoalOrChance: false, hasCard: false, hasSub: false };
  let lastEventMin = -1;

  // Kickoff
  events.push({ minute: 0, type: 'kickoff', description: `⚽ Saída de bola! ${homeTeam} inicia a partida no ${stadiumName}!`, team: 'home' });

  // Generate events for 90 minutes (+ added time)
  // We'll generate ~1 event per game-minute on average
  for (let min = 1; min <= 95; min++) {
    // Half-time at 45
    if (min === 46) {
      const addedTime1 = Math.floor(1 + rng() * 4);
      events.push({ minute: 45, type: 'added_time', description: `⏱️ Acréscimos: +${addedTime1} minutos!`, team: 'neutral' });
      events.push({ minute: 45 + addedTime1, type: 'halftime', description: '⏱️ Intervalo! Hora de ajustar a equipe.', team: 'neutral' });
    }

    // Multiple event chances per minute (like the client does per tick)
    const ticksPerMin = 3 + Math.floor(rng() * 3); // 3-5 ticks per minute
    for (let t = 0; t < ticksPerMin; t++) {
      if (rng() > 0.55 * tempoMod) continue;
      if (min === lastEventMin && rng() > 0.4) continue;
      lastEventMin = min;

      const homeOff = (teamAvgAttr(allPlayers, 'home', 'shooting') + teamAvgAttr(allPlayers, 'home', 'passing') + teamAvgAttr(allPlayers, 'home', 'speed')) / 3;
      const awayOff = (teamAvgAttr(allPlayers, 'away', 'shooting') + teamAvgAttr(allPlayers, 'away', 'passing') + teamAvgAttr(allPlayers, 'away', 'speed')) / 3;
      const effectiveHome = homeOff * homeAdv * moraleMod * fatigueMod;
      const ratio = effectiveHome / (effectiveHome + awayOff);
      const teamIdx: 0 | 1 = rng() < ratio ? 0 : 1;
      const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
      const tName = team === 'home' ? homeTeam : awayTeam;
      const opp = team === 'home' ? awayTeam : homeTeam;
      const oppTeamKey: 'home' | 'away' = team === 'home' ? 'away' : 'home';
      const homePlrs = allPlayers.filter(p => p.team === team && p.isOnPitch);
      const oppPlrs = allPlayers.filter(p => p.team === oppTeamKey && p.isOnPitch);
      const pName = homePlrs.length > 0 ? pick(homePlrs).name : 'Jogador';
      const pName2 = homePlrs.length > 0 ? pick(homePlrs).name : 'Jogador';
      const oppName = oppPlrs.length > 0 ? pick(oppPlrs).name : 'Adversário';
      const g = guarantees;

      // Force card if none yet and past minute 60
      if (!g.hasCard && min >= 60 && rng() < 0.3) {
        g.hasCard = true;
        stats.fouls[teamIdx]++; stats.yellowCards[teamIdx]++;
        const p = pick(homePlrs);
        if (p && team === 'home') { p.yellowCards++; p.rating = Math.max(3, p.rating - 0.4); }
        events.push({ minute: min, type: 'yellow_card', description: `🟨 Cartão amarelo! ${pName} faz falta dura e é advertido pelo árbitro.`, team, playerName: pName });
        continue;
      }

      // Force sub if none yet past 55
      if (!g.hasSub && min >= 55 && rng() < 0.25) {
        g.hasSub = true;
        events.push({ minute: min, type: 'substitution', description: `🔄 Substituição no ${opp}! Troca tática.`, team: oppTeamKey });
        continue;
      }

      // Force chance if no goal/chance past 80
      if (!g.hasGoalOrChance && min >= 80 && rng() < 0.5) {
        g.hasGoalOrChance = true;
        stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++;
        events.push({ minute: min, type: 'great_save', description: `🧤 GRANDE CHANCE! ${pName} finaliza com perigo mas o goleiro do ${opp} faz defesa espetacular!`, team, playerName: pName });
        continue;
      }

      // Weighted event generation
      const r = rng();
      let cumul = 0;

      // Possession (8%)
      cumul += 0.08;
      if (r < cumul) {
        events.push({ minute: min, type: 'possession', description: pick([
          `⚽ ${tName} mantém a posse no meio-campo.`,
          `⚽ Bola circulando entre os jogadores do ${tName}.`,
          `⚽ ${tName} controla o ritmo da partida.`,
        ]), team });
        continue;
      }

      // Short pass OK (7%)
      cumul += 0.07 * shortPassMod;
      if (r < cumul) {
        stats.passes[teamIdx]++;
        events.push({ minute: min, type: 'short_pass_ok', description: pick([
          `📍 Passe curto certeiro de ${pName} para ${pName2}.`,
          `📍 ${pName} toca de primeira para ${pName2}.`,
        ]), team });
        continue;
      }

      // Short pass fail (3%)
      cumul += 0.03;
      if (r < cumul) {
        stats.passes[teamIdx]++;
        events.push({ minute: min, type: 'short_pass_fail', description: `❌ ${pName} erra o passe curto! ${opp} recupera.`, team });
        continue;
      }

      // Long pass OK (4%)
      cumul += 0.04 * longPassMod;
      if (r < cumul) {
        stats.passes[teamIdx]++;
        events.push({ minute: min, type: 'long_pass_ok', description: pick([
          `🎯 Lançamento perfeito de ${pName}!`,
          `🎯 ${pName} acerta lançamento longo na medida para ${pName2}.`,
        ]), team });
        continue;
      }

      // Long pass fail (3%)
      cumul += 0.03;
      if (r < cumul) {
        events.push({ minute: min, type: 'long_pass_fail', description: `💨 Lançamento longo de ${pName} sai sem direção.`, team });
        continue;
      }

      // Through ball (3%)
      cumul += 0.03 * highLineMod;
      if (r < cumul) {
        stats.passes[teamIdx]++;
        events.push({ minute: min, type: 'through_ball', description: `🚀 ${pName} encontra ${pName2} no espaço com passe genial!`, team });
        continue;
      }

      // Dribble (4%)
      cumul += 0.04;
      if (r < cumul) {
        const dribblerAttr = teamAvgAttr(allPlayers, team, 'dribbling');
        const defenderAttr = teamAvgAttr(allPlayers, oppTeamKey, 'marking');
        if (rng() < dribblerAttr / (dribblerAttr + defenderAttr)) {
          const p = pickByAttr(allPlayers.filter(pp => pp.team === team), 'dribbling');
          if (p) p.rating = Math.min(10, p.rating + 0.15);
          events.push({ minute: min, type: 'dribble_ok', description: `✨ ${p?.name || pName} dribla com classe e avança!`, team, playerName: p?.name || pName });
        } else {
          events.push({ minute: min, type: 'dribble_fail', description: `🛑 ${pName} tenta o dribble mas é desarmado!`, team });
        }
        continue;
      }

      // Cross OK (3%)
      cumul += 0.03;
      if (r < cumul) {
        events.push({ minute: min, type: 'cross_ok', description: `↗️ ${pName} cruza na medida para a área!`, team, playerName: pName });
        continue;
      }

      // Corner (3%)
      cumul += 0.03;
      if (r < cumul) {
        stats.corners[teamIdx]++;
        events.push({ minute: min, type: 'corner', description: `🚩 Escanteio para o ${tName}!`, team });
        continue;
      }

      // Corner danger (1.5%)
      cumul += 0.015;
      if (r < cumul) {
        stats.corners[teamIdx]++;
        g.hasGoalOrChance = true;
        events.push({ minute: min, type: 'corner_danger', description: `🚩⚠️ Escanteio perigoso! ${pName} cabeceia mas passa perto da trave!`, team, playerName: pName });
        continue;
      }

      // Strong shot (2.5%)
      cumul += 0.025 * offensiveMod;
      if (r < cumul) {
        stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++;
        const p = pickByAttr(allPlayers.filter(pp => pp.team === team), 'shooting');
        if (p) p.rating = Math.min(10, p.rating + 0.15);
        events.push({ minute: min, type: 'strong_shot', description: `🎯 ${p?.name || pName} chuta forte! Goleiro faz boa defesa!`, team, playerName: p?.name || pName });
        continue;
      }

      // Weak shot (2%)
      cumul += 0.02;
      if (r < cumul) {
        stats.shots[teamIdx]++;
        events.push({ minute: min, type: 'weak_shot', description: `👟 Finalização fraca de ${pName}. Sem perigo.`, team, playerName: pName });
        continue;
      }

      // Long shot (2%)
      cumul += 0.02;
      if (r < cumul) {
        stats.shots[teamIdx]++;
        events.push({ minute: min, type: 'long_shot', description: `💣 ${pName} arrisca de fora da área!`, team, playerName: pName });
        continue;
      }

      // Great save (1.5%)
      cumul += 0.015;
      if (r < cumul) {
        stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++;
        stats.saves[teamIdx === 0 ? 1 : 0]++;
        g.hasGoalOrChance = true;
        events.push({ minute: min, type: 'great_save', description: `🧤🔥 DEFESAÇA! ${pName} chuta no ângulo e o goleiro faz milagre!`, team, playerName: pName });
        continue;
      }

      // Woodwork (1%)
      cumul += 0.01;
      if (r < cumul) {
        stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++;
        g.hasGoalOrChance = true;
        events.push({ minute: min, type: 'woodwork', description: `📐 BOLA NA TRAVE! ${pName} acerta o poste!`, team, playerName: pName });
        continue;
      }

      // === GOALS ===
      // Foot goal (2.5%)
      cumul += 0.025 * offensiveMod;
      if (r < cumul) {
        g.hasGoalOrChance = true;
        const scorer = pickByAttr(allPlayers.filter(pp => pp.team === team), 'shooting', rng() > 0.6 ? 'ATA' : undefined);
        const gk = pickByAttr(allPlayers.filter(pp => pp.team === oppTeamKey), 'goalkeeping', 'GOL');
        const shooterSkill = scorer ? (scorer.shooting * 0.6 + scorer.composure * 0.2 + scorer.positioning * 0.2) : 60;
        const gkSkill = gk ? (gk.goalkeeping * 0.7 + gk.positioning * 0.3) : 55;
        const goalProb = clamp(shooterSkill / (shooterSkill + gkSkill) + 0.05, 0.25, 0.75);
        if (rng() < goalProb) {
          const goalTypes = ['chute rasteiro', 'chute colocado', 'voleio', 'toque de primeira', 'chute cruzado', 'pênalti'];
          const goalType = pick(goalTypes);
          let assistName: string | undefined;
          if (scorer) {
            scorer.goals++; scorer.rating = Math.min(10, scorer.rating + 1.2);
            if (team === 'home') homeGoals++; else awayGoals++;
            const others = allPlayers.filter(p => p.team === team && p.id !== scorer.id && p.isOnPitch);
            if (others.length > 0 && rng() < 0.65) {
              const assister = pickByAttr(others, 'vision') || pick(others);
              assister.assists++; assister.rating = Math.min(10, assister.rating + 0.6);
              assistName = assister.name;
            }
          } else {
            if (team === 'home') homeGoals++; else awayGoals++;
          }
          stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++;
          events.push({ minute: min, type: 'foot_goal', description: `⚽ GOOOOL! ${scorer?.name || pName} marca com ${goalType} para o ${tName}!`, team, playerName: scorer?.name || pName, assistName, goalType, isGoal: true });
        } else {
          stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++;
          stats.saves[teamIdx === 0 ? 1 : 0]++;
          if (gk) gk.rating = Math.min(10, gk.rating + 0.3);
          events.push({ minute: min, type: 'great_save', description: `🧤🔥 DEFESAÇA! ${scorer?.name || pName} chuta forte e o goleiro salva!`, team, playerName: scorer?.name || pName });
        }
        continue;
      }

      // Header goal (0.8%)
      cumul += 0.008;
      if (r < cumul) {
        g.hasGoalOrChance = true;
        const scorer = pickByAttr(allPlayers.filter(pp => pp.team === team), 'heading');
        const gk = pickByAttr(allPlayers.filter(pp => pp.team === oppTeamKey), 'goalkeeping', 'GOL');
        const headingSkill = scorer ? (scorer.heading * 0.7 + scorer.physical * 0.3) : 55;
        const gkSkill = gk ? gk.goalkeeping : 55;
        const goalProb = clamp(headingSkill / (headingSkill + gkSkill) + 0.05, 0.3, 0.7);
        if (rng() < goalProb) {
          let assistName: string | undefined;
          if (scorer) {
            scorer.goals++; scorer.rating = Math.min(10, scorer.rating + 1.2);
            if (team === 'home') homeGoals++; else awayGoals++;
            const others = allPlayers.filter(p => p.team === team && p.id !== scorer.id && p.isOnPitch);
            if (others.length > 0 && rng() < 0.7) {
              const assister = pickByAttr(others, 'crossing') || pick(others);
              assister.assists++; assister.rating = Math.min(10, assister.rating + 0.6);
              assistName = assister.name;
            }
          } else {
            if (team === 'home') homeGoals++; else awayGoals++;
          }
          stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++;
          events.push({ minute: min, type: 'header_goal', description: `⚽🤕 GOL DE CABEÇA! ${scorer?.name || pName} sobe mais alto que todos!`, team, playerName: scorer?.name || pName, assistName, goalType: 'cabeceio', isGoal: true });
        } else {
          stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++;
          stats.saves[teamIdx === 0 ? 1 : 0]++;
          events.push({ minute: min, type: 'great_save', description: `🧤 Cabeceio de ${pName} e o goleiro defende!`, team, playerName: pName });
        }
        continue;
      }

      // Own goal (0.2%)
      cumul += 0.002;
      if (r < cumul) {
        const oppTeam: 'home' | 'away' = team === 'home' ? 'away' : 'home';
        if (oppTeam === 'home') homeGoals++; else awayGoals++;
        g.hasGoalOrChance = true;
        events.push({ minute: min, type: 'own_goal', description: `⚽🔴 GOL CONTRA! ${pName} do ${tName} desvia contra o próprio patrimônio!`, team: oppTeam, playerName: pName, goalType: 'gol contra', isGoal: true });
        continue;
      }

      // Fouls & cards
      cumul += 0.03 * pressingMod;
      if (r < cumul) {
        stats.fouls[teamIdx]++;
        events.push({ minute: min, type: 'midfield_foul', description: `⚠️ Falta de ${pName} no meio-campo.`, team, playerName: pName });
        continue;
      }

      cumul += 0.02;
      if (r < cumul) {
        stats.fouls[teamIdx]++; stats.yellowCards[teamIdx]++; g.hasCard = true;
        const p = pick(homePlrs);
        if (p && team === 'home') { p.yellowCards++; p.rating = Math.max(3, p.rating - 0.4); }
        events.push({ minute: min, type: 'yellow_card', description: `🟨 Cartão amarelo para ${pName}!`, team, playerName: pName });
        continue;
      }

      cumul += 0.002;
      if (r < cumul) {
        stats.redCards[teamIdx]++; stats.fouls[teamIdx]++; g.hasCard = true;
        events.push({ minute: min, type: 'red_card', description: `🟥 CARTÃO VERMELHO DIRETO! ${pName} é expulso!`, team, playerName: pName });
        continue;
      }

      // Tackles
      cumul += 0.03 * pressingMod;
      if (r < cumul) {
        stats.tackles[teamIdx]++;
        const p = pickByAttr(allPlayers.filter(pp => pp.team === team), 'defending');
        if (p) p.rating = Math.min(10, p.rating + 0.1);
        events.push({ minute: min, type: 'dribble_fail', description: `💪 Desarme de ${p?.name || pName}! Recupera a posse!`, team, playerName: p?.name || pName });
        continue;
      }

      // Medical (0.8%)
      cumul += 0.008;
      if (r < cumul) {
        events.push({ minute: min, type: 'medical', description: `🏥 Atendimento médico. ${pName} sentiu uma fisgada.`, team, playerName: pName });
        continue;
      }

      // Substitution (1.5%)
      cumul += 0.015;
      if (r < cumul) {
        g.hasSub = true;
        events.push({ minute: min, type: 'substitution', description: `🔄 Substituição no ${tName}. Troca tática.`, team, playerName: pName });
        continue;
      }

      // Offside (2%)
      cumul += 0.02;
      if (r < cumul) {
        stats.offsides[teamIdx]++;
        events.push({ minute: min, type: 'through_ball', description: `🏳️ Impedimento! ${pName} estava adiantado.`, team, playerName: pName });
        continue;
      }

      // Counterattack (2%)
      cumul += 0.02;
      if (r < cumul) {
        events.push({ minute: min, type: 'through_ball', description: `🏃 Contra-ataque veloz do ${tName}! ${pName} puxa em velocidade!`, team });
        continue;
      }

      // Default: possession
      stats.passes[teamIdx]++;
      events.push({ minute: min, type: 'possession', description: `⚽ ${tName} trabalha a bola com paciência.`, team });
    }
  }

  // End of match
  const addedTime2 = Math.floor(1 + rng() * 5);
  events.push({ minute: 90, type: 'added_time', description: `⏱️ Acréscimos: +${addedTime2} minutos!`, team: 'neutral' });
  events.push({ minute: 90 + addedTime2, type: 'final_whistle', description: '🏁 APITO FINAL! Fim de jogo!', team: 'neutral' });

  // Update possession
  const effectiveHome2 = homeStrength * homeAdv * moraleMod;
  const possRatio = effectiveHome2 / (effectiveHome2 + awayStrength);
  stats.possession = [Math.round(possRatio * 100), Math.round((1 - possRatio) * 100)];

  // Player ratings
  const playerRatings: Record<string, number> = {};
  allPlayers.filter(p => p.team === 'home').forEach(p => {
    playerRatings[p.id] = Math.round(p.rating * 10) / 10;
  });

  return { events, homeGoals, awayGoals, stats, playerRatings };
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
      return new Response(JSON.stringify({ error: 'Failed to create match', details: insertError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
