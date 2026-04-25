import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function rng() { return Math.random(); }
function pick<T>(arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; }

function poissonSample(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}

interface TeamData {
  id: string;
  club_name: string;
  bot_strength: number;
  is_bot: boolean;
  bot_squad: any[] | null;
  user_id: string | null;
}

const EVENT_TYPES = {
  goals: ['foot_goal', 'header_goal'],
  chances: ['great_save', 'woodwork', 'long_shot_miss', 'header_miss', 'corner_danger'],
  fouls: ['dangerous_foul', 'midfield_foul', 'yellow_card'],
  possession: ['possession', 'dribble_ok', 'through_ball', 'crossing', 'long_pass', 'pressing', 'tackle'],
};

function generateBotSquad(strength: number): any[] {
  const positions = ['GOL', 'LAT', 'ZAG', 'ZAG', 'LAT', 'VOL', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA',
    'GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA', 'MEI', 'ZAG'];
  const firstNames = ['João', 'Pedro', 'Carlos', 'André', 'Felipe', 'Lucas', 'Rafael', 'Bruno',
    'Diego', 'Marcelo', 'Thiago', 'Leandro', 'Gustavo', 'Matheus', 'Gabriel', 'Daniel', 'Rodrigo', 'Victor', 'Alex'];
  const lastNames = ['Silva', 'Santos', 'Oliveira', 'Costa', 'Lima', 'Pereira', 'Souza', 'Ferreira',
    'Almeida', 'Rodrigues', 'Araújo', 'Barbosa', 'Ribeiro', 'Martins', 'Cardoso', 'Nascimento', 'Monteiro', 'Campos', 'Duarte'];
  return positions.map((pos, i) => {
    const variation = Math.floor(rng() * 15) - 7;
    const ovr = Math.max(40, Math.min(95, strength + variation));
    return { id: `bot-p-${i}-${Date.now()}`, name: `${firstNames[i]} ${lastNames[i]}`, position: pos, overall: ovr, age: 18 + Math.floor(rng() * 17) };
  });
}

function generateRichEvents(
  homeTeam: TeamData, awayTeam: TeamData,
  homeGoals: number, awayGoals: number
) {
  const homeStr = homeTeam.bot_strength || 60;
  const awayStr = awayTeam.bot_strength || 60;
  const homeSquad = Array.isArray(homeTeam.bot_squad) && homeTeam.bot_squad.length > 0 ? homeTeam.bot_squad : generateBotSquad(homeStr);
  const awaySquad = Array.isArray(awayTeam.bot_squad) && awayTeam.bot_squad.length > 0 ? awayTeam.bot_squad : generateBotSquad(awayStr);
  const homeAttackers = homeSquad.filter((p: any) => ['ATA', 'MEI', 'VOL'].includes(p.position));
  const awayAttackers = awaySquad.filter((p: any) => ['ATA', 'MEI', 'VOL'].includes(p.position));
  const homeDefenders = homeSquad.filter((p: any) => ['ZAG', 'LAT', 'GOL'].includes(p.position));
  const awayDefenders = awaySquad.filter((p: any) => ['ZAG', 'LAT', 'GOL'].includes(p.position));

  const events: any[] = [];
  const usedMinutes = new Set<number>([0, 45, 46]);

  function pickMinute(pool: number[]): number {
    const avail = pool.filter(m => !usedMinutes.has(m));
    if (!avail.length) return -1;
    const m = avail[Math.floor(rng() * avail.length)];
    usedMinutes.add(m);
    return m;
  }

  const firstHalf = Array.from({ length: 44 }, (_, i) => i + 1);
  const secondHalf = Array.from({ length: 44 }, (_, i) => i + 47);
  const allMinutes = [...firstHalf, ...secondHalf];

  events.push({ minute: 0, type: 'kickoff', description: `📢 ${homeTeam.club_name} x ${awayTeam.club_name} - Começa o jogo!`, team: 'neutral', animType: 'kickoff' });

  const goalScorers: any[] = [];
  const goalTypes = ['foot_goal', 'header_goal'];

  for (let i = 0; i < homeGoals; i++) {
    const min = pickMinute(allMinutes);
    if (min < 0) continue;
    const scorer = homeAttackers.length > 0 ? pick(homeAttackers) : { name: `Jogador ${i + 1}` };
    const assister = homeAttackers.length > 1 ? pick(homeAttackers.filter((p: any) => p.name !== scorer.name)) : null;
    const goalType = pick(goalTypes);
    const desc = goalType === 'header_goal'
      ? `⚽ GOL DE CABEÇA! ${scorer.name} sobe mais que todo mundo e cabeceia para o gol!${assister ? ` Cruzamento de ${assister.name}.` : ''}`
      : `⚽ GOL! ${scorer.name} finaliza com categoria para o gol de ${homeTeam.club_name}!${assister ? ` Assistência de ${assister.name}.` : ''}`;
    events.push({ minute: min, type: goalType, description: desc, team: 'home', playerName: scorer.name, assistName: assister?.name, isGoal: true, goalType: goalType === 'header_goal' ? 'Cabeçada' : 'Chute', animType: 'goal' });
    goalScorers.push({ minute: min, name: scorer.name, assist: assister?.name, team: 'home' });
  }

  for (let i = 0; i < awayGoals; i++) {
    const min = pickMinute(allMinutes);
    if (min < 0) continue;
    const scorer = awayAttackers.length > 0 ? pick(awayAttackers) : { name: `Jogador ${i + 1}` };
    const assister = awayAttackers.length > 1 ? pick(awayAttackers.filter((p: any) => p.name !== scorer.name)) : null;
    const goalType = pick(goalTypes);
    const desc = goalType === 'header_goal'
      ? `⚽ GOL DE CABEÇA! ${scorer.name} sobe mais que todo mundo e cabeceia para o gol!${assister ? ` Cruzamento de ${assister.name}.` : ''}`
      : `⚽ GOL! ${scorer.name} finaliza com categoria para o gol de ${awayTeam.club_name}!${assister ? ` Assistência de ${assister.name}.` : ''}`;
    events.push({ minute: min, type: goalType, description: desc, team: 'away', playerName: scorer.name, assistName: assister?.name, isGoal: true, goalType: goalType === 'header_goal' ? 'Cabeçada' : 'Chute', animType: 'goal' });
    goalScorers.push({ minute: min, name: scorer.name, assist: assister?.name, team: 'away' });
  }

  if (rng() < 0.12) {
    const min = pickMinute(allMinutes.filter(m => m >= 20));
    if (min > 0) {
      const team: 'home' | 'away' = rng() < 0.55 ? 'home' : 'away';
      const squad = team === 'home' ? homeAttackers : awayAttackers;
      const kicker = squad.length > 0 ? pick(squad) : { name: 'Jogador' };
      const isGoal = rng() < 0.75;
      if (isGoal) {
        events.push({ minute: min, type: 'penalty_goal', description: `⚽ GOL DE PÊNALTI! ${kicker.name} bate firme e marca!`, team, playerName: kicker.name, isGoal: true, goalType: 'Pênalti', animType: 'penalty' });
      } else {
        events.push({ minute: min, type: 'penalty_miss', description: `❌ PÊNALTI PERDIDO! ${kicker.name} isola a bola!`, team, playerName: kicker.name, isGoal: false, animType: 'penalty' });
      }
    }
  }

  const chanceCount = 4 + Math.floor(rng() * 6);
  for (let i = 0; i < chanceCount; i++) {
    const min = pickMinute(allMinutes);
    if (min < 0) continue;
    const team: 'home' | 'away' = rng() < 0.55 ? 'home' : 'away';
    const attackers = team === 'home' ? homeAttackers : awayAttackers;
    const player = attackers.length > 0 ? pick(attackers) : { name: 'Jogador' };
    const chanceType = pick(EVENT_TYPES.chances);
    const descriptions: Record<string, string> = {
      great_save: `🧤 GRANDE DEFESA! O goleiro faz uma defesa espetacular em chute de ${player.name}!`,
      woodwork: `🥅 NA TRAVE! ${player.name} acerta o poste! Quase gol!`,
      long_shot_miss: `🎯 ${player.name} arrisca de fora da área, mas a bola sai pela linha de fundo.`,
      header_miss: `🎯 ${player.name} cabeceia, mas a bola passa por cima do gol!`,
      corner_danger: `🏳️ Escanteio perigoso! ${player.name} cabeceia na primeira trave, o goleiro defende!`,
    };
    events.push({ minute: min, type: chanceType, description: descriptions[chanceType] || `Lance de ${player.name}`, team, playerName: player.name, animType: chanceType === 'great_save' ? 'save' : 'chance' });
  }

  const foulCount = 3 + Math.floor(rng() * 5);
  for (let i = 0; i < foulCount; i++) {
    const min = pickMinute(allMinutes);
    if (min < 0) continue;
    const team: 'home' | 'away' = rng() < 0.5 ? 'home' : 'away';
    const defenders = team === 'home' ? homeDefenders : awayDefenders;
    const allP = team === 'home' ? homeSquad : awaySquad;
    const player = defenders.length > 0 ? pick(defenders) : allP.length > 0 ? pick(allP) : { name: 'Jogador' };
    const foulType = pick(EVENT_TYPES.fouls);
    const descriptions: Record<string, string> = {
      dangerous_foul: `⚠️ Falta perigosa de ${player.name}! Livre direto na entrada da área.`,
      midfield_foul: `⚠️ ${player.name} comete falta no meio de campo.`,
      yellow_card: `🟡 CARTÃO AMARELO para ${player.name}! Entrada imprudente.`,
    };
    events.push({ minute: min, type: foulType, description: descriptions[foulType] || `Falta de ${player.name}`, team, playerName: player.name, animType: foulType === 'yellow_card' ? 'card' : 'foul' });
  }

  const possCount = 8 + Math.floor(rng() * 8);
  for (let i = 0; i < possCount; i++) {
    const min = pickMinute(allMinutes);
    if (min < 0) continue;
    const team: 'home' | 'away' = rng() < 0.5 ? 'home' : 'away';
    const squad = team === 'home' ? homeSquad : awaySquad;
    const player = squad.length > 0 ? pick(squad) : { name: 'Jogador' };
    const possType = pick(EVENT_TYPES.possession);
    const descriptions: Record<string, string> = {
      possession: `${(team === 'home' ? homeTeam : awayTeam).club_name} troca passes no campo ofensivo.`,
      dribble_ok: `💨 ${player.name} dribla com classe e avança!`,
      through_ball: `⚡ ${player.name} faz um lançamento preciso!`,
      crossing: `↗️ ${player.name} cruza na área!`,
      long_pass: `${player.name} faz um lançamento longo preciso.`,
      pressing: `${(team === 'home' ? homeTeam : awayTeam).club_name} pressiona alto no campo adversário.`,
      tackle: `🦶 ${player.name} desarma com precisão!`,
    };
    events.push({ minute: min, type: possType, description: descriptions[possType] || `Lance de ${player.name}`, team, playerName: player.name });
  }

  events.push({ minute: 45, type: 'halftime', description: `⏸ Intervalo! ${homeTeam.club_name} ${goalScorers.filter(g => g.team === 'home' && g.minute <= 45).length} x ${goalScorers.filter(g => g.team === 'away' && g.minute <= 45).length} ${awayTeam.club_name}`, team: 'neutral', animType: 'halftime' });
  events.push({ minute: 46, type: 'kickoff', description: `📢 Começa o segundo tempo!`, team: 'neutral', animType: 'kickoff' });
  events.push({ minute: 90, type: 'final_whistle', description: `🏁 Fim de jogo! ${homeTeam.club_name} ${homeGoals} x ${awayGoals} ${awayTeam.club_name}`, team: 'neutral', animType: 'final' });

  events.sort((a, b) => a.minute - b.minute);

  const playerRatings: Record<string, number> = {};
  for (const p of homeSquad) {
    playerRatings[p.id || p.name] = clamp(parseFloat((6 + rng() * 3 + (homeGoals > awayGoals ? 0.5 : -0.3)).toFixed(1)), 4, 10);
  }
  for (const p of awaySquad) {
    playerRatings[p.id || p.name] = clamp(parseFloat((6 + rng() * 3 + (awayGoals > homeGoals ? 0.5 : -0.3)).toFixed(1)), 4, 10);
  }

  const stats = {
    possession: [clamp(45 + (homeStr - awayStr) * 0.3 + (rng() * 10 - 5), 30, 70), 0] as [number, number],
    shots: [clamp(Math.floor(3 + homeStr / 15 + rng() * 5), 2, 20), clamp(Math.floor(3 + awayStr / 15 + rng() * 5), 2, 20)],
    shotsOnTarget: [clamp(Math.floor(1 + homeGoals + rng() * 3), 0, 15), clamp(Math.floor(1 + awayGoals + rng() * 3), 0, 15)],
    fouls: [Math.floor(5 + rng() * 12), Math.floor(5 + rng() * 12)],
    corners: [Math.floor(1 + rng() * 7), Math.floor(1 + rng() * 7)],
    yellowCards: [0, 0] as [number, number],
    redCards: [0, 0] as [number, number],
    passes: [Math.floor(150 + rng() * 200), Math.floor(150 + rng() * 200)],
    tackles: [Math.floor(5 + rng() * 10), Math.floor(5 + rng() * 10)],
    saves: [Math.floor(1 + rng() * 5), Math.floor(1 + rng() * 5)],
    offsides: [Math.floor(rng() * 5), Math.floor(rng() * 5)],
  };
  stats.possession[1] = 100 - stats.possession[0];
  for (const ev of events) {
    if (ev.type === 'yellow_card') stats.yellowCards[ev.team === 'home' ? 0 : 1]++;
  }

  return { events, goalScorers, playerRatings, homePlayers: homeSquad, stats };
}

function simulateMatch(homeTeam: TeamData, awayTeam: TeamData) {
  const homeStr = homeTeam.bot_strength || 60;
  const awayStr = awayTeam.bot_strength || 60;
  const homeLambda = clamp((homeStr / 50) * 1.4 + 0.15, 0.3, 4.5);
  const awayLambda = clamp((awayStr / 50) * 1.2, 0.2, 4.0);
  const homeGoals = poissonSample(homeLambda);
  const awayGoals = poissonSample(awayLambda);
  const result = generateRichEvents(homeTeam, awayTeam, homeGoals, awayGoals);
  return { homeGoals, awayGoals, ...result };
}

// ── Knockout tie-breaker (extra time → penalty shootout) ──
// Applied AFTER 90' regulation when match cannot end in a draw.
function resolveKnockoutTieBreaker(
  baseHome: number, baseAway: number,
  homeStr: number, awayStr: number,
  homeName: string, awayName: string,
) {
  if (baseHome !== baseAway) {
    return {
      homeGoalsET: 0, awayGoalsET: 0,
      hadExtraTime: false, hadShootout: false,
      shootoutHome: 0, shootoutAway: 0,
      winner: (baseHome > baseAway ? 'home' : 'away') as 'home' | 'away',
      events: [] as any[],
    };
  }
  const events: any[] = [];
  const total = Math.max(60, homeStr + awayStr);
  const homeGoalsET = Math.min(3, poissonSample(2.6 * (homeStr * 1.05 / total) * 0.34));
  const awayGoalsET = Math.min(3, poissonSample(2.6 * (awayStr / total) * 0.34));

  events.push({ minute: 91, type: 'extra_time_start', team: 'neutral', description: `⏱️ Empate em 90'! Vamos para a prorrogação.`, animType: 'kickoff' });

  const used = new Set<number>();
  const pickMin = () => {
    let m = 91 + Math.floor(rng() * 30); let tries = 0;
    while (used.has(m) && tries < 30) { m = 91 + Math.floor(rng() * 30); tries++; }
    used.add(m);
    return m;
  };
  for (let i = 0; i < homeGoalsET; i++) events.push({ minute: pickMin(), type: 'foot_goal', team: 'home', isGoal: true, playerName: 'Atacante', description: `⚽ GOL na prorrogação para ${homeName}!`, animType: 'goal' });
  for (let i = 0; i < awayGoalsET; i++) events.push({ minute: pickMin(), type: 'foot_goal', team: 'away', isGoal: true, playerName: 'Atacante', description: `⚽ GOL na prorrogação para ${awayName}!`, animType: 'goal' });
  events.push({ minute: 120, type: 'extra_time_end', team: 'neutral', description: `⏸️ Fim da prorrogação: ${baseHome + homeGoalsET} x ${baseAway + awayGoalsET}.`, animType: 'final' });

  const totalH = baseHome + homeGoalsET;
  const totalA = baseAway + awayGoalsET;
  if (totalH !== totalA) {
    return {
      homeGoalsET, awayGoalsET,
      hadExtraTime: true, hadShootout: false,
      shootoutHome: 0, shootoutAway: 0,
      winner: (totalH > totalA ? 'home' : 'away') as 'home' | 'away',
      events,
    };
  }

  events.push({ minute: 121, type: 'penalty_shootout_start', team: 'neutral', description: `🎯 Prorrogação não decidiu. Vamos para os pênaltis!`, animType: 'kickoff' });

  const homeConv = Math.min(0.92, 0.72 + (homeStr - 60) * 0.004);
  const awayConv = Math.min(0.92, 0.72 + (awayStr - 60) * 0.004);
  let sH = 0, sA = 0; let kickMin = 121;
  for (let i = 0; i < 5; i++) {
    const hs = rng() < homeConv; if (hs) sH++;
    events.push({ minute: kickMin++, type: hs ? 'penalty_shootout' : 'penalty_shootout_miss', team: 'home', isGoal: hs, animType: 'penalty', description: hs ? `🎯 ${homeName} converte (${sH}-${sA}).` : `❌ ${homeName} desperdiça (${sH}-${sA}).` });
    const as_ = rng() < awayConv; if (as_) sA++;
    events.push({ minute: kickMin++, type: as_ ? 'penalty_shootout' : 'penalty_shootout_miss', team: 'away', isGoal: as_, animType: 'penalty', description: as_ ? `🎯 ${awayName} converte (${sH}-${sA}).` : `❌ ${awayName} desperdiça (${sH}-${sA}).` });
    const remaining = 5 - (i + 1);
    if (Math.abs(sH - sA) > remaining) break;
  }
  while (sH === sA) {
    const hs = rng() < homeConv; if (hs) sH++;
    events.push({ minute: kickMin++, type: hs ? 'penalty_shootout' : 'penalty_shootout_miss', team: 'home', isGoal: hs, animType: 'penalty', description: hs ? `🎯 Morte súbita: ${homeName} marca (${sH}-${sA}).` : `❌ Morte súbita: ${homeName} para no goleiro (${sH}-${sA}).` });
    const as_ = rng() < awayConv; if (as_) sA++;
    events.push({ minute: kickMin++, type: as_ ? 'penalty_shootout' : 'penalty_shootout_miss', team: 'away', isGoal: as_, animType: 'penalty', description: as_ ? `🎯 Morte súbita: ${awayName} marca (${sH}-${sA}).` : `❌ Morte súbita: ${awayName} para no goleiro (${sH}-${sA}).` });
  }
  const winner: 'home' | 'away' = sH > sA ? 'home' : 'away';
  events.push({ minute: kickMin, type: 'penalty_shootout_end', team: 'neutral', description: `🏆 ${winner === 'home' ? homeName : awayName} vence nos pênaltis ${sH}x${sA}!`, animType: 'final' });
  return { homeGoalsET, awayGoalsET, hadExtraTime: true, hadShootout: true, shootoutHome: sH, shootoutAway: sA, winner, events };
}

function isKnockoutStageStr(stage: string | null | undefined): boolean {
  if (!stage) return false;
  const s = String(stage).toLowerCase();
  if (s.startsWith('grupo')) return false;
  if (s === 'league' || s === 'liga' || s === 'group') return false;
  return true;
}

// ══════════════════════════════════════════════
// LEAGUE PROCESSING — auto-simulate league rounds
// ══════════════════════════════════════════════

function calculateSquadStrength(squadData: any[]): number {
  if (!Array.isArray(squadData) || squadData.length === 0) return 55;
  const starters = squadData.slice(0, 11);
  const overalls = starters.map((p: any) => p.overall || p.ovr || 50);
  if (overalls.length === 0) return 55;
  return Math.round(overalls.reduce((a: number, b: number) => a + b, 0) / overalls.length);
}

async function processLeagueMatches(supabase: any, now: Date) {
  const nowISO = now.toISOString();
  let leagueProcessed = 0;

  // Find league matches that are scheduled and past their time
  const { data: dueLeagueMatches, error: leagueErr } = await supabase
    .from('league_matches')
    .select('*')
    .eq('status', 'scheduled')
    .order('created_at', { ascending: true })
    .limit(100);

  if (leagueErr || !dueLeagueMatches || dueLeagueMatches.length === 0) {
    return leagueProcessed;
  }

  // Get all relevant leagues to check match_time
  const leagueIds = [...new Set(dueLeagueMatches.map((m: any) => m.league_id))];
  const { data: leagues } = await supabase
    .from('multiplayer_leagues')
    .select('id, match_time, season_status, tier, tier_level, country')
    .in('id', leagueIds);

  const leagueMap = new Map((leagues || []).map((l: any) => [l.id, l]));

  // Get all league members for strength/squad lookup
  const { data: allMembers } = await supabase
    .from('league_members')
    .select('user_id, league_id, club_name, club_logo')
    .in('league_id', leagueIds);

  // Get league squads
  const { data: allSquads } = await supabase
    .from('league_squads')
    .select('user_id, league_id, squad_data')
    .in('league_id', leagueIds);

  // ── Identify human players (those who have game_saves) ──
  const allUserIds = [...new Set(dueLeagueMatches.flatMap((m: any) => [m.home_user_id, m.away_user_id]))];
  const { data: humanSaves } = await supabase
    .from('game_saves')
    .select('user_id')
    .in('user_id', allUserIds);
  const humanUserIds = new Set((humanSaves || []).map((s: any) => s.user_id));

  const memberMap = new Map<string, any>();
  for (const m of (allMembers || [])) {
    memberMap.set(`${m.league_id}:${m.user_id}`, m);
  }
  const squadMap = new Map<string, any>();
  for (const s of (allSquads || [])) {
    squadMap.set(`${s.league_id}:${s.user_id}`, s);
  }

  for (const match of dueLeagueMatches) {
    const league = leagueMap.get(match.league_id);
    if (!league || league.season_status !== 'in_progress') continue;

    // Check if match_time has passed today
    const matchTime = league.match_time || '20:00';
    const [mH, mM] = matchTime.split(':').map(Number);
    const todayMatchTime = new Date(now);
    todayMatchTime.setHours(mH, mM, 0, 0);

    // ── Human player check ──
    const homeIsHuman = humanUserIds.has(match.home_user_id);
    const awayIsHuman = humanUserIds.has(match.away_user_id);
    const hasHuman = homeIsHuman || awayIsHuman;

    if (hasHuman) {
      // Humans NEVER auto-simulate after 5min anymore.
      // They have a full 48h window to play manually.
      const hoursSinceMatchTime = (now.getTime() - todayMatchTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceMatchTime < 48) {
        continue; // Skip — wait for manual play
      }
      console.log(`[League] Auto-simulating match ${match.id} after 48h timeout (human did not play)`);
    } else {
      // Bot vs bot: wait at least 30 minutes after match_time before auto-simulating
      // (gives time for the scheduled cron to fire and avoids racing the schedule)
      if (now.getTime() < todayMatchTime.getTime() + 30 * 60 * 1000) continue;
    }

    const homeMember = memberMap.get(`${match.league_id}:${match.home_user_id}`);
    const awayMember = memberMap.get(`${match.league_id}:${match.away_user_id}`);
    if (!homeMember || !awayMember) continue;

    const homeSquad = squadMap.get(`${match.league_id}:${match.home_user_id}`);
    const awaySquad = squadMap.get(`${match.league_id}:${match.away_user_id}`);

    // Determine strength from squad data or tier-based default
    const tierStrength: Record<string, number> = {
      nacional: 70, regional: 60, pre_regional: 50, varzea: 45,
    };
    const baseStr = tierStrength[league.tier] || 55;

    // Use real squad strength if available, otherwise tier default
    const homeStr = homeSquad?.squad_data ? calculateSquadStrength(homeSquad.squad_data) : baseStr + Math.floor(rng() * 10);
    const awayStr = awaySquad?.squad_data ? calculateSquadStrength(awaySquad.squad_data) : baseStr + Math.floor(rng() * 10) - 3;

    const homeTeam: TeamData = {
      id: match.home_user_id,
      club_name: homeMember.club_name || 'Casa',
      bot_strength: homeStr,
      is_bot: !homeIsHuman,
      bot_squad: homeSquad?.squad_data || null,
      user_id: match.home_user_id,
    };
    const awayTeam: TeamData = {
      id: match.away_user_id,
      club_name: awayMember.club_name || 'Visitante',
      bot_strength: awayStr,
      is_bot: !awayIsHuman,
      bot_squad: awaySquad?.squad_data || null,
      user_id: match.away_user_id,
    };

    const result = simulateMatch(homeTeam, awayTeam);

    await supabase.from('league_matches').update({
      home_goals: result.homeGoals,
      away_goals: result.awayGoals,
      match_data: {
        events: result.events,
        goal_scorers: result.goalScorers,
        player_ratings: result.playerRatings,
        home_players: result.homePlayers,
        stats: result.stats,
      },
      status: 'played',
      played_at: nowISO,
    }).eq('id', match.id);

    // Update standings
    const homePoints = result.homeGoals > result.awayGoals ? 3 : result.homeGoals === result.awayGoals ? 1 : 0;
    const awayPoints = result.awayGoals > result.homeGoals ? 3 : result.homeGoals === result.awayGoals ? 1 : 0;

    await supabase.rpc('update_league_standings', {
      _league_id: match.league_id,
      _home_user_id: match.home_user_id,
      _away_user_id: match.away_user_id,
      _home_goals: result.homeGoals,
      _away_goals: result.awayGoals,
    }).catch(() => {});

    // Manual standings update as fallback
    const { data: homeLm } = await supabase
      .from('league_members')
      .select('*')
      .eq('league_id', match.league_id)
      .eq('user_id', match.home_user_id)
      .single();

    if (homeLm) {
      await supabase.from('league_members').update({
        played: (homeLm.played || 0) + 1,
        wins: (homeLm.wins || 0) + (homePoints === 3 ? 1 : 0),
        draws: (homeLm.draws || 0) + (homePoints === 1 ? 1 : 0),
        losses: (homeLm.losses || 0) + (homePoints === 0 ? 1 : 0),
        goals_for: (homeLm.goals_for || 0) + result.homeGoals,
        goals_against: (homeLm.goals_against || 0) + result.awayGoals,
        points: (homeLm.points || 0) + homePoints,
      }).eq('id', homeLm.id);
    }

    const { data: awayLm } = await supabase
      .from('league_members')
      .select('*')
      .eq('league_id', match.league_id)
      .eq('user_id', match.away_user_id)
      .single();

    if (awayLm) {
      await supabase.from('league_members').update({
        played: (awayLm.played || 0) + 1,
        wins: (awayLm.wins || 0) + (awayPoints === 3 ? 1 : 0),
        draws: (awayLm.draws || 0) + (awayPoints === 1 ? 1 : 0),
        losses: (awayLm.losses || 0) + (awayPoints === 0 ? 1 : 0),
        goals_for: (awayLm.goals_for || 0) + result.awayGoals,
        goals_against: (awayLm.goals_against || 0) + result.homeGoals,
        points: (awayLm.points || 0) + awayPoints,
      }).eq('id', awayLm.id);
    }

    leagueProcessed++;
  }

  return leagueProcessed;
}

// ══════════════════════════════════════════════
// CUP PROCESSING — auto-simulate cup matches
// ══════════════════════════════════════════════

async function processCupMatches(supabase: any, now: Date) {
  const nowISO = now.toISOString();
  let cupProcessed = 0;

  const { data: dueCupMatches } = await supabase
    .from('cup_matches')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', nowISO)
    .order('scheduled_at', { ascending: true })
    .limit(50);

  if (!dueCupMatches || dueCupMatches.length === 0) return cupProcessed;

  const cupIds = [...new Set(dueCupMatches.map((m: any) => m.cup_id))];

  const { data: allCupTeams } = await supabase
    .from('cup_teams')
    .select('*')
    .in('cup_id', cupIds);

  const cupTeamsMap: Record<string, any[]> = {};
  for (const t of (allCupTeams || [])) {
    if (!cupTeamsMap[t.cup_id]) cupTeamsMap[t.cup_id] = [];
    cupTeamsMap[t.cup_id].push(t);
  }

  for (const match of dueCupMatches) {
    const teams = cupTeamsMap[match.cup_id] || [];
    const homeTeam = teams.find((t: any) => t.id === match.home_team_id);
    const awayTeam = teams.find((t: any) => t.id === match.away_team_id);
    if (!homeTeam || !awayTeam) continue;

    const home: TeamData = {
      id: homeTeam.id,
      club_name: homeTeam.club_name,
      bot_strength: homeTeam.bot_strength || 60,
      is_bot: homeTeam.is_bot,
      bot_squad: null,
      user_id: homeTeam.user_id,
    };
    const away: TeamData = {
      id: awayTeam.id,
      club_name: awayTeam.club_name,
      bot_strength: awayTeam.bot_strength || 60,
      is_bot: awayTeam.is_bot,
      bot_squad: null,
      user_id: awayTeam.user_id,
    };

    const result = simulateMatch(home, away);

    // Cup matches are ALWAYS knockout — apply ET → penalties when tied.
    const tb = resolveKnockoutTieBreaker(
      result.homeGoals, result.awayGoals,
      home.bot_strength, away.bot_strength,
      home.club_name, away.club_name,
    );
    const finalHome = result.homeGoals + tb.homeGoalsET;
    const finalAway = result.awayGoals + tb.awayGoalsET;
    const mergedEvents = [...result.events, ...tb.events];

    await supabase.from('cup_matches').update({
      home_goals: finalHome,
      away_goals: finalAway,
      match_data: {
        events: mergedEvents,
        goal_scorers: result.goalScorers,
        player_ratings: result.playerRatings,
        home_players: result.homePlayers,
        stats: result.stats,
        extra_time: tb.hadExtraTime,
        shootout: tb.hadShootout,
        shootout_home: tb.shootoutHome,
        shootout_away: tb.shootoutAway,
        knockout_winner: tb.winner,
      },
      status: 'played',
      played_at: nowISO,
    }).eq('id', match.id);

    // Eliminate loser — ET/shootout always produces a definitive winner now.
    const winnerId = tb.winner === 'home' ? homeTeam.id : awayTeam.id;
    const loserId = winnerId === homeTeam.id ? awayTeam.id : homeTeam.id;

    await supabase.from('cup_teams').update({ eliminated: true }).eq('id', loserId);

    cupProcessed++;
  }

  // Advance cup rounds
  for (const cupId of cupIds) {
    const { data: cup } = await supabase
      .from('cup_competitions')
      .select('*')
      .eq('id', cupId)
      .single();
    if (!cup) continue;

    const { data: cupMatches } = await supabase
      .from('cup_matches')
      .select('*')
      .eq('cup_id', cupId)
      .order('round', { ascending: true });

    const currentRound = cup.current_round || 1;
    const roundMatches = (cupMatches || []).filter((m: any) => m.round === currentRound);
    const allPlayed = roundMatches.length > 0 && roundMatches.every((m: any) => m.status === 'played');

    if (allPlayed) {
      const winners: string[] = [];
      for (const m of roundMatches) {
        if ((m.home_goals ?? 0) > (m.away_goals ?? 0)) winners.push(m.home_team_id);
        else if ((m.away_goals ?? 0) > (m.home_goals ?? 0)) winners.push(m.away_team_id);
        else winners.push(rng() > 0.5 ? m.home_team_id : m.away_team_id);
      }

      if (winners.length > 1) {
        const nextRound = currentRound + 1;
        const shuffled = [...winners].sort(() => rng() - 0.5);
        const nextMatches: any[] = [];
        const baseDate = new Date(now.getTime() + 24 * 3600000);

        for (let i = 0; i < Math.floor(shuffled.length / 2); i++) {
          nextMatches.push({
            cup_id: cupId,
            home_team_id: shuffled[i * 2],
            away_team_id: shuffled[i * 2 + 1],
            round: nextRound,
            leg: 1,
            scheduled_at: new Date(baseDate.getTime() + i * 3600000).toISOString(),
            status: 'scheduled',
          });
        }

        if (nextMatches.length > 0) {
          await supabase.from('cup_matches').insert(nextMatches);
        }

        await supabase.from('cup_competitions').update({
          current_round: nextRound,
          total_rounds: nextRound,
        }).eq('id', cupId);
      } else if (winners.length === 1) {
        await supabase.from('cup_competitions').update({ status: 'finished' }).eq('id', cupId);
      }
    }
  }

  return cupProcessed;
}

// ══════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const nowISO = now.toISOString();

    // ── 1. Process custom tournament matches (existing logic) ──
    const { data: dueMatches, error: fetchErr } = await supabase
      .from('custom_tournament_matches')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', nowISO)
      .order('scheduled_at', { ascending: true })
      .limit(50);

    if (fetchErr) throw fetchErr;

    let tournamentProcessed = 0;

    if (dueMatches && dueMatches.length > 0) {
      const tournamentIds = [...new Set(dueMatches.map(m => m.tournament_id))];

      const { data: allTeams } = await supabase
        .from('custom_tournament_teams')
        .select('*')
        .in('tournament_id', tournamentIds);

      const teamsMap: Record<string, TeamData[]> = {};
      for (const t of (allTeams || [])) {
        if (!teamsMap[t.tournament_id]) teamsMap[t.tournament_id] = [];
        teamsMap[t.tournament_id].push(t as any);
      }

      // Fetch real squad strength for human players in custom tournaments
      const humanTournamentUserIds = [...new Set(
        (allTeams || []).filter((t: any) => !t.is_bot && t.user_id).map((t: any) => t.user_id)
      )];
      let tournamentGameSaves: any[] = [];
      if (humanTournamentUserIds.length > 0) {
        const { data: saves } = await supabase
          .from('game_saves')
          .select('user_id, club_data')
          .in('user_id', humanTournamentUserIds);
        tournamentGameSaves = saves || [];
      }
      const tournamentSaveMap = new Map(tournamentGameSaves.map((s: any) => [s.user_id, s]));

      for (const match of dueMatches) {
        const teams = teamsMap[match.tournament_id] || [];
        const homeTeam = teams.find(t => t.id === match.home_team_id);
        const awayTeam = teams.find(t => t.id === match.away_team_id);
        if (!homeTeam || !awayTeam) continue;

        const hasHuman = (!homeTeam.is_bot && homeTeam.user_id) || (!awayTeam.is_bot && awayTeam.user_id);

        if (hasHuman) {
          const scheduledAt = new Date(match.scheduled_at).getTime();
          const hoursSinceScheduled = (now.getTime() - scheduledAt) / (1000 * 60 * 60);
          if (hoursSinceScheduled < 48) continue;
          console.log(`[Tournament] Auto-simulating match ${match.id} after 48h timeout`);
        }

        // Enhance bot_strength for human players using their real squad
        const enhancedHome = { ...homeTeam };
        const enhancedAway = { ...awayTeam };
        if (!enhancedHome.is_bot && enhancedHome.user_id) {
          const save = tournamentSaveMap.get(enhancedHome.user_id);
          if (save?.club_data?.squad) {
            enhancedHome.bot_squad = save.club_data.squad;
            enhancedHome.bot_strength = calculateSquadStrength(save.club_data.squad);
          }
        }
        if (!enhancedAway.is_bot && enhancedAway.user_id) {
          const save = tournamentSaveMap.get(enhancedAway.user_id);
          if (save?.club_data?.squad) {
            enhancedAway.bot_squad = save.club_data.squad;
            enhancedAway.bot_strength = calculateSquadStrength(save.club_data.squad);
          }
        }

        const result = simulateMatch(enhancedHome, enhancedAway);

        await supabase.from('custom_tournament_matches').update({
          home_goals: result.homeGoals,
          away_goals: result.awayGoals,
          match_data: {
            events: result.events,
            goal_scorers: result.goalScorers,
            player_ratings: result.playerRatings,
            home_players: result.homePlayers,
            stats: result.stats,
          },
          status: 'played',
          played_at: nowISO,
        }).eq('id', match.id);

        const homePoints = result.homeGoals > result.awayGoals ? 3 : result.homeGoals === result.awayGoals ? 1 : 0;
        const awayPoints = result.awayGoals > result.homeGoals ? 3 : result.homeGoals === result.awayGoals ? 1 : 0;

        await supabase.from('custom_tournament_teams').update({
          played: (homeTeam as any).played + 1,
          wins: (homeTeam as any).wins + (homePoints === 3 ? 1 : 0),
          draws: (homeTeam as any).draws + (homePoints === 1 ? 1 : 0),
          losses: (homeTeam as any).losses + (homePoints === 0 ? 1 : 0),
          goals_for: (homeTeam as any).goals_for + result.homeGoals,
          goals_against: (homeTeam as any).goals_against + result.awayGoals,
          points: (homeTeam as any).points + homePoints,
        }).eq('id', homeTeam.id);

        await supabase.from('custom_tournament_teams').update({
          played: (awayTeam as any).played + 1,
          wins: (awayTeam as any).wins + (awayPoints === 3 ? 1 : 0),
          draws: (awayTeam as any).draws + (awayPoints === 1 ? 1 : 0),
          losses: (awayTeam as any).losses + (awayPoints === 0 ? 1 : 0),
          goals_for: (awayTeam as any).goals_for + result.awayGoals,
          goals_against: (awayTeam as any).goals_against + result.homeGoals,
          points: (awayTeam as any).points + awayPoints,
        }).eq('id', awayTeam.id);

        tournamentProcessed++;
      }

      // Knockout advancement for custom tournaments
      for (const tournamentId of tournamentIds) {
        const { data: tournament } = await supabase
          .from('custom_tournaments')
          .select('*')
          .eq('id', tournamentId)
          .single();

        if (!tournament || (tournament.format !== 'knockout' && tournament.format !== 'group_knockout')) continue;

        const { data: allMatches } = await supabase
          .from('custom_tournament_matches')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('round', { ascending: true });

        if (!allMatches) continue;

        const currentRound = tournament.current_round || 1;
        const roundMatches = allMatches.filter(m => m.round === currentRound);
        const allPlayed = roundMatches.every(m => m.status === 'played');

        if (allPlayed && roundMatches.length > 0) {
          const winners: string[] = [];
          for (const m of roundMatches) {
            if ((m.home_goals ?? 0) > (m.away_goals ?? 0)) winners.push(m.home_team_id);
            else if ((m.away_goals ?? 0) > (m.home_goals ?? 0)) winners.push(m.away_team_id);
            else winners.push(rng() > 0.5 ? m.home_team_id : m.away_team_id);

            const loserId = winners[winners.length - 1] === m.home_team_id ? m.away_team_id : m.home_team_id;
            await supabase.from('custom_tournament_teams').update({ eliminated: true }).eq('id', loserId);
          }

          if (winners.length > 1) {
            const nextRound = currentRound + 1;
            const shuffled = [...winners].sort(() => rng() - 0.5);
            const nextMatches: any[] = [];
            const intervalHours = tournament.match_interval_hours || 24;
            const matchTime = tournament.match_time || '20:00';
            const baseDate = new Date();

            for (let i = 0; i < Math.floor(shuffled.length / 2); i++) {
              const scheduledDate = new Date(baseDate.getTime() + (i + 1) * intervalHours * 3600000);
              const [hours, minutes] = matchTime.split(':').map(Number);
              scheduledDate.setHours(hours || 20, minutes || 0, 0, 0);

              nextMatches.push({
                tournament_id: tournamentId,
                home_team_id: shuffled[i * 2],
                away_team_id: shuffled[i * 2 + 1],
                round: nextRound,
                stage: `R${shuffled.length}`,
                scheduled_at: scheduledDate.toISOString(),
                status: 'scheduled',
              });
            }

            if (nextMatches.length > 0) {
              await supabase.from('custom_tournament_matches').insert(nextMatches);
            }

            await supabase.from('custom_tournaments').update({
              current_round: nextRound,
              total_rounds: nextRound,
            }).eq('id', tournamentId);
          } else if (winners.length === 1) {
            await supabase.from('custom_tournaments').update({ status: 'finished' }).eq('id', tournamentId);
          }
        }
      }
    }

    // ── 2. Process automatic league matches ──
    const leagueProcessed = await processLeagueMatches(supabase, now);

    // ── 3. Process cup matches ──
    const cupProcessed = await processCupMatches(supabase, now);

    return new Response(JSON.stringify({
      tournamentProcessed,
      leagueProcessed,
      cupProcessed,
      total: tournamentProcessed + leagueProcessed + cupProcessed,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error processing matches:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
