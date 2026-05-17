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
  if (stamina >= 80) return 1.0;
  if (stamina >= 65) return 0.92;
  if (stamina >= 50) return 0.82;
  if (stamina >= 35) return 0.68;
  if (stamina >= 20) return 0.52;
  return 0.35; // Penalidade Crítica
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

// Individual "form" multiplier (morale × stamina) used to scale action probabilities.
// Range ~0.55 (gassed + desmotivado) → ~1.10 (fresco + moral alta).
function formMult(p: SimPlayer | null | undefined): number {
  if (!p) return 1.0;
  return getStaminaMultiplier(p.stamina) * getMoraleMultiplier(p.morale);
}

// Team-level form (average of on-pitch players).
function teamFormMult(players: SimPlayer[]): number {
  const onPitch = players.filter(p => p.isOnPitch);
  if (onPitch.length === 0) return 1.0;
  const sum = onPitch.reduce((s, p) => s + formMult(p), 0);
  return sum / onPitch.length;
}

// ── POSITION-WEIGHTED ROLE MODEL ───────────────────────────
// Each position gets a weight per attribute for each "role" (action type).
// A ZAG playing as scorer barely contributes (low finishing weight); an ATA dominates.
type Role = 'finishing' | 'creation' | 'tackle' | 'aerial' | 'dribble' | 'pace' | 'gk_save' | 'set_piece';

// weights[position][role] = partial map of { attribute: weight }
const POSITION_ROLE_WEIGHTS: Record<string, Record<Role, Partial<Record<keyof SimPlayer, number>>>> = {
  ATA: {
    finishing: { shooting: 1.0, composure: 0.45, positioning: 0.35, longShots: 0.25, heading: 0.20 },
    creation:  { vision: 0.45, passing: 0.40, dribbling: 0.40, crossing: 0.20 },
    tackle:    { defending: 0.15, marking: 0.10, workRate: 0.20 },
    aerial:    { heading: 0.90, physical: 0.40, positioning: 0.30 },
    dribble:   { dribbling: 1.0, speed: 0.45, composure: 0.25 },
    pace:      { speed: 1.0, workRate: 0.35, physical: 0.25 },
    gk_save:   { goalkeeping: 0.05 },
    set_piece: { setPieces: 1.0, composure: 0.40, shooting: 0.30 },
  },
  MEI: {
    finishing: { shooting: 0.65, longShots: 0.45, composure: 0.35, positioning: 0.25 },
    creation:  { vision: 1.0, passing: 0.90, dribbling: 0.40, crossing: 0.30, composure: 0.25 },
    tackle:    { defending: 0.35, marking: 0.30, workRate: 0.40 },
    aerial:    { heading: 0.35, physical: 0.30 },
    dribble:   { dribbling: 0.85, speed: 0.40, vision: 0.30 },
    pace:      { speed: 0.75, workRate: 0.45 },
    gk_save:   { goalkeeping: 0.05 },
    set_piece: { setPieces: 0.95, vision: 0.45, composure: 0.40 },
  },
  VOL: {
    finishing: { shooting: 0.35, longShots: 0.40, composure: 0.25 },
    creation:  { passing: 0.70, vision: 0.55, workRate: 0.35 },
    tackle:    { defending: 0.90, marking: 0.80, physical: 0.45, workRate: 0.55, aggression: 0.30 },
    aerial:    { heading: 0.55, physical: 0.55, positioning: 0.30 },
    dribble:   { dribbling: 0.45, speed: 0.30 },
    pace:      { speed: 0.60, workRate: 0.55, physical: 0.35 },
    gk_save:   { goalkeeping: 0.05 },
    set_piece: { setPieces: 0.55, longShots: 0.40 },
  },
  LAT: {
    finishing: { shooting: 0.25, longShots: 0.20, positioning: 0.15 },
    creation:  { crossing: 0.85, passing: 0.50, vision: 0.35, dribbling: 0.40 },
    tackle:    { defending: 0.70, marking: 0.65, workRate: 0.50, positioning: 0.40 },
    aerial:    { heading: 0.40, physical: 0.35 },
    dribble:   { dribbling: 0.60, speed: 0.55 },
    pace:      { speed: 0.95, workRate: 0.55, physical: 0.30 },
    gk_save:   { goalkeeping: 0.05 },
    set_piece: { setPieces: 0.40, crossing: 0.50 },
  },
  ZAG: {
    finishing: { shooting: 0.20, heading: 0.55, positioning: 0.25 },
    creation:  { passing: 0.45, vision: 0.30 },
    tackle:    { defending: 1.0, marking: 0.95, heading: 0.50, physical: 0.65, positioning: 0.55, aggression: 0.35 },
    aerial:    { heading: 1.0, physical: 0.65, positioning: 0.45 },
    dribble:   { dribbling: 0.25, speed: 0.25 },
    pace:      { speed: 0.55, physical: 0.40 },
    gk_save:   { goalkeeping: 0.05 },
    set_piece: { setPieces: 0.30, heading: 0.45 },
  },
  GOL: {
    finishing: { shooting: 0.05 },
    creation:  { passing: 0.20, vision: 0.20 },
    tackle:    { positioning: 0.30, composure: 0.20 },
    aerial:    { goalkeeping: 0.50, heading: 0.30, positioning: 0.40 },
    dribble:   { dribbling: 0.10 },
    pace:      { speed: 0.20 },
    gk_save:   { goalkeeping: 1.0, positioning: 0.55, composure: 0.45, physical: 0.20 },
    set_piece: { setPieces: 0.10 },
  },
};

const DEFAULT_ROLE_WEIGHTS = POSITION_ROLE_WEIGHTS.MEI;

function rolePower(p: SimPlayer, role: Role): number {
  const weights = (POSITION_ROLE_WEIGHTS[p.position] || DEFAULT_ROLE_WEIGHTS)[role];
  let sum = 0; let totalW = 0;
  for (const [attr, w] of Object.entries(weights)) {
    sum += effectiveAttr(p, attr as keyof SimPlayer) * (w as number);
    totalW += (w as number);
  }
  return totalW > 0 ? sum / totalW : 50;
}

// Back-compat aliases used elsewhere in the file
function creationPower(p: SimPlayer): number { return rolePower(p, 'creation'); }
function tacklePower(p: SimPlayer): number { return rolePower(p, 'tackle'); }
function finishingPower(p: SimPlayer): number { return rolePower(p, 'finishing'); }
function transitionPower(p: SimPlayer): number { return rolePower(p, 'pace'); }
function headerPower(p: SimPlayer): number { return rolePower(p, 'aerial'); }
function dribblePower(p: SimPlayer): number { return rolePower(p, 'dribble'); }

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

// Pick a player weighted by their position-aware role power.
// Optional posFilter narrows the pool first (e.g. only ATAs for many goal events).
function pickByRole(pool: SimPlayer[], role: Role, posFilter?: string): SimPlayer | null {
  let filtered = pool.filter(p => p.isOnPitch && !p.injured);
  if (posFilter) { const f2 = filtered.filter(p => p.position === posFilter); if (f2.length > 0) filtered = f2; }
  if (filtered.length === 0) return null;
  // Cubic weighting amplifies attribute differences so top players dominate the role
  const weights = filtered.map(p => Math.max(1, Math.pow(rolePower(p, role), 2.2)));
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
    // Physical attribute reduces drain (0.5x at 100, 0.8x at 50)
    const physicalFactor = 1.1 - (p.physical / 100) * 0.4;
    const baseRate = 0.35 + rng() * 0.25;
    
    // Tactic multipliers (more severe)
    let drain = baseRate * physicalFactor * pressingMod * tempoMod;
    
    // Extra drain in the end of the match if already tired
    if (minute > 70 && p.stamina < 40) drain *= 1.25;
    
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

// ── EXTRA TACTICAL OPTIONS ───────────────────────────────────
// Aplica os campos marking / passingStyle / defenseLine / width / formation
// sobre os modificadores táticos. Tudo simétrico entre home e away.
interface TacticalExtras {
  atkMul: number;      // multiplica offensiveMod
  defMul: number;      // multiplica defensiveMod
  pressBonus: number;  // soma em pressingMod
  drainMul: number;    // multiplica desgaste de stamina
  foulBias: number;    // peso extra no sorteio de cartões/faltas
  penaltyBonus: number;// soma no penaltyChance
  offsideMul: number;  // multiplica chance de impedimento marcado a favor
  possessionBias: number; // soma na razão de posse (-0.1..+0.1)
  shortPassBoost: number; // boost em creationPower / passes
  longShotBoost: number;  // boost em finalizações de longe
  crossBoost: number;     // boost em jogadas aéreas/cruzamento
}

function getTacticalExtras(t: any): TacticalExtras {
  const marking = t?.marking || 'zona';
  const passing = t?.passingStyle || 'misto';
  const dline = t?.defenseLine || 'media';
  const width = t?.width || 'normal';
  const formation: string = t?.formation || '4-4-2';

  let atkMul = 1, defMul = 1, pressBonus = 0, drainMul = 1;
  let foulBias = 0, penaltyBonus = 0, offsideMul = 1, possessionBias = 0;
  let shortPassBoost = 0, longShotBoost = 0, crossBoost = 0;

  // Marcação
  if (marking === 'individual') {
    defMul *= 1.08; pressBonus += 0.10; drainMul *= 1.08;
    foulBias += 0.6; penaltyBonus += 0.025;
  } else if (marking === 'zona') {
    defMul *= 1.03;
  } else if (marking === 'mista') {
    defMul *= 1.05; pressBonus += 0.05;
  }

  // Linha defensiva
  if (dline === 'alta') {
    atkMul *= 1.05; defMul *= 0.92; pressBonus += 0.10;
    offsideMul *= 1.6; drainMul *= 1.05;
  } else if (dline === 'baixa') {
    atkMul *= 0.92; defMul *= 1.10; pressBonus -= 0.10;
    offsideMul *= 0.6; drainMul *= 0.95;
  }

  // Estilo de passe
  if (passing === 'curto') {
    possessionBias += 0.06; shortPassBoost += 0.10;
    atkMul *= 0.97; drainMul *= 0.97;
  } else if (passing === 'direto') {
    possessionBias -= 0.05; longShotBoost += 0.12; atkMul *= 1.05;
  } else if (passing === 'longo') {
    possessionBias -= 0.07; longShotBoost += 0.05; crossBoost += 0.15; atkMul *= 1.07;
    drainMul *= 1.02;
  }

  // Largura
  if (width === 'larga') {
    atkMul *= 1.04; defMul *= 0.97; crossBoost += 0.18;
  } else if (width === 'estreita') {
    atkMul *= 0.97; defMul *= 1.04; shortPassBoost += 0.06;
  }

  // Formação (impacto sutil — só viés)
  if (formation.startsWith('5-') || formation === '4-5-1') { defMul *= 1.05; atkMul *= 0.95; }
  else if (formation === '3-4-3' || formation === '4-3-3' || formation === '4-2-4') { atkMul *= 1.05; defMul *= 0.96; }
  else if (formation === '4-2-3-1' || formation === '4-3-2-1') { possessionBias += 0.03; }

  return { atkMul, defMul, pressBonus, drainMul, foulBias, penaltyBonus, offsideMul, possessionBias, shortPassBoost, longShotBoost, crossBoost };
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

  // Symmetric morale/fatigue mods for the AWAY side — without these only the home
  // team felt the effect of low motivation / tired squad on the goal model.
  const awayAvgMorale = away.reduce((s, p) => s + p.morale, 0) / Math.max(1, away.length);
  const awayMoraleMod = 0.85 + (awayAvgMorale / 100) * 0.3;
  const awayAvgStaminaInit = away.reduce((s, p) => s + p.stamina, 0) / 11;
  const awayFatigueMod = 0.8 + (awayAvgStaminaInit / 100) * 0.2;
  
  // Extras táticos (marking/passing/defenseLine/width/formation)
  const homeExtras = getTacticalExtras(tactics);
  const awayExtras = getTacticalExtras(awayTacticsInput);
  console.log(`[Tactics] HOME mark=${tactics?.marking||'zona'} pass=${tactics?.passingStyle||'misto'} line=${tactics?.defenseLine||'media'} width=${tactics?.width||'normal'} form=${tactics?.formation||'4-4-2'}`);
  console.log(`[Tactics] AWAY mark=${awayTacticsInput?.marking||'zona'} pass=${awayTacticsInput?.passingStyle||'misto'} line=${awayTacticsInput?.defenseLine||'media'} width=${awayTacticsInput?.width||'normal'} form=${awayTacticsInput?.formation||'4-4-2'}`);

  // Tactical impact on simulation (HOME) — uses style table + extras
  const pressingBase = pressing === 'ultra-alto' ? 1.5 : pressing === 'alto' ? 1.25 : pressing === 'medio' ? 1.0 : 0.8;
  const pressingMod = clamp(pressingBase + homeStyleMod.pressureExtra + homeExtras.pressBonus, 0.5, 2.2);
  const offensiveMod = homeStyleMod.atk * homeExtras.atkMul;
  const defensiveMod = homeStyleMod.def * homeExtras.defMul;
  const tempoMod = tempo === 'muito-rapido' ? 1.15 : tempo === 'rapido' ? 1.08 : tempo === 'normal' ? 1.0 : 0.9;

  // Away tactical mods
  const awayPressingBase = awayPressing === 'ultra-alto' ? 1.5 : awayPressing === 'alto' ? 1.25 : awayPressing === 'medio' ? 1.0 : 0.8;
  const awayPressingMod = clamp(awayPressingBase + awayStyleMod.pressureExtra + awayExtras.pressBonus, 0.5, 2.2);
  const awayOffensiveMod = awayStyleMod.atk * awayExtras.atkMul;
  const awayDefensiveMod = awayStyleMod.def * awayExtras.defMul;
  const awayTempoMod = awayTempo === 'muito-rapido' ? 1.15 : awayTempo === 'rapido' ? 1.08 : awayTempo === 'normal' ? 1.0 : 0.9;

  // Stamina drain modifiers for pressing/tempo (multiplied by style drain + extras)
  const staminaDrainPressing = (pressing === 'ultra-alto' ? 1.5 : pressing === 'alto' ? 1.25 : pressing === 'medio' ? 1.0 : 0.8) * homeStyleMod.staminaDrain * homeExtras.drainMul;
  const staminaDrainTempo = tempo === 'muito-rapido' ? 1.2 : tempo === 'rapido' ? 1.1 : 1.0;
  const awayStaminaDrainPressing = (awayPressing === 'ultra-alto' ? 1.5 : awayPressing === 'alto' ? 1.25 : awayPressing === 'medio' ? 1.0 : 0.8) * awayStyleMod.staminaDrain * awayExtras.drainMul;
  const awayStaminaDrainTempo = awayTempo === 'muito-rapido' ? 1.2 : awayTempo === 'rapido' ? 1.1 : 1.0;

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

  // ── POISSON GOALS (atributos REFORÇADOS) ───────────────────
  // Reforço: peso de atributos sobe de 0.6 → 1.1 e do strengthDiff de 1.5 → 2.2.
  // Isso faz times com finalização/defesa/passe melhores marcarem mais e sofrerem menos.
  const homeAttackVsDefense = (homeAtkAvg + homeMidAvg * 0.5) / Math.max(1, awayDefAvg);
  const awayAttackVsDefense = (awayAtkAvg + 50 * 0.5) / Math.max(1, homeDefAvg);

  const strengthDiff = (homeStrength * homeAdv * moraleMod * fatigueMod) - (awayStrength * awayMoraleMod * awayFatigueMod);

  // ── MATCHUP MULTIPLIERS ──────────────────────────────────────
  const homeMatchup = getMatchup(playStyle, awayPlayStyle);
  const awayMatchup = getMatchup(awayPlayStyle, playStyle);
  console.log(`[Matchup] Home(${playStyle}) vs Away(${awayPlayStyle}) | homeAtk×${homeMatchup.homeAtk} homeDef×${homeMatchup.homeDef} | awayAtk×${awayMatchup.homeAtk} awayDef×${awayMatchup.homeDef}`);
  console.log(`[Form] HOME mor=${avgMorale.toFixed(0)} sta=${avgStamina.toFixed(0)} (mod ${(moraleMod*fatigueMod).toFixed(2)}) | AWAY mor=${awayAvgMorale.toFixed(0)} sta=${awayAvgStaminaInit.toFixed(0)} (mod ${(awayMoraleMod*awayFatigueMod).toFixed(2)})`);

  // Home expected goals — agora também escalado pelo moral+stamina do mandante
  const homeExpected = clamp(
    ((1.1 + (strengthDiff / 100) * 2.2 * offensiveMod * tempoMod + (homeAttackVsDefense - 1) * 1.1) * homeMatchup.homeAtk * moraleMod * fatigueMod) /
    Math.max(0.7, awayDefensiveMod * 0.85 * awayMatchup.homeDef * awayMoraleMod * awayFatigueMod + 0.15),
    0.1, 4.0
  );
  // Away expected goals — simétrico, com moral/stamina visitante atacando e mandante defendendo
  const awayExpected = clamp(
    ((1.1 - (strengthDiff / 100) * 1.8 + (awayAttackVsDefense - 1) * 1.1 * awayOffensiveMod * awayTempoMod) * awayMatchup.homeAtk * awayMoraleMod * awayFatigueMod) /
    Math.max(0.7, defensiveMod * 0.85 * homeMatchup.homeDef * moraleMod * fatigueMod + 0.15),
    0.1, 4.0
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
  const penaltyChance = clamp((pressingMod - 0.9) * 0.1 + 0.07 + (homeExtras.penaltyBonus + awayExtras.penaltyBonus) * 0.5, 0.02, 0.35);
  const homePenBias = 0.55 + (homeExtras.penaltyBonus - awayExtras.penaltyBonus) * 2;
  for (let i = 0; i < 2; i++) {
    if (rng() < penaltyChance) {
      const team: 'home' | 'away' = rng() < clamp(homePenBias, 0.25, 0.85) ? 'home' : 'away';
      const m = pickUnique(allGamePool.filter(m => m >= 20));
      if (m > 0) {
        const kicker = team === 'home'
          ? pickByRole(home.filter(p => p.isOnPitch && p.position !== 'GOL'), 'set_piece')
          : pickByRole(away.filter(p => p.isOnPitch && p.position !== 'GOL'), 'set_piece');
        const gk = team === 'home'
          ? pickByRole(away.filter(p => p.isOnPitch), 'gk_save', 'GOL')
          : pickByRole(home.filter(p => p.isOnPitch), 'gk_save', 'GOL');
        const kickerSkill = kicker ? (kicker.composure * 0.5 + kicker.setPieces * 0.5) * formMult(kicker) : 55;
        const gkSkill = gk ? (gk.goalkeeping * 0.6 + gk.composure * 0.4) * formMult(gk) : 50;
        const conversionProb = clamp(kickerSkill / (kickerSkill + gkSkill) + 0.15, 0.50, 0.88);
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
    const scorer = pickByRole(home.filter(p => p.isOnPitch && p.position !== 'GOL'), 'finishing', rng() > 0.55 ? 'ATA' : undefined);
    const goalTypes = ['chute rasteiro no canto', 'chute colocado no ângulo', 'voleio de primeira', 'toque na saída do goleiro', 'cabeçada certeira', 'chute de longe'];
    const goalType = pick(goalTypes);
    let assistName: string | undefined;
    if (scorer) {
      scorer.goals++; scorer.rating = Math.min(10, scorer.rating + 1.2);
      const others = home.filter(p => p.id !== scorer.id && p.isOnPitch);
      if (others.length > 0 && rng() < 0.65) {
        const assister = pickByRole(others, 'creation') || pick(others);
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
    const scorer = pickByRole(away.filter(p => p.isOnPitch && p.position !== 'GOL'), 'finishing', rng() > 0.55 ? 'ATA' : undefined);
    const goalType = pick(['chute rasteiro cruzado', 'cabeceio no segundo pau', 'contra-ataque com toque na saída do goleiro', 'finalização de primeira']);
    let assistName: string | undefined;
    if (scorer) {
      scorer.goals++; scorer.rating = Math.min(10, scorer.rating + 1.2);
      const others = away.filter(p => p.id !== scorer.id && p.isOnPitch);
      if (others.length > 0 && rng() < 0.60) {
        const assister = pickByRole(others, 'creation') || pick(others);
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
    const kicker = pickByRole(teamPlayers.filter(p => p.isOnPitch && p.position !== 'GOL'), 'set_piece');
    const gk = pickByRole(oppPlayers.filter(p => p.isOnPitch), 'gk_save', 'GOL');
    stats.fouls[teamIdx === 0 ? 1 : 0]++;

    // ── LANCE ANTERIOR (jogada na área que gera o pênalti) ──
    const attacker = pickByRole(teamPlayers.filter(p => p.isOnPitch), 'dribble', rng() > 0.4 ? 'ATA' : undefined) || kicker;
    const defender = pickByRole(oppPlayers.filter(p => p.isOnPitch && p.position !== 'GOL'), 'tackle', 'ZAG') || pick(oppPlayers.filter(p => p.isOnPitch));
    const buildupVariants = [
      `🏃 Jogada perigosa do ${tName}! ${attacker?.name || 'Atacante'} entra na área driblando, ${defender?.name || 'defensor'} do ${opp} chega atrasado e derruba dentro da área!`,
      `🔥 Contra-ataque mortal! ${attacker?.name || 'O atacante'} ganha na velocidade, invade a área e é derrubado por trás pelo ${defender?.name || 'zagueiro'}!`,
      `📦 Bola na área! ${attacker?.name || 'O atacante'} tenta o giro, mas é agarrado pelo ${defender?.name || 'defensor'}. O juiz aponta a marca da cal!`,
    ];
    const buildup = pick(buildupVariants);
    const [scoreH, scoreA] = getScoreAtMinute(pen.minute, true);

    if (pen.isGoal) {
      if (team === 'home') penaltyHomeGoals++; else penaltyAwayGoals++;
      if (kicker) { kicker.goals++; kicker.rating = Math.min(10, kicker.rating + 1.2); }
      if (gk) gk.rating = Math.max(3, gk.rating - 0.8);
      
      allPlanned.push({
        minute: pen.minute, type: 'penalty', team, isGoal: true,
        playerName: kicker?.name, animType: 'penalty',
        ballX: team === 'home' ? 0.95 : 0.05, ballY: 0.5,
        description: `${buildup} 🎯 PÊNALTI PARA O ${tName.toUpperCase()}! ${kicker?.name || 'Batedor'} se concentra... ⚽ GOOOOL!!! Cobrança perfeita no canto! [${scoreH}x${scoreA}]`,
      });
    } else {
      if (kicker) kicker.rating = Math.max(3, kicker.rating - 1.0);
      if (gk) {
        gk.rating = Math.min(10, gk.rating + 1.5);
        stats.saves[team === 'home' ? 1 : 0]++;
      }
      
      allPlanned.push({
        minute: pen.minute, type: 'penalty_miss', team, isGoal: false,
        playerName: kicker?.name, animType: 'penalty',
        // For a save, we set ballX slightly away from the net in HighlightMiniCanvas logic
        ballX: team === 'home' ? 0.90 : 0.10, ballY: 0.5 + (rng() - 0.5) * 0.2,
        description: `${buildup} 🎯 PÊNALTI PARA O ${tName.toUpperCase()}! ${kicker?.name || 'Batedor'} parte para a bola... 🧤 DEFENDE O GOLEIRO!!! Sensacional intervenção de ${gk?.name || 'Goleiro'}! [${scoreH}x${scoreA}]`,
      });
    }
  }

  // ── DANGEROUS FOULS ──────────────────────────────────────────
  for (const m of dangerousFoulMins) {
    const teamIdx: 0 | 1 = rng() < 0.5 ? 0 : 1;
    const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    const opp = team === 'home' ? awayTeam : homeTeam;
    const attacker = pickByRole(allPlayers.filter(p => p.team === team && p.isOnPitch), 'dribble');
    const defender = pickByRole(allPlayers.filter(p => p.team !== team && p.isOnPitch), 'tackle');
    stats.fouls[teamIdx === 0 ? 1 : 0]++;
    allPlanned.push({
      minute: m, type: 'dangerous_foul', team,
      playerName: attacker?.name, animType: 'foul',
      description: `⚠️🔥 Falta perigosa! ${defender?.name || 'Defensor'} do ${opp} derruba ${attacker?.name || 'atacante'} do ${tName} na entrada da área!`,
    });
  }

  // ── CARDS ──────────────────────────────────────────────────
  // Times com moral/stamina baixos cometem mais faltas → favorece esses jogadores no sorteio.
  for (const m of cardMins) {
    // Times com marcação individual / pressing alto cometem mais faltas
    const homeFoulW = 1 + homeExtras.foulBias + Math.max(0, pressingMod - 1) * 0.8;
    const awayFoulW = 1 + awayExtras.foulBias + Math.max(0, awayPressingMod - 1) * 0.8;
    const teamIdx: 0 | 1 = rng() < homeFoulW / (homeFoulW + awayFoulW) ? 0 : 1;
    const team: 'home' | 'away' = teamIdx === 0 ? 'home' : 'away';
    const tName = team === 'home' ? homeTeam : awayTeam;
    const pool = allPlayers.filter(p => p.team === team && p.isOnPitch);
    // Weight: jogador cansado/desmotivado tem 3x mais chance de tomar amarelo
    const weights = pool.map(p => {
      const fatigue = Math.max(0, 100 - p.stamina);   // 0..100
      const lowMor = Math.max(0, 70 - p.morale);      // 0..70
      return 1 + fatigue * 0.04 + lowMor * 0.05;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let pickRoll = rng() * total;
    let player: SimPlayer | null = null;
    for (let i = 0; i < pool.length; i++) {
      pickRoll -= weights[i];
      if (pickRoll <= 0) { player = pool[i]; break; }
    }
    if (!player && pool.length) player = pool[pool.length - 1];
    if (player) player.yellowCards++;
    stats.fouls[teamIdx]++; stats.yellowCards[teamIdx]++;
    allPlanned.push({
      minute: m, type: 'yellow_card', team, animType: 'card',
      playerName: player?.name || 'Jogador',
      description: `CARTÃO AMARELO para ${player?.name || 'Jogador'} do ${tName}! Falta dura no meio-campo!`,
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
    // Atacante sorteado favorece os melhor-formados (stamina+moral)
    const shooterCandidates = pool.filter(p => p.position !== 'GOL');
    const shooter = shooterCandidates.length > 0
      ? (() => {
          const ws = shooterCandidates.map(p => Math.pow(finishingPower(p) * formMult(p), 2.0));
          const tot = ws.reduce((a, b) => a + b, 0) || 1;
          let r = rng() * tot;
          for (let i = 0; i < shooterCandidates.length; i++) { r -= ws[i]; if (r <= 0) return shooterCandidates[i]; }
          return shooterCandidates[shooterCandidates.length - 1];
        })()
      : null;
    const pName = shooter?.name || (pool.length > 0 ? pick(pool).name : 'Jogador');
    const p2Name = pool.filter(p => p.name !== pName).length > 0 ? pick(pool.filter(p => p.name !== pName)).name : pName;
    const defName = oppPool.length > 0 ? pick(oppPool).name : 'Defensor';
    const gkName = oppPool.filter(p => p.position === 'GOL').length > 0 ? pick(oppPool.filter(p => p.position === 'GOL')).name : 'Goleiro';
    stats.shots[teamIdx]++;
    // Chance outcome favors misses/saves when shooter is tired/desmotivated
    const sForm = formMult(shooter);
    // Defesa adversária com linha alta força mais impedimentos contra o atacante
    const oppExtras = team === 'home' ? awayExtras : homeExtras;
    const myExtras = team === 'home' ? homeExtras : awayExtras;
    const basePool = sForm >= 1.0
      ? ['woodwork', 'great_save', 'corner_danger', 'offside_trap', 'long_shot_miss', 'header_miss', 'counter_attack', 'buildup_play', 'free_kick_near']
      : sForm >= 0.85
        ? ['woodwork', 'great_save', 'great_save', 'corner_danger', 'offside_trap', 'long_shot_miss', 'header_miss', 'counter_attack', 'buildup_play', 'free_kick_near']
        : ['great_save', 'great_save', 'offside_trap', 'long_shot_miss', 'long_shot_miss', 'header_miss', 'header_miss', 'buildup_play'];
    const chancePool: string[] = [...basePool];
    // Linha alta adversária → +impedimentos
    if (oppExtras.offsideMul > 1.2) chancePool.push('offside_trap', 'offside_trap');
    else if (oppExtras.offsideMul < 0.8) {
      // tira um offside_trap se houver
      const idx = chancePool.indexOf('offside_trap');
      if (idx >= 0) chancePool.splice(idx, 1);
    }
    // Bola longa / largura larga → mais cruzamentos / cabeceios e contra-ataques
    if (myExtras.crossBoost > 0.1) chancePool.push('corner_danger', 'header_miss', 'free_kick_near');
    // Passe curto → mais construção
    if (myExtras.shortPassBoost > 0.05) chancePool.push('buildup_play', 'buildup_play');
    // Chutão / passe longo → mais chutes de longe
    if (myExtras.longShotBoost > 0.08) chancePool.push('long_shot_miss', 'woodwork');
    const evType = pick(chancePool);
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
      penalty_hit: `🎯 PÊNALTI! ${pName} do ${tName} se prepara... parte para a bola... ⚽ GOOOOOOOOOOL!!! Cobrança magistral, sem chances para o goleiro!`,
      penalty_save: `🧤 PÊNALTI DEFENDIDO! ${pName} do ${tName} solta a bomba, mas ${gkName} do ${opp} voa no canto e busca! Espetacular defesa que mantém o placar!`,
      penalty_out: `❌ PÊNALTI PARA FORA! ${pName} tenta colocar demais, a bola raspa a trave e vai pela linha de fundo! Torcida não acredita no que viu!`,
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
    drainStamina(away, m, awayStaminaDrainPressing, awayStaminaDrainTempo);

    // Update score at this minute
    const [sh, sa] = getScoreAtMinute(m, false);
    currentHomeGoals = sh; currentAwayGoals = sa;

    // Injury check for exhausted players — moral baixa aumenta o risco
    const checkInjury = (squad: SimPlayer[], teamKey: 'home' | 'away') => {
      for (const p of squad) {
        if (!p.isOnPitch || p.injured || p.stamina >= 40) continue;
        const moraleRisk = p.morale < 40 ? 1.6 : p.morale < 60 ? 1.2 : 1.0;
        const baseRisk = 0.04 + (40 - p.stamina) / 800; // 0..0.09
        if (rng() < baseRisk * moraleRisk) {
          p.injured = true;
          p.isOnPitch = false;
          allPlanned.push({
            minute: m, type: 'injury', team: teamKey,
            playerName: p.name, animType: 'foul',
            description: `🏥 LESÃO! ${p.name} sente dores musculares e precisa ser substituído! O cansaço cobrou seu preço!`,
          });
        }
      }
    };
    checkInjury(home, 'home');
    checkInjury(away, 'away');

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
    const p3 = pool.filter(p => p.name !== p1 && p.name !== p2).length > 0 ? pick(pool.filter(p => p.name !== p1 && p.name !== p2)).name : p2;
    const def = oppPool.length > 0 ? pick(oppPool).name : 'Defensor';
    const oppGk = oppPool.find(p => p.position === 'GOL')?.name || 'Goleiro';
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
      { type: 'triangulation', desc: `🔺 Triangulação rápida do ${tName}! ${p1} toca para ${p2}, que devolve de primeira para ${p3}. Belo trabalho coletivo no meio-campo!` },
      { type: 'counter_attempt', desc: `⚡ Contra-ataque do ${tName}! ${p1} rouba a bola e lança para ${p2} em velocidade. ${def} corre para tentar interceptar.` },
      { type: 'shot_blocked', desc: `🛡️ ${p1} do ${tName} arrisca de fora da área, mas ${def} se joga e bloqueia o chute! Defesa heroica do ${opp}.` },
      { type: 'shot_off', desc: `🎯 ${p1} do ${tName} finaliza de fora da área e a bola passa raspando a trave! Por pouco não saiu o gol!` },
      { type: 'gk_save', desc: `🧤 GRANDE DEFESA! ${oppGk} do ${opp} se estica todo e espalma a finalização de ${p1}! Defesaça!` },
      { type: 'corner_kick', desc: `🚩 Escanteio para o ${tName}. ${p1} cobra na área, ${p2} sobe mais alto que a defesa, mas cabeceia para fora!` },
      { type: 'interception', desc: `✋ Interceptação inteligente! ${def} do ${opp} lê o passe de ${p1} e corta a jogada antes que chegue em ${p2}.` },
      { type: 'one_two', desc: `🤝 Tabela perfeita entre ${p1} e ${p2} do ${tName}! Trocam dois toques rápidos e abrem espaço na defesa do ${opp}.` },
      { type: 'wing_run', desc: `🏃‍♂️ ${p1} dispara pela ponta direita do ${tName}! Deixa ${def} para trás e prepara o cruzamento na área.` },
      { type: 'header_duel', desc: `💢 Disputa aérea no meio-campo! ${p1} e ${def} sobem juntos e a bola sobra para ${p2} retomar a posse.` },
    ];
    const chosen = pick(posTypes);
    if (chosen.type === 'midfield_foul') stats.fouls[teamIdx]++;
    if (chosen.type === 'tackle' || chosen.type === 'interception') stats.tackles[teamIdx === 0 ? 1 : 0]++;
    if (chosen.type === 'shot_blocked' || chosen.type === 'shot_off') stats.shots[teamIdx]++;
    if (chosen.type === 'gk_save') { stats.shots[teamIdx]++; stats.shotsOnTarget[teamIdx]++; stats.saves[teamIdx === 0 ? 1 : 0]++; }
    if (chosen.type === 'corner_kick') stats.corners[teamIdx]++;

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

  // ── PÚBLICO E RECEITA (Stadium Economy Engine) ──
  // Usar a lógica centralizada de economia do estádio
  // Consideramos humor e impacto de preço baseados nos inputs do cliente
  const effectiveHomeStrength = (homeStrength || 60);
  const reputation = homeStrength; // Simplified reputation for server calculation
  
  // Fatores de humor e sequência
  const winStreakMod = Number(body.winStreak || 0);
  const loseStreakMod = Number(body.loseStreak || 0);
  const moodScore = (winStreakMod * 2) - (loseStreakMod * 1.5) + (reputation / 20);
  const moodMult = moodScore >= 12 ? 1.5 : moodScore >= 6 ? 1.25 : moodScore >= 0 ? 1.0 : 0.7;
  
  // Multiplicador de tipo de partida
  const compStr = String(competition || '').toLowerCase();
  const matchMult = compStr.includes('final') ? 2.2 : compStr.includes('clás') ? 1.5 : compStr.includes('amistos') ? 0.6 : 1.0;
  
  // Impacto de preço (curva de tolerância)
  const ticketPriceVal = Number(body.ticketPrice || 25);
  const idealPrice = 20 + (reputation / 4);
  const priceImpact = Math.min(1.2, Math.max(0.25, 1 - ((ticketPriceVal - idealPrice) / (idealPrice * 2.5))));
  
  // Conversão de fãs (5% base * reputação)
  const conversionRate = 0.05 * (0.5 + (reputation / 100));
  const expectedAttendance = Math.floor(resolvedHomeFans * conversionRate * moodMult * matchMult * priceImpact);
  const estimatedCrowd = Math.min(maxCapacity, Math.max(100, expectedAttendance));
  
  // Receitas detalhadas
  const ticketRevenue = estimatedCrowd * ticketPriceVal;
  const vipPrice = 500 + (Math.floor(reputation/10) * 200);
  const occupancy = estimatedCrowd / maxCapacity;
  const vipUnits = Number(body.vipUnits || 0);
  const vipRevenue = vipUnits * vipPrice * Math.min(1, occupancy + 0.2);
  const commercialRevenue = estimatedCrowd * (10 + Math.floor(reputation/10) * 2);
  const parkingRevenue = Math.min(Math.floor(maxCapacity / 8), Math.floor(estimatedCrowd / 6)) * (20 + Math.floor(reputation/10) * 2);
  const totalRevenue = Math.round(ticketRevenue + vipRevenue + commercialRevenue + parkingRevenue);

  finalEvents.push({
    minute: 0, type: 'kickoff', team: 'neutral', animType: 'kickoff', ballX: 0.5, ballY: 0.5,
    description: `🏟️ A partida começa no ${stadiumName}! 👥 Público: ${estimatedCrowd.toLocaleString('pt-BR')} (🏠 ${Math.round(occupancy * 100)}% de ocupação) — ${homeTeam} x ${awayTeam} • ${competition}!`,
    momentPhase: 'equilíbrio',
  });

  finalEvents.push({
    minute: 1, type: 'attendance', team: 'neutral', animType: 'pass', ballX: 0.5, ballY: 0.5,
    description: `💰 Receita Total da Partida: R$ ${totalRevenue.toLocaleString('pt-BR')} (Bilheteria: R$ ${Math.round(ticketRevenue).toLocaleString('pt-BR')} | Comercial: R$ ${Math.round(commercialRevenue).toLocaleString('pt-BR')}).`,
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
          const gkSave = (awayKeeper?.goalkeeping || 60) / 100 * 0.10 * formMult(awayKeeper);
          // Pênaltis são feitos de cabeça fria: moral pesa mais que stamina pura
          const takerForm = (0.6 + 0.4 * formMult(hT));
          const scored = rng() < ((baseProb + skillBoost) * takerForm - gkSave);
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
          const gkSave = (homeKeeper?.goalkeeping || 60) / 100 * 0.10 * formMult(homeKeeper);
          const takerForm = (0.6 + 0.4 * formMult(aT));
          const scored = rng() < ((baseProb + skillBoost) * takerForm - gkSave);
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

  // Possession stats — agora influenciado por estilo de passe / largura
  const effectiveHome = homeStrength * homeAdv * moraleMod;
  const possStyle = playStyle === 'posse' ? 1.15 : playStyle === 'contra-ataque' ? 0.85 : 1.0;
  const awayPossStyle = awayPlayStyle === 'posse' ? 1.15 : awayPlayStyle === 'contra-ataque' ? 0.85 : 1.0;
  const homePossWeight = effectiveHome * possStyle * (1 + homeExtras.possessionBias);
  const awayPossWeight = awayStrength * awayPossStyle * (1 + awayExtras.possessionBias);
  const possRatio = homePossWeight / (homePossWeight + awayPossWeight);
  stats.possession = [Math.round(possRatio * 100), 100 - Math.round(possRatio * 100)];

  // ── PLAYER RATINGS (recompute from event log + role fit) ──
  // Base 6.0, then accumulate per-action deltas attributing them to playerName/assistName.
  // Players also gain a small bonus for participation aligned with their role power.
  const playerRatings: Record<string, number> = {};
  const playersById = new Map<string, SimPlayer>();
  allPlayers.forEach(p => playersById.set(p.id, p));
  const nameToPlayer = new Map<string, SimPlayer>();
  allPlayers.forEach(p => nameToPlayer.set(p.name, p));

  // counters per player
  const counters: Record<string, {
    goals: number; assists: number; saves: number; tackles: number;
    yellows: number; reds: number; missedPen: number; concededGoals: number;
    keyMoments: number;
  }> = {};
  for (const p of allPlayers) {
    counters[p.id] = { goals: 0, assists: 0, saves: 0, tackles: 0, yellows: 0, reds: 0, missedPen: 0, concededGoals: 0, keyMoments: 0 };
  }

  let homeFinal = 0, awayFinal = 0;
  for (const ev of finalEvents) {
    if (ev.type === 'penalty_shootout') continue;
    const scorer = ev.playerName ? nameToPlayer.get(ev.playerName) : null;
    const assister = ev.assistName ? nameToPlayer.get(ev.assistName) : null;
    if (ev.isGoal) {
      if (ev.team === 'home') homeFinal++; else if (ev.team === 'away') awayFinal++;
      if (scorer) counters[scorer.id].goals++;
      if (assister) counters[assister.id].assists++;
      // GK on the conceding team takes a small hit
      const concedingTeam: 'home' | 'away' = ev.team === 'home' ? 'away' : 'home';
      const gks = allPlayers.filter(p => p.team === concedingTeam && p.position === 'GOL' && p.isOnPitch);
      for (const gk of gks) counters[gk.id].concededGoals++;
    }
    switch (ev.type) {
      case 'great_save':
        // attribute the save to the opposing team's GK
        {
          const oppTeam: 'home' | 'away' = ev.team === 'home' ? 'away' : 'home';
          const gks = allPlayers.filter(p => p.team === oppTeam && p.position === 'GOL' && p.isOnPitch);
          for (const gk of gks) counters[gk.id].saves++;
        }
        break;
      case 'penalty_miss':
        if (scorer) counters[scorer.id].missedPen++;
        break;
      case 'tackle':
        if (scorer) counters[scorer.id].tackles++;
        break;
      case 'yellow_card':
        if (scorer) counters[scorer.id].yellows++;
        break;
      case 'red_card':
        if (scorer) counters[scorer.id].reds++;
        break;
      case 'woodwork':
      case 'corner_danger':
      case 'counter_attack':
      case 'free_kick_near':
      case 'long_shot_miss':
      case 'header_miss':
        if (scorer) counters[scorer.id].keyMoments++;
        break;
    }
  }

  for (const p of allPlayers) {
    if (!p.isOnPitch && counters[p.id].goals === 0 && counters[p.id].assists === 0) {
      // Player never came on and had no events → neutral baseline
      playerRatings[p.id] = 6.0;
      continue;
    }
    const c = counters[p.id];
    // Role-aligned baseline contribution (0..0.6 extra for players doing their job well)
    const myTeamWon = (p.team === 'home' && homeFinal > awayFinal) || (p.team === 'away' && awayFinal > homeFinal);
    const myTeamLost = (p.team === 'home' && homeFinal < awayFinal) || (p.team === 'away' && awayFinal < homeFinal);
    // Per-position role fit bonus, based on stamina/morale-adjusted attributes
    let roleBonus = 0;
    if (p.position === 'GOL') roleBonus = (rolePower(p, 'gk_save') - 60) / 100;
    else if (p.position === 'ZAG' || p.position === 'LAT') roleBonus = (rolePower(p, 'tackle') - 60) / 120;
    else if (p.position === 'VOL' || p.position === 'MEI') roleBonus = (rolePower(p, 'creation') - 60) / 130;
    else if (p.position === 'ATA') roleBonus = (rolePower(p, 'finishing') - 60) / 110;
    roleBonus = Math.max(-0.4, Math.min(0.6, roleBonus));

    let r = 6.0
      + c.goals * 1.2
      + c.assists * 0.65
      + c.saves * 0.25
      + c.tackles * 0.10
      + c.keyMoments * 0.08
      - c.yellows * 0.30
      - c.reds * 1.40
      - c.missedPen * 0.90
      - (p.position === 'GOL' ? c.concededGoals * 0.20 : 0)
      + roleBonus
      + (myTeamWon ? 0.20 : myTeamLost ? -0.15 : 0);

    // Stamina/morale-driven decay for players who finished the game cooked or low morale
    r += (p.stamina - 50) / 400;   // ±0.12 swing
    r += (p.morale - 50) / 500;    // ±0.10 swing

    // Carry over duel rating already applied during sim (penalty miss/save handlers etc.)
    // We blend in 30% of the live "p.rating" so existing penalty/save bumps still influence the final.
    r = r * 0.85 + p.rating * 0.15;

    playerRatings[p.id] = Math.round(Math.max(3.0, Math.min(10.0, r)) * 10) / 10;
    // sync back so manOfTheMatch sort uses the same number
    p.rating = playerRatings[p.id];
  }

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
    const { homeTeam, awayTeam, homePlayers, homeStrength, awayStrength, matchId, tactics, stadiumName, stadiumCapacity, isHome, competition, tournamentMatchId, fans, awayFans, staff, tieBreaker, awayPlayers, awayTactics, ticketPrice } = body;
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

    // 2.5 AUTHORITATIVE TEAM/STADIUM RESOLUTION (CRITICAL — DESYNC GUARD)
    // Cada cliente envia homeTeam/awayTeam/homePlayers do SEU ponto de vista.
    // O visitante envia INVERTIDO (próprio clube como home). Sem corrigir isso
    // no servidor, quem chegar primeiro define a simulação errada — gerando
    // resultados completamente diferentes para os dois jogadores na mesma
    // partida (ex: 2x0 para um, 2x1 para o outro).
    //
    // Solução: resolvemos o mandante REAL pelo matchId no banco e, se o
    // chamador for o visitante, INVERTEMOS times/elencos/táticas antes da
    // simulação. Assim, qualquer um dos dois clientes que chegue primeiro
    // produz EXATAMENTE a mesma timeline (porque o seed do PRNG é matchId
    // e os inputs são idênticos).
    let effHomeTeam: string = homeTeam;
    let effAwayTeam: string = awayTeam;
    let effHomePlayers: any[] = Array.isArray(homePlayers) ? homePlayers : [];
    let effAwayPlayers: any[] | undefined = Array.isArray(awayPlayers) ? awayPlayers : undefined;
    let effHomeStrength: number = validatedHomeStrength;
    let effAwayStrength: number = validatedAwayStrength;
    let effTactics: any = tactics || {};
    let effAwayTactics: any = awayTactics || undefined;
    let effIsHomeForReport: boolean = isHome !== false;

    let resolvedHomeFans = Number(fans) || 500;
    let resolvedAwayFans = Number(awayFans) || 500;
    let resolvedStadiumCapacity = Number(stadiumCapacity) || 5000;
    let resolvedStadiumName = stadiumName || 'Estádio';
    let resolvedHomeUserId: string | null = null;
    try {
      const { data: homeUserId } = await adminClient.rpc('resolve_home_user_for_match', { _match_id: String(matchId) });
      if (homeUserId) {
        resolvedHomeUserId = homeUserId as string;

        // Se o chamador NÃO for o mandante, ele é o visitante e enviou os
        // dados invertidos. Buscamos os dados autoritativos do mandante real
        // via game_saves e invertemos para que a simulação rode sempre com a
        // mesma orientação (mandante = mandante real).
        const callerIsHome = resolvedHomeUserId === userId;

        if (!callerIsHome) {
          console.info('[start-match] Caller is VISITOR — flipping inputs to mandante=', resolvedHomeUserId);
          // Inverte campos vindos do cliente (visitante mandou homeX = clube dele)
          const tmpTeam = effHomeTeam; effHomeTeam = effAwayTeam; effAwayTeam = tmpTeam;
          const tmpPlayers = effHomePlayers; effHomePlayers = effAwayPlayers || []; effAwayPlayers = tmpPlayers;
          const tmpStr = effHomeStrength; effHomeStrength = effAwayStrength; effAwayStrength = tmpStr;
          const tmpTac = effTactics; effTactics = effAwayTactics || {}; effAwayTactics = tmpTac;
          const tmpFans = resolvedHomeFans; resolvedHomeFans = resolvedAwayFans; resolvedAwayFans = tmpFans;
          effIsHomeForReport = false; // o relatório é gerado para o caller (visitante)
        }

        // Buscar info de estádio do mandante real
        const { data: stadiumRows } = await adminClient.rpc('get_user_stadium_info', { _user_id: resolvedHomeUserId });
        const stadium = Array.isArray(stadiumRows) ? stadiumRows[0] : stadiumRows;
        if (stadium) {
          resolvedStadiumName = stadium.stadium_name || resolvedStadiumName;
          const lvl = Math.max(1, Math.min(15, Number(stadium.stadium_level) || 1));
          // Tabela oficial de capacidade por nível (alinha com src/types/infrastructure.ts)
          const STADIUM_CAPACITIES: Record<number, number> = {
            1: 5000, 2: 10000, 3: 15000, 4: 20000, 5: 25000, 6: 30000,
            7: 40000, 8: 50000, 9: 60000, 10: 70000, 11: 80000, 12: 90000,
            13: 100000, 14: 110000, 15: 120000,
          };
          resolvedStadiumCapacity = STADIUM_CAPACITIES[lvl] || 5000;
          // Nome do mandante autoritativo (substitui o que o cliente passou)
          if (stadium.club_name && typeof stadium.club_name === 'string' && stadium.club_name.length > 0) {
            effHomeTeam = stadium.club_name;
          }
        }
        // Mandante: fans + elenco autoritativos via game_saves
        const { data: homeSave } = await adminClient
          .from('game_saves')
          .select('club_data')
          .eq('user_id', resolvedHomeUserId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const homeClubData: any = homeSave?.club_data || {};
        const homeFansFromSave = homeClubData?.club?.fans ?? homeClubData?.fans;
        if (typeof homeFansFromSave === 'number' && homeFansFromSave > 0) {
          resolvedHomeFans = homeFansFromSave;
        }
        // Substitui elenco do mandante pelo que está salvo no servidor
        const homePlayersFromSave: any[] = Array.isArray(homeClubData?.players) ? homeClubData.players : [];
        if (homePlayersFromSave.length > 0) {
          effHomePlayers = homePlayersFromSave;
        }

        // Visitante: tentar buscar elenco autoritativo se for jogador humano
        // (resolvido pelo matchId — ex: friendly_invites, league_matches, cup_matches).
        try {
          let awayUserId: string | null = null;
          const m = String(matchId);
          if (m.startsWith('friendly-')) {
            const inviteId = m.slice('friendly-'.length);
            const { data: inv } = await adminClient
              .from('friendly_invites')
              .select('sender_id, receiver_id, home_team_id')
              .eq('id', inviteId)
              .maybeSingle();
            if (inv) {
              awayUserId = inv.home_team_id === inv.sender_id ? inv.receiver_id : inv.sender_id;
            }
          } else {
            // tenta como uuid em league_matches/cup_matches/custom_tournament_matches
            const { data: lm } = await adminClient
              .from('league_matches')
              .select('home_user_id, away_user_id')
              .eq('id', m)
              .maybeSingle();
            if (lm) awayUserId = lm.home_user_id === resolvedHomeUserId ? lm.away_user_id : lm.home_user_id;
          }
          if (awayUserId && awayUserId !== resolvedHomeUserId) {
            const { data: awaySave } = await adminClient
              .from('game_saves')
              .select('club_data')
              .eq('user_id', awayUserId)
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            const awayClubData: any = awaySave?.club_data || {};
            const awayPlayersFromSave: any[] = Array.isArray(awayClubData?.players) ? awayClubData.players : [];
            if (awayPlayersFromSave.length > 0) {
              effAwayPlayers = awayPlayersFromSave;
            }
            const awayName = awayClubData?.club?.name;
            if (typeof awayName === 'string' && awayName.length > 0) {
              effAwayTeam = awayName;
            }
            const awayFansFromSave = awayClubData?.club?.fans ?? awayClubData?.fans;
            if (typeof awayFansFromSave === 'number' && awayFansFromSave > 0) {
              resolvedAwayFans = awayFansFromSave;
            }
          }
        } catch (e) {
          console.warn('[start-match] Failed to load away authoritative data', e);
        }

        console.info('[start-match] Authoritative inputs', {
          matchId, homeUserId: resolvedHomeUserId, callerIsHome,
          effHomeTeam, effAwayTeam,
          homePlayersCount: effHomePlayers.length, awayPlayersCount: effAwayPlayers?.length || 0,
          capacity: resolvedStadiumCapacity, homeFans: resolvedHomeFans, awayFans: resolvedAwayFans,
        });
      } else {
        console.info('[start-match] No home user resolved (likely friendly vs BOT) — using client values', { matchId });
      }
    } catch (e) {
      console.warn('[start-match] Authoritative resolution failed, falling back to client data', e);
    }

    // Simulate match (com inputs AUTORITATIVOS — sempre orientação mandante=mandante real)
    const result = simulateFullMatch(
      effHomeTeam, effAwayTeam, effHomePlayers,
      effHomeStrength, effAwayStrength,
      effTactics, resolvedStadiumName, effIsHomeForReport,
      competition || 'Amistoso', resolvedStadiumCapacity, resolvedHomeFans,
      staff, resolvedAwayFans, validTieBreaker,
      effAwayPlayers,
      effAwayTactics,
      ticketPrice || 25
    );

    // Fallback: ensure minimum events so UI never hangs
    if (!Array.isArray(result.events) || result.events.length === 0) {
      console.warn('[Sim] Empty events generated — applying fallback');
      const fallbackHomeGoals = poissonSample(Math.max(0.3, effHomeStrength / 60));
      const fallbackAwayGoals = poissonSample(Math.max(0.3, effAwayStrength / 60));
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
    // home_team/away_team/home_players gravados são SEMPRE a orientação autoritativa
    // (mandante real à esquerda). is_home reflete a perspectiva do user_id que inseriu;
    // o oponente lê a MESMA linha (RLS via is_match_participant) e deve derivar
    // sua própria perspectiva localmente — nunca confiar no is_home da linha.
    const callerIsHomeOnInsert = resolvedHomeUserId
      ? resolvedHomeUserId === userId
      : (isHome !== false);
    const insertPayload = {
      user_id: userId,
      match_id: matchId,
      shared_match_id: String(matchId),
      home_team: effHomeTeam,
      away_team: effAwayTeam,
      home_strength: effHomeStrength,
      away_strength: effAwayStrength,
      stadium_name: resolvedStadiumName,
      stadium_capacity: resolvedStadiumCapacity,
      attendance: result.attendance,
      ticket_revenue: result.ticketRevenue,

      is_home: callerIsHomeOnInsert,
      competition: competition || 'Amistoso',
      duration_seconds: durationSeconds,
      events: result.events as any,
      home_goals: result.homeGoals,
      away_goals: result.awayGoals,
      stats: result.stats as any,
      home_players: effHomePlayers as any,
      player_ratings: result.playerRatings as any,
      tactics: effTactics as any,
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

    // --- 3. PERSISTENCE & STATISTICS SYNC ---
    const isLeagueMatch = String(competition).toLowerCase().includes('liga') || String(matchId).length === 36;
    const isCupMatch = String(competition).toLowerCase().includes('copa') || String(competition).toLowerCase().includes('cup');

    // Helper: Update Player Stats (League or Cup)
    const updateStatsForCompetition = async (
      compType: 'league' | 'cup',
      compId: string,
      teamId: string, // member_id for league, team_id for cup
      players: SimPlayer[],
      teamGoalsAgainst: number,
      isWinner: boolean
    ) => {
      const statsTable = compType === 'league' ? 'league_player_stats' : 'cup_player_stats';
      const idField = compType === 'league' ? 'league_id' : 'cup_id';
      const teamField = compType === 'league' ? 'member_id' : 'team_id';

      for (const p of players) {
        if (!p.isOnPitch && p.goals === 0 && p.assists === 0 && p.yellowCards === 0) continue;

        const isGK = p.position === 'GOL';
        const cleanSheet = isGK && teamGoalsAgainst === 0 ? 1 : 0;
        const conceded = isGK ? teamGoalsAgainst : 0;
        const isMOTM = result.manOfTheMatch === p.name ? 1 : 0;

        // Collect card data from events for this specific player
        const playerYellows = result.events.filter(e => e.type === 'yellow_card' && e.playerName === p.name).length;
        const playerReds = result.events.filter(e => e.type === 'red_card' && e.playerName === p.name).length;

        // Prepare the upsert data
        const statData: any = {
          [idField]: compId,
          [teamField]: teamId,
          player_name: p.name,
          goals: p.goals,
          assists: p.assists,
          matches_played: 1,
          yellow_cards: playerYellows,
          red_cards: playerReds,
          clean_sheets: cleanSheet,
          goals_conceded: conceded,
          motm_count: isMOTM,
          minutes_played: p.isOnPitch ? 90 : 0, // Simplified, could be more precise
          team_name: p.team === 'home' ? effHomeTeam : effAwayTeam
        };

        if (compType === 'league') {
          statData.total_rating = p.rating;
        } else {
          statData.avg_rating = p.rating;
          statData.player_id = p.id;
        }

        // RPC to handle atomic increment/update to avoid race conditions and duplicates
        await adminClient.rpc('upsert_player_stats', {
          _table_name: statsTable,
          _comp_id_field: idField,
          _comp_id: compId,
          _team_id_field: teamField,
          _team_id: teamId,
          _player_name: p.name,
          _stats: statData
        });
      }
    };

    // Determine competition details and update match tables
    try {
      // 3.1. League Match Logic
      const { data: leagueMatch } = await adminClient
        .from('league_matches')
        .select('league_id, home_team_id, away_team_id')
        .eq('id', String(matchId))
        .maybeSingle();

      if (leagueMatch) {
        console.info('[Sync] Updating league_matches', { matchId });
        await adminClient.from('league_matches').update({
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
          } as any
        }).eq('id', String(matchId));

        // Update player stats for both teams
        // In league_player_stats, teamId is the member_id (UUID)
        // We need to resolve member_id from league_id + user_id or team_id
        const { data: members } = await adminClient
          .from('league_members')
          .select('id, user_id, is_bot')
          .eq('league_id', leagueMatch.league_id);
        
        const homeMember = members?.find(m => m.id === leagueMatch.home_team_id);
        const awayMember = members?.find(m => m.id === leagueMatch.away_team_id);

        if (homeMember) {
          await updateStatsForCompetition('league', leagueMatch.league_id, homeMember.id, allPlayers.filter(p => p.team === 'home'), result.awayGoals, result.homeGoals > result.awayGoals);
        }
        if (awayMember) {
          await updateStatsForCompetition('league', leagueMatch.league_id, awayMember.id, allPlayers.filter(p => p.team === 'away'), result.homeGoals, result.awayGoals > result.homeGoals);
        }

        // Update Standings via RPC for consistency
        await adminClient.rpc('update_league_standings', { _league_id: leagueMatch.league_id });
      }

      // 3.2. National Cup Match Logic
      const { data: cupMatch } = await adminClient
        .from('national_cup_matches')
        .select('cup_id, home_team_id, away_team_id')
        .eq('id', String(matchId))
        .maybeSingle();

      if (cupMatch) {
        console.info('[Sync] Updating national_cup_matches', { matchId });
        const winnerId = result.homeGoals > result.awayGoals ? cupMatch.home_team_id 
                        : result.awayGoals > result.homeGoals ? cupMatch.away_team_id 
                        : (result.penaltyHomeGoals > result.penaltyAwayGoals ? cupMatch.home_team_id : cupMatch.away_team_id);

        await adminClient.from('national_cup_matches').update({
          home_score: result.homeGoals,
          away_score: result.awayGoals,
          home_penalties: result.penaltyHomeGoals,
          away_penalties: result.penaltyAwayGoals,
          status: 'played',
          winner_team_id: winnerId,
          updated_at: new Date().toISOString(),
          match_data: {
            events: result.events,
            stats: result.stats,
            playerRatings: result.playerRatings,
            goalScorers: result.goalScorers,
            manOfTheMatch: result.manOfTheMatch,
          } as any
        }).eq('id', String(matchId));

        // Update cup player stats
        await updateStatsForCompetition('cup', cupMatch.cup_id, cupMatch.home_team_id, allPlayers.filter(p => p.team === 'home'), result.awayGoals, result.homeGoals > result.awayGoals);
        await updateStatsForCompetition('cup', cupMatch.cup_id, cupMatch.away_team_id, allPlayers.filter(p => p.team === 'away'), result.homeGoals, result.awayGoals > result.homeGoals);
      }

      // 3.3. Custom Tournament Logic
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

      // 3.4. Global/World Stats (Always update for any competitive match)
      if (isLeagueMatch || isCupMatch) {
        // Find or create global league entry if needed, but usually we just want to update world_player_stats
        // We can use a default league_id if not a league match
        const worldLeagueId = leagueMatch?.league_id || '00000000-0000-0000-0000-000000000000';
        for (const p of allPlayers) {
          if (!p.isOnPitch && p.goals === 0) continue;
          await adminClient.rpc('upsert_world_player_stats', {
            _player_id: p.id,
            _team_name: p.team === 'home' ? effHomeTeam : effAwayTeam,
            _league_id: worldLeagueId,
            _goals: p.goals,
            _assists: p.assists,
            _rating: p.rating,
            _is_mvp: result.manOfTheMatch === p.name
          });
        }
      }
    } catch (err) {
      console.error('[Sync] Error updating statistics:', err);
    }

    // 4. LOG HISTORY & REPORTS
    await adminClient.from('match_history').insert({
      user_id: userId,
      live_match_id: matchRow.id,
      home_team: effHomeTeam,
      away_team: effAwayTeam,
      home_goals: result.homeGoals,
      away_goals: result.awayGoals,
      is_home: callerIsHomeOnInsert,
      competition: competition || 'Amistoso',
      stadium_name: resolvedStadiumName,
      stadium_capacity: resolvedStadiumCapacity,
      events: result.events as any,
      stats: result.stats as any,
      player_ratings: result.playerRatings as any,
      home_players: effHomePlayers as any,
      goal_scorers: result.goalScorers as any,
      man_of_the_match: result.manOfTheMatch,
      match_type: competition === 'Amistoso' ? 'friendly' : 'competitive',
    });

    await adminClient.from('match_reports').insert({
      user_id: userId,
      home_team: effHomeTeam,
      away_team: effAwayTeam,
      home_goals: result.homeGoals,
      away_goals: result.awayGoals,
      competition: competition || 'Amistoso',
      result: result.result,
      ranking_impact: result.rankingChange,
      report_data: result.reportData as any,
    });


    return new Response(JSON.stringify({
      success: true, matchDbId: matchRow.id,
      homeGoals: result.homeGoals, awayGoals: result.awayGoals,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[Match] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
