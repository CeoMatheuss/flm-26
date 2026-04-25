/**
 * useAutoSimulator — Controlled, single-match-per-cycle auto-simulation.
 *
 * NEW CONTRACT (anti-mass-simulation):
 *   • A scan processes AT MOST ONE match per cycle, then stops.
 *   • Only matches whose scheduled time has passed are eligible.
 *   • A 2s delay is enforced between cycles to avoid bursts.
 *   • Atomic update guard (`.eq('status', 'scheduled')`) prevents double sims.
 *   • localStorage lock + global in-flight flag prevent concurrent execution
 *     across tabs and within the same tab.
 *
 * Eligibility filters:
 *   - league_matches:           status='scheduled' AND auto_sim_at <= now()
 *   - friendly_invites:         status='accepted'  AND match_result IS NULL
 *                               AND (auto_sim_at <= now() OR match_date <= now())
 *   - custom_tournament_matches: status='scheduled' AND scheduled_at <= now()
 *
 * Trigger sources:
 *   1. Initial scan on mount.
 *   2. Periodic scan every 5s.
 *   3. Realtime subscription (INSERT/UPDATE).
 *   4. Public `triggerAutoSim()` helper.
 *   5. `online` event re-scan.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { resolveKnockout, isKnockoutStage } from '@/match/knockoutTieBreaker';

const SCAN_INTERVAL_MS = 5_000;       // 5s between scans
const POST_SIM_DELAY_MS = 2_000;      // 2s cooldown after a successful sim
const LOCK_TTL_MS = 60_000;           // 60s per-match lock
const TOLERANCE_MS = 5 * 60_000;      // 5min tolerance: only auto-sim if match_time + 5min has passed
const STUCK_AFTER_MS = 30 * 60_000;   // 30min: anything older = "stuck" → forced sim path
const WATCHDOG_INTERVAL_MS = 60_000;  // 60s: watchdog cadence

// ───────────────── helpers ─────────────────
function poisson(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function simulate(homeStr: number, awayStr: number) {
  const hs = Math.max(30, homeStr) * 1.15;
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
  // Use SECURITY DEFINER RPC so we don't need broad SELECT on game_saves.
  const { data, error } = await supabase.rpc('get_user_team_strength', { _user_id: userId });
  if (error || data == null) return 60;
  const n = Number(data);
  return Number.isFinite(n) && n > 0 ? n : 60;
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
async function processLeagueMatch(m: any): Promise<boolean> {
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

    // Atomic guard: status must still be 'scheduled' (prevents double-sim)
    const { error, data: updated } = await supabase
      .from('league_matches')
      .update({
        home_goals: hg,
        away_goals: ag,
        status: 'finished',
        played_at: new Date().toISOString(),
        match_data: { ...(m.match_data || {}), events, auto_simulated: true, simulated: true, home_name: homeName, away_name: awayName },
      })
      .eq('id', m.id)
      .eq('status', 'scheduled')
      .select('id');
    if (error || !updated || updated.length === 0) return false;

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
    console.info('[autosim] league match simulated', { id: m.id, score: `${hg}x${ag}` });
    return true;
  } finally {
    releaseLock(m.id);
  }
}

// ───────────────── friendly processing ─────────────────
async function processFriendly(f: any): Promise<boolean> {
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

    const { error, data: updated } = await supabase
      .from('friendly_invites')
      .update({
        status: 'finished',
        match_result: {
          home_goals: hg, away_goals: ag, events,
          auto_simulated: true, simulated: true, home_name: homeName, away_name: awayName,
        },
      })
      .eq('id', f.id)
      .eq('status', 'accepted')
      .select('id');
    if (error || !updated || updated.length === 0) return false;

    const senderGoals = homeIsSender ? hg : ag;
    const receiverGoals = homeIsSender ? ag : hg;
    await notify(f.sender_id, f.receiver_club_name, senderGoals, receiverGoals, 'Amistoso');
    await notify(f.receiver_id, f.sender_club_name, receiverGoals, senderGoals, 'Amistoso');
    console.info('[autosim] friendly simulated', { id: f.id, score: `${hg}x${ag}` });
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

async function processTournamentMatch(m: any): Promise<boolean> {
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
    let { home: hg, away: ag } = simulate(homeStr, awayStr);
    let events = genEvents(hg, ag, home.club_name, away.club_name);

    let tb: ReturnType<typeof resolveKnockout> | null = null;
    if (isKnockoutStage(m.stage) && hg === ag) {
      tb = resolveKnockout({
        homeGoals: hg, awayGoals: ag, homeStr, awayStr,
        homeName: home.club_name, awayName: away.club_name,
      });
      hg = hg + tb.homeGoalsET;
      ag = ag + tb.awayGoalsET;
      events = [...events, ...tb.events.map(e => ({ ...e, team: e.team as 'home' | 'away' }))] as any;
    }

    const { error, data: updated } = await supabase
      .from('custom_tournament_matches')
      .update({
        home_goals: hg,
        away_goals: ag,
        status: 'finished',
        played_at: new Date().toISOString(),
        match_data: {
          ...(m.match_data || {}),
          events,
          auto_simulated: true,
          simulated: true,
          home_name: home.club_name,
          away_name: away.club_name,
          extra_time: tb?.hadExtraTime ?? false,
          shootout: tb?.hadShootout ?? false,
          shootout_home: tb?.shootoutHome ?? 0,
          shootout_away: tb?.shootoutAway ?? 0,
          knockout_winner: tb?.winner ?? null,
        },
      })
      .eq('id', m.id)
      .eq('status', 'scheduled')
      .select('id');
    if (error || !updated || updated.length === 0) return false;

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
    console.info('[autosim] tournament match simulated', { id: m.id, score: `${hg}x${ag}` });
    return true;
  } finally {
    releaseLock(m.id);
  }
}

// ───────────────── single-match queue (1 sim per cycle) ─────────────────
let scanInFlight = false;
let cooldownUntil = 0;

// Cross-tab scan lock — prevents two browser tabs from both running a scan
// at the same instant. TTL is short so a crashed tab cannot block forever.
const SCAN_LOCK_KEY = 'autosim_scan_lock';
const SCAN_LOCK_TTL_MS = 8_000;

function tryAcquireScanLock(): boolean {
  try {
    const raw = localStorage.getItem(SCAN_LOCK_KEY);
    if (raw) {
      const expires = parseInt(raw, 10);
      if (Number.isFinite(expires) && expires > Date.now()) return false;
    }
    localStorage.setItem(SCAN_LOCK_KEY, String(Date.now() + SCAN_LOCK_TTL_MS));
    return true;
  } catch { return true; }
}
function releaseScanLock() {
  try { localStorage.removeItem(SCAN_LOCK_KEY); } catch { /* ignore */ }
}

/**
 * Fetches the NEXT eligible pending match (priority: league → friendly →
 * tournament). Only matches whose scheduled time has passed are returned.
 */
async function fetchNextEligibleMatch(): Promise<
  | { kind: 'league'; row: any }
  | { kind: 'friendly'; row: any }
  | { kind: 'tournament'; row: any }
  | null
> {
  // TOLERANCE: only auto-sim matches whose scheduled time passed AT LEAST 5 minutes ago.
  // Gives the player time to come back online before the system simulates for them.
  const nowIso = new Date(Date.now() - TOLERANCE_MS).toISOString();

  // 1) League — needs auto_sim_at <= now (or null + created long ago as fallback)
  const { data: league } = await supabase
    .from('league_matches')
    .select('id, league_id, home_user_id, away_user_id, match_data, auto_sim_at, created_at')
    .eq('status', 'scheduled')
    .lte('auto_sim_at', nowIso)
    .order('auto_sim_at', { ascending: true, nullsFirst: false })
    .limit(1);
  if (league && league.length > 0) return { kind: 'league', row: league[0] };

  // 2) Friendly — accepted with no result and time passed
  const { data: friendly } = await supabase
    .from('friendly_invites')
    .select('id, sender_id, receiver_id, sender_club_name, receiver_club_name, home_team_id, match_date, match_result, auto_sim_at')
    .eq('status', 'accepted')
    .is('match_result', null)
    .or(`auto_sim_at.lte.${nowIso},match_date.lte.${nowIso}`)
    .order('match_date', { ascending: true })
    .limit(1);
  if (friendly && friendly.length > 0) return { kind: 'friendly', row: friendly[0] };

  // 3) Tournament — scheduled and scheduled_at passed
  const { data: tournament } = await supabase
    .from('custom_tournament_matches')
    .select('id, tournament_id, home_team_id, away_team_id, round, stage, match_data, scheduled_at')
    .eq('status', 'scheduled')
    .lte('scheduled_at', nowIso)
    .order('scheduled_at', { ascending: true, nullsFirst: false })
    .limit(1);
  if (tournament && tournament.length > 0) return { kind: 'tournament', row: tournament[0] };

  return null;
}

/**
 * Tenta simular UMA partida do sistema mundial (world_matches) via edge function.
 * Retorna true se simulou algo. Erros são silenciosos — não devem quebrar o ciclo.
 */
async function runWorldScan(): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('world-match-simulator', {
      body: {},
    });
    if (error) {
      console.warn('[autosim/world] invoke error:', error.message);
      return false;
    }
    const processed = Number((data as any)?.processed) || 0;
    if (processed > 0) {
      console.info(`[autosim/world] simulated ${processed} match(es)`);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[autosim/world] error:', err);
    return false;
  }
}

/**
 * Runs ONE simulation per call. Stops immediately after.
 * Concurrent calls are gated by `scanInFlight` (in-tab) AND a cross-tab
 * localStorage lock with TTL.
 */
async function runScan(): Promise<void> {
  if (scanInFlight) return;
  if (Date.now() < cooldownUntil) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  if (!tryAcquireScanLock()) return;

  scanInFlight = true;
  let success = false;
  let kind: string | null = null;
  try {
    const next = await fetchNextEligibleMatch();
    if (next) {
      kind = next.kind;
      try {
        if (next.kind === 'league')          success = await processLeagueMatch(next.row);
        else if (next.kind === 'friendly')   success = await processFriendly(next.row);
        else if (next.kind === 'tournament') success = await processTournamentMatch(next.row);
      } catch (err) {
        console.warn(`[autosim] ${next.kind} sim error:`, err);
      }
    } else {
      // Nenhuma partida legacy elegível → tenta o sistema mundial
      const worldOk = await runWorldScan();
      if (worldOk) {
        kind = 'world';
        success = true;
      }
    }

    // Enforce cooldown after a successful sim — prevents bursts.
    if (success) {
      cooldownUntil = Date.now() + POST_SIM_DELAY_MS;
    }
  } catch (err) {
    console.warn('[autosim] scan error:', err);
  } finally {
    scanInFlight = false;
    releaseScanLock();
  }

  // CHAIN: if we just simulated a match, schedule another scan AFTER the
  // cooldown so the next pending match in the queue is processed promptly
  // instead of waiting up to 5s for the next interval tick.
  if (success) {
    setTimeout(() => { void runScan(); }, POST_SIM_DELAY_MS + 50);
    if (kind) console.info(`[autosim] chaining next scan after ${kind} sim`);
  }
}

// ───────────────── watchdog: rescue stuck matches ─────────────────
/**
 * Runs every WATCHDOG_INTERVAL_MS. Handles matches that should have been
 * simulated long ago but got stuck (e.g., everyone offline, transient errors).
 *
 * "Stuck" criterion: status='scheduled' AND scheduled time + STUCK_AFTER_MS
 * has elapsed. We bypass the 5-min tolerance for these — the player has had
 * MORE than enough time. We forward to runScan via a relaxed selector.
 */
let watchdogInFlight = false;
let watchdogTickCount = 0;
async function runWatchdog(): Promise<void> {
  if (watchdogInFlight) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  watchdogInFlight = true;
  try {
    const stuckIso = new Date(Date.now() - STUCK_AFTER_MS).toISOString();

    // Probe each table. If anything stuck found, run a scan; the scan's own
    // tolerance check will let it through (stuck > tolerance, by definition).
    const [leagueRes, friendlyRes, tournamentRes, worldRes, cupRes, intlRes] = await Promise.all([
      supabase.from('league_matches')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'scheduled').lte('auto_sim_at', stuckIso),
      supabase.from('friendly_invites')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'accepted').is('match_result', null).lte('match_date', stuckIso),
      supabase.from('custom_tournament_matches')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'scheduled').lte('scheduled_at', stuckIso),
      supabase.from('world_matches')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'scheduled').lte('kickoff_at', stuckIso),
      supabase.from('world_cup_matches')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'scheduled').lte('kickoff_at', stuckIso),
      supabase.from('international_matches')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'scheduled').lte('kickoff_at', stuckIso),
    ]);

    const legacyStuck =
      (leagueRes.count || 0) + (friendlyRes.count || 0) + (tournamentRes.count || 0);
    const worldStuck = (worldRes.count || 0) + (cupRes.count || 0) + (intlRes.count || 0);
    const stuckCount = legacyStuck + worldStuck;
    if (stuckCount > 0) {
      console.warn(`[autosim/watchdog] ${stuckCount} stuck match(es) (world: ${worldStuck}, cup: ${cupRes.count || 0}, intl: ${intlRes.count || 0}) — forcing scan`);
      cooldownUntil = 0;
      void runScan();

      // Drain mode: muitas world matches → simula em lote
      if (worldStuck >= 5) {
        try {
          const { data } = await supabase.functions.invoke('world-match-simulator', {
            body: { force_until_empty: true, max: 20 },
          });
          const drained = Number((data as any)?.processed) || 0;
          if (drained > 0) console.info(`[autosim/watchdog] drained ${drained} world matches`);
        } catch (err) {
          console.warn('[autosim/watchdog] drain error:', err);
        }
      }
    }

    // A cada ~5 ciclos do watchdog (≈5 minutos), aciona o cup-advancer
    // para gerar próximas rodadas (QF/SF/F) das copas com rodada concluída.
    watchdogTickCount++;
    if (watchdogTickCount % 5 === 0) {
      try {
        await supabase.functions.invoke('world-cup-advancer', { body: {} });
      } catch (err) {
        console.warn('[autosim/watchdog] cup-advancer error:', err);
      }
    }
  } catch (err) {
    console.warn('[autosim/watchdog] error:', err);
  } finally {
    watchdogInFlight = false;
  }
}

/**
 * Public helper — call this RIGHT AFTER creating a match so the simulation
 * kicks off in the same tick (still respecting the 1-per-cycle rule).
 */
export function triggerAutoSim(): void {
  void runScan();
}

// Expose globally for legacy callers / debugging.
if (typeof window !== 'undefined') {
  (window as any).__triggerAutoSim = triggerAutoSim;
}

// ───────────────── hook ─────────────────
export function useAutoSimulator(userId: string | undefined) {
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    void runScan();
    void runWatchdog();
    const interval = setInterval(() => { void runScan(); }, SCAN_INTERVAL_MS);
    const watchdog = setInterval(() => { void runWatchdog(); }, WATCHDOG_INTERVAL_MS);
    const onOnline = () => { void runScan(); void runWatchdog(); };
    window.addEventListener('online', onOnline);

    let leagueChannel: ReturnType<typeof supabase.channel> | null = null;
    let friendlyChannel: ReturnType<typeof supabase.channel> | null = null;
    let tournamentChannel: ReturnType<typeof supabase.channel> | null = null;
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
      tournamentChannel = supabase
        .channel('autosim-tournament-matches')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'custom_tournament_matches' }, () => { void runScan(); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'custom_tournament_matches' }, () => { void runScan(); })
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      clearInterval(watchdog);
      window.removeEventListener('online', onOnline);
      if (leagueChannel) supabase.removeChannel(leagueChannel);
      if (friendlyChannel) supabase.removeChannel(friendlyChannel);
      if (tournamentChannel) supabase.removeChannel(tournamentChannel);
      subscribedRef.current = false;
    };
  }, [userId]);
}
