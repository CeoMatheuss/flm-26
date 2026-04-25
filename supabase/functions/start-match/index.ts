import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

// ── Deterministic PRNG (seeded per request from matchId) ────────
// IMPORTANT: rng() must be deterministic so that any client invoking start-match
// with the same matchId produces the SAME events, score and stats. Otherwise
// the two players in the same online match see divergent results.
function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
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
// Default to Math.random until a request seeds it. Each Deno.serve handler
// MUST call seedRng(matchId) before invoking simulateFullMatch.
let _rng: () => number = () => Math.random();
function seedRng(matchId: string) {
  _rng = makeMulberry32(hashString(String(matchId)));
}
function rng() { return _rng(); }
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
  homePlayers: SimPlayer[], awayPlayers: SimPlayer[],
  attendanceOverride?: number, ticketRevenueOverride?: number
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

  // Use público autoritativo da partida quando disponível; nunca random aqui.
  const attendance = typeof attendanceOverride === 'number'
    ? attendanceOverride
    : Math.floor(stadiumCapacity * 0.6);
  const ticketRevenue = typeof ticketRevenueOverride === 'number'
    ? ticketRevenueOverride
    : attendance * 25;
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

// ── PLAY STYLE MODIFIERS ─────────────────────────────────────
interface StyleMod {
  atk: number;       // multiplier on offensive expected
  def: number;       // multiplier on defensive solidity (HIGHER def = LESS goals conceded)
  pressureExtra: number; // adds to pressing baseline
  staminaDrain: number;  // multiplies stamina drain
  // attribute bonuses applied per-player on home side
  attrBoost?: Partial<Record<string, number>>;
}

const STYLE_MODS: Record<string, StyleMod> = {
  'ofensivo':       { atk: 1.20, def: 0.85, pressureExtra: 0.10, staminaDrain: 1.10, attrBoost: { shooting: 5 } },
  'equilibrado':    { atk: 1.00, def: 1.00, pressureExtra: 0.00, staminaDrain: 1.00 },
  'defensivo':      { atk: 0.85, def: 1.20, pressureExtra: -0.10, staminaDrain: 0.95, attrBoost: { marking: 5 } },
  'contra-ataque':  { atk: 1.05, def: 1.10, pressureExtra: -0.10, staminaDrain: 0.95, attrBoost: { speed: 8 } },
  'posse':          { atk: 0.90, def: 1.05, pressureExtra: 0.00, staminaDrain: 0.95, attrBoost: { passing: 5 } },
  'tiki-taka':      { atk: 0.95, def: 1.10, pressureExtra: 0.15, staminaDrain: 1.05, attrBoost: { passing: 10, vision: 5 } },
  'gegenpressing':  { atk: 1.15, def: 0.90, pressureExtra: 0.30, staminaDrain: 1.20, attrBoost: { aggression: 8, workRate: 5 } },
  'parking-bus':    { atk: 0.75, def: 1.35, pressureExtra: -0.25, staminaDrain: 0.90, attrBoost: { defending: 10, marking: 8 } },
  'long-ball':      { atk: 1.10, def: 0.95, pressureExtra: -0.05, staminaDrain: 0.95, attrBoost: { physical: 5, longShots: 8 } },
  // NOVOS estilos pedidos
  'retranca-total': { atk: 0.65, def: 1.45, pressureExtra: -0.30, staminaDrain: 0.85, attrBoost: { defending: 12, marking: 10, positioning: 6 } },
  'pressao-alta':   { atk: 1.15, def: 0.90, pressureExtra: 0.30, staminaDrain: 1.20, attrBoost: { aggression: 8, workRate: 5 } },
};

// ── MATCHUP MATRIX ──────────────────────────────────────────
// Ajusta atk/def do mandante baseado no estilo do adversário.
// Resultado é simétrico (aplicado também ao away invertendo home/away).
type Matchup = { homeAtk: number; homeDef: number };
const MATCHUP_BONUS: Record<string, Record<string, Matchup>> = {
  'ofensivo': {
    'contra-ataque':  { homeAtk: 1.05, homeDef: 0.85 }, // jogo aberto, ambos marcam
    'retranca-total': { homeAtk: 0.85, homeDef: 1.05 }, // muro segura
    'parking-bus':    { homeAtk: 0.80, homeDef: 1.05 },
    'defensivo':      { homeAtk: 0.95, homeDef: 1.00 },
    'pressao-alta':   { homeAtk: 1.05, homeDef: 0.90 }, // troca de socos
  },
  'contra-ataque': {
    'ofensivo':       { homeAtk: 1.10, homeDef: 0.95 }, // contra-ataque pune
    'posse':          { homeAtk: 1.05, homeDef: 1.00 },
    'tiki-taka':      { homeAtk: 1.05, homeDef: 1.00 },
    'pressao-alta':   { homeAtk: 1.05, homeDef: 0.95 },
  },
  'retranca-total': {
    'ofensivo':       { homeAtk: 0.85, homeDef: 1.20 }, // segura ataque
    'pressao-alta':   { homeAtk: 0.80, homeDef: 1.10 },
    'tiki-taka':      { homeAtk: 0.85, homeDef: 1.15 },
    'long-ball':      { homeAtk: 0.90, homeDef: 0.95 }, // bola longa fura retranca
  },
  'pressao-alta': {
    'posse':          { homeAtk: 1.15, homeDef: 0.95 }, // press funciona contra posse
    'tiki-taka':      { homeAtk: 1.10, homeDef: 0.95 },
    'contra-ataque':  { homeAtk: 0.95, homeDef: 0.90 }, // contra-ataque explora
    'long-ball':      { homeAtk: 0.90, homeDef: 0.95 },
  },
  'defensivo': {
    'contra-ataque':  { homeAtk: 0.85, homeDef: 1.10 }, // jogo travado
    'ofensivo':       { homeAtk: 0.90, homeDef: 1.10 },
  },
  'posse': {
    'pressao-alta':   { homeAtk: 0.85, homeDef: 1.00 }, // sofre com pressão
    'gegenpressing':  { homeAtk: 0.85, homeDef: 1.00 },
    'retranca-total': { homeAtk: 0.95, homeDef: 1.00 },
  },
  'tiki-taka': {
    'pressao-alta':   { homeAtk: 0.85, homeDef: 0.95 },
    'retranca-total': { homeAtk: 0.85, homeDef: 1.00 },
  },
  'long-ball': {
    'retranca-total': { homeAtk: 1.10, homeDef: 1.00 }, // chuvinha funciona
    'pressao-alta':   { homeAtk: 1.05, homeDef: 0.95 },
  },
};

function getMatchup(myStyle: string, oppStyle: string): Matchup {
  return MATCHUP_BONUS[myStyle]?.[oppStyle] || { homeAtk: 1.0, homeDef: 1.0 };
}

function getStyleMod(style: string): StyleMod {
  return STYLE_MODS[style] || STYLE_MODS['equilibrado'];
}

// ── MAIN SIMULATION ──────────────────────────────────────────

function simulateFullMatch(
  homeTeam: string, awayTeam: string, homePlayers: any[],
  homeStrength: number, awayStrength: number, tactics: any,
  stadiumName: string, isHome: boolean, competition: string,
  stadiumCapacity: number = 5000, homeFans: number = 500,
  staffData?: any, awayFans: number = 500,
  tieBreakerMode: 'none' | 'extra_time' | 'penalties' | 'both' = 'none',
  awayPlayersInput?: any[],
  awayTacticsInput?: any
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
  // Use REAL away players when provided (multiplayer/tournaments)
  const useRealAway = Array.isArray(awayPlayersInput) && awayPlayersInput.length >= 11;
  const away: SimPlayer[] = useRealAway
    ? awayPlayersInput!.slice(0, 11).map((p: any, i: number) => ({
        id: p.id || `a${i}`, name: (p.name || '').split(' ').pop() || p.name || `Jog${i}`,
        position: p.position || 'MEI', team: 'away' as const, ovr: p.overall || 60,
        rating: 6.0, goals: 0, assists: 0, yellowCards: 0, isOnPitch: true, injured: false,
        stamina: p.stamina || 80, baseStamina: p.stamina || 80, morale: p.morale || 70,
        speed: p.attributes?.speed || 50, shooting: p.attributes?.shooting || 50,
        passing: p.attributes?.passing || 50, defending: p.attributes?.defending || 50,
        physical: p.attributes?.physical || 50, dribbling: p.attributes?.dribbling || 50,
        heading: p.attributes?.heading || 50, marking: p.attributes?.marking || 50,
        vision: p.attributes?.vision || 50, crossing: p.attributes?.crossing || 50,
        longShots: p.attributes?.longShots || 50, workRate: p.attributes?.workRate || 50,
        composure: p.attributes?.composure || 50, aggression: p.attributes?.aggression || 50,
        goalkeeping: p.attributes?.goalkeeping || (p.position === 'GOL' ? 60 : 0),
        setPieces: p.attributes?.setPieces || 50, positioning: p.attributes?.positioning || 50,
        personality: p.personality || 'introvertido',
      }))
    : Array.from({ length: 11 }, (_, i) => {
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

  // Away tactics (from input or defaults)
  const awayPressing = awayTacticsInput?.pressing || 'medio';
  const awayPlayStyle = awayTacticsInput?.playStyle || 'equilibrado';
  const awayTempo = awayTacticsInput?.tempo || 'normal';

  // Apply attribute boosts from style to home and away
  const homeStyleMod = getStyleMod(playStyle);
  const awayStyleMod = getStyleMod(awayPlayStyle);
  if (homeStyleMod.attrBoost) {
    for (const p of home) {
      for (const [attr, bonus] of Object.entries(homeStyleMod.attrBoost)) {
        (p as any)[attr] = Math.min(99, ((p as any)[attr] || 50) + (bonus as number));
      }
    }
  }
  if (awayStyleMod.attrBoost) {
    for (const p of away) {
      for (const [attr, bonus] of Object.entries(awayStyleMod.attrBoost)) {
        (p as any)[attr] = Math.min(99, ((p as any)[attr] || 50) + (bonus as number));
      }
    }
  }

  const homeAdv = isHome ? 1.10 : 0.95;
  const avgMorale = home.reduce((s, p) => s + p.morale, 0) / Math.max(1, home.length);
  const moraleMod = 0.85 + (avgMorale / 100) * 0.3;
  const avgStamina = home.reduce((s, p) => s + p.stamina, 0) / 11;
  const fatigueMod = 0.8 + (avgStamina / 100) * 0.2;
  
  // Tactical impact on simulation (HOME) — uses style table
  const pressingBase = pressing === 'ultra-alto' ? 1.5 : pressing === 'alto' ? 1.25 : pressing === 'medio' ? 1.0 : 0.8;
  const pressingMod = clamp(pressingBase + homeStyleMod.pressureExtra, 0.5, 2.0);
  const offensiveMod = homeStyleMod.atk;
  const defensiveMod = homeStyleMod.def;
  const tempoMod = tempo === 'muito-rapido' ? 1.15 : tempo === 'rapido' ? 1.08 : tempo === 'normal' ? 1.0 : 0.9;

  // Away tactical mods
  const awayPressingBase = awayPressing === 'ultra-alto' ? 1.5 : awayPressing === 'alto' ? 1.25 : awayPressing === 'medio' ? 1.0 : 0.8;
  const awayPressingMod = clamp(awayPressingBase + awayStyleMod.pressureExtra, 0.5, 2.0);
  const awayOffensiveMod = awayStyleMod.atk;
  const awayDefensiveMod = awayStyleMod.def;
  const awayTempoMod = awayTempo === 'muito-rapido' ? 1.15 : awayTempo === 'rapido' ? 1.08 : awayTempo === 'normal' ? 1.0 : 0.9;

  // Stamina drain modifiers for pressing/tempo (multiplied by style drain)
  const staminaDrainPressing = (pressing === 'ultra-alto' ? 1.5 : pressing === 'alto' ? 1.25 : pressing === 'medio' ? 1.0 : 0.8) * homeStyleMod.staminaDrain;
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

  // ── MATCHUP MULTIPLIERS ──────────────────────────────────────
  // Cada lado é avaliado de acordo com como seu estilo se sai contra o do outro.
  const homeMatchup = getMatchup(playStyle, awayPlayStyle);
  const awayMatchup = getMatchup(awayPlayStyle, playStyle);
  console.log(`[Matchup] Home(${playStyle}) vs Away(${awayPlayStyle}) | homeAtk×${homeMatchup.homeAtk} homeDef×${homeMatchup.homeDef} | awayAtk×${awayMatchup.homeAtk} awayDef×${awayMatchup.homeDef}`);

  // Home expected goals: home offense vs away defense (style mod + matchup)
  const homeExpected = clamp(
    ((1.1 + (strengthDiff / 100) * 1.5 * offensiveMod * tempoMod + (homeAttackVsDefense - 1) * 0.6) * homeMatchup.homeAtk) /
    Math.max(0.7, awayDefensiveMod * 0.85 * awayMatchup.homeDef + 0.15),
    0.2, 3.0
  );
  // Away expected goals: away offense vs home defense (style mod + matchup)
  const awayExpected = clamp(
    ((1.1 - (strengthDiff / 100) * 1.2 + (awayAttackVsDefense - 1) * 0.6 * awayOffensiveMod * awayTempoMod) * awayMatchup.homeAtk) /
    Math.max(0.7, defensiveMod * 0.85 * homeMatchup.homeDef + 0.15),
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
    const p3 = pool.filter(p => p.name !== p1 && p.name !== p2).length > 0 ? pick(pool.filter(p => p.name !== p1 && p.name !== p2)).name : p2;
    const p4 = pool.filter(p => ![p1, p2, p3].includes(p.name)).length > 0 ? pick(pool.filter(p => ![p1, p2, p3].includes(p.name))).name : p3;
    const buildups = [
      `${p1} sai jogando da defesa do ${tName}… aciona ${p2} no meio-campo… ${p2} gira sob marcação e lança ${p3} pela ponta… ${p3} acelera, dribla a marcação e cruza rasteiro para ${p4} concluir`,
      `${p1} recebe na intermediária… troca curta com ${p2}… ${p2} devolve de primeira… ${p1} avança com bola dominada e enfia para ${p3} entre os zagueiros… ${p3} bate firme`,
      `${p1} desarma no meio-campo… inicia transição rápida… toque para ${p2}… ${p2} carrega e lança em profundidade para ${p3}… ${p3} domina no peito e finaliza`,
      `${p1} pressiona alto e recupera a bola… aciona ${p2} no corredor central… tabela com ${p3}… ${p3} devolve, ${p2} avança livre e bate cruzado`,
      `${p1} arma a jogada do ${tName} pela direita… troca passe com ${p2}… ${p2} inverte longo para ${p3} aberto na esquerda… ${p3} corta para o meio e cruza rasteiro… ${p4} aparece de surpresa`,
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
      corner_danger: `🚩 Escanteio perigoso para o ${tName}! ${p2Name} cobra fechado na área… ${pName} sobe mais alto que ${defName} no primeiro pau… cabeceia firme em direção ao gol… a bola raspa a trave e sai pela linha de fundo! Quase!`,
      offside_trap: `⛳ Impedimento! ${pName} do ${tName} partiu antes da hora e o bandeirinha marcou posição irregular. Lance anulado por centímetros!`,
      long_shot_miss: `💨 ${pName} puxa para o pé direito e arrisca de longa distância! A bola sobe um pouco acima do travessão. Boa tentativa do ${tName}!`,
      header_miss: `👤 ${pName} cabeceia após cruzamento de ${p2Name}, mas a bola passa por cima do gol! Chance desperdiçada pelo ${tName}! O jogador leva as mãos à cabeça!`,
      counter_attack: `🏃💨 CONTRA-ATAQUE FULMINANTE DO ${tName}! ${pName} rouba a bola no campo de defesa… toca rápido para ${p2Name}… ${p2Name} carrega em velocidade pelo meio… deixa um zagueiro pra trás… aciona ${pName} de novo na entrada da área… ${pName} bate forte mas ${gkName} se estica e defende! Que jogada construída!`,
      buildup_play: `⚙️ Bela construção do ${tName}! ${p2Name} sai jogando da defesa… troca passe curto com ${pName}… ${pName} devolve de primeira… ${p2Name} avança com a bola dominada… abre na ponta para ${pName}… ${pName} corta para o meio, dribla ${defName} e cruza rasteiro… mas a defesa adversária afasta no último segundo!`,
      free_kick_near: `🎯 Falta perigosa para o ${tName}! ${p2Name} posiciona a bola… aguarda a barreira… cobra colocado por cima da barreira… a bola tem efeito e busca o ângulo… ${gkName} voa e espalma para escanteio! Quase um golaço de falta!`,
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

  // ── TIE BREAKER (extra time / penalty shootout) ──
  let extraHomeGoals = 0;
  let extraAwayGoals = 0;
  let shootoutHomeGoals = 0;
  let shootoutAwayGoals = 0;

  const isDraw = (finalHomeGoals + extraHomeGoals) === (finalAwayGoals + extraAwayGoals);
  const wantsExtraTime = tieBreakerMode === 'extra_time' || tieBreakerMode === 'both';
  const wantsPenalties = tieBreakerMode === 'penalties' || tieBreakerMode === 'both';

  if (isDraw && (wantsExtraTime || wantsPenalties)) {
    let regulationEndMin = 90 + addedTime2;

    if (wantsExtraTime) {
      finalEvents.push({
        minute: regulationEndMin, type: 'extra_time_start', team: 'neutral', animType: 'kickoff',
        description: `⏱️ ${finalHomeGoals + extraHomeGoals} x ${finalAwayGoals + extraAwayGoals} no tempo regulamentar! Vamos para a PRORROGAÇÃO de 30 minutos!`,
      });

      // Simulate 30 mins of extra time — 2-3 chances per side, lower goal probability
      const balance = (homeStrength * homeAdv) / ((homeStrength * homeAdv) + awayStrength);
      const etChances = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < etChances; i++) {
        const min = regulationEndMin + 1 + Math.floor((i / etChances) * 28);
        const isHomeChance = rng() < balance;
        const team = isHomeChance ? 'home' : 'away';
        const teamPool = (isHomeChance ? home : away).filter(p => p.position !== 'GOL');
        const scorer = teamPool.length > 0 ? pick(teamPool) : null;
        const scoreProb = 0.28; // ~28% chance per shot
        if (rng() < scoreProb && scorer) {
          if (isHomeChance) extraHomeGoals++; else extraAwayGoals++;
          finalEvents.push({
            minute: min, type: 'extra_time_goal', team, animType: 'goal',
            playerName: scorer.name, isGoal: true,
            description: `⚽ GOOOOL DA PRORROGAÇÃO! ${scorer.name} (${isHomeChance ? homeTeam : awayTeam})!`,
          });
        } else {
          finalEvents.push({
            minute: min, type: 'extra_time_chance', team, animType: 'shot',
            playerName: scorer?.name,
            description: `⚡ Chance perigosa de ${scorer?.name || 'jogador'} na prorrogação — ${isHomeChance ? homeTeam : awayTeam}!`,
          });
        }
      }
      regulationEndMin += 30;
      finalEvents.push({
        minute: regulationEndMin, type: 'extra_time_end', team: 'neutral', animType: 'halftime',
        description: `⏸️ Fim da prorrogação: ${finalHomeGoals + extraHomeGoals} x ${finalAwayGoals + extraAwayGoals}.`,
      });
    }

    const stillDraw = (finalHomeGoals + extraHomeGoals) === (finalAwayGoals + extraAwayGoals);
    if (stillDraw && wantsPenalties) {
      finalEvents.push({
        minute: regulationEndMin, type: 'penalty_shootout_start', team: 'neutral', animType: 'kickoff',
        description: `🎯 DISPUTA DE PÊNALTIS! Quem terá o sangue frio?`,
      });

      const homeTakers = [...home].filter(p => p.position !== 'GOL').sort((a, b) => (b.shooting + (b.composure || 60)) - (a.shooting + (a.composure || 60))).slice(0, 5);
      const awayTakers = [...away].filter(p => p.position !== 'GOL').sort((a, b) => (b.shooting + (b.composure || 60)) - (a.shooting + (a.composure || 60))).slice(0, 5);
      const homeKeeper = home.find(p => p.position === 'GOL');
      const awayKeeper = away.find(p => p.position === 'GOL');

      let kickMinute = regulationEndMin;
      for (let round = 0; round < 5; round++) {
        // Home kicks
        const hT = homeTakers[round];
        if (hT) {
          kickMinute += 1;
          const baseProb = 0.78;
          const skillBoost = (hT.shooting + (hT.composure || 60) + (hT.setPieces || 60)) / 300 * 0.15;
          const gkSave = (awayKeeper?.goalkeeping || 60) / 100 * 0.10;
          const scored = rng() < (baseProb + skillBoost - gkSave);
          if (scored) shootoutHomeGoals++;
          finalEvents.push({
            minute: kickMinute, type: 'penalty_shootout', team: 'home', animType: 'penalty',
            playerName: hT.name, isGoal: scored,
            description: scored
              ? `✅ ${hT.name} converte! ${homeTeam} ${shootoutHomeGoals} x ${shootoutAwayGoals} ${awayTeam} (${round + 1}ª série)`
              : `❌ ${awayKeeper?.name || 'Goleiro'} pega! ${hT.name} desperdiça (${round + 1}ª série)`,
          });
        }
        // Away kicks
        const aT = awayTakers[round];
        if (aT) {
          kickMinute += 1;
          const baseProb = 0.78;
          const skillBoost = (aT.shooting + (aT.composure || 60) + (aT.setPieces || 60)) / 300 * 0.15;
          const gkSave = (homeKeeper?.goalkeeping || 60) / 100 * 0.10;
          const scored = rng() < (baseProb + skillBoost - gkSave);
          if (scored) shootoutAwayGoals++;
          finalEvents.push({
            minute: kickMinute, type: 'penalty_shootout', team: 'away', animType: 'penalty',
            playerName: aT.name, isGoal: scored,
            description: scored
              ? `✅ ${aT.name} converte! ${homeTeam} ${shootoutHomeGoals} x ${shootoutAwayGoals} ${awayTeam} (${round + 1}ª série)`
              : `❌ ${homeKeeper?.name || 'Goleiro'} pega! ${aT.name} desperdiça (${round + 1}ª série)`,
          });
        }
        // Sudden death after 5 rounds if tied
        if (round === 4 && shootoutHomeGoals === shootoutAwayGoals) {
          // Sudden death: 5 more attempts max
          for (let sd = 0; sd < 5; sd++) {
            const hSudden = homeTakers[(5 + sd) % homeTakers.length];
            const aSudden = awayTakers[(5 + sd) % awayTakers.length];
            kickMinute += 1;
            const hScored = rng() < 0.75;
            if (hScored) shootoutHomeGoals++;
            finalEvents.push({
              minute: kickMinute, type: 'penalty_shootout', team: 'home', animType: 'penalty',
              playerName: hSudden?.name, isGoal: hScored,
              description: `${hScored ? '✅' : '❌'} Morte súbita: ${hSudden?.name || 'Jogador'} - ${shootoutHomeGoals} x ${shootoutAwayGoals}`,
            });
            kickMinute += 1;
            const aScored = rng() < 0.75;
            if (aScored) shootoutAwayGoals++;
            finalEvents.push({
              minute: kickMinute, type: 'penalty_shootout', team: 'away', animType: 'penalty',
              playerName: aSudden?.name, isGoal: aScored,
              description: `${aScored ? '✅' : '❌'} Morte súbita: ${aSudden?.name || 'Jogador'} - ${shootoutHomeGoals} x ${shootoutAwayGoals}`,
            });
            if (shootoutHomeGoals !== shootoutAwayGoals) break;
          }
          // If still tied after sudden death — coin flip
          if (shootoutHomeGoals === shootoutAwayGoals) {
            if (rng() < 0.5) shootoutHomeGoals++; else shootoutAwayGoals++;
          }
        }
      }
      regulationEndMin = kickMinute;
    }

    finalEvents.push({
      minute: regulationEndMin + 1, type: 'final_whistle', team: 'neutral', animType: 'final',
      description: `🏁 FIM! ${homeTeam} ${finalHomeGoals + extraHomeGoals} x ${finalAwayGoals + extraAwayGoals} ${awayTeam}` +
        (shootoutHomeGoals + shootoutAwayGoals > 0
          ? ` (${shootoutHomeGoals} x ${shootoutAwayGoals} pênaltis — ${shootoutHomeGoals > shootoutAwayGoals ? homeTeam : awayTeam} avança!)`
          : `!`),
    });
  } else {
    finalEvents.push({
      minute: 90 + addedTime2, type: 'final_whistle', team: 'neutral', animType: 'final',
      description: `🏁 APITO FINAL! ${homeTeam} ${finalHomeGoals} x ${finalAwayGoals} ${awayTeam}!`,
    });
  }

  // Update final tally with extra time goals (penalties stay separate for display)
  const aggregateHomeGoals = finalHomeGoals + extraHomeGoals;
  const aggregateAwayGoals = finalAwayGoals + extraAwayGoals;

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
    homeTeam, awayTeam, aggregateHomeGoals, aggregateAwayGoals,
    stats, playerRatings, goalScorers, manOfTheMatch,
    isHome, competition, homeStrength, awayStrength, tactics,
    stadiumCapacity, [...home, ...away], [...home, ...away],
    estimatedCrowd, ticketRevenue
  );

  console.log(`[Sim] Final: ${aggregateHomeGoals}x${aggregateAwayGoals} (Pen: ${shootoutHomeGoals}x${shootoutAwayGoals}) | Events: ${finalEvents.length}`);
  return {
    events: finalEvents,
    homeGoals: aggregateHomeGoals,
    awayGoals: aggregateAwayGoals,
    penaltyHomeGoals: shootoutHomeGoals,
    penaltyAwayGoals: shootoutAwayGoals,
    stats, playerRatings, goalScorers, manOfTheMatch,
    reportData: reportResult.report,
    result: reportResult.result,
    rankingChange: reportResult.rankingChange,
    attendance: estimatedCrowd,
    ticketRevenue,
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
    const { homeTeam, awayTeam, homePlayers, homeStrength, awayStrength, matchId, tactics, stadiumName, stadiumCapacity, isHome, competition, tournamentMatchId, fans, awayFans, staff, tieBreaker, awayPlayers, awayTactics } = body;
    const validTieBreaker: 'none' | 'extra_time' | 'penalties' | 'both' =
      ['none', 'extra_time', 'penalties', 'both'].includes(tieBreaker) ? tieBreaker : 'none';


    if (!homeTeam || !awayTeam || !matchId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (typeof homeTeam !== 'string' || homeTeam.length > 100 || typeof awayTeam !== 'string' || awayTeam.length > 100) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!Array.isArray(homePlayers) || homePlayers.length === 0) {
      return new Response(JSON.stringify({ error: 'No home players provided. Selecione ao menos 1 jogador titular.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const validatedHomeStrength = clamp(Number(homeStrength) || 60, 20, 99);
    const validatedAwayStrength = clamp(Number(awayStrength) || 60, 20, 99);

    const adminClient = createClient(supabaseUrl, serviceKey);

    // 1. CENTRAL SIMULATION: dedupe by shared_match_id.
    //    If a row already exists for this matchId, both clients must read THAT
    //    same row — never re-simulate. This is what guarantees Time 1 and Time 2
    //    see the same placar, eventos, estatísticas E PÚBLICO.
    const { data: shared } = await adminClient
      .from('live_matches')
      .select('id, status')
      .eq('shared_match_id', String(matchId))
      .neq('status', 'superseded')
      .maybeSingle();

    if (shared) {
      console.info('[start-match] Reusing shared simulation', { matchId, matchDbId: shared.id });
      return new Response(
        JSON.stringify({ success: true, matchDbId: shared.id, alreadySimulated: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Seed PRNG from matchId BEFORE any rng() call so the simulation is
    //    deterministic per match. Two parallel callers produce identical output.
    seedRng(String(matchId));

    // 2.5 STADIUM AUTHORITATIVE RESOLUTION
    // O público/capacidade NUNCA pode vir do cliente sem validação — senão o
    // mandante e o visitante enviam números diferentes e o primeiro a chegar
    // vence, causando o bug de "Time A vê 10k, Time B vê 1k".
    // Aqui resolvemos o mandante real pelo matchId e usamos o stadium info
    // dele do banco. Para amistosos sem matchId resolvível, caímos no fallback.
    let resolvedHomeFans = Number(fans) || 500;
    let resolvedAwayFans = Number(awayFans) || 500;
    let resolvedStadiumCapacity = Number(stadiumCapacity) || 5000;
    let resolvedStadiumName = stadiumName || 'Estádio';
    try {
      const { data: homeUserId } = await adminClient.rpc('resolve_home_user_for_match', { _match_id: String(matchId) });
      if (homeUserId) {
        // Buscar info de estádio do mandante real
        const { data: stadiumRows } = await adminClient.rpc('get_user_stadium_info', { _user_id: homeUserId });
        const stadium = Array.isArray(stadiumRows) ? stadiumRows[0] : stadiumRows;
        if (stadium) {
          resolvedStadiumName = stadium.stadium_name || resolvedStadiumName;
          // Capacidade base por nível: 5k base * (1 + nível*0.4), igual ao client (aproximação segura)
          const lvl = Number(stadium.stadium_level) || 1;
          resolvedStadiumCapacity = Math.max(5000, Math.floor(5000 * (1 + (lvl - 1) * 0.4)));
        }
        // Fans do mandante via game_saves
        const { data: homeSave } = await adminClient
          .from('game_saves')
          .select('club_data')
          .eq('user_id', homeUserId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const homeFansFromSave = (homeSave?.club_data as any)?.club?.fans
          ?? (homeSave?.club_data as any)?.fans;
        if (typeof homeFansFromSave === 'number' && homeFansFromSave > 0) {
          resolvedHomeFans = homeFansFromSave;
        }
        console.info('[Stadium] Authoritative resolution', {
          matchId, homeUserId, capacity: resolvedStadiumCapacity, fans: resolvedHomeFans,
        });
      } else {
        console.info('[Stadium] No home user resolved (likely friendly/admin) — using client values', { matchId });
      }
    } catch (e) {
      console.warn('[Stadium] Resolution failed, falling back to client data', e);
    }

    // Simulate match (com dados de estádio AUTORITATIVOS)
    const result = simulateFullMatch(
      homeTeam, awayTeam, homePlayers || [],
      validatedHomeStrength, validatedAwayStrength,
      tactics || {}, resolvedStadiumName, isHome !== false,
      competition || 'Amistoso', resolvedStadiumCapacity, resolvedHomeFans,
      staff, resolvedAwayFans, validTieBreaker,
      Array.isArray(awayPlayers) ? awayPlayers : undefined,
      awayTactics || undefined
    );

    // Fallback: ensure minimum events so UI never hangs
    if (!Array.isArray(result.events) || result.events.length === 0) {
      console.warn('[Sim] Empty events generated — applying fallback');
      const fallbackHomeGoals = poissonSample(Math.max(0.3, validatedHomeStrength / 60));
      const fallbackAwayGoals = poissonSample(Math.max(0.3, validatedAwayStrength / 60));
      result.events = [
        { minute: 0, type: 'kickoff', team: 'neutral', description: '⚽ Início da partida!' },
        { minute: 45, type: 'halftime', team: 'neutral', description: '🟡 Fim do 1º tempo' },
        { minute: 90, type: 'final_whistle', team: 'neutral', description: '🏁 Fim de jogo!' },
      ] as any;
      result.homeGoals = fallbackHomeGoals;
      result.awayGoals = fallbackAwayGoals;
    }

    const durationSeconds = 720; // 12 minutes real time

    // Insert into live_matches with shared_match_id mirror so both clients converge.
    const insertPayload = {
      user_id: userId,
      match_id: matchId,
      shared_match_id: String(matchId),
      home_team: homeTeam,
      away_team: awayTeam,
      home_strength: validatedHomeStrength,
      away_strength: validatedAwayStrength,
      stadium_name: resolvedStadiumName,
      stadium_capacity: resolvedStadiumCapacity,
      attendance: result.attendance,
      ticket_revenue: result.ticketRevenue,
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
      roster_locked_at: new Date().toISOString(),
    };

    const { data: matchRow, error: insertError } = await adminClient
      .from('live_matches')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError) {
      // Race: another client (the opponent) inserted first. Return that row.
      const code = (insertError as any).code;
      const msg = String((insertError as any).message || '');
      if (code === '23505' || msg.includes('uniq_live_matches_shared_match_id') || msg.toLowerCase().includes('duplicate')) {
        const { data: winner } = await adminClient
          .from('live_matches')
          .select('id')
          .eq('shared_match_id', String(matchId))
          .neq('status', 'superseded')
          .maybeSingle();
        if (winner) {
          console.info('[start-match] Race resolved — using winner row', { matchId, matchDbId: winner.id });
          return new Response(
            JSON.stringify({ success: true, matchDbId: winner.id, alreadySimulated: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }
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
      stadium_name: resolvedStadiumName,
      stadium_capacity: resolvedStadiumCapacity,
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
