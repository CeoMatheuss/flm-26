/**
 * useAutoSimulator — 100% client-side time-based auto-simulation.
 *
 * Any logged-in client periodically scans for matches whose scheduled kickoff
 * has already passed and simulates them locally, writing the result straight
 * to Supabase. The simulation runs regardless of whether either player joined
 * the lobby — once the time arrives, the match is played.
 *
 * A localStorage lock prevents duplicate work across tabs.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SCAN_INTERVAL_MS = 15_000;   // 15s — react quickly when kickoff arrives
const FALLBACK_DELAY_MS = 5 * 60_000; // fallback if auto_sim_at/match_date is missing
const LOCK_TTL_MS = 60_000;        // 60s
const MAX_PER_RUN = 20;            // soft cap per scan

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

// Strength = avg OVR of top 11 healthy players (fallback 60).
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

// ── Lock helpers (localStorage, 60s TTL) ──
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
  } catch { return true; /* if storage fails, just proceed */ }
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
      message: `Você não entrou em campo. ${result} ${mine}x${theirs} vs ${opponent} (${comp})`,
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
      .eq('status', 'scheduled'); // guard
    if (error) return false;

    // Update standings (best-effort)
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

// ───────────────── hook ─────────────────
export function useAutoSimulator(userId: string | undefined) {
  const runningRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const scan = async () => {
      if (runningRef.current) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      runningRef.current = true;

      try {
        const nowIso = new Date().toISOString();
        const fallbackCutoffIso = new Date(Date.now() - FALLBACK_DELAY_MS).toISOString();

        // 1) League matches: any scheduled match whose kickoff time has passed.
        //    Uses auto_sim_at when present; otherwise falls back to created_at + 5min.
        //    NOTE: we deliberately do NOT filter by home_joined/away_joined —
        //    the match must run whether or not players joined the lobby.
        const { data: leaguesByAutoSim } = await supabase
          .from('league_matches')
          .select('id, league_id, home_user_id, away_user_id, match_data, created_at, auto_sim_at')
          .eq('status', 'scheduled')
          .not('auto_sim_at', 'is', null)
          .lte('auto_sim_at', nowIso)
          .limit(MAX_PER_RUN);

        const { data: leaguesNoAutoSim } = await supabase
          .from('league_matches')
          .select('id, league_id, home_user_id, away_user_id, match_data, created_at, auto_sim_at')
          .eq('status', 'scheduled')
          .is('auto_sim_at', null)
          .lt('created_at', fallbackCutoffIso)
          .limit(MAX_PER_RUN);

        const leagues = [...(leaguesByAutoSim || []), ...(leaguesNoAutoSim || [])];
        for (const m of leagues) {
          try { await processLeagueMatch(m); } catch (err) { console.warn('[autosim] league error:', err); }
        }

        // 2) Friendlies: accepted, no result yet, scheduled match_date already passed.
        //    Again, no joined-flag filter — automatic regardless of player presence.
        const { data: friendlies } = await supabase
          .from('friendly_invites')
          .select('id, sender_id, receiver_id, sender_club_name, receiver_club_name, home_team_id, match_date, match_result, created_at')
          .eq('status', 'accepted')
          .is('match_result', null)
          .lte('match_date', nowIso)
          .limit(MAX_PER_RUN);

        for (const f of friendlies || []) {
          try { await processFriendly(f); } catch (err) { console.warn('[autosim] friendly error:', err); }
        }
      } catch (err) {
        console.warn('[autosim] scan error:', err);
      } finally {
        runningRef.current = false;
      }
    };

    // Initial run + periodic scan
    scan();
    const interval = setInterval(scan, SCAN_INTERVAL_MS);

    // Also scan whenever connectivity returns
    const onOnline = () => scan();
    window.addEventListener('online', onOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
    };
  }, [userId]);
}
