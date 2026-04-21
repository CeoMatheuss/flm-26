import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function rng() { return Math.random(); }
function pick<T>(arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; }

// ── TYPES ──────────────────────────────────────────────────────

interface SimPlayer {
  id: string; name: string; position: string; team: 'home' | 'away'; ovr: number;
  rating: number; goals: number; assists: number; yellowCards: number; isOnPitch: boolean;
  stamina: number; morale: number; baseStamina: number;
  speed: number; shooting: number; passing: number; defending: number; physical: number;
  dribbling: number; heading: number; marking: number; vision: number; crossing: number;
  longShots: number; workRate: number; composure: number; aggression: number;
  goalkeeping: number; setPieces: number; positioning: number;
  personality?: string;
  injured?: boolean;
}

interface SimEvent {
  minute: number; type: string; description: string; team: 'home' | 'away' | 'neutral';
  playerName?: string; assistName?: string; goalType?: string; isGoal?: boolean;
  animType?: string; ballX?: number; ballY?: number;
  staminaData?: Record<string, number>;
  momentPhase?: string;
  priority?: string;
}

// ── ATTRIBUTE-BASED ACTION POWER ──────────────────────────────

function getStaminaMultiplier(stamina: number): number {
  if (stamina >= 70) return 1.0;
  if (stamina >= 60) return 0.95;
  if (stamina >= 40) return 0.85;
  return 0.75;
}

function getMoraleMultiplier(morale: number): number {
  if (morale >= 80) return 1.10;  // +10%
  if (morale >= 60) return 1.05;  // +5%
  if (morale >= 40) return 1.0;   // neutral
  if (morale >= 20) return 0.90;  // -10%
  return 0.85;                    // -15%
}

function effectiveAttr(player: SimPlayer, attr: keyof SimPlayer): number {
  const val = Number(player[attr]) || 50;
  return val * getStaminaMultiplier(player.stamina) * getMoraleMultiplier(player.morale);
}

function creationPower(p: SimPlayer): number {
  return effectiveAttr(p, 'passing') + effectiveAttr(p, 'vision') * 0.5;
}
function tacklePower(p: SimPlayer): number {
  return effectiveAttr(p, 'defending') + effectiveAttr(p, 'marking') * 0.5;
}
function finishingPower(p: SimPlayer): number {
  return effectiveAttr(p, 'shooting') + effectiveAttr(p, 'composure') * 0.3;
}
function transitionPower(p: SimPlayer): number {
  return effectiveAttr(p, 'speed') + effectiveAttr(p, 'workRate') * 0.3;
}
function headerPower(p: SimPlayer): number {
  return effectiveAttr(p, 'heading') + effectiveAttr(p, 'physical') * 0.3;
}
function dribblePower(p: SimPlayer): number {
  return effectiveAttr(p, 'dribbling') + effectiveAttr(p, 'speed') * 0.3;
}

// ── HELPERS ──────────────────────────────────────────────────

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
  let filtered = pool.filter(p => p.isOnPitch && !p.injured);
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

// ── STAMINA SYSTEM ──────────────────────────────────────────

function drainStamina(players: SimPlayer[], minute: number, pressingMod: number, tempoMod: number) {
  for (const p of players) {
    if (!p.isOnPitch || p.injured) continue;
    const physicalFactor = 1 - (p.physical / 100) * 0.3;
    const baseRate = 0.3 + rng() * 0.2;
    const drain = baseRate * physicalFactor * pressingMod * tempoMod;
    p.stamina = Math.max(0, p.stamina - drain);
  }
}

// ── MOMENT SYSTEM ──────────────────────────────────────────

type MomentPhase = 'pressão_home' | 'pressão_away' | 'equilíbrio' | 'domínio_home' | 'domínio_away';

function computeMoment(
  home: SimPlayer[], away: SimPlayer[],
  homeStrength: number, awayStrength: number,
  homeGoals: number, awayGoals: number,
  homeAdv: number, pressingMod: number
): MomentPhase {
  const homeAvgStamina = home.filter(p => p.isOnPitch).reduce((s, p) => s + p.stamina, 0) / Math.max(1, home.filter(p => p.isOnPitch).length);
  const awayAvgStamina = away.filter(p => p.isOnPitch).reduce((s, p) => s + p.stamina, 0) / Math.max(1, away.filter(p => p.isOnPitch).length);
  
  let homeForce = homeStrength * homeAdv * (homeAvgStamina / 100) * pressingMod;
  let awayForce = awayStrength * (awayAvgStamina / 100);
  
  // Losing team pushes harder
  if (homeGoals < awayGoals) homeForce *= 1.15;
  if (awayGoals < homeGoals) awayForce *= 1.15;
  
  const diff = homeForce - awayForce;
  if (diff > 15) return 'domínio_home';
  if (diff > 5) return 'pressão_home';
  if (diff < -15) return 'domínio_away';
  if (diff < -5) return 'pressão_away';
  return 'equilíbrio';
}

// ── ASSISTANT TIPS ──────────────────────────────────────────

function generateAssistantTips(
  home: SimPlayer[], away: SimPlayer[], minute: number, hasAssistant: boolean, assistantSkill: number,
  homeGoals: number, awayGoals: number, moment: string, homeTeam: string, awayTeam: string,
  stats: any
): SimEvent[] {
  if (!hasAssistant) return [];
  const tips: SimEvent[] = [];
  
  for (const p of home) {
    if (!p.isOnPitch || p.injured) continue;
    
    // Stamina warnings
    if (p.stamina < 60 && p.stamina >= 40 && assistantSkill >= 3) {
      tips.push({
        minute, type: 'assistant_tip', team: 'neutral',
        playerName: p.name, priority: 'medium',
        description: `💬 "${p.name} está com ${Math.round(p.stamina)}% de stamina e começando a sentir o cansaço. Considere uma substituição nos próximos minutos para manter a intensidade do time."`,
      });
    } else if (p.stamina < 40 && assistantSkill >= 1) {
      tips.push({
        minute, type: 'assistant_tip', team: 'neutral',
        playerName: p.name, priority: 'high',
        description: `⚠️ ALERTA: ${p.name} está ESGOTADO com apenas ${Math.round(p.stamina)}% de stamina! Risco de lesão muscular se continuar em campo. Substituição urgente recomendada!`,
      });
    }
    
    // Yellow card warning
    if (p.yellowCards > 0 && assistantSkill >= 5) {
      tips.push({
        minute, type: 'assistant_tip', team: 'neutral',
        playerName: p.name, priority: 'medium',
        description: `🟨 ${p.name} já tem cartão amarelo. Peça para ele evitar divididas duras. Uma expulsão agora seria devastadora para nosso esquema tático.`,
      });
    }
  }

  // Tactical analysis tips
  if (assistantSkill >= 4 && moment.includes('pressão_away')) {
    tips.push({
      minute, type: 'assistant_tip', team: 'neutral', priority: 'high',
      description: `📊 O ${awayTeam} está nos pressionando muito! Nosso meio-campo está perdendo muitos duelos. Considere recuar a pressão ou trocar para contra-ataque.`,
    });
  }
  if (assistantSkill >= 4 && moment.includes('domínio_home')) {
    tips.push({
      minute, type: 'assistant_tip', team: 'neutral', priority: 'low',
      description: `✅ Estamos dominando o jogo! A posse de bola está a nosso favor. Mantenha o ritmo e explore os espaços na defesa adversária.`,
    });
  }
  if (assistantSkill >= 3 && homeGoals < awayGoals && minute >= 60) {
    tips.push({
      minute, type: 'assistant_tip', team: 'neutral', priority: 'high',
      description: `🔴 Estamos perdendo e o tempo está passando! Sugiro colocar mais um atacante e aumentar a pressão. É hora de arriscar!`,
    });
  }
  if (assistantSkill >= 5 && minute >= 70 && homeGoals > awayGoals) {
    tips.push({
      minute, type: 'assistant_tip', team: 'neutral', priority: 'medium',
      description: `🛡️ Estamos vencendo e faltam poucos minutos. Considere recuar a linha defensiva e segurar o resultado com jogadores mais frescos.`,
    });
  }

  // Sector comparison tip
  if (assistantSkill >= 4 && minute % 20 === 0 && minute > 0) {
    const homeDefAvg = home.filter(p => ['ZAG', 'LAT', 'GOL'].includes(p.position) && p.isOnPitch).reduce((s, p) => s + p.stamina, 0) / Math.max(1, home.filter(p => ['ZAG', 'LAT', 'GOL'].includes(p.position) && p.isOnPitch).length);
    const homeMidAvg = home.filter(p => ['MEI', 'VOL'].includes(p.position) && p.isOnPitch).reduce((s, p) => s + p.stamina, 0) / Math.max(1, home.filter(p => ['MEI', 'VOL'].includes(p.position) && p.isOnPitch).length);
    const homeAtkAvg = home.filter(p => p.position === 'ATA' && p.isOnPitch).reduce((s, p) => s + p.stamina, 0) / Math.max(1, home.filter(p => p.position === 'ATA' && p.isOnPitch).length);
    tips.push({
      minute, type: 'assistant_tip', team: 'neutral', priority: 'low',
      description: `📈 Relatório de Setores:\n🛡️ Defesa: ${Math.round(homeDefAvg)}% stamina\n⚙️ Meio: ${Math.round(homeMidAvg)}% stamina\n⚔️ Ataque: ${Math.round(homeAtkAvg)}% stamina`,
    });
  }
  
  // Limit to 2 tips per check (most important)
  tips.sort((a, b) => (b.priority === 'high' ? 1 : 0) - (a.priority === 'high' ? 1 : 0));
  return tips.slice(0, 2);
}

// ── REPORT GENERATOR ──────────────────────────────────────

function generateReport(
  homeTeam: string, awayTeam: string, homeGoals: number, awayGoals: number,
  stats: any, playerRatings: Record<string, number>, goalScorers: any[],
  manOfTheMatch: string | undefined, isHome: boolean, competition: string,
  homeStrength: number, awayStrength: number, tactics: any, stadiumCapacity: number,
  homePlayers: SimPlayer[], awayPlayers: SimPlayer[]
) {
  const isUserHome = isHome;
  const userGoals = isUserHome ? homeGoals : awayGoals;
  const oppGoals = isUserHome ? awayGoals : homeGoals;
  const userTeam = isUserHome ? homeTeam : awayTeam;
  const oppTeam = isUserHome ? awayTeam : homeTeam;
  const idx = isUserHome ? 0 : 1;

  let result = 'draw';
  let resultType = 'draw';
  if (userGoals > oppGoals) {
    result = 'win';
    resultType = userGoals - oppGoals >= 3 ? 'rout_win' : userGoals - oppGoals >= 2 ? 'solid_win' : 'narrow_win';
  } else if (userGoals < oppGoals) {
    result = 'loss';
    resultType = oppGoals - userGoals >= 3 ? 'rout_loss' : oppGoals - userGoals >= 2 ? 'solid_loss' : 'narrow_loss';
  }

  const strengthDiff = homeStrength - awayStrength;
  let rankingChange = 0;
  if (result === 'win') {
    rankingChange = Math.max(3, 10 - Math.floor(strengthDiff / 5));
    if (resultType === 'rout_win') rankingChange += 3;
  } else if (result === 'loss') {
    rankingChange = -Math.max(3, 10 + Math.floor(strengthDiff / 5));
    if (resultType === 'rout_loss') rankingChange -= 2;
  } else {
    rankingChange = strengthDiff > 10 ? -2 : strengthDiff < -10 ? 3 : 0;
  }
  if (competition === 'Amistoso') rankingChange = Math.round(rankingChange * 0.5);

  const positives: string[] = [];
  if (stats.possession[idx] >= 55) positives.push(`Domínio na posse de bola (${stats.possession[idx]}%)`);
  if (stats.shotsOnTarget[idx] >= 5) positives.push(`Eficiência ofensiva: ${stats.shotsOnTarget[idx]} finalizações no gol`);
  if (oppGoals === 0) positives.push('Defesa sólida — Clean Sheet! 🧤');
  if (userGoals >= 3) positives.push(`Ataque avassalador com ${userGoals} gols marcados`);
  if (positives.length === 0) positives.push('Equipe mostrou garra e determinação');

  const negatives: string[] = [];
  if (stats.possession[idx] < 45) negatives.push(`Posse de bola baixa (${stats.possession[idx]}%)`);
  if (oppGoals >= 3) negatives.push(`Defesa vulnerável: sofreu ${oppGoals} gols`);
  if (stats.yellowCards[idx] >= 3) negatives.push(`Indisciplina: ${stats.yellowCards[idx]} cartões amarelos`);
  if (negatives.length === 0 && result !== 'win') negatives.push('Faltou eficiência nos momentos decisivos');

  const pressing = tactics?.pressing || 'medio';
  const playStyle = tactics?.playStyle || 'equilibrado';
  const tacticalNotes: string[] = [];
  if (pressing === 'ultra-alto' || pressing === 'alto') {
    tacticalNotes.push(stats.tackles[idx] >= 8 ? 'Pressing alto foi eficaz' : 'Pressing alto não surtiu efeito');
  }
  if (playStyle === 'ofensivo') tacticalNotes.push(userGoals >= 2 ? 'Estilo ofensivo rendeu gols' : 'Estilo ofensivo deixou a defesa exposta');
  if (tacticalNotes.length === 0) tacticalNotes.push('Tática equilibrada manteve o time competitivo');

  const attendance = Math.floor(stadiumCapacity * (0.5 + rng() * 0.45));
  const ticketRevenue = attendance * (50 + Math.floor(rng() * 30));
  let moraleChange = 0;
  if (result === 'win') moraleChange = resultType === 'rout_win' ? 15 : 10;
  else if (result === 'loss') moraleChange = resultType === 'rout_loss' ? -15 : -8;
  else moraleChange = strengthDiff > 10 ? -3 : 2;

  const sortedByRating = homePlayers.filter(p => p.team === (isUserHome ? 'home' : 'away')).sort((a, b) => b.rating - a.rating);
  const bestPlayer = sortedByRating[0];
  const worstPlayer = sortedByRating[sortedByRating.length - 1];

  return {
    result, resultType, rankingChange,
    report: {
      general: { competition, userTeam, oppTeam, userGoals, oppGoals, resultType, isHome },
      positives, negatives,
      highlights: {
        bestPlayer: bestPlayer ? { name: bestPlayer.name, position: bestPlayer.position, rating: Math.round(bestPlayer.rating * 10) / 10, goals: bestPlayer.goals, assists: bestPlayer.assists } : null,
        worstPlayer: worstPlayer && worstPlayer.id !== bestPlayer?.id ? { name: worstPlayer.name, position: worstPlayer.position, rating: Math.round(worstPlayer.rating * 10) / 10 } : null,
        manOfTheMatch,
      },
      tactical: tacticalNotes,
      impacts: { moraleChange, rankingChange, attendance, revenue: ticketRevenue, fatigue: pressing === 'ultra-alto' ? 12 : pressing === 'alto' ? 8 : 5 },
    },
  };
}

// ── MAIN SIMULATION ──────────────────────────────────────────

function simulateFullMatch(
  homeTeam: string, awayTeam: string, homePlayers: any[],
  homeStrength: number, awayStrength: number, tactics: any,
  stadiumName: string, isHome: boolean, competition: string,
  stadiumCapacity: number = 5000, homeFans: number = 500,
  staffData?: any, awayFans: number = 500
) {
  homeStrength = clamp(Math.round(homeStrength), 20, 99);
  awayStrength = clamp(Math.round(awayStrength), 20, 99);

  // Check for assistant coach
  const hasAssistant = staffData?.some((s: any) => s.role === 'assistente') || false;
  const assistantSkill = hasAssistant ? (staffData.find((s: any) => s.role === 'assistente')?.skill || 5) : 0;

  // ── BUILD PLAYERS ──────────────────────────────────────────
  const home: SimPlayer[] = homePlayers.slice(0, 11).map((p: any, i: number) => ({
    id: p.id, name: (p.name || '').split(' ').pop() || p.name || `Jog${i}`,
    position: p.position || 'MEI', team: 'home' as const, ovr: p.overall || 60,
    rating: 6.0, goals: 0, assists: 0, yellowCards: 0, isOnPitch: true, injured: false,
    stamina: p.stamina || 80, baseStamina: p.stamina || 80, morale: p.morale || 70,
    speed: p.attributes?.speed || 50, shooting: p.attributes?.shooting || 50,
    passing: p.attributes?.passing || 50, defending: p.attributes?.defending || 50,
    physical: p.attributes?.physical || 50, dribbling: p.attributes?.dribbling || 50,
    heading: p.attributes?.heading || 50, marking: p.attributes?.marking || 50,
    vision: p.attributes?.vision || 50, crossing: p.attributes?.crossing || 50,
    longShots: p.attributes?.longShots || 50, workRate: p.attributes?.workRate || 50,
    composure: p.attributes?.composure || 50, aggression: p.attributes?.aggression || 50,
    goalkeeping: p.attributes?.goalkeeping || 0, setPieces: p.attributes?.setPieces || 50,
    positioning: p.attributes?.positioning || 50,
    personality: p.personality || 'introvertido',
  }));

  const awayNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Almeida', 'Ribeiro', 'Gomes'];
  const away: SimPlayer[] = Array.from({ length: 11 }, (_, i) => {
    const pos = i === 0 ? 'GOL' : i < 5 ? 'ZAG' : i < 9 ? 'MEI' : 'ATA';
    const ovr = clamp(Math.floor(awayStrength + (rng() * 8 - 4)), 30, 99);
    const attrs = genAwayAttrs(ovr, pos);
    return {
      id: `a${i}`, name: awayNames[i] || `Jog.${i + 1}`, position: pos,
      team: 'away' as const, ovr, rating: 6.0, goals: 0, assists: 0, yellowCards: 0,
      isOnPitch: true, injured: false, stamina: 70 + Math.floor(rng() * 20), baseStamina: 80, morale: 60 + Math.floor(rng() * 30),
      ...attrs,
    };
  });

  const allPlayers = [...home, ...away];

  // ── PERSONALITY MODIFIERS ────────────────────────────────────
  const hasLider = home.some(p => p.personality === 'lider' && p.morale > 70);
  const hasCompetitivo = home.some(p => p.personality === 'competitivo');
  if (hasLider) home.forEach(p => { p.morale = Math.min(100, p.morale + 5); });
  if (hasCompetitivo && awayStrength > 70) {
    home.filter(p => p.personality === 'competitivo').forEach(p => {
      p.shooting += 5; p.dribbling += 5; p.composure += 5;
    });
  }
  home.filter(p => p.personality === 'calmo').forEach(p => { p.composure += 5; });
  home.filter(p => p.personality === 'dedicado').forEach(p => {
    p.speed += 3; p.shooting += 3; p.passing += 3; p.defending += 3; p.physical += 3; p.dribbling += 3;
  });
  home.filter(p => p.personality === 'preguicoso').forEach(p => { p.physical -= 2; p.workRate -= 2; });

  // ── TACTICAL MODIFIERS ──────────────────────────────────────
  const pressing = tactics?.pressing || 'medio';
  const playStyle = tactics?.playStyle || 'equilibrado';
  const tempo = tactics?.tempo || 'normal';

  const homeAdv = isHome ? 1.10 : 0.95;
  const avgMorale = home.reduce((s, p) => s + p.morale, 0) / Math.max(1, home.length);
  const moraleMod = 0.85 + (avgMorale / 100) * 0.3;
  const avgStamina = home.reduce((s, p) => s + p.stamina, 0) / 11;
  const fatigueMod = 0.8 + (avgStamina / 100) * 0.2;
  
  // Tactical impact on simulation
  const pressingMod = pressing === 'ultra-alto' ? 1.5 : pressing === 'alto' ? 1.25 : pressing === 'medio' ? 1.0 : 0.8;
  const offensiveMod = playStyle === 'ofensivo' ? 1.20 : playStyle === 'contra-ataque' ? 1.05 : playStyle === 'equilibrado' ? 1.0 : playStyle === 'posse' ? 0.9 : 0.75;
  const defensiveMod = playStyle === 'defensivo' ? 0.85 : playStyle === 'equilibrado' ? 1.0 : playStyle === 'ofensivo' ? 1.10 : 1.0;
  const tempoMod = tempo === 'muito-rapido' ? 1.15 : tempo === 'rapido' ? 1.08 : tempo === 'normal' ? 1.0 : 0.9;
  
  // Stamina drain modifiers for pressing/tempo
  const staminaDrainPressing = pressing === 'ultra-alto' ? 1.5 : pressing === 'alto' ? 1.25 : pressing === 'medio' ? 1.0 : 0.8;
  const staminaDrainTempo = tempo === 'muito-rapido' ? 1.2 : tempo === 'rapido' ? 1.1 : 1.0;

  // ── ATTRIBUTE-BASED STRENGTH ──────────────────────────────
  const homeDefenders = home.filter(p => ['ZAG', 'LAT', 'GOL'].includes(p.position));
  const homeMidfielders = home.filter(p => ['MEI', 'VOL'].includes(p.position));
  const homeAttackers = home.filter(p => ['ATA'].includes(p.position));
  
  const homeDefAvg = homeDefenders.length > 0 ? homeDefenders.reduce((s, p) => s + tacklePower(p), 0) / homeDefenders.length : 50;
  const homeMidAvg = homeMidfielders.length > 0 ? homeMidfielders.reduce((s, p) => s + creationPower(p), 0) / homeMidfielders.length : 50;
  const homeAtkAvg = homeAttackers.length > 0 ? homeAttackers.reduce((s, p) => s + finishingPower(p), 0) / homeAttackers.length : 50;

  const awayDefenders = away.filter(p => ['ZAG', 'LAT', 'GOL'].includes(p.position));
  const awayAttackers = away.filter(p => ['ATA'].includes(p.position));
  const awayDefAvg = awayDefenders.length > 0 ? awayDefenders.reduce((s, p) => s + tacklePower(p), 0) / awayDefenders.length : 50;
  const awayAtkAvg = awayAttackers.length > 0 ? awayAttackers.reduce((s, p) => s + finishingPower(p), 0) / awayAttackers.length : 50;

  const stats = {
    possession: [50, 50], shots: [0, 0], shotsOnTarget: [0, 0], corners: [0, 0],
    fouls: [0, 0], yellowCards: [0, 0], redCards: [0, 0], passes: [0, 0],
    tackles: [0, 0], saves: [0, 0], offsides: [0, 0],
  };

  // ── POISSON GOALS ──────────────────────────────────────────
  const homeAttackVsDefense = (homeAtkAvg + homeMidAvg * 0.5) / Math.max(1, awayDefAvg);
  const awayAttackVsDefense = (awayAtkAvg + 50 * 0.5) / Math.max(1, homeDefAvg);
  
  const strengthDiff = (homeStrength * homeAdv * moraleMod * fatigueMod) - awayStrength;
  const homeExpected = clamp(
    1.1 + (strengthDiff / 100) * 1.5 * offensiveMod * tempoMod + (homeAttackVsDefense - 1) * 0.6,
    0.3, 3.0  // Capped at 3.0 for balance
  );
  const awayExpected = clamp(
    1.1 - (strengthDiff / 100) * 1.2 * defensiveMod + (awayAttackVsDefense - 1) * 0.6,
    0.2, 3.0
  );
  
  const totalHomeGoals = poissonSample(homeExpected);
  const totalAwayGoals = poissonSample(awayExpected);

  console.log(`[Sim] H:${homeStrength} A:${awayStrength} | λH:${homeExpected.toFixed(2)} λA:${awayExpected.toFixed(2)} | Final: ${totalHomeGoals}x${totalAwayGoals}`);

  // ── UNIQUE MINUTES ──────────────────────────────────────────
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

  // ── GOAL MINUTES ──────────────────────────────────────────
  const homeGoalMins: number[] = [];
  const awayGoalMins: number[] = [];
  for (let g = 0; g < totalHomeGoals; g++) { const m = pickUnique(allGamePool); if (m > 0) homeGoalMins.push(m); }
  for (let g = 0; g < totalAwayGoals; g++) { const m = pickUnique(allGamePool); if (m > 0) awayGoalMins.push(m); }

  // ── PENALTY EVENTS ──────────────────────────────────────────
  const penaltyMins: { minute: number; team: 'home' | 'away'; isGoal: boolean }[] = [];
  const penaltyChance = (pressingMod - 0.9) * 0.1 + 0.07;
  for (let i = 0; i < 2; i++) {
    if (rng() < penaltyChance) {
      const team: 'home' | 'away' = rng() < 0.55 ? 'home' : 'away';
      const m = pickUnique(allGamePool.filter(m => m >= 20));
      if (m > 0) {
        const kicker = team === 'home'
          ? pickByAttr(home.filter(p => p.isOnPitch), 'setPieces')
          : pickByAttr(away.filter(p => p.isOnPitch), 'setPieces');
        const gk = team === 'home'
          ? pickByAttr(away.filter(p => p.isOnPitch), 'goalkeeping', 'GOL')
          : pickByAttr(home.filter(p => p.isOnPitch), 'goalkeeping', 'GOL');
        const kickerSkill = kicker ? (kicker.composure * 0.5 + kicker.setPieces * 0.5) : 55;
        const gkSkill = gk ? (gk.goalkeeping * 0.6 + gk.composure * 0.4) : 50;
        const conversionProb = clamp(kickerSkill / (kickerSkill + gkSkill) + 0.15, 0.55, 0.85);
        penaltyMins.push({ minute: m, team, isGoal: rng() < conversionProb });
      }
    }
  }

  // ── SUPPORT EVENTS ──────────────────────────────────────────
  const cardMins: number[] = [];
  for (let i = 0; i < 2 + Math.floor(rng() * 4); i++) {
    const m = pickUnique(allGamePool.filter(m => m >= 15)); if (m > 0) cardMins.push(m);
  }
  const dangerousFoulMins: number[] = [];
  for (let i = 0; i < 1 + Math.floor(rng() * 3); i++) {
    const m = pickUnique(allGamePool.filter(m => m >= 10)); if (m > 0) dangerousFoulMins.push(m);
  }
  // NOTE: Substitutions are 100% manual now — controlled by the player from MatchPage.
  // No server-side automatic substitutions are generated.
  const chanceMins: number[] = [];
  for (let i = 0; i < 10 + Math.floor(rng() * 8); i++) {
    const m = pickUnique(allGamePool); if (m > 0) chanceMins.push(m);
  }
  const possessionMins: number[] = [];
  for (let m = 1; m <= 90; m++) {
    if (!usedMinutes.has(m) && m !== 45 && m !== 46) {
      usedMinutes.add(m); possessionMins.push(m);
    }
  }

  // ── SCORE TRACKER ──────────────────────────────────────────
  const allGoalEvents: { minute: number; team: 'home' | 'away' }[] = [];
  for (const m of homeGoalMins) allGoalEvents.push({ minute: m, team: 'home' });
  for (const m of awayGoalMins) allGoalEvents.push({ minute: m, team: 'away' });
  for (const pen of penaltyMins) { if (pen.isGoal) allGoalEvents.push({ minute: pen.minute, team: pen.team }); }
  allGoalEvents.sort((a, b) => a.minute - b.minute);

  function getScoreAtMinute(minute: number, includeSelf: boolean): [number, number] {
    let h = 0, a = 0;
    for (const g of allGoalEvents) {
      if (g.minute < minute || (includeSelf && g.minute === minute)) {
        if (g.team === 'home') h++; else a++;
      }
    }
    return [h, a];
  }

  // ── EVENT BUILDER ──────────────────────────────────────────
  const allPlanned: SimEvent[] = [];
  let penaltyHomeGoals = 0, penaltyAwayGoals = 0;

  function buildupDesc(team: 'home' | 'away', tName: string): string {
    const pool = allPlayers.filter(p => p.team === team && p.isOnPitch);
    const p1 = pool.length > 0 ? pick(pool).name : 'Jogador';
    const p2 = pool.filter(p => p.name !== p1).length > 0 ? pick(pool.filter(p => p.name !== p1)).name : p1;
    const buildups = [
      `${p1} recebe no meio-campo, gira e toca para ${p2} que avança pela meia-esquerda`,
      `Troca de passes rápida: ${p1} para ${p2}, tabela pelo centro, a bola volta limpa`,
      `${p1} desarma no meio e aciona ${p2} no contra-ataque fulminante`,
      `Combinação entre ${p1} e ${p2}: parede no meio, ${p2} avança livre`,
    ];
    return pick(buildups);
  }

  function pickGoalEventType(): string {
    const r = rng();
    if (r < 0.20) return 'counter_attack_goal';
    if (r < 0.38) return 'crossing_goal';
    if (r < 0.50) return 'free_kick_goal';
    return 'foot_goal';
  }

  // ── HOME GOALS ──────────────────────────────────────────────
  for (const m of homeGoalMins) {
    const [scoreH, scoreA] = getScoreAtMinute(m, true);
    const scorer = pickByAttr(home.filter(p => p.isOnPitch), 'shooting', rng() > 0.55 ? 'ATA' : undefined);
    const goalTypes = ['chute rasteiro no canto', 'chute colocado no ângulo', 'voleio de primeira', 'toque na saída do goleiro', 'cabeçada certeira', 'chute de longe'];
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
      minute: m, type: pickGoalEventType(), team: 'home', isGoal: true,
      playerName: scorer?.name, assistName, goalType,
      animType: 'goal', ballX: 0.95, ballY: 0.5,
      description: `${buildup}... ⚽ GOOOOL DO ${homeTeam.toUpperCase()}!!! ${scorer?.name || 'Jogador'} finaliza com ${goalType}!${assistName ? ` Assistência de ${assistName}!` : ''} [${scoreH}x${scoreA}]`,
    });
  }

  // ── AWAY GOALS ──────────────────────────────────────────────
  for (const m of awayGoalMins) {
    const [scoreH, scoreA] = getScoreAtMinute(m, true);
    const scorer = pickByAttr(away.filter(p => p.isOnPitch), 'shooting', rng() > 0.55 ? 'ATA' : undefined);
    const goalType = pick(['chute rasteiro cruzado', 'cabeceio no segundo pau', 'contra-ataque com toque na saída do goleiro', 'finalização de primeira']);
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
      minute: m, type: pickGoalEventType(), team: 'away', isGoal: true,
      playerName: scorer?.name, assistName, goalType,
      animType: 'goal', ballX: 0.05, ballY: 0.5,
      description: `${buildup}... ⚽ GOL DO ${awayTeam.toUpperCase()}! ${scorer?.name || 'Jogador'} marca com ${goalType}!${assistName ? ` Passe de ${assistName}!` : ''} [${scoreH}x${scoreA}]`,
    });
  }

  // ── PENALTIES ──────────────────────────────────────────────
  for (const pen of penaltyMins) {
    const team = pen.team;
    const tName = team === 'home' ? homeTeam : awayTeam;
    const opp = team === 'home' ? awayTeam : homeTeam;
    const teamPlayers = team === 'home' ? home : away;
    const oppPlayers = team === 'home' ? away : home;
    const teamIdx = team === 'home' ? 0 : 1;
    const kicker = pickByAttr(teamPlayers.filter(p => p.isOnPitch), 'setPieces');
    const gk = pickByAttr(oppPlayers.filter(p => p.isOnPitch), 'goalkeeping', 'GOL');
    stats.fouls[teamIdx === 0 ? 1 : 0]++;

    if (pen.isGoal) {
      if (team === 'home') penaltyHomeGoals++; else penaltyAwayGoals++;
      const [scoreH, scoreA] = getScoreAtMinute(pen.minute, true);
      if (kicker) { kicker.goals++; kicker.rating = Math.min(10, kicker.rating + 1.0); }
      stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++;
      allPlanned.push({
        minute: pen.minute, type: 'penalty_goal', team, isGoal: true,
        playerName: kicker?.name, goalType: 'pênalti',
        animType: 'penalty', ballX: team === 'home' ? 0.88 : 0.12, ballY: 0.5,
        description: `🔴 PÊNALTI! ⚽ ${kicker?.name || 'Cobrador'} converte com frieza! ${scoreH}x${scoreA}!`,
      });
    } else {
      stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++; stats.saves[teamIdx === 0 ? 1 : 0]++;
      if (gk) gk.rating = Math.min(10, gk.rating + 0.8);
      allPlanned.push({
        minute: pen.minute, type: 'penalty_miss', team,
        playerName: kicker?.name,
        animType: 'penalty', ballX: team === 'home' ? 0.88 : 0.12, ballY: 0.5,
        description: `🔴 PÊNALTI! 🧤 ${gk?.name || 'Goleiro'} do ${opp} defende o chute de ${kicker?.name || 'cobrador'}!`,
      });
    }
  }

  // ── DANGEROUS FOULS ──────────────────────────────────────────
  for (const m of dangerousFoulMins) {
    const teamIdx: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    const opp = team === 'home' ? awayTeam : homeTeam;
    const attacker = pickByAttr(allPlayers.filter(p => p.team === team && p.isOnPitch), 'dribbling');
    const defender = pickByAttr(allPlayers.filter(p => p.team !== team && p.isOnPitch), 'aggression');
    stats.fouls[teamIdx === 0 ? 1 : 0]++;
    allPlanned.push({
      minute: m, type: 'dangerous_foul', team,
      playerName: attacker?.name, animType: 'foul',
      description: `⚠️🔥 Falta perigosa! ${defender?.name || 'Defensor'} do ${opp} derruba ${attacker?.name || 'atacante'} do ${tName} na entrada da área!`,
    });
  }

  // ── CARDS ──────────────────────────────────────────────────
  for (const m of cardMins) {
    const teamIdx: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    const pool = allPlayers.filter(p => p.team === team && p.isOnPitch);
    const player = pool.length > 0 ? pick(pool) : null;
    if (player) player.yellowCards++;
    stats.fouls[teamIdx]++; stats.yellowCards[teamIdx]++;
    allPlanned.push({
      minute: m, type: 'yellow_card', team, animType: 'card',
      playerName: player?.name || 'Jogador',
      description: `🟨 CARTÃO AMARELO para ${player?.name || 'Jogador'} do ${tName}! Falta dura no meio-campo!`,
    });
  }

  // ── SUBSTITUTIONS: REMOVED ──────────────────────────────────
  // Substitutions are now 100% manual: the player triggers them from MatchPage,
  // and they are inserted into live_matches.events via client-side updates.
  // The server only produces "💡 Considere substituir" tips through the assistant coach.

  // ── CHANCES ──────────────────────────────────────────────────
  for (const m of chanceMins) {
    const teamIdx: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    const opp = team === 'home' ? awayTeam : homeTeam;
    const pool = allPlayers.filter(p => p.team === team && p.isOnPitch);
    const oppPool = allPlayers.filter(p => p.team !== team && p.isOnPitch);
    const pName = pool.length > 0 ? pick(pool).name : 'Jogador';
    const p2Name = pool.filter(p => p.name !== pName).length > 0 ? pick(pool.filter(p => p.name !== pName)).name : pName;
    const defName = oppPool.length > 0 ? pick(oppPool).name : 'Defensor';
    const gkName = oppPool.filter(p => p.position === 'GOL').length > 0 ? pick(oppPool.filter(p => p.position === 'GOL')).name : 'Goleiro';
    stats.shots[teamIdx]++;
    const evType = pick(['woodwork', 'great_save', 'corner_danger', 'offside_trap', 'long_shot_miss', 'header_miss', 'counter_attack', 'buildup_play', 'free_kick_near']);
    const descs: Record<string, string> = {
      woodwork: `📐 TRAVE!!! ${pName} do ${tName} solta uma bomba de fora da área e a bola bate no travessão! ${gkName} do ${opp} apenas observou. A torcida grita!`,
      great_save: `🧤 DEFESAÇA! ${pName} recebe de ${p2Name}, gira e finaliza forte no canto. ${gkName} do ${opp} faz uma defesa espetacular com a ponta dos dedos! Que reflexo!`,
      corner_danger: `🚩 Escanteio perigoso do ${tName}! ${pName} sobe mais que ${defName} e cabeceia forte. A bola raspa a trave e sai pela linha de fundo! Quase!`,
      offside_trap: `⛳ Impedimento! ${pName} do ${tName} partiu antes da hora e o bandeirinha marcou posição irregular. Lance anulado por centímetros!`,
      long_shot_miss: `💨 ${pName} puxa para o pé direito e arrisca de longa distância! A bola sobe um pouco acima do travessão. Boa tentativa do ${tName}!`,
      header_miss: `👤 ${pName} cabeceia após cruzamento de ${p2Name}, mas a bola passa por cima do gol! Chance desperdiçada pelo ${tName}! O jogador leva as mãos à cabeça!`,
      counter_attack: `🏃💨 CONTRA-ATAQUE VELOZ! ${pName} rouba a bola no meio e sai em velocidade! Passa por ${defName} e finaliza, mas ${gkName} se estica e defende! Quase gol do ${tName}!`,
      buildup_play: `⚙️ Bela construção do ${tName}! Troca de passes entre ${pName} e ${p2Name}, tabela pelo lado esquerdo. ${pName} cruza rasteiro mas ${defName} corta no último segundo!`,
      free_kick_near: `🎯 Falta perigosa para o ${tName}! ${pName} bate colocado por cima da barreira... ${gkName} espalma para escanteio! Quase um golaço de falta!`,
    };
    if (evType === 'great_save') { stats.shotsOnTarget[teamIdx]++; stats.saves[teamIdx === 0 ? 1 : 0]++; }
    if (evType === 'corner_danger') stats.corners[teamIdx]++;
    if (evType === 'offside_trap') stats.offsides[teamIdx]++;
    if (evType === 'counter_attack') { stats.shotsOnTarget[teamIdx]++; stats.saves[teamIdx === 0 ? 1 : 0]++; }
    if (evType === 'free_kick_near') { stats.shotsOnTarget[teamIdx]++; stats.saves[teamIdx === 0 ? 1 : 0]++; }
    allPlanned.push({
      minute: m, type: evType, team, animType: 'chance', playerName: pName,
      description: descs[evType] || `⚡ Grande chance do ${tName}!`,
    });
  }

  // ── POSSESSION + STAMINA + MOMENTS ──────────────────────────
  // Process minute by minute for stamina drain and moments
  let currentHomeGoals = 0, currentAwayGoals = 0;
  const momentCheckMinutes = [10, 20, 30, 40, 55, 65, 75, 85];
  let lastTipMinute = -10;

  for (const m of possessionMins.sort((a, b) => a - b)) {
    // Drain stamina
    drainStamina(home, m, staminaDrainPressing, staminaDrainTempo);
    drainStamina(away, m, 1.0, 1.0);

    // Update score at this minute
    const [sh, sa] = getScoreAtMinute(m, false);
    currentHomeGoals = sh; currentAwayGoals = sa;

    // Injury check for exhausted players
    for (const p of home) {
      if (p.isOnPitch && !p.injured && p.stamina < 40 && rng() < 0.05) {
        p.injured = true;
        p.isOnPitch = false;
        allPlanned.push({
          minute: m, type: 'injury', team: 'home',
          playerName: p.name, animType: 'foul',
          description: `🏥 LESÃO! ${p.name} sente dores musculares e precisa ser substituído! O cansaço cobrou seu preço!`,
        });
      }
    }

    // Moment phase check
    const isMomentCheck = momentCheckMinutes.includes(m);
    let momentPhase: string | undefined;
    if (isMomentCheck) {
      momentPhase = computeMoment(home, away, homeStrength, awayStrength, currentHomeGoals, currentAwayGoals, homeAdv, pressingMod > 1 ? pressingMod : 1);
    }

    // Assistant tips (max every 8 minutes)
    if (hasAssistant && m - lastTipMinute >= 8) {
      const currentMomentStr = momentPhase || 'equilíbrio';
      const tips = generateAssistantTips(home, away, m, hasAssistant, assistantSkill, currentHomeGoals, currentAwayGoals, currentMomentStr, homeTeam, awayTeam, stats);
      if (tips.length > 0) {
        allPlanned.push(...tips);
        lastTipMinute = m;
      }
    }

    // Possession event
    const teamIdx: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    const opp = team === 'home' ? awayTeam : homeTeam;
    const pool = allPlayers.filter(p => p.team === team && p.isOnPitch && !p.injured);
    const oppPool = allPlayers.filter(p => p.team !== team && p.isOnPitch);
    const p1 = pool.length > 0 ? pick(pool).name : 'Jogador';
    const p2 = pool.filter(p => p.name !== p1).length > 0 ? pick(pool.filter(p => p.name !== p1)).name : p1;
    const def = oppPool.length > 0 ? pick(oppPool).name : 'Defensor';
    stats.passes[teamIdx]++;

    const posTypes = [
      { type: 'possession', desc: `⚽ ${tName} troca passes no campo ofensivo. ${p1} recebe de ${p2}, protege a bola e distribui o jogo com tranquilidade.` },
      { type: 'dribble_ok', desc: `✨ ${p1} do ${tName} puxa para o pé esquerdo, faz um corte seco em ${def} e avança pelo corredor! A torcida se anima!` },
      { type: 'through_ball', desc: `🏃 Lançamento PERFEITO de ${p1}! ${p2} aparece nas costas da zaga do ${opp} e recebe em profundidade. A defesa não acompanha!` },
      { type: 'midfield_foul', desc: `⚠️ ${p1} do ${tName} chega atrasado em ${def} do ${opp} no meio-campo. O árbitro marca falta sem hesitar. Bola parada para o ${opp}.` },
      { type: 'tackle', desc: `💪 DESARME LIMPO! ${def} do ${opp} antecipa a jogada de ${p1} e fica com a bola. Ótima leitura defensiva!` },
      { type: 'crossing', desc: `↗️ ${p1} avança pela ponta e cruza na área! ${def} do ${opp} aparece e afasta de cabeça. Pressão do ${tName}!` },
      { type: 'pressing', desc: `🔥 Pressão intensa do ${tName}! ${p1} e ${p2} não dão espaço para a saída de bola. O ${opp} está sufocado no próprio campo!` },
      { type: 'gk_distribution', desc: `🧤 Reposição rápida do goleiro do ${tName}! Lançamento longo que encontra ${p1} na intermediária. O jogo segue aberto.` },
      { type: 'throw_in', desc: `📏 Lateral para o ${tName}. ${p1} cobra e encontra ${p2} que domina e tenta avançar, mas ${def} marca firme.` },
      { type: 'long_pass', desc: `🎯 ${p1} faz um lançamento de 40 metros que cruza o campo inteiro! ${p2} amortece no peito e protege. Passe cirúrgico!` },
      { type: 'pressing_recovery', desc: `🔄 Recuperação de bola do ${tName}! ${p1} pressiona ${def} que erra o passe. ${tName} sai jogando pelo lado esquerdo com ${p2}.` },
    ];
    const chosen = pick(posTypes);
    if (chosen.type === 'midfield_foul') stats.fouls[teamIdx]++;
    if (chosen.type === 'tackle') stats.tackles[teamIdx === 0 ? 1 : 0]++;

    // Build stamina snapshot every 10 min
    let staminaData: Record<string, number> | undefined;
    if (isMomentCheck) {
      staminaData = {};
      for (const p of home) {
        staminaData[p.id] = Math.round(p.stamina);
      }
    }

    allPlanned.push({
      minute: m, type: chosen.type, team, animType: 'pass', playerName: p1,
      ballX: 0.3 + rng() * 0.4, ballY: 0.2 + rng() * 0.6,
      description: chosen.desc,
      staminaData, momentPhase,
    });
  }

  // ── FINAL ASSEMBLY ──────────────────────────────────────────
  allPlanned.sort((a, b) => a.minute - b.minute);

  const addedTime1 = 1 + Math.floor(rng() * 4);
  const halftimeMin = 45 + addedTime1;
  const ht_h = homeGoalMins.filter(m => m <= 45).length + penaltyMins.filter(p => p.team === 'home' && p.isGoal && p.minute <= 45).length;
  const ht_a = awayGoalMins.filter(m => m <= 45).length + penaltyMins.filter(p => p.team === 'away' && p.isGoal && p.minute <= 45).length;

  const finalEvents: SimEvent[] = [];
  const maxCapacity = stadiumCapacity || 5000;

  // ── PUBLIC NO ESTÁDIO: torcida do mandante (85%) + visitante (até 5% / 10% capacidade)
  const homePart = Math.floor((homeFans || 0) * 0.85);
  const awayPart = Math.min(Math.floor((awayFans || 0) * 0.05), Math.floor(maxCapacity * 0.10));
  const baseAttendance = homePart + awayPart;
  const strengthMultiplier = 0.85 + (homeStrength / 200);
  const estimatedCrowd = Math.min(maxCapacity, Math.floor(baseAttendance * strengthMultiplier));
  const ticketRevenue = Math.floor(estimatedCrowd * 25); // R$ 25 médio por ingresso

  finalEvents.push({
    minute: 0, type: 'kickoff', team: 'neutral', animType: 'kickoff', ballX: 0.5, ballY: 0.5,
    description: `🏟️ A partida começa no ${stadiumName}! 👥 Público: ${estimatedCrowd.toLocaleString('pt-BR')} (🏠 ${homePart.toLocaleString('pt-BR')} mandante · 🛫 ${awayPart.toLocaleString('pt-BR')} visitante) — ${homeTeam} x ${awayTeam} • ${competition}!`,
    momentPhase: 'equilíbrio',
  });

  finalEvents.push({
    minute: 1, type: 'attendance', team: 'neutral', animType: 'pass', ballX: 0.5, ballY: 0.5,
    description: `💰 Renda de bilheteria estimada: R$ ${ticketRevenue.toLocaleString('pt-BR')} (${estimatedCrowd.toLocaleString('pt-BR')} pagantes).`,
  });


  for (const ev of allPlanned.filter(e => e.minute <= 44)) finalEvents.push(ev);

  finalEvents.push({
    minute: 45, type: 'added_time', team: 'neutral', animType: 'halftime',
    description: `⏱️ +${addedTime1} minutos de acréscimo no 1º tempo!`,
  });
  finalEvents.push({
    minute: halftimeMin, type: 'halftime', team: 'neutral', animType: 'halftime',
    description: `⏸️ INTERVALO! ${homeTeam} ${ht_h} x ${ht_a} ${awayTeam}.`,
  });

  for (const ev of allPlanned.filter(e => e.minute >= 47)) finalEvents.push(ev);

  const addedTime2 = 1 + Math.floor(rng() * 5);
  const finalHomeGoals = totalHomeGoals + penaltyHomeGoals;
  const finalAwayGoals = totalAwayGoals + penaltyAwayGoals;

  finalEvents.push({
    minute: 90, type: 'added_time', team: 'neutral', animType: 'halftime',
    description: `⏱️ +${addedTime2} minutos de acréscimo no 2º tempo!`,
  });
  finalEvents.push({
    minute: 90 + addedTime2, type: 'final_whistle', team: 'neutral', animType: 'final',
    description: `🏁 APITO FINAL! ${homeTeam} ${finalHomeGoals} x ${finalAwayGoals} ${awayTeam}!`,
  });

  // Possession stats
  const effectiveHome = homeStrength * homeAdv * moraleMod;
  const possStyle = playStyle === 'posse' ? 1.15 : playStyle === 'contra-ataque' ? 0.85 : 1.0;
  const possRatio = (effectiveHome * possStyle) / (effectiveHome * possStyle + awayStrength);
  stats.possession = [Math.round(possRatio * 100), 100 - Math.round(possRatio * 100)];

  // Player ratings
  const playerRatings: Record<string, number> = {};
  allPlayers.filter(p => p.team === 'home').forEach(p => {
    playerRatings[p.id] = Math.round(p.rating * 10) / 10;
  });

  const goalScorers: { name: string; minute: number; team: 'home' | 'away'; assist?: string }[] = [];
  finalEvents.filter(e => e.isGoal).forEach(e => {
    if (e.playerName) goalScorers.push({ name: e.playerName, minute: e.minute, team: e.team as 'home' | 'away', assist: e.assistName });
  });

  const homePlayers_sorted = allPlayers.filter(p => p.team === 'home').sort((a, b) => b.rating - a.rating);
  const manOfTheMatch = homePlayers_sorted.length > 0 ? homePlayers_sorted[0].name : undefined;

  const reportResult = generateReport(
    homeTeam, awayTeam, finalHomeGoals, finalAwayGoals,
    stats, playerRatings, goalScorers, manOfTheMatch,
    isHome, competition, homeStrength, awayStrength, tactics,
    stadiumCapacity, [...home, ...away], [...home, ...away]
  );

  console.log(`[Sim] Final: ${finalHomeGoals}x${finalAwayGoals} | Events: ${finalEvents.length}`);
  return {
    events: finalEvents, homeGoals: finalHomeGoals, awayGoals: finalAwayGoals,
    stats, playerRatings, goalScorers, manOfTheMatch,
    reportData: reportResult.report,
    result: reportResult.result,
    rankingChange: reportResult.rankingChange,
  };
}

// ── DENO SERVE ──────────────────────────────────────────────

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
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const { homeTeam, awayTeam, homePlayers, homeStrength, awayStrength, matchId, tactics, stadiumName, stadiumCapacity, isHome, competition, tournamentMatchId, fans, awayFans, staff } = body;
// ... keep existing code (validations until simulateFullMatch call)

    if (!homeTeam || !awayTeam || !matchId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (typeof homeTeam !== 'string' || homeTeam.length > 100 || typeof awayTeam !== 'string' || awayTeam.length > 100) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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
      return new Response(JSON.stringify({ error: 'Match already active', matchDbId: existing.id }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Simulate match
    const result = simulateFullMatch(
      homeTeam, awayTeam, homePlayers || [],
      validatedHomeStrength, validatedAwayStrength,
      tactics || {}, stadiumName || 'Estádio', isHome !== false,
      competition || 'Amistoso', stadiumCapacity || 5000, fans || 500,
      staff
    );

    const durationSeconds = 720; // 12 minutes real time

    // Insert into live_matches
    const { data: matchRow, error: insertError } = await adminClient
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
        competition: competition || 'Amistoso',
        duration_seconds: durationSeconds,
        events: result.events as any,
        home_goals: result.homeGoals,
        away_goals: result.awayGoals,
        stats: result.stats as any,
        home_players: (homePlayers || []) as any,
        player_ratings: result.playerRatings as any,
        tactics: (tactics || {}) as any,
        status: 'live',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[Match] Insert error:', insertError.message);
      return new Response(JSON.stringify({ error: 'Failed to create match' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Insert match history
    await adminClient.from('match_history').insert({
      user_id: userId,
      live_match_id: matchRow.id,
      home_team: homeTeam,
      away_team: awayTeam,
      home_goals: result.homeGoals,
      away_goals: result.awayGoals,
      is_home: isHome !== false,
      competition: competition || 'Amistoso',
      stadium_name: stadiumName || 'Estádio',
      stadium_capacity: stadiumCapacity || 5000,
      events: result.events as any,
      stats: result.stats as any,
      player_ratings: result.playerRatings as any,
      home_players: (homePlayers || []) as any,
      goal_scorers: result.goalScorers as any,
      man_of_the_match: result.manOfTheMatch,
      match_type: competition === 'Amistoso' ? 'friendly' : 'competitive',
    });

    // Insert match report
    await adminClient.from('match_reports').insert({
      user_id: userId,
      home_team: homeTeam,
      away_team: awayTeam,
      home_goals: result.homeGoals,
      away_goals: result.awayGoals,
      competition: competition || 'Amistoso',
      result: result.result,
      ranking_impact: result.rankingChange,
      report_data: result.reportData as any,
    });

    // Update tournament match if applicable
    if (tournamentMatchId) {
      await adminClient.from('custom_tournament_matches')
        .update({
          home_goals: result.homeGoals,
          away_goals: result.awayGoals,
          status: 'played',
          played_at: new Date().toISOString(),
          match_data: {
            events: result.events,
            stats: result.stats,
            playerRatings: result.playerRatings,
            goalScorers: result.goalScorers,
            manOfTheMatch: result.manOfTheMatch,
          } as any,
        })
        .eq('id', tournamentMatchId);
    }

    return new Response(JSON.stringify({
      success: true, matchDbId: matchRow.id,
      homeGoals: result.homeGoals, awayGoals: result.awayGoals,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[Match] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
