/**
 * useAutoSimulator — 100% client-side auto-simulation, ZERO time/lobby gating.
 *
 * Behavior (per product spec "Toda partida criada deve simular até o fim"):
 *   • Any `league_matches` row with status='scheduled' is simulated IMMEDIATELY,
 *     regardless of auto_sim_at, lobby, players-joined or any other flag.
 *   • Any `friendly_invites` row with status='accepted' and no match_result is
 *     simulated IMMEDIATELY, regardless of match_date.
 *   • Any `custom_tournament_matches` row with status='scheduled' is simulated
 *     IMMEDIATELY, regardless of scheduled_at — no "Aguardando horário" ever.
 *
 * Trigger sources (any one of them is enough — the others are failsafes):
 *   1. Initial scan on mount.
 *   2. Periodic scan every 5s (failsafe).
 *   3. Realtime subscription on INSERT/UPDATE of both tables.
 *   4. Public `triggerAutoSim()` helper that callers can fire right after
 *      creating a match (instant kickoff, no waiting).
 *   5. `online` event re-scan when connectivity returns.
 *
 * A localStorage lock (60s TTL) prevents duplicate simulations across tabs.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SCAN_INTERVAL_MS = 5_000;    // 5s failsafe
const LOCK_TTL_MS = 60_000;        // 60s
const MAX_PER_RUN = 30;            // soft cap per scan

// ───────────────── helpers ─────────────────
function poisson(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function simulate(homeStr: number, awayStr: number) {
  const hs = Math.max(30, homeStr) * 1.15; // home advantage
  const as = Math.max(30, awayStr);
  const total = hs + as;
  const baseGoals = 2.6;
  const lambdaHome = baseGoals * (hs / total) * 1.05;
  const lambdaAway = baseGoals * (as / total) * 0.95;
  return {
    home: Math.min(7, poisson(lambdaHome)),
    away: Math.min(7, poisson(lambdaAway)),
  };
}

function genEvents(hg: number, ag: number, homeName: string, awayName: string) {
  const events: Array<{ minute: number; type: string; team: 'home' | 'away'; isGoal: boolean; playerName: string; description: string }> = [];
  const used = new Set<number>();
  const add = (team: 'home' | 'away', name: string) => {
    let m = 1; let tries = 0;
    do { m = Math.floor(Math.random() * 90) + 1; tries++; } while (used.has(m) && tries < 20);
    used.add(m);
    events.push({
      minute: m,
      type: 'goal',
      team,
      isGoal: true,
      playerName: 'Atacante',
      description: `⚽ GOOOL de ${name}!`,
    });
  };
  for (let i = 0; i < hg; i++) add('home', homeName);
  for (let i = 0; i < ag; i++) add('away', awayName);
  events.sort((a, b) => a.minute - b.minute);
  return events;
}

async function getStrength(userId: string | null): Promise<number> {
  if (!userId) return 60;
  const { data } = await supabase
    .from('game_saves')
    .select('club_data')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const players = (data?.club_data as any)?.players as any[] | undefined;
  if (!players || players.length === 0) return 60;
  const healthy = players.filter(p => !p.injured);
  const pool = (healthy.length ? healthy : players)
    .slice()
    .sort((a, b) => (b.overall || b.ovr || 0) - (a.overall || a.ovr || 0))
    .slice(0, 11);
  const sum = pool.reduce((s, p) => s + (p.overall || p.ovr || 60), 0);
  return Math.round(sum / Math.max(1, pool.length));
}

function tryLock(matchId: string): boolean {
  try {
    const key = `autosim_lock_${matchId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const expires = parseInt(raw, 10);
      if (Number.isFinite(expires) && expires > Date.now()) return false;
    }
    localStorage.setItem(key, String(Date.now() + LOCK_TTL_MS));
    return true;
  } catch { return true; }
}
function releaseLock(matchId: string) {
  try { localStorage.removeItem(`autosim_lock_${matchId}`); } catch { /* ignore */ }
}

async function notify(userId: string, opponent: string, mine: number, theirs: number, comp: string) {
  try {
    const result = mine > theirs ? '🟢 Vitória' : mine === theirs ? '🟡 Empate' : '🔴 Derrota';
    await supabase.from('user_notifications').insert({
      user_id: userId,
      type: 'match_auto_simulated',
      icon: '🤖',
      title: 'Partida simulada automaticamente',
      message: `${result} ${mine}x${theirs} vs ${opponent} (${comp})`,
      data: { auto_simulated: true, my_goals: mine, opp_goals: theirs, opponent, competition: comp },
    });
  } catch { /* ignore */ }
}

// ───────────────── league processing ─────────────────
async function processLeagueMatch(m: any) {
  if (!tryLock(m.id)) return false;
  try {
    const homeStr = await getStrength(m.home_user_id);
    const awayStr = await getStrength(m.away_user_id);
    const { home: hg, away: ag } = simulate(homeStr, awayStr);

    const { data: members } = await supabase
      .from('league_members')
      .select('user_id, club_name')
      .eq('league_id', m.league_id)
      .in('user_id', [m.home_user_id, m.away_user_id]);
    const homeName = members?.find(x => x.user_id === m.home_user_id)?.club_name || 'Mandante';
    const awayName = members?.find(x => x.user_id === m.away_user_id)?.club_name || 'Visitante';
    const events = genEvents(hg, ag, homeName, awayName);

    const { error } = await supabase
      .from('league_matches')
      .update({
        home_goals: hg,
        away_goals: ag,
        status: 'finished',
        played_at: new Date().toISOString(),
        match_data: { ...(m.match_data || {}), events, auto_simulated: true, home_name: homeName, away_name: awayName },
      })
      .eq('id', m.id)
      .eq('status', 'scheduled');
    if (error) return false;

    for (const u of [
      { uid: m.home_user_id, gf: hg, ga: ag, win: hg > ag, draw: hg === ag, loss: hg < ag },
      { uid: m.away_user_id, gf: ag, ga: hg, win: ag > hg, draw: hg === ag, loss: ag < hg },
    ]) {
      const { data: row } = await supabase
        .from('league_members')
        .select('points,wins,draws,losses,goals_for,goals_against,played')
        .eq('league_id', m.league_id).eq('user_id', u.uid).maybeSingle();
      if (!row) continue;
      await supabase.from('league_members').update({
        points: row.points + (u.win ? 3 : u.draw ? 1 : 0),
        wins: row.wins + (u.win ? 1 : 0),
        draws: row.draws + (u.draw ? 1 : 0),
        losses: row.losses + (u.loss ? 1 : 0),
        goals_for: row.goals_for + u.gf,
        goals_against: row.goals_against + u.ga,
        played: row.played + 1,
      }).eq('league_id', m.league_id).eq('user_id', u.uid);
    }

    await notify(m.home_user_id, awayName, hg, ag, 'Liga');
    await notify(m.away_user_id, homeName, ag, hg, 'Liga');
    return true;
  } finally {
    releaseLock(m.id);
  }
}

// ───────────────── friendly processing ─────────────────
async function processFriendly(f: any) {
  if (!tryLock(f.id)) return false;
  try {
    const homeIsSender = f.home_team_id === f.sender_id;
    const senderStr = await getStrength(f.sender_id);
    const receiverStr = await getStrength(f.receiver_id);
    const homeStr = homeIsSender ? senderStr : receiverStr;
    const awayStr = homeIsSender ? receiverStr : senderStr;
    const homeName = homeIsSender ? f.sender_club_name : f.receiver_club_name;
    const awayName = homeIsSender ? f.receiver_club_name : f.sender_club_name;
    const { home: hg, away: ag } = simulate(homeStr, awayStr);
    const events = genEvents(hg, ag, homeName, awayName);

    const { error } = await supabase
      .from('friendly_invites')
      .update({
        status: 'finished',
        match_result: {
          home_goals: hg, away_goals: ag, events,
          auto_simulated: true, home_name: homeName, away_name: awayName,
        },
      })
      .eq('id', f.id)
      .eq('status', 'accepted');
    if (error) return false;

    const senderGoals = homeIsSender ? hg : ag;
    const receiverGoals = homeIsSender ? ag : hg;
    await notify(f.sender_id, f.receiver_club_name, senderGoals, receiverGoals, 'Amistoso');
    await notify(f.receiver_id, f.sender_club_name, receiverGoals, senderGoals, 'Amistoso');
    return true;
  } finally {
    releaseLock(f.id);
  }
}

// ───────────────── tournament processing ─────────────────
async function getTournamentTeamStrength(t: { user_id: string | null; bot_strength: number | null }): Promise<number> {
  if (t.user_id) return await getStrength(t.user_id);
  return Math.max(30, Math.min(95, t.bot_strength || 60));
}

async function processTournamentMatch(m: any) {
  if (!tryLock(m.id)) return false;
  try {
    const { data: teams } = await supabase
      .from('custom_tournament_teams')
      .select('id, club_name, user_id, bot_strength, points, wins, draws, losses, goals_for, goals_against, played')
      .in('id', [m.home_team_id, m.away_team_id]);
    const home = teams?.find(t => t.id === m.home_team_id);
    const away = teams?.find(t => t.id === m.away_team_id);
    if (!home || !away) return false;

    const homeStr = await getTournamentTeamStrength(home);
    const awayStr = await getTournamentTeamStrength(away);
    const { home: hg, away: ag } = simulate(homeStr, awayStr);
    const events = genEvents(hg, ag, home.club_name, away.club_name);

    const { error } = await supabase
      .from('custom_tournament_matches')
      .update({
        home_goals: hg,
        away_goals: ag,
        status: 'finished',
        played_at: new Date().toISOString(),
        match_data: { ...(m.match_data || {}), events, auto_simulated: true, home_name: home.club_name, away_name: away.club_name },
      })
      .eq('id', m.id)
      .eq('status', 'scheduled');
    if (error) return false;

    // Update standings (only relevant for league/group stage; harmless for knockouts)
    for (const u of [
      { row: home, gf: hg, ga: ag, win: hg > ag, draw: hg === ag, loss: hg < ag },
      { row: away, gf: ag, ga: hg, win: ag > hg, draw: hg === ag, loss: ag < hg },
    ]) {
      await supabase.from('custom_tournament_teams').update({
        points: (u.row.points || 0) + (u.win ? 3 : u.draw ? 1 : 0),
        wins: (u.row.wins || 0) + (u.win ? 1 : 0),
        draws: (u.row.draws || 0) + (u.draw ? 1 : 0),
        losses: (u.row.losses || 0) + (u.loss ? 1 : 0),
        goals_for: (u.row.goals_for || 0) + u.gf,
        goals_against: (u.row.goals_against || 0) + u.ga,
        played: (u.row.played || 0) + 1,
      }).eq('id', u.row.id);
    }

    if (home.user_id) await notify(home.user_id, away.club_name, hg, ag, 'Campeonato');
    if (away.user_id) await notify(away.user_id, home.club_name, ag, hg, 'Campeonato');
    return true;
  } finally {
    releaseLock(m.id);
  }
}

// ───────────────── module-scope scan (so triggerAutoSim works without hook) ─────────────────
let scanInFlight = false;

async function runScan() {
  if (scanInFlight) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  scanInFlight = true;
  try {
    // Liga: TODA partida agendada — sem filtro de tempo, sem lobby, sem joined.
    const { data: leagues } = await supabase
      .from('league_matches')
      .select('id, league_id, home_user_id, away_user_id, match_data')
      .eq('status', 'scheduled')
      .limit(MAX_PER_RUN);

    for (const m of leagues || []) {
      try { await processLeagueMatch(m); } catch (err) { console.warn('[autosim] league error:', err); }
    }

    // Amistosos: TODO convite aceito sem resultado — sem esperar match_date.
    const { data: friendlies } = await supabase
      .from('friendly_invites')
      .select('id, sender_id, receiver_id, sender_club_name, receiver_club_name, home_team_id, match_date, match_result')
      .eq('status', 'accepted')
      .is('match_result', null)
      .limit(MAX_PER_RUN);

    for (const f of friendlies || []) {
      try { await processFriendly(f); } catch (err) { console.warn('[autosim] friendly error:', err); }
    }

    // Campeonatos (custom tournaments): TODA partida agendada — sem esperar scheduled_at.
    const { data: tournaments } = await supabase
      .from('custom_tournament_matches')
      .select('id, tournament_id, home_team_id, away_team_id, round, stage, match_data')
      .eq('status', 'scheduled')
      .limit(MAX_PER_RUN);

    for (const m of tournaments || []) {
      try { await processTournamentMatch(m); } catch (err) { console.warn('[autosim] tournament error:', err); }
    }
  } catch (err) {
    console.warn('[autosim] scan error:', err);
  } finally {
    scanInFlight = false;
  }
}

/**
 * Public helper — call this RIGHT AFTER creating a match (insert into
 * league_matches/friendly_invites) so the simulation kicks off in the same
 * tick, with no waiting and no lobby. Safe to call from anywhere.
 */
export function triggerAutoSim(): void {
  // Fire-and-forget; multiple parallel calls are gated by `scanInFlight`.
  void runScan();
}

// Expose globally too for legacy callers / debugging.
if (typeof window !== 'undefined') {
  (window as any).__triggerAutoSim = triggerAutoSim;
}

// ───────────────── hook ─────────────────
export function useAutoSimulator(userId: string | undefined) {
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    // Initial scan
    void runScan();

    // Failsafe periodic scan (5s).
    const interval = setInterval(() => { void runScan(); }, SCAN_INTERVAL_MS);

    // Reconnect → scan
    const onOnline = () => { void runScan(); };
    window.addEventListener('online', onOnline);

    // Realtime: simulate the moment a row is inserted/updated.
    let leagueChannel: ReturnType<typeof supabase.channel> | null = null;
    let friendlyChannel: ReturnType<typeof supabase.channel> | null = null;
    if (!subscribedRef.current) {
      subscribedRef.current = true;
      leagueChannel = supabase
        .channel('autosim-league-matches')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'league_matches' }, () => { void runScan(); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'league_matches' }, () => { void runScan(); })
        .subscribe();
      friendlyChannel = supabase
        .channel('autosim-friendly-invites')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendly_invites' }, () => { void runScan(); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friendly_invites' }, () => { void runScan(); })
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
      if (leagueChannel) supabase.removeChannel(leagueChannel);
      if (friendlyChannel) supabase.removeChannel(friendlyChannel);
      subscribedRef.current = false;
    };
  }, [userId]);
}
